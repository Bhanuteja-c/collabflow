// src/app/api/boards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { Activity } from "@/lib/activity";

// GET /api/boards - List boards for a workspace
export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
        }

        // Verify workspace membership
        const membership = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
        });
        if (!membership) {
            return NextResponse.json({ error: "Not a member" }, { status: 403 });
        }

        const boards = await prisma.board.findMany({
            where: { workspaceId },
            orderBy: { updatedAt: "desc" },
            include: {
                columns: {
                    orderBy: { order: "asc" },
                    include: {
                        cards: {
                            orderBy: { order: "asc" },
                            include: {
                                assignee: {
                                    select: { id: true, name: true, image: true },
                                },
                                _count: {
                                    select: {
                                        comments: true,
                                        checklist: true,
                                    },
                                },
                                checklist: {
                                    where: { completed: true },
                                    select: { id: true },
                                },
                            },
                        },
                    },
                },
                author: {
                    select: { id: true, name: true, image: true },
                },
            },
        });

        // Flatten checklist counts into the card objects
        const enriched = boards.map(board => ({
            ...board,
            columns: board.columns.map(col => ({
                ...col,
                cards: col.cards.map(card => ({
                    id: card.id,
                    title: card.title,
                    description: card.description,
                    order: card.order,
                    priority: card.priority,
                    dueDate: card.dueDate,
                    startDate: card.startDate,
                    labels: card.labels,
                    status: card.status,
                    assigneeId: card.assigneeId,
                    assignee: card.assignee,
                    commentsCount: card._count.comments,
                    checklistTotal: card._count.checklist,
                    checklistCompleted: card.checklist.length,
                    createdAt: card.createdAt,
                    updatedAt: card.updatedAt,
                })),
            })),
        }));

        return NextResponse.json(enriched);
    } catch (error) {
        console.error("[API/boards] Error:", error);
        return NextResponse.json({
            error: "Failed to fetch boards",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

// POST /api/boards - Create a new board with default columns
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        const body = await req.json();
        const { title, workspaceId } = body;

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
        }

        // Verify workspace membership
        const membership = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
        });
        if (!membership) {
            return NextResponse.json({ error: "Not a member" }, { status: 403 });
        }

        const board = await prisma.board.create({
            data: {
                title: title || "Project Board",
                authorId: userId,
                workspaceId,
                columns: {
                    create: [
                        { title: "To Do", order: 0 },
                        { title: "In Progress", order: 1 },
                        { title: "Review", order: 2 },
                        { title: "Done", order: 3 },
                    ],
                },
            },
            include: {
                columns: {
                    orderBy: { order: "asc" },
                    include: { cards: true },
                },
            },
        });

        // Log activity
        Activity.boardCreated(userId, workspaceId, board.id, board.title);

        return NextResponse.json(board);
    } catch (error) {
        console.error("[API/boards] Error:", error);
        return NextResponse.json({
            error: "Failed to create board",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
