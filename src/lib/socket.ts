// src/lib/socket.ts
// Socket.io helper functions for API routes
import { Server as SocketIOServer } from "socket.io";

// Get the global io instance (initialized in server.ts)
export const getIO = (): SocketIOServer | null => {
    return global.io || null;
};

// Emit a message to a specific channel
export const emitToChannel = (channelId: string, event: string, data: any) => {
    const io = getIO();
    if (io) {
        io.to(`channel:${channelId}`).emit(event, data);
    }
};

// Emit to all connected clients
export const emitToAll = (event: string, data: any) => {
    const io = getIO();
    if (io) {
        io.emit(event, data);
    }
};
