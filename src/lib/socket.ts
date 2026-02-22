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

// Emit to a kanban board room
export const emitToBoard = (boardId: string, event: string, data: any) => {
    const io = getIO();
    if (io) {
        io.to(`board:${boardId}`).emit(event, data);
    }
};

// Emit to a document room
export const emitToDocument = (documentId: string, event: string, data: any) => {
    const io = getIO();
    if (io) {
        io.to(`doc:${documentId}`).emit(event, data);
    }
};

// Emit to a video room
export const emitToVideoRoom = (roomId: string, event: string, data: any) => {
    const io = getIO();
    if (io) {
        io.to(`video:${roomId}`).emit(event, data);
    }
};

// Emit to all connected clients
export const emitToAll = (event: string, data: any) => {
    const io = getIO();
    if (io) {
        io.emit(event, data);
    }
};

// Emit to a specific user's personal room
export const emitToUser = (userId: string, event: string, data: any) => {
    const io = getIO();
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};

// Emit to all connected clients in a workspace room
export const emitToWorkspace = (workspaceId: string, event: string, data: any) => {
    const io = getIO();
    if (io) {
        io.to(`workspace:${workspaceId}`).emit(event, data);
    }
};
