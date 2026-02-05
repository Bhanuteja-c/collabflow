// src/app/api/cards/[id]/checklist/[itemId]/route.ts
// Update and delete checklist items
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT - Update a checklist item (toggle completed, edit content)
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    try {
        const session = await auth();
        const { itemId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { completed, content } = body;

        const item = await prisma.checklistItem.update({
            where: { id: itemId },
            data: {
                ...(completed !== undefined && { completed }),
                ...(content !== undefined && { content }),
            },
        });

        return NextResponse.json(item);
    } catch (error) {
        console.error("Error updating checklist item:", error);
        return NextResponse.json({ error: "Failed to update checklist item" }, { status: 500 });
    }
}

// DELETE - Delete a checklist item
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    try {
        const session = await auth();
        const { itemId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.checklistItem.delete({
            where: { id: itemId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting checklist item:", error);
        return NextResponse.json({ error: "Failed to delete checklist item" }, { status: 500 });
    }
}
