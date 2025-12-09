// src/app/api/boards/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

        const board = await prisma.board.findFirst({
            where: { id, authorId: session.user.id },
            include: {
                columns: {
                    orderBy: { order: "asc" },
                    include: {
                        cards: {
                            orderBy: { order: "asc" },
                        },
                    },
                },
            },
        });

        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        return NextResponse.json(board);
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

// DELETE /api/boards/[id] - Delete a board
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

        await prisma.board.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting board:", error);
        return NextResponse.json({ error: "Failed to delete board" }, { status: 500 });
    }
}
