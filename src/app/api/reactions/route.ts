// src/app/api/reactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { pusherServer } from "@/lib/pusher";

// POST /api/reactions - Add or remove reaction
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const body = await req.json();
        const { messageId, emoji } = body;

        if (!messageId || !emoji) {
            return NextResponse.json({ error: "messageId and emoji are required" }, { status: 400 });
        }

        const message = await prisma.message.findUnique({
            where: { id: messageId },
            include: {
                channel: true
            }
        });

        if (!message) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        // Check for existing reaction
        const existingReaction = await prisma.reaction.findUnique({
            where: {
                messageId_userId_emoji: {
                    messageId,
                    userId,
                    emoji,
                },
            },
        });

        if (existingReaction) {
            // Toggle off (remove)
            await prisma.reaction.delete({
                where: { id: existingReaction.id },
            });

            // Trigger Pusher update
            await pusherServer.trigger(`channel-${message.channelId}`, "message-reaction", {
                messageId,
                emoji,
                userId,
                action: "removed"
            });

            return NextResponse.json({ action: "removed" });
        } else {
            // Add reaction
            const reaction = await prisma.reaction.create({
                data: {
                    messageId,
                    userId,
                    emoji,
                },
            });

            // Trigger Pusher update
            await pusherServer.trigger(`channel-${message.channelId}`, "message-reaction", {
                messageId,
                emoji,
                userId,
                id: reaction.id,
                action: "added"
            });

            return NextResponse.json({ action: "added", reaction });
        }

    } catch (error) {
        console.error("[API/reactions] Error:", error);
        return NextResponse.json({
            error: "Failed to toggle reaction",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
