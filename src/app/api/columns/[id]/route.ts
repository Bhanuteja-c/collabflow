// src/app/api/columns/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// Helper to check workspace access via column -> board
async function checkColumnAccess(columnId: string, userId: string) {
    const column = await prisma.column.findUnique({
        where: { id: columnId },
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
            },
            _count: {
                select: { cards: true }
            }
        }
    });

    if (!column) return null;

    const board = column.board;
    if (!board) return null;

    const isAuthor = board.authorId === userId;
    const isWorkspaceMember = board.workspace?.members && board.workspace.members.length > 0;

    if (!isAuthor && !isWorkspaceMember) return null;

    return column;
}

// PUT /api/columns/[id] - Update column properties
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

        const existing = await checkColumnAccess(id, userId);
        if (!existing) {
            return NextResponse.json({ error: "Column not found" }, { status: 404 });
        }

        const body = await req.json();
        const { title, category, color, wipLimit, order, orderKey } = body;

        const column = await prisma.column.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(category !== undefined && { category }),
                ...(color !== undefined && { color }),
                ...(wipLimit !== undefined && { wipLimit }),
                ...(order !== undefined && { order }),
                ...(orderKey !== undefined && { orderKey }),
            },
        });

        return NextResponse.json(column);
    } catch (error) {
        console.error("Error updating column:", error);
        return NextResponse.json({ error: "Failed to update column" }, { status: 500 });
    }
}

// DELETE /api/columns/[id] - Delete a column
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

        const existing = await checkColumnAccess(id, userId);
        if (!existing) {
            return NextResponse.json({ error: "Column not found" }, { status: 404 });
        }

        // Prevent deleting a column that still has cards
        if (existing._count.cards > 0) {
            return NextResponse.json(
                { error: "Cannot delete a column that contains tasks. Move or delete the tasks first." },
                { status: 400 }
            );
        }

        await prisma.column.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting column:", error);
        return NextResponse.json({ error: "Failed to delete column" }, { status: 500 });
    }
}
