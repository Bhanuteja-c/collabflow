// src/app/api/cards/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { Activity } from "@/lib/activity";
import { CrossNotifier } from "@/lib/crossNotifier";

// Helper to check workspace access via card -> column -> board -> workspace
async function checkCardAccess(cardId: string, userId: string) {
    const card = await prisma.card.findUnique({
        where: { id: cardId },
        include: {
            column: {
                include: {
                    board: {
                        include: {
                            workspace: {
                                include: {
                                    members: {
                                        where: { userId },
                                        select: { id: true }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!card) return null;

    // Check if user is board author OR workspace member
    const board = card.column.board;
    const isAuthor = board.authorId === userId;
    const isWorkspaceMember = board.workspace?.members && board.workspace.members.length > 0;

    if (!isAuthor && !isWorkspaceMember) return null;

    return card;
}

// PUT /api/cards/[id] - Update a card
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Check access first
        const existing = await checkCardAccess(id, userId);
        if (!existing) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        const body = await req.json();
        const { title, description, columnId, order, priority, dueDate, assigneeId, startDate, labels, status } = body;

        const card = await prisma.card.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(columnId !== undefined && { columnId }),
                ...(order !== undefined && { order }),
                ...(priority !== undefined && { priority }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
                ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                ...(labels !== undefined && { labels }),
                ...(status !== undefined && { status }),
            },
            include: {
                assignee: {
                    select: { id: true, name: true, image: true }
                }
            }
        });

        // Log activity and cross-feature notifications
        const workspaceId = existing.column.board.workspace?.id;
        if (workspaceId) {
            // Card assigned → log activity + chat notification
            if (assigneeId !== undefined && assigneeId !== existing.assigneeId) {
                const assignee = card.assignee;
                if (assignee) {
                    Activity.cardAssigned(userId, workspaceId, id, card.title, assignee.name || "someone");
                    CrossNotifier.cardAssigned({
                        workspaceId,
                        userId,
                        cardTitle: card.title,
                        assigneeName: assignee.name || "someone",
                    });
                }
            }

            // Card moved to a "done" column → chat notification
            if (columnId !== undefined && columnId !== existing.columnId) {
                const newColumn = await prisma.column.findUnique({ where: { id: columnId }, select: { title: true } });
                const doneNames = ["done", "complete", "completed", "finished", "closed"];
                if (newColumn && doneNames.includes(newColumn.title.toLowerCase())) {
                    CrossNotifier.cardCompleted({
                        workspaceId,
                        userId,
                        cardTitle: card.title,
                        boardName: existing.column.board.title,
                    });
                }
            }
        }

        return NextResponse.json(card);
    } catch (error) {
        console.error("Error updating card:", error);
        return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
    }
}

// DELETE /api/cards/[id] - Delete a card
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Check access first
        const existing = await checkCardAccess(id, userId);
        if (!existing) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        await prisma.card.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting card:", error);
        return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
    }
}
