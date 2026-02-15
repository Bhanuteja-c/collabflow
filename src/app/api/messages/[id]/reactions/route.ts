// POST /api/messages/[id]/reactions — Add/toggle reaction on a message
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: messageId } = await params;
    const userId = await ensureUser(session.user as any);
    const { emoji } = await req.json();

    if (!emoji) {
        return NextResponse.json({ error: "Emoji required" }, { status: 400 });
    }

    try {
        // Check if reaction already exists — toggle it
        const existing = await prisma.reaction.findUnique({
            where: {
                messageId_userId_emoji: { messageId, userId, emoji },
            },
        });

        if (existing) {
            // Remove the reaction (toggle off)
            await prisma.reaction.delete({ where: { id: existing.id } });
            return NextResponse.json({ action: "removed", emoji });
        }

        // Add the reaction
        const reaction = await prisma.reaction.create({
            data: { messageId, userId, emoji },
            include: {
                user: { select: { id: true, name: true, image: true } },
            },
        });

        return NextResponse.json({ action: "added", reaction });
    } catch (error) {
        console.error("Reaction error:", error);
        return NextResponse.json({ error: "Failed to toggle reaction" }, { status: 500 });
    }
}
