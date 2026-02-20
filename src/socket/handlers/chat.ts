// src/socket/handlers/chat.ts
// Chat channel events: join, leave, typing, stop-typing
import type { Server, Socket } from "socket.io";
import type { SocketData } from "../types";
import { makeRoomId, ROOM_PREFIX } from "../types";
import { prisma } from "../../lib/prisma";
import { redis } from "../../lib/redis";

export function registerChatHandlers(io: Server, socket: Socket<any, any, any, SocketData>) {
    socket.on("join-channel", async (data: string | { channelId: string }) => {
        const channelId = typeof data === "string" ? data : data.channelId;
        const userId = socket.data.userId;

        // ... (Membership checks omitted for brevity in diff, but should remain) ...
        // For now, assuming auth passed or reusing existing checks if I don't overwrite them.
        // Wait, replace_file_content replaces the whole block. I need to keep the checks.
        
        // RE-IMPLEMENTING CHECKS:
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            select: {
                 workspaceId: true,
                 members: { where: { userId }, select: { id: true } },
                 workspace: { select: { members: { where: { userId }, select: { id: true } } } }
            }
        });

        if (!channel) {
             socket.emit("error", { message: "Channel not found", code: "NOT_FOUND" });
             return;
        }
        
        const isMember = channel.members.length > 0 || (channel.workspace?.members?.length ?? 0) > 0;
        if (!isMember) {
             socket.emit("error", { message: "Not authorized", code: "FORBIDDEN" });
             return;
        }

        const room = makeRoomId(ROOM_PREFIX.CHANNEL, channelId);
        socket.join(room);

        // Redis: Increment active count
        const metaKey = `channel:meta:${channelId}`;
        await redis.hincrby(metaKey, "active_count", 1);
        
        // Presence: Mark user as online in this channel context
        const presenceKey = `presence:${userId}`;
        await redis.set(presenceKey, JSON.stringify({ status: "online", channelId, timestamp: Date.now() }), "EX", 60);

        // Notify others
        socket.to(room).emit("channel-user-joined", { 
            socketId: socket.id, 
            user: { id: userId, name: socket.data.userName, image: socket.data.userImage } 
        });

        // Send active count
        const count = await redis.hget(metaKey, "active_count");
        socket.emit("channel-meta", { activeCount: parseInt(count || "1") });
    });

    socket.on("leave-channel", async (channelId: string) => {
        const room = makeRoomId(ROOM_PREFIX.CHANNEL, channelId);
        socket.leave(room);
        
        const metaKey = `channel:meta:${channelId}`;
        await redis.hincrby(metaKey, "active_count", -1);
        
        socket.to(room).emit("channel-user-left", { socketId: socket.id });
    });

    socket.on("typing", async (data: { channelId: string }) => {
        const room = makeRoomId(ROOM_PREFIX.CHANNEL, data.channelId);
        const typingKey = `typing:channel:${data.channelId}`;
        
        // Redis: Store typing timestamp
        await redis.hset(typingKey, socket.data.userId, Date.now());
        // Expire key after 5s (handled by valid-check or separate cleanup, strictly Redis EX is on key, not field. 
        // We can set EX on the HASH every time, but fields need manual pruning or just let UI handle debounce.)
        await redis.expire(typingKey, 5);

        socket.to(room).emit("user-typing", {
            userId: socket.data.userId,
            name: socket.data.userName,
        });
    });

    socket.on("stop-typing", async (data: { channelId: string }) => {
        const room = makeRoomId(ROOM_PREFIX.CHANNEL, data.channelId);
        const typingKey = `typing:channel:${data.channelId}`;
        
        await redis.hdel(typingKey, socket.data.userId); // Remove user
        
        socket.to(room).emit("user-stop-typing", {
            userId: socket.data.userId,
        });
    });

    socket.on("message:send", async (data: { channelId: string; content: string; clientId: string; parentId?: string; attachments?: any }, callback: (response: any) => void) => {
        try {
            const { channelId, content, clientId, parentId, attachments } = data;
            const userId = socket.data.userId;

            if (!channelId || !content?.trim()) {
                if (callback) callback({ error: "Invalid data" });
                return;
            }

            // 1. Idempotency Check
            if (clientId) {
                const existing = await prisma.message.findUnique({
                    where: { clientId },
                    include: { author: { select: { id: true, name: true, image: true } }, reactions: true }
                });
                if (existing) {
                    if (callback) callback({ success: true, message: existing });
                    return;
                }
            }

            // 2. Authorization
            const membership = await prisma.channelMember.findUnique({
                 where: { channelId_userId: { channelId, userId } }
            });

            if (!membership) {
                 if (callback) callback({ error: "Forbidden" });
                 return;
            }

            // 3. Create Message
            const message = await prisma.message.create({
                data: {
                    content: content.trim(),
                    channelId,
                    authorId: userId,
                    clientId: clientId || undefined,
                    parentId: parentId || null,
                    attachments: attachments || undefined
                },
                include: {
                    author: { select: { id: true, name: true, image: true } },
                    reactions: true
                }
            });

            // 4. Update Reply Count (if reply)
            if (parentId) {
                await prisma.message.update({
                    where: { id: parentId },
                    data: { replyCount: { increment: 1 } }
                });
                
                socket.to(makeRoomId(ROOM_PREFIX.CHANNEL, channelId)).emit("thread-reply", { ...message, parentId });
                
                const parent = await prisma.message.findUnique({ where: { id: parentId }, select: { replyCount: true } });
                socket.to(makeRoomId(ROOM_PREFIX.CHANNEL, channelId)).emit("reply-count-update", {
                    messageId: parentId,
                    replyCount: parent?.replyCount || 1,
                    latestReply: { author: message.author, createdAt: message.createdAt }
                });
            } else {
                socket.to(makeRoomId(ROOM_PREFIX.CHANNEL, channelId)).emit("new-message", message);
            }

            // 5. Update Unread (Backend Only)
            await prisma.channel.update({ where: { id: channelId }, data: { updatedAt: new Date() } });

            // 6. Parse Mentions and Create Notifications
            const mentionRegex = /@(\w+)/g;
            const matches = [...content.matchAll(mentionRegex)].map(m => m[1].toLowerCase());

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
                        const member = workspaceMembers.find(m => {
                            const nameParts = (m.user.name || "").toLowerCase().split(" ");
                            const fullNameNoSpaces = (m.user.name || "").toLowerCase().replace(/\s+/g, '');
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
                                message: `${message.author.name || 'Someone'} mentioned you in a message.`,
                                senderId: userId,
                                workspaceId: workspaceId,
                                link: `/workspace/${channelInfo.workspace.slug}/chat?channelId=${channelId}`
                            }
                        });

                        socket.to(`user:${mentionedUserId}`).emit("notification", notification);
                    }
                }
            }

            // 7. Ack
            if (callback) callback({ success: true, message });

        } catch (error) {
            console.error("Socket message:send error", error);
            if (callback) callback({ error: "Internal Error" });
        }
    });

    socket.on("heartbeat", async (data: { status?: string }) => {
        const presenceKey = `presence:${socket.data.userId}`;
        await redis.set(presenceKey, JSON.stringify({ 
            status: data.status || "online", 
            lastActive: Date.now() 
        }), "EX", 60);
    });
}
