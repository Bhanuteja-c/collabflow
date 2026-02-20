// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { emitToChannel } from "@/lib/socket";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

// GET /api/messages?channelId=xxx - Get messages for a channel
// GET /api/messages?channelId=xxx&parentId=yyy - Get replies to a message (thread)
export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);
        const { searchParams } = new URL(req.url);
        const channelId = searchParams.get("channelId");
        const parentId = searchParams.get("parentId");

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

        // Update lastReadAt to track unread messages (only for top-level views)
        if (!parentId) {
            await prisma.channelMember.update({
                where: { id: membership.id },
                data: { lastReadAt: new Date() },
            });
        }

        if (parentId) {
            // Fetch replies to a specific message (thread view)
            const replies = await prisma.message.findMany({
                where: { channelId, parentId },
                orderBy: { createdAt: "asc" },
                include: {
                    author: {
                        select: { id: true, name: true, image: true },
                    },
                    reactions: true,
                },
            });
            return NextResponse.json(replies);
        }

        // Fetch top-level messages only (no parentId)
        const messages = await prisma.message.findMany({
            where: { channelId, parentId: null },
            orderBy: { createdAt: "asc" },
            include: {
                author: {
                    select: { id: true, name: true, image: true },
                },
                reactions: true,
                // Include latest reply author for thread preview
                replies: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: {
                        author: {
                            select: { id: true, name: true, image: true },
                        },
                        createdAt: true,
                    },
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

// POST /api/messages - Send a message (or reply to one)
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = await ensureUser(session.user as any);

        // Rate limit check
        const rl = checkRateLimit(`msg:${userId}`, RATE_LIMITS.write);
        if (!rl.success) {
            return NextResponse.json(
                { error: "Too many messages. Please wait." },
                { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
            );
        }

        const body = await req.json();
        const { channelId, content, attachments, parentId, clientId } = body;

        if (!channelId || !content?.trim()) {
            return NextResponse.json({ error: "channelId and content are required" }, { status: 400 });
        }

        // Idempotency Check
        if (clientId) {
            const existingMessage = await prisma.message.findUnique({
                where: { clientId },
                include: {
                    author: { select: { id: true, name: true, image: true } },
                    reactions: true,
                }
            });
            if (existingMessage) {
                return NextResponse.json(existingMessage);
            }
        }

        // Check if user is member of channel
        let membership = await prisma.channelMember.findUnique({
             where: { channelId_userId: { channelId, userId } }
        });

        if (!membership) {
             // ... Auto-join logic ...
             const channel = await prisma.channel.findUnique({
                 where: { id: channelId },
                 include: { workspace: { select: { members: { where: { userId }, select: { id: true } } } } }
             });

             if (channel?.type === "public" && channel.workspace?.members.length) {
                 membership = await prisma.channelMember.create({
                     data: { channelId, userId, role: "member" },
                 });
             } else {
                 return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
             }
        }

        const message = await prisma.message.create({
            data: {
                content: content.trim(),
                channelId,
                authorId: userId,
                attachments: attachments ?? undefined,
                parentId: parentId || null,
                clientId: clientId || undefined,
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

        // If this is a reply, increment the parent's reply count
        if (parentId) {
            await prisma.message.update({
                where: { id: parentId },
                data: { replyCount: { increment: 1 } },
            });

            // Emit thread-reply event so thread viewers get the update
            emitToChannel(channelId, "thread-reply", {
                ...message,
                parentId,
            });

            // Also emit a reply-count-update so the main chat shows updated count
            const parent = await prisma.message.findUnique({
                where: { id: parentId },
                select: { replyCount: true },
            });
            emitToChannel(channelId, "reply-count-update", {
                messageId: parentId,
                replyCount: parent?.replyCount || 1,
                latestReply: {
                    author: message.author,
                    createdAt: message.createdAt,
                },
            });
        } else {
            // Emit normal new-message event for top-level messages
            emitToChannel(channelId, "new-message", message);
        }

        // Update channel's updatedAt
        await prisma.channel.update({
            where: { id: channelId },
            data: { updatedAt: new Date() },
        });

        return NextResponse.json(message);
    } catch (error) {
        console.error("[API/messages] Error:", error);
        return NextResponse.json({
            error: "Failed to send message",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
