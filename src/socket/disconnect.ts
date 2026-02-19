// src/socket/disconnect.ts
// Universal disconnect handler — iterates socket.rooms to clean up ALL rooms
// Fixes ghost presence by not relying on per-category stored state
import type { Socket } from "socket.io";
import type { SocketData } from "./types";
import { parseRoomId, ROOM_PREFIX } from "./types";

export function handleDisconnect(socket: Socket<any, any, any, SocketData>) {
    socket.on("disconnect", () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id} (user: ${socket.data.userId})`);

        // Socket.IO automatically removes socket from all rooms on disconnect.
        // We iterate every room and emit the correct "left" event based on prefix.
        // This fixes the ghost presence bug where only one room per category was cleaned up.
        for (const room of socket.rooms) {
            // Skip the default self-room (socket.id)
            if (room === socket.id) continue;

            const parsed = parseRoomId(room);
            if (!parsed) continue;

            switch (parsed.prefix) {
                case ROOM_PREFIX.WORKSPACE:
                    socket.to(room).emit("workspace-user-left", { socketId: socket.id });
                    break;
                case ROOM_PREFIX.CHANNEL:
                    socket.to(room).emit("channel-user-left", { socketId: socket.id });
                    break;
                case ROOM_PREFIX.DOCUMENT:
                    socket.to(room).emit("user-left-doc", { socketId: socket.id });
                    break;
                case ROOM_PREFIX.BOARD:
                    socket.to(room).emit("board-viewer-left", { socketId: socket.id });
                    break;
                case ROOM_PREFIX.VIDEO:
                    socket.to(room).emit("user-left-room", { socketId: socket.id });
                    break;
            }
        }
    });
}
