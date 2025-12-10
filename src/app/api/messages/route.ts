// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { pusherServer } from "@/lib/pusher";

// GET /api/messages?channelId=xxx - Get messages for a channel
export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const { searchParams } = new URL(req.url);
        const channelId = searchParams.get("channelId");

        if (!channelId) {
            return NextResponse.json({ error: "channelId is required" }, { status: 400 });
        }

        // Check if user is member of channel
        const membership = await prisma.channelMember.findUnique({
            where: {
                channelId_userId: { channelId, userId },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
        }

        const messages = await prisma.message.findMany({
            where: { channelId },
            orderBy: { createdAt: "asc" },
            include: {
                author: {
                    select: { id: true, name: true, image: true },
                },
            },
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error("[API/messages] Error:", error);
        return NextResponse.json({
            error: "Failed to fetch messages",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

// POST /api/messages - Send a message
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const body = await req.json();
        const { channelId, content, attachments } = body;

        if (!channelId || !content?.trim()) {
            return NextResponse.json({ error: "channelId and content are required" }, { status: 400 });
        }

        // Check if user is member of channel
        const membership = await prisma.channelMember.findUnique({
            where: {
                channelId_userId: { channelId, userId },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
        }

        const message = await prisma.message.create({
            data: {
                content: content.trim(),
                channelId,
                authorId: userId,
                attachments: attachments ?? undefined,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
                reactions: true,
            },
        });

        // Update channel's updatedAt
        await prisma.channel.update({
            where: { id: channelId },
            data: { updatedAt: new Date() },
        });

        // Trigger Pusher/Soketi event for real-time update (non-blocking)
        try {
            await pusherServer.trigger(`channel-${channelId}`, "new-message", message);
            await pusherServer.trigger(`presence-channel-${channelId}`, "new-message", message);
        } catch (pusherError) {
            // Log but don't fail the request if real-time push fails
            console.error("[API/messages] Pusher trigger failed:", pusherError);
        }

        return NextResponse.json(message);
    } catch (error) {
        console.error("[API/messages] Error:", error);
        return NextResponse.json({
            error: "Failed to send message",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
