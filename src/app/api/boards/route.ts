// src/app/api/boards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

// GET /api/boards - List all boards for the current user
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Ensure user exists in database
        const userId = await ensureUser(session.user as any);

        const boards = await prisma.board.findMany({
            where: { authorId: userId },
            orderBy: { updatedAt: "desc" },
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

        return NextResponse.json(boards);
    } catch (error) {
        console.error("[API/boards] Error:", error);
        return NextResponse.json({
            error: "Failed to fetch boards",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

// POST /api/boards - Create a new board with default columns
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Ensure user exists in database
        const userId = await ensureUser(session.user as any);

        const body = await req.json();
        const { title } = body;

        const board = await prisma.board.create({
            data: {
                title: title || "Untitled Board",
                authorId: userId,
                columns: {
                    create: [
                        { title: "To Do", order: 0 },
                        { title: "In Progress", order: 1 },
                        { title: "Review", order: 2 },
                        { title: "Done", order: 3 },
                    ],
                },
            },
            include: {
                columns: {
                    orderBy: { order: "asc" },
                    include: { cards: true },
                },
            },
        });

        return NextResponse.json(board);
    } catch (error) {
        console.error("[API/boards] Error:", error);
        return NextResponse.json({
            error: "Failed to create board",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
