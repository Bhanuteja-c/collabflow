// src/app/api/cards/bulk/route.ts
// Bulk operations on multiple cards: move, assign, priority, delete
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// POST /api/cards/bulk
// Body: { cardIds: string[], action: "move" | "assign" | "priority" | "delete", payload: object }
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const body = await req.json();
        const { cardIds, action, payload } = body;

        if (!Array.isArray(cardIds) || cardIds.length === 0) {
            return NextResponse.json({ error: "cardIds must be a non-empty array" }, { status: 400 });
        }

        if (cardIds.length > 50) {
            return NextResponse.json({ error: "Maximum 50 cards per bulk operation" }, { status: 400 });
        }

        // Verify all cards exist and user has access
        const cards = await prisma.card.findMany({
            where: { id: { in: cardIds } },
            include: {
                column: {
                    include: {
                        board: {
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
                        },
                    },
                },
            },
        });

        if (cards.length !== cardIds.length) {
            return NextResponse.json({ error: "Some cards were not found" }, { status: 404 });
        }

        // Verify access to all cards
        for (const card of cards) {
            const board = card.column?.board;
            if (!board) continue;
            const isAuthor = board.authorId === userId;
            const isMember = board.workspace?.members && board.workspace.members.length > 0;
            if (!isAuthor && !isMember) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        switch (action) {
            case "move": {
                const { columnId } = payload || {};
                if (!columnId) {
                    return NextResponse.json({ error: "columnId required for move action" }, { status: 400 });
                }

                // Verify target column exists
                const targetColumn = await prisma.column.findUnique({
                    where: { id: columnId },
                    select: { id: true, title: true },
                });
                if (!targetColumn) {
                    return NextResponse.json({ error: "Target column not found" }, { status: 404 });
                }

                // Get current max order in target column
                const lastCard = await prisma.card.findFirst({
                    where: { columnId },
                    orderBy: { order: "desc" },
                    select: { order: true },
                });
                let nextOrder = (lastCard?.order ?? -1) + 1;

                // Move all cards to target column
                const updates = cardIds.map((id: string, index: number) =>
                    prisma.card.update({
                        where: { id },
                        data: {
                            columnId,
                            order: nextOrder + index,
                            isBacklog: false,
                        },
                    })
                );

                await prisma.$transaction(updates);

                return NextResponse.json({
                    success: true,
                    action: "move",
                    count: cardIds.length,
                    columnId,
                    columnTitle: targetColumn.title,
                });
            }

            case "assign": {
                const { assigneeId } = payload || {};
                // assigneeId can be null to unassign

                if (assigneeId) {
                    const assignee = await prisma.user.findUnique({
                        where: { id: assigneeId },
                        select: { id: true },
                    });
                    if (!assignee) {
                        return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
                    }
                }

                await prisma.card.updateMany({
                    where: { id: { in: cardIds } },
                    data: { assigneeId: assigneeId || null },
                });

                return NextResponse.json({
                    success: true,
                    action: "assign",
                    count: cardIds.length,
                    assigneeId: assigneeId || null,
                });
            }

            case "priority": {
                const { priority } = payload || {};
                if (!["low", "medium", "high"].includes(priority)) {
                    return NextResponse.json({ error: "Invalid priority. Must be low, medium, or high" }, { status: 400 });
                }

                await prisma.card.updateMany({
                    where: { id: { in: cardIds } },
                    data: { priority },
                });

                return NextResponse.json({
                    success: true,
                    action: "priority",
                    count: cardIds.length,
                    priority,
                });
            }

            case "delete": {
                await prisma.card.deleteMany({
                    where: { id: { in: cardIds } },
                });

                return NextResponse.json({
                    success: true,
                    action: "delete",
                    count: cardIds.length,
                });
            }

            default:
                return NextResponse.json(
                    { error: "Invalid action. Must be move, assign, priority, or delete" },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error("Bulk action error:", error);
        return NextResponse.json({ error: "Failed to perform bulk action" }, { status: 500 });
    }
}
