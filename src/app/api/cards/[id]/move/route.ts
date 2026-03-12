// src/app/api/cards/[id]/move/route.ts
// Unified card move endpoint: backlog ↔ board column
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { Activity } from "@/lib/activity";
import { generateKeyBetween } from "fractional-indexing";

// PATCH /api/cards/[id]/move
// Body: { target: "backlog" } | { targetColumnId: "col_123" }
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id: cardId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Fetch the card with its board context
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

        if (!card) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        // Resolve the board (from column or direct)
        const board = card.column?.board || card.board;
        if (!board) {
            return NextResponse.json({ error: "Card has no associated board" }, { status: 400 });
        }

        // Check access
        const isAuthor = board.authorId === userId;
        const isMember = board.workspace?.members && board.workspace.members.length > 0;
        if (!isAuthor && !isMember) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { target, targetColumnId } = body;

        if (target === "backlog") {
            // Move card TO backlog
            // Generate orderKey at the end of backlog
            const lastBacklogCard = await prisma.card.findFirst({
                where: { boardId: board.id, isBacklog: true },
                orderBy: { orderKey: "desc" },
                select: { orderKey: true },
            });
            const newOrderKey = generateKeyBetween(lastBacklogCard?.orderKey ?? null, null);

            const updated = await prisma.card.update({
                where: { id: cardId },
                data: {
                    isBacklog: true,
                    columnId: null,
                    boardId: board.id,
                    orderKey: newOrderKey,
                },
                include: {
                    assignee: { select: { id: true, name: true, image: true } },
                },
            });

            // Log activity
            const wId = board.workspace?.id;
            if (wId) {
                Activity.cardMoved(userId, wId, cardId, card.title, card.column?.title || "Board", "Backlog");
            }

            return NextResponse.json(updated);
        } else if (targetColumnId) {
            // Move card FROM backlog TO a column
            const targetColumn = await prisma.column.findUnique({
                where: { id: targetColumnId },
                select: { id: true, title: true, boardId: true },
            });

            if (!targetColumn || targetColumn.boardId !== board.id) {
                return NextResponse.json({ error: "Target column not found" }, { status: 404 });
            }

            // Generate orderKey at the end of the column
            const lastCard = await prisma.card.findFirst({
                where: { columnId: targetColumnId },
                orderBy: { orderKey: "desc" },
                select: { orderKey: true, order: true },
            });
            const newOrderKey = generateKeyBetween(lastCard?.orderKey ?? null, null);
            const newOrder = (lastCard?.order ?? -1) + 1;

            const updated = await prisma.card.update({
                where: { id: cardId },
                data: {
                    isBacklog: false,
                    columnId: targetColumnId,
                    boardId: board.id,
                    orderKey: newOrderKey,
                    order: newOrder,
                },
                include: {
                    assignee: { select: { id: true, name: true, image: true } },
                },
            });

            // Log activity
            const wId = board.workspace?.id;
            if (wId) {
                Activity.cardMoved(userId, wId, cardId, card.title, "Backlog", targetColumn.title);
            }

            return NextResponse.json(updated);
        } else {
            return NextResponse.json(
                { error: "Provide 'target: backlog' or 'targetColumnId'" },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Error moving card:", error);
        return NextResponse.json({ error: "Failed to move card" }, { status: 500 });
    }
}
