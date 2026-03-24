// src/app/api/cards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { Activity } from "@/lib/activity";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { generateKeyBetween } from "fractional-indexing";

// POST /api/cards - Create a new card
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Rate limit check
        const rl = checkRateLimit(`card:${userId}`, RATE_LIMITS.write);
        if (!rl.success) {
            return NextResponse.json(
                { error: "Too many requests. Please wait." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
            );
        }

        const body = await req.json();
        const { title, description, columnId, priority, assigneeId, dueDate, startDate, labels, status, issueType, isBacklog, boardId, parentId, storyPoints, epicId } = body;

        // Enforce single-level subtask nesting
        if (parentId) {
            const parentCard = await prisma.card.findUnique({
                where: { id: parentId },
                select: { parentId: true },
            });
            if (parentCard?.parentId) {
                return NextResponse.json(
                    { error: "Cannot create subtask of a subtask. Only one level of nesting is allowed." },
                    { status: 400 }
                );
            }
        }

        // For backlog cards, columnId is optional
        if (!isBacklog && !columnId) {
            return NextResponse.json({ error: "columnId is required for non-backlog cards" }, { status: 400 });
        }

        // Get the last card for ordering
        const orderQuery = isBacklog
            ? { boardId, isBacklog: true }
            : { columnId };
        const lastCard = await prisma.card.findFirst({
            where: orderQuery,
            orderBy: { orderKey: "desc" },
        });

        // Generate fractional key after the last card
        const newOrderKey = generateKeyBetween(lastCard?.orderKey ?? null, null);

        // Get column and board info for activity logging + issue number
        let resolvedBoardId = boardId;
        let workspaceId: string | undefined;

        if (columnId) {
            const column = await prisma.column.findUnique({
                where: { id: columnId },
                include: {
                    board: {
                        select: { id: true, workspaceId: true }
                    }
                }
            });
            resolvedBoardId = column?.board?.id || boardId;
            workspaceId = column?.board?.workspaceId ?? undefined;
        } else if (boardId) {
            const board = await prisma.board.findUnique({
                where: { id: boardId },
                select: { workspaceId: true },
            });
            workspaceId = board?.workspaceId ?? undefined;
        }

        // Compute MAX+1 issue number across all cards in this board
        let nextIssueNumber = 1;
        if (resolvedBoardId) {
            const maxCard = await prisma.card.findFirst({
                where: {
                    OR: [
                        { column: { boardId: resolvedBoardId } },
                        { boardId: resolvedBoardId },
                    ],
                },
                orderBy: { issueNumber: "desc" },
                select: { issueNumber: true },
            });
            nextIssueNumber = (maxCard?.issueNumber ?? 0) + 1;
        }

        const card = await prisma.card.create({
            data: {
                title: title || "New Task",
                description,
                columnId: columnId || null,
                boardId: resolvedBoardId || null,
                isBacklog: isBacklog || false,
                parentId: parentId || null,
                order: (lastCard?.order ?? -1) + 1,
                orderKey: newOrderKey,
                issueType: issueType || "task",
                issueNumber: nextIssueNumber,
                ...(priority && { priority }),
                ...(assigneeId && { assigneeId }),
                ...(dueDate && { dueDate: new Date(dueDate) }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(labels && { labels }),
                ...(status && { status }),
                ...(storyPoints !== undefined && { storyPoints }),
                ...(epicId && { epicId }),
            },
            include: {
                assignee: {
                    select: { id: true, name: true, image: true },
                },
                epic: {
                    select: { id: true, title: true, color: true },
                },
                _count: {
                    select: { subtasks: true },
                },
            },
        });

        // Log activity
        if (workspaceId) {
            Activity.cardCreated(userId, workspaceId, card.id, card.title);
        }

        // Return enriched card with all fields for consistent client-side state
        const enrichedCard = {
            id: card.id,
            title: card.title,
            description: card.description,
            order: card.order,
            issueType: card.issueType,
            issueNumber: card.issueNumber,
            priority: card.priority,
            dueDate: card.dueDate,
            startDate: card.startDate,
            labels: card.labels,
            status: card.status,
            storyPoints: card.storyPoints,
            isBacklog: card.isBacklog,
            parentId: card.parentId,
            assigneeId: card.assigneeId,
            assignee: card.assignee,
            epic: card.epic,
            subtaskCount: card._count.subtasks,
            commentsCount: 0,
            checklistTotal: 0,
            checklistCompleted: 0,
            createdAt: card.createdAt,
            updatedAt: card.updatedAt,
        };

        return NextResponse.json(enrichedCard);
    } catch (error) {
        console.error("Error creating card:", error);
        return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
    }
}

// PUT /api/cards - Update card positions (for drag and drop)
export async function PUT(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const body = await req.json();
        const { cardId, columnId, order, orderKey } = body;

        // Get current card state before update
        const oldCard = await prisma.card.findUnique({
            where: { id: cardId },
            include: {
                column: {
                    include: {
                        board: { select: { workspaceId: true } }
                    }
                }
            }
        });

        // Log activity if column changed (card was moved)
        if (oldCard && oldCard.columnId !== columnId) {
            let card;
            try {
                card = await prisma.$transaction(async (tx) => {
                    const targetColumn = await tx.column.findUnique({
                        where: { id: columnId },
                        include: {
                            _count: { select: { cards: true } }
                        }
                    });

                    if (
                        targetColumn?.wipLimit && 
                        (targetColumn._count?.cards ?? 0) >= targetColumn.wipLimit
                    ) {
                        throw new Error("WIP_LIMIT_REACHED");
                    }

                    return await tx.card.update({
                        where: { id: cardId },
                        data: {
                            columnId,
                            order,
                            ...(orderKey && { orderKey }),
                        },
                        include: {
                            column: { select: { title: true } }
                        }
                    });
                }, { isolationLevel: "Serializable" });
            } catch (error: any) {
                if (error.message === "WIP_LIMIT_REACHED") {
                    return NextResponse.json(
                        { error: "WIP_LIMIT_REACHED", message: "Column WIP limit reached" },
                        { status: 422 }
                    );
                }
                throw error;
            }

            if (oldCard.column?.board?.workspaceId) {
                Activity.cardMoved(
                    userId,
                    oldCard.column.board.workspaceId,
                    cardId,
                    card.title,
                    oldCard.column.title,
                    card.column?.title || "Unknown"
                );
            }

            return NextResponse.json(card);
        }

        // If no column change, just update order
        const card = await prisma.card.update({
            where: { id: cardId },
            data: {
                columnId,
                order,
                ...(orderKey && { orderKey }),
            },
            include: {
                column: { select: { title: true } }
            }
        });

        return NextResponse.json(card);
    } catch (error) {
        console.error("Error updating card:", error);
        return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
    }
}
