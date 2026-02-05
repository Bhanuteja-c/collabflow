// src/app/api/cards/[id]/checklist/route.ts
// CRUD for card checklist items
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch checklist items for a card
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

        const items = await prisma.checklistItem.findMany({
            where: { cardId: id },
            orderBy: { order: "asc" },
        });

        return NextResponse.json(items);
    } catch (error) {
        console.error("Error fetching checklist:", error);
        return NextResponse.json({ error: "Failed to fetch checklist" }, { status: 500 });
    }
}

// POST - Add a checklist item
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

        const body = await req.json();
        const { content } = body;

        if (!content?.trim()) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        // Get the highest order
        const lastItem = await prisma.checklistItem.findFirst({
            where: { cardId: id },
            orderBy: { order: "desc" },
        });

        const item = await prisma.checklistItem.create({
            data: {
                content: content.trim(),
                cardId: id,
                order: (lastItem?.order ?? -1) + 1,
            },
        });

        return NextResponse.json(item);
    } catch (error) {
        console.error("Error creating checklist item:", error);
        return NextResponse.json({ error: "Failed to create checklist item" }, { status: 500 });
    }
}
