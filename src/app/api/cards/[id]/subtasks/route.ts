// src/app/api/cards/[id]/subtasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { Activity } from "@/lib/activity";
import { generateKeyBetween } from "fractional-indexing";

// Helper: verify card access via card → column → board → workspace
async function checkCardAccess(cardId: string, userId: string) {
    const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
            column: {
                include: {
                    board: {
                        include: {
                            workspace: {
                                select: {
                                    id: true,
                                    members: {
                                        where: { userId },
                                        select: { id: true },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            board: {
                include: {
                    workspace: {
                        select: {
                            id: true,
                            members: {
                                where: { userId },
                                select: { id: true },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!card) return null;

    const board = card.column?.board || card.board;
    if (!board) return null;

    const isAuthor = board.authorId === userId;
    const isMember = board.workspace?.members && board.workspace.members.length > 0;
    if (!isAuthor && !isMember) return null;

    return { card, board };
}

// GET /api/cards/[id]/subtasks — List subtasks of a card
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id: parentId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const access = await checkCardAccess(parentId, userId);
        if (!access) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        const subtasks = await prisma.card.findMany({
            where: { parentId },
            orderBy: { orderKey: "asc" },
            include: {
                assignee: {
                    select: { id: true, name: true, image: true },
                },
                _count: {
                    select: { comments: true, checklist: true },
                },
            },
        });

        const enriched = subtasks.map((st) => ({
            id: st.id,
            title: st.title,
            description: st.description,
            priority: st.priority,
            status: st.status,
            dueDate: st.dueDate,
            startDate: st.startDate,
            assigneeId: st.assigneeId,
            assignee: st.assignee,
            issueType: st.issueType,
            issueNumber: st.issueNumber,
            labels: st.labels,
            storyPoints: st.storyPoints,
            commentsCount: st._count.comments,
            checklistTotal: st._count.checklist,
            createdAt: st.createdAt,
        }));

        return NextResponse.json(enriched);
    } catch (error) {
        console.error("Error fetching subtasks:", error);
        return NextResponse.json({ error: "Failed to fetch subtasks" }, { status: 500 });
    }
}

// POST /api/cards/[id]/subtasks — Create a subtask
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id: parentId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const access = await checkCardAccess(parentId, userId);
        if (!access) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        // Enforce single-level nesting: parent must NOT itself be a subtask
        if (access.card.parentId) {
            return NextResponse.json(
                { error: "Cannot create subtask of a subtask. Only one level of nesting is allowed." },
                { status: 400 }
            );
        }

        const body = await req.json();
        const { title, description, priority, assigneeId, dueDate, startDate, labels, storyPoints } = body;

        if (!title?.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        // Get last subtask for ordering
        const lastSubtask = await prisma.card.findFirst({
            where: { parentId },
            orderBy: { orderKey: "desc" },
            select: { orderKey: true, order: true },
        });
        const newOrderKey = generateKeyBetween(lastSubtask?.orderKey ?? null, null);
        const newOrder = (lastSubtask?.order ?? -1) + 1;

        // Compute next issue number across the board
        const boardId = access.card.boardId || access.card.column?.boardId;
        let nextIssueNumber = 1;
        if (boardId) {
            const maxCard = await prisma.card.findFirst({
                where: {
                    OR: [
                        { column: { boardId } },
                        { boardId },
                    ],
                },
                orderBy: { issueNumber: "desc" },
                select: { issueNumber: true },
            });
            nextIssueNumber = (maxCard?.issueNumber ?? 0) + 1;
        }

        const subtask = await prisma.card.create({
            data: {
                title: title.trim(),
                description,
                parentId,
                columnId: access.card.columnId, // Inherit parent's column
                boardId: boardId || undefined,
                isBacklog: access.card.isBacklog,
                order: newOrder,
                orderKey: newOrderKey,
                issueNumber: nextIssueNumber,
                issueType: "task",
                ...(priority && { priority }),
                ...(assigneeId && { assigneeId }),
                ...(dueDate && { dueDate: new Date(dueDate) }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(labels && { labels }),
                ...(storyPoints !== undefined && { storyPoints }),
            },
            include: {
                assignee: {
                    select: { id: true, name: true, image: true },
                },
            },
        });

        // Log activity
        const workspaceId = access.board.workspace?.id;
        if (workspaceId) {
            Activity.cardCreated(userId, workspaceId, subtask.id, subtask.title);
        }

        return NextResponse.json(subtask);
    } catch (error) {
        console.error("Error creating subtask:", error);
        return NextResponse.json({ error: "Failed to create subtask" }, { status: 500 });
    }
}
