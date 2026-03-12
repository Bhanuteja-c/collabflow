// src/socket/handlers/workspace.ts
// Workspace presence: join, leave, online user tracking
import type { Server, Socket } from "socket.io";
import type { SocketData } from "../types";
import { makeRoomId, ROOM_PREFIX } from "../types";
import { prisma } from "../../lib/prisma";

export function registerWorkspaceHandlers(io: Server, socket: Socket<any, any, any, SocketData>) {
    socket.on("join-workspace", async (data: { workspaceId: string; user: { id: string; name: string; image?: string } }) => {
        // SECURITY: Validate workspace membership using verified userId from JWT
        const userId = socket.data.userId;

        const member = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: data.workspaceId, userId } },
        });

        if (!member) {
            socket.emit("error", { message: "Not a workspace member", code: "FORBIDDEN" });
            return;
        }

        const room = makeRoomId(ROOM_PREFIX.WORKSPACE, data.workspaceId);
        socket.join(room);

        // Notify others
        socket.to(room).emit("workspace-user-joined", {
            socketId: socket.id,
            user: data.user,
        });

        // Send existing online users to joiner
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
            socket.emit("workspace-presence", { users: onlineUsers });
        }
    });

    socket.on("leave-workspace", (workspaceId: string) => {
        const room = makeRoomId(ROOM_PREFIX.WORKSPACE, workspaceId);
        socket.leave(room);
        socket.to(room).emit("workspace-user-left", { socketId: socket.id });
    });

    // Epics Real-Time Sync
    socket.on("epic-created", (data: { workspaceId: string; epic: any }) => {
        const room = makeRoomId(ROOM_PREFIX.WORKSPACE, data.workspaceId);
        socket.to(room).emit("epic-created", data);
    });

    socket.on("epic-updated", (data: { workspaceId: string; epic: any }) => {
        const room = makeRoomId(ROOM_PREFIX.WORKSPACE, data.workspaceId);
        socket.to(room).emit("epic-updated", data);
    });

    socket.on("epic-deleted", (data: { workspaceId: string; epicId: string }) => {
        const room = makeRoomId(ROOM_PREFIX.WORKSPACE, data.workspaceId);
        socket.to(room).emit("epic-deleted", data);
    });

    // Dependencies Real-Time Sync
    socket.on("card-dependency-updated", (data: { workspaceId: string; cardId: string; dependencyCount: number; isBlocked: boolean; targetCardId: string; targetDependencyCount: number; targetIsBlocked: boolean }) => {
        const room = makeRoomId(ROOM_PREFIX.WORKSPACE, data.workspaceId);
        socket.to(room).emit("card-dependency-updated", data);
    });
}
