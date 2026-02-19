// src/app/api/boards/[id]/columns/route.ts
// Column CRUD: Add, rename, reorder, and delete columns
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { generateKeyBetween } from "fractional-indexing";

// Helper to verify board access
async function checkBoardAccess(boardId: string, userId: string) {
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
    const isWorkspaceMember = board.workspace?.members && board.workspace.members.length > 0;

    if (!isAuthor && !isWorkspaceMember) return null;
    return board;
}

// POST /api/boards/[id]/columns - Add a new column
export async function POST(
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
        const board = await checkBoardAccess(boardId, userId);
        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        const body = await req.json();
        const { title } = body;

        // Get the last column for both integer order and fractional orderKey
        const lastColumn = await prisma.column.findFirst({
            where: { boardId },
            orderBy: { orderKey: "desc" },
        });

        // Generate fractional key after the last column
        const newOrderKey = generateKeyBetween(lastColumn?.orderKey ?? null, null);

        const column = await prisma.column.create({
            data: {
                title: title || "New Column",
                boardId,
                order: (lastColumn?.order ?? -1) + 1,
                orderKey: newOrderKey,
            },
        });

        return NextResponse.json(column);
    } catch (error) {
        console.error("Error creating column:", error);
        return NextResponse.json({ error: "Failed to create column" }, { status: 500 });
    }
}

// PUT /api/boards/[id]/columns - Update a column (rename or reorder)
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
        const board = await checkBoardAccess(boardId, userId);
        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        const body = await req.json();
        const { columnId, title } = body;

        const column = await prisma.column.update({
            where: { id: columnId },
            data: {
                ...(title !== undefined && { title }),
            },
        });

        return NextResponse.json(column);
    } catch (error) {
        console.error("Error updating column:", error);
        return NextResponse.json({ error: "Failed to update column" }, { status: 500 });
    }
}

// DELETE /api/boards/[id]/columns - Delete a column
export async function DELETE(
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
        const board = await checkBoardAccess(boardId, userId);
        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const columnId = searchParams.get("columnId");

        if (!columnId) {
            return NextResponse.json({ error: "columnId required" }, { status: 400 });
        }

        // Check if column has cards
        const cardCount = await prisma.card.count({ where: { columnId } });

        if (cardCount > 0) {
            // Move cards to the first available column (not the one being deleted)
            const otherColumn = await prisma.column.findFirst({
                where: { boardId, id: { not: columnId } },
                orderBy: { order: "asc" },
            });

            if (otherColumn) {
                await prisma.card.updateMany({
                    where: { columnId },
                    data: { columnId: otherColumn.id },
                });
            }
        }

        await prisma.column.delete({ where: { id: columnId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting column:", error);
        return NextResponse.json({ error: "Failed to delete column" }, { status: 500 });
    }
}
