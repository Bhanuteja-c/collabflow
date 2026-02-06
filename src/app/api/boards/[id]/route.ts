// src/app/api/boards/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// Helper to check workspace access via board
async function checkBoardAccess(boardId: string, userId: string) {
    const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
            workspace: {
                include: {
                    members: {
                        where: { userId },
                        select: { id: true, role: true }
                    }
                }
            },
            columns: {
                orderBy: { order: "asc" },
                include: {
                    cards: {
                        orderBy: { order: "asc" },
                        include: {
                            assignee: {
                                select: { id: true, name: true, image: true }
                            }
                        }
                    },
                },
            },
        },
    });

    if (!board) return null;

    // Check if user is author OR workspace member
    const isAuthor = board.authorId === userId;
    const isWorkspaceMember = board.workspace?.members && board.workspace.members.length > 0;

    if (!isAuthor && !isWorkspaceMember) return null;

    return board;
}

// GET /api/boards/[id] - Get a single board with columns and cards
export async function GET(
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
        const board = await checkBoardAccess(id, userId);

        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        // Don't expose internal workspace membership details
        return NextResponse.json({
            ...board,
            workspace: undefined
        });
    } catch (error) {
        console.error("Error fetching board:", error);
        return NextResponse.json({ error: "Failed to fetch board" }, { status: 500 });
    }
}

// PUT /api/boards/[id] - Update board title
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
        const existing = await checkBoardAccess(id, userId);
        if (!existing) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        const body = await req.json();
        const { title } = body;

        const board = await prisma.board.update({
            where: { id },
            data: { title },
        });

        return NextResponse.json(board);
    } catch (error) {
        console.error("Error updating board:", error);
        return NextResponse.json({ error: "Failed to update board" }, { status: 500 });
    }
}

// DELETE /api/boards/[id] - Delete a board (author only)
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

        // Only author can delete
        const board = await prisma.board.findUnique({
            where: { id },
            select: { authorId: true }
        });

        if (!board || board.authorId !== userId) {
            return NextResponse.json({ error: "Only the board author can delete it" }, { status: 403 });
        }

        await prisma.board.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting board:", error);
        return NextResponse.json({ error: "Failed to delete board" }, { status: 500 });
    }
}
