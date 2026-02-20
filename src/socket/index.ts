// src/socket/index.ts
// Wires all socket handlers, middleware, and disconnect cleanup to the io instance
import type { Server as SocketIOServer } from "socket.io";
import { socketAuthMiddleware } from "./middleware";
import { registerWorkspaceHandlers } from "./handlers/workspace";
import { registerChatHandlers } from "./handlers/chat";
import { registerDocumentHandlers } from "./handlers/document";
import { registerKanbanHandlers } from "./handlers/kanban";
import { registerVideoHandlers } from "./handlers/video";
import { handleDisconnect } from "./disconnect";

/**
 * Registers all Socket.IO middleware, event handlers, and disconnect cleanup.
 *
 * Architecture:
 * 1. Auth middleware runs FIRST on every new connection → verifies JWT → sets socket.data.userId
 * 2. If auth fails, connection is rejected (client receives "connect_error")
 * 3. Each handler module registers its events and validates room access via Prisma
 * 4. Disconnect handler iterates socket.rooms to clean up ALL rooms
 */
export function registerSocketHandlers(io: SocketIOServer) {
    // TASK 1: Authentication middleware — runs before any event handler
    io.use(socketAuthMiddleware as any);

    io.on("connection", (socket) => {
        console.log(`[Socket.io] Client connected: ${socket.id} (user: ${socket.data.userId})`);

        // Join a personal room for this user to receive direct global events (like notifications)
        socket.join(`user:${socket.data.userId}`);

        // Register all feature handlers
        registerWorkspaceHandlers(io, socket);
        registerChatHandlers(io, socket);
        registerDocumentHandlers(io, socket);
        registerKanbanHandlers(io, socket);
        registerVideoHandlers(io, socket);

        // TASK 4: Universal disconnect cleanup
        handleDisconnect(socket);
    });
}
