// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensureUser";
import { emitToChannel, emitToUser, emitToWorkspace } from "@/lib/socket";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit";

// GET /api/messages?channelId=xxx - Get messages for a channel
// GET /api/messages?channelId=xxx&parentId=yyy - Get replies to a message (thread)
// GET /api/messages?channelId=xxx&pinned=true - Get only pinned messages for a channel
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
        let membership = await prisma.channelMember.findUnique({
            where: {
                channelId_userId: { channelId, userId },
            },
        });

        if (!membership) {
            // Auto-join public channels
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

        const pinnedOnly = searchParams.get("pinned") === "true";

        if (pinnedOnly) {
            // Fetch only pinned messages for this channel
            const pinned = await prisma.pinnedMessage.findMany({
                where: { message: { channelId } },
                orderBy: { pinnedAt: "asc" },
                include: {
                    message: {
                        include: {
                            author: { select: { id: true, name: true, image: true } },
                            reactions: true,
                        },
                    },
                },
            });
            const result = pinned.map((p: any) => ({
                ...p.message,
                isPinned: true,
                pinnedAt: p.pinnedAt,
                pinnedBy: p.pinnedBy,
            }));
            return NextResponse.json(result);
        }

        const cursor = searchParams.get("cursor");
        const takeSize = 50;

        // Fetch top-level messages only (no parentId)
        const messages = await prisma.message.findMany({
            where: {
                channelId,
                parentId: null,
                isDeleted: false,
                NOT: [
                    { content: { startsWith: "📋" } },
                    { content: { startsWith: "✅" } },
                    { content: { startsWith: "📊" } },
                    { content: { startsWith: "🔔" } },
                    { content: { startsWith: "──" } },
                    { content: { startsWith: "**" } },
                    { content: { startsWith: "👋" } },
                    { content: { startsWith: "🎥" } }
                ]
            },
            take: takeSize,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: [
                { createdAt: "desc" },
                { id: "desc" }
            ],
            include: {
                author: {
                    select: { id: true, name: true, image: true },
                },
                reactions: true,
                pinnedMessage: {
                    select: { id: true },
                },
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

        const nextCursor = messages.length === takeSize ? messages[messages.length - 1].id : null;

        // Map to expose isPinned as a boolean
        const result = messages.map(({ pinnedMessage, ...msg }: any) => ({
            ...msg,
            isPinned: !!pinnedMessage,
        }));

        // Callers expect `{ messages, nextCursor }` when nextCursor is implemented
        const responseData = cursor !== null || searchParams.has("cursor") || searchParams.has("take") 
            ? { messages: result, nextCursor } 
            : { messages: result, nextCursor }; // Always return the object form for paginated requests

        // Update this user's lastReadAt and notify other channel members (for read receipts / blue ticks)
        const readAt = new Date();
        await prisma.channelMember.updateMany({
            where: { channelId, userId },
            data: { lastReadAt: readAt },
        });
        emitToChannel(channelId, "messages-read", { userId, readAt: readAt.toISOString() });

        return NextResponse.json(responseData);
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

        if (!channelId || (!content?.trim() && !attachments?.length)) {
            return NextResponse.json({ error: "channelId and either content or attachments are required" }, { status: 400 });
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
                content: content?.trim() || "",
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

            // Emit lightweight workspace-level event for unread badge increments
            const channelInfo = await prisma.channel.findUnique({
                where: { id: channelId },
                select: { workspaceId: true },
            });
            if (channelInfo?.workspaceId) {
                emitToWorkspace(channelInfo.workspaceId, "channel-new-message", {
                    channelId,
                    authorId: userId,
                });
            }
        }

        // Update channel's updatedAt
        await prisma.channel.update({
            where: { id: channelId },
            data: { updatedAt: new Date() },
        });

        // Parse Mentions and Create Notifications
        const mentionRegex = /@(\w+)/g;
        const matches = [...content.matchAll(mentionRegex)].map((m) => m[1].toLowerCase());

        if (matches.length > 0) {
            const channelInfo = await prisma.channel.findUnique({
                where: { id: channelId },
                include: {
                    workspace: {
                        include: { members: { include: { user: true } } }
                    }
                }
            });

            if (channelInfo?.workspace) {
                const workspaceId = channelInfo.workspaceId;
                const workspaceMembers = channelInfo.workspace.members;
                const mentionedUserIds = new Set<string>();

                for (const match of matches) {
                    const member = workspaceMembers.find((m: any) => {
                        const nameParts = (m.user.name || "").toLowerCase().split(" ");
                        const fullNameNoSpaces = (m.user.name || "").toLowerCase().replace(/\s+/g, "");
                        return nameParts.includes(match) || fullNameNoSpaces === match;
                    });

                    if (member && member.user.id !== userId) {
                        mentionedUserIds.add(member.user.id);
                    }
                }

                for (const mentionedUserId of mentionedUserIds) {
                    const notification = await prisma.notification.create({
                        data: {
                            userId: mentionedUserId,
                            type: "mention",
                            title: "New Mention",
                            message: `${message.author.name || "Someone"} mentioned you in a message.`,
                            senderId: userId,
                            workspaceId: workspaceId,
                            link: `/workspace/${channelInfo.workspace.slug}/chat?channelId=${channelId}`
                        }
                    });

                    emitToUser(mentionedUserId, "notification", notification);
                }
            }
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
