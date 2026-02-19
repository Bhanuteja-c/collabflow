// src/socket/handlers/chat.ts
// Chat channel events: join, leave, typing, stop-typing
import type { Server, Socket } from "socket.io";
import type { SocketData } from "../types";
import { makeRoomId, ROOM_PREFIX } from "../types";
import { prisma } from "../../lib/prisma";

export function registerChatHandlers(io: Server, socket: Socket<any, any, any, SocketData>) {
    socket.on("join-channel", async (data: string | { channelId: string; user?: { id: string; name: string; image?: string } }) => {
        const channelId = typeof data === "string" ? data : data.channelId;
        const user = typeof data === "object" ? data.user : undefined;
        const userId = socket.data.userId;

        // SECURITY: Validate channel access via workspace membership
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            select: {
                workspaceId: true,
                members: { where: { userId }, select: { id: true } },
                workspace: {
                    select: { members: { where: { userId }, select: { id: true } } },
                },
            },
        });

        if (!channel) {
            socket.emit("error", { message: "Channel not found", code: "NOT_FOUND" });
            return;
        }

        const isChannelMember = channel.members.length > 0;
        const isWorkspaceMember = (channel.workspace?.members?.length ?? 0) > 0;

        if (!isChannelMember && !isWorkspaceMember) {
            socket.emit("error", { message: "Not authorized for this channel", code: "FORBIDDEN" });
            return;
        }

        const room = makeRoomId(ROOM_PREFIX.CHANNEL, channelId);
        socket.join(room);

        // If user info provided, notify others and send existing online users
        if (user) {
            socket.to(room).emit("channel-user-joined", { socketId: socket.id, user });

            const roomSockets = io.sockets.adapter.rooms.get(room);
            if (roomSockets) {
                const onlineUsers: any[] = [];
                for (const socketId of roomSockets) {
                    if (socketId === socket.id) continue;
                    const s = io.sockets.sockets.get(socketId);
                    if (s) {
                        onlineUsers.push({
                            socketId,
                            user: { id: s.data.userId, name: s.data.userName, image: s.data.userImage },
                        });
                    }
                }
                socket.emit("channel-presence", { users: onlineUsers });
            }
        }
    });

    socket.on("leave-channel", (channelId: string) => {
        const room = makeRoomId(ROOM_PREFIX.CHANNEL, channelId);
        socket.leave(room);
        socket.to(room).emit("channel-user-left", { socketId: socket.id });
    });

    socket.on("typing", (data: { channelId: string; userId: string; name: string }) => {
        // Use verified userId, not client-sent
        socket.to(makeRoomId(ROOM_PREFIX.CHANNEL, data.channelId)).emit("user-typing", {
            userId: socket.data.userId,
            name: socket.data.userName,
        });
    });

    socket.on("stop-typing", (data: { channelId: string; userId: string }) => {
        socket.to(makeRoomId(ROOM_PREFIX.CHANNEL, data.channelId)).emit("user-stop-typing", {
            userId: socket.data.userId,
        });
    });
}
