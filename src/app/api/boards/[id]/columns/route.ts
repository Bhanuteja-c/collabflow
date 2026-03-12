// src/app/api/boards/[id]/columns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { generateKeyBetween } from "fractional-indexing";

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
            }
        },
    });

    if (!board) return null;

    // Check if user is author OR workspace member
    const isAuthor = board.authorId === userId;
    const isWorkspaceMember = board.workspace?.members && board.workspace.members.length > 0;

    if (!isAuthor && !isWorkspaceMember) return null;

    return board;
}

// POST /api/boards/[id]/columns - Create a new column
export async function POST(
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

        // Check access to the board
        const existing = await checkBoardAccess(id, userId);
        if (!existing) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        const body = await req.json();
        const { title, category = "todo", color = "#6366f1", wipLimit = null } = body;

        if (!title) {
            return NextResponse.json({ error: "Column title is required" }, { status: 400 });
        }

        // Get the current highest order column to append this new one to the end
        const lastColumn = await prisma.column.findFirst({
            where: { boardId: id },
            orderBy: { orderKey: "desc" },
        });

        const newOrderKey = generateKeyBetween(lastColumn?.orderKey || null, null);
        const newOrderIndex = (lastColumn?.order || 0) + 1; // Fallback for legacy order integer

        const column = await prisma.column.create({
            data: {
                title,
                category,
                color,
                wipLimit,
                order: newOrderIndex,
                orderKey: newOrderKey,
                boardId: id,
            },
            include: {
                cards: true
            }
        });

        // Ensure newly created columns have a guaranteed empty cards array for the frontend
        return NextResponse.json({ ...column, cards: [] });
    } catch (error) {
        console.error("Error creating column:", error);
        return NextResponse.json({ error: "Failed to create column" }, { status: 500 });
    }
}
