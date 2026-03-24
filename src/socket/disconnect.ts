// src/socket/disconnect.ts
// Universal disconnect handler — iterates socket.rooms to clean up ALL rooms
// Fixes ghost presence by not relying on per-category stored state
import type { Socket } from "socket.io";
import type { SocketData } from "./types";
import { parseRoomId, ROOM_PREFIX } from "./types";
// Import redis to clean up global presence keys across horizontally scaled nodes
import { redis, isRedisAvailable } from "../lib/redis";

export function handleDisconnect(socket: Socket<any, any, any, SocketData>) {
    socket.on("disconnect", async () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id} (user: ${socket.data.userId})`);

        // Socket.IO automatically removes socket from all rooms on disconnect.
        // We iterate every room and emit the correct "left" event based on prefix.
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
                    
                    // Decrement Redis active count for channel to keep multi-instance counts accurate
                    if (isRedisAvailable()) {
                        await redis!.hincrby(`channel:meta:${parsed.id}`, "active_count", -1);
                    }
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

        // Clean up global user presence from Redis so they immediately show as offline
        // across all horizontal instances, instead of waiting 60s for TTL expiration
        const presenceKey = `presence:${socket.data.userId}`;
        if (isRedisAvailable()) {
            await redis!.del(presenceKey);
        }
    });
}
