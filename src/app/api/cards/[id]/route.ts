// src/app/api/cards/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { Activity } from "@/lib/activity";
import { CrossNotifier } from "@/lib/crossNotifier";
import { createNotification } from "@/lib/notifications";

// Helper to check workspace access via card -> column -> board -> workspace OR card -> board -> workspace (backlog)
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
                                    slug: true,
                                    members: {
                                        where: { userId },
                                        select: { id: true }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            board: {
                include: {
                    workspace: {
                        select: {
                            id: true,
                            slug: true,
                            members: {
                                where: { userId },
                                select: { id: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!card) return null;

    // Resolve board from column path or direct board relation (backlog cards)
    const board = card.column?.board || card.board;
    if (!board) return null;

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
        const { title, description, columnId, order, orderKey, priority, dueDate, assigneeId, startDate, labels, status, storyPoints, timeEstimated, parentId, epicId } = body;

        // Enforce single-level subtask nesting if parentId is being set
        if (parentId !== undefined && parentId !== null) {
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

        const card = await prisma.card.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(columnId !== undefined && { columnId }),
                ...(order !== undefined && { order }),
                ...(orderKey !== undefined && { orderKey }),
                ...(priority !== undefined && { priority }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
                ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                ...(labels !== undefined && { labels }),
                ...(status !== undefined && { status }),
                ...(storyPoints !== undefined && { storyPoints }),
                ...(timeEstimated !== undefined && { timeEstimated }),
                ...(parentId !== undefined && { parentId: parentId || null }),
                ...(epicId !== undefined && { epicId: epicId || null }),
            },
            include: {
                assignee: {
                    select: { id: true, name: true, image: true }
                },
                epic: {
                    select: { id: true, title: true, color: true }
                }
            }
        });

        // Log activity and cross-feature notifications
        const board = existing.column?.board || existing.board;
        const workspaceId = board?.workspace?.id;
        if (workspaceId) {
            // Card assigned → log activity + chat notification
            if (assigneeId !== undefined && assigneeId !== existing.assigneeId) {
                const assignee = card.assignee;
                if (assignee) {
                    Activity.cardAssigned(userId, workspaceId, id, card.title, assignee.name || "someone");
                    // Personal notification to the assignee
                    const boardSlug = board?.workspace?.slug ?? workspaceId;
                    await createNotification({
                        userId: assignee.id,
                        senderId: userId,
                        type: "task_assigned",
                        title: "Task Assigned",
                        message: `You were assigned to "${card.title}"`,
                        workspaceId,
                        link: `/workspace/${boardSlug}/kanban`,
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
                        boardName: board?.title ?? "Board",
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
