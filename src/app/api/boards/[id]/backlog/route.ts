// src/app/api/boards/[id]/backlog/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// Helper: check board membership
async function checkBoardMembership(boardId: string, userId: string) {
    const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
            workspace: {
                include: {
                    members: {
                        where: { userId },
                        select: { id: true },
                    },
                },
            },
        },
    });

    if (!board) return null;
    const isAuthor = board.authorId === userId;
    const isMember = board.workspace?.members && board.workspace.members.length > 0;
    if (!isAuthor && !isMember) return null;
    return board;
}

// GET /api/boards/[id]/backlog — Paginated backlog cards
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id: boardId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const board = await checkBoardMembership(boardId, userId);
        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        // Pagination
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
        const skip = (page - 1) * limit;

        const [cards, total] = await Promise.all([
            prisma.card.findMany({
                where: { boardId, isBacklog: true },
                orderBy: { orderKey: "asc" },
                skip,
                take: limit,
                include: {
                    assignee: {
                        select: { id: true, name: true, image: true },
                    },
                    epic: {
                        select: { id: true, title: true, color: true },
                    },
                    _count: {
                        select: { subtasks: true, comments: true, checklist: true },
                    },
                },
            }),
            prisma.card.count({
                where: { boardId, isBacklog: true },
            }),
        ]);

        // Enrich with checklist completion counts
        const enrichedCards = await Promise.all(
            cards.map(async (card) => {
                const checklistCompleted = await prisma.checklistItem.count({
                    where: { cardId: card.id, completed: true },
                });
                return {
                    ...card,
                    subtaskCount: card._count.subtasks,
                    commentsCount: card._count.comments,
                    checklistTotal: card._count.checklist,
                    checklistCompleted,
                    _count: undefined,
                };
            })
        );

        return NextResponse.json({
            cards: enrichedCards,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("Error fetching backlog:", error);
        return NextResponse.json({ error: "Failed to fetch backlog" }, { status: 500 });
    }
}

// PUT /api/boards/[id]/backlog — Reorder backlog items
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id: boardId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const board = await checkBoardMembership(boardId, userId);
        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        const body = await req.json();
        const { cardId, orderKey } = body;

        if (!cardId || !orderKey) {
            return NextResponse.json({ error: "cardId and orderKey required" }, { status: 400 });
        }

        const card = await prisma.card.update({
            where: { id: cardId },
            data: { orderKey },
        });

        return NextResponse.json(card);
    } catch (error) {
        console.error("Error reordering backlog:", error);
        return NextResponse.json({ error: "Failed to reorder backlog" }, { status: 500 });
    }
}
