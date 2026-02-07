// src/app/api/cards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { Activity } from "@/lib/activity";

// POST /api/cards - Create a new card
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const body = await req.json();
        const { title, description, columnId } = body;

        // Get the highest order in the column
        const lastCard = await prisma.card.findFirst({
            where: { columnId },
            orderBy: { order: "desc" },
        });

        // Get column and board info for activity logging
        const column = await prisma.column.findUnique({
            where: { id: columnId },
            include: {
                board: {
                    select: { workspaceId: true }
                }
            }
        });

        const card = await prisma.card.create({
            data: {
                title: title || "New Task",
                description,
                columnId,
                order: (lastCard?.order ?? -1) + 1,
            },
        });

        // Log activity
        if (column?.board?.workspaceId) {
            Activity.cardCreated(userId, column.board.workspaceId, card.id, card.title);
        }

        return NextResponse.json(card);
    } catch (error) {
        console.error("Error creating card:", error);
        return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
    }
}

// PUT /api/cards - Update card positions (for drag and drop)
export async function PUT(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { cardId, columnId, order } = body;

        const card = await prisma.card.update({
            where: { id: cardId },
            data: { columnId, order },
        });

        return NextResponse.json(card);
    } catch (error) {
        console.error("Error updating card:", error);
        return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
    }
}
