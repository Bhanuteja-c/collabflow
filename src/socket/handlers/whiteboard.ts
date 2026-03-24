// src/socket/handlers/whiteboard.ts
import type { Server, Socket } from "socket.io";
import type { SocketData } from "../types";
import { makeRoomId, ROOM_PREFIX } from "../types";
import { prisma } from "../../lib/prisma";

export function registerWhiteboardHandlers(io: Server, socket: Socket<any, any, any, SocketData>) {
    // Shared debounce timer per whiteboard per socket to avoid overwhelming DB writes
    const saveTimers = new Map<string, NodeJS.Timeout>();

    socket.on("whiteboard:join", async (data: { whiteboardId: string }) => {
        const userId = socket.data.userId;
        
        // Validation query with workspace members sub-selection
        const wb = await prisma.whiteboard.findUnique({
             where: { id: data.whiteboardId },
             include: {
                 workspace: {
                     include: {
                         members: {
                             where: { userId },
                             select: { id: true }
                         }
                     }
                 }
             }
        });
        
        if (!wb) return socket.emit("error", { message: "Whiteboard not found", code: "NOT_FOUND" });
        
        const isAuthor = wb.createdById === userId;
        const isWorkspaceMember = wb.workspace?.members && wb.workspace.members.length > 0;
        
        if (!isAuthor && !isWorkspaceMember) {
            return socket.emit("error", { message: "Not authorized", code: "FORBIDDEN" });
        }

        const room = makeRoomId(ROOM_PREFIX.WHITEBOARD, data.whiteboardId);
        socket.join(room);
        
        socket.to(room).emit("whiteboard:user-joined", {
            socketId: socket.id,
            user: { id: socket.data.userId, name: socket.data.userName, image: socket.data.userImage }
        });
    });

    socket.on("whiteboard:leave", (data: { whiteboardId: string }) => {
        const room = makeRoomId(ROOM_PREFIX.WHITEBOARD, data.whiteboardId);
        socket.leave(room);
        socket.to(room).emit("whiteboard:user-left", { socketId: socket.id });
        
        const timeout = saveTimers.get(data.whiteboardId);
        if (timeout) clearTimeout(timeout);
    });

    // Handle incoming deltas from tldraw and persist occasionally
    socket.on("whiteboard:update", (data: { whiteboardId: string; update: any; fullSnapshot?: any }) => {
        const room = makeRoomId(ROOM_PREFIX.WHITEBOARD, data.whiteboardId);
        
        // Rapid broadcast to all peers for real-time fidelity
        socket.to(room).emit("whiteboard:update", data);

        // If a full snapshot was included, debounce DB writes by 3s
        if (data.fullSnapshot) {
            const existingTimeout = saveTimers.get(data.whiteboardId);
            if (existingTimeout) clearTimeout(existingTimeout);

            saveTimers.set(data.whiteboardId, setTimeout(async () => {
                try {
                    const bytes = Buffer.from(JSON.stringify(data.fullSnapshot), "utf-8");
                    await prisma.whiteboard.update({
                        where: { id: data.whiteboardId },
                        data: { yjsState: bytes }
                    });
                } catch (e) {
                    console.error("[Socket.io] Failed to persist whiteboard state", e);
                }
            }, 3000));
        }
    });

    // Handle cursor and presence movements independently from drawing data
    socket.on("whiteboard:awareness", (data: { whiteboardId: string; awareness: any }) => {
        const room = makeRoomId(ROOM_PREFIX.WHITEBOARD, data.whiteboardId);
        socket.to(room).emit("whiteboard:awareness", { socketId: socket.id, awareness: data.awareness });
    });
}
