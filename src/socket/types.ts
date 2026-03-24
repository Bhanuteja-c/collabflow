// src/socket/types.ts
// Typed Socket.IO interfaces — eliminates all (socket as any) casts

export interface SocketData {
    userId: string;
    userName: string;
    userImage?: string;
}

// Room prefix constants
export const ROOM_PREFIX = {
    WORKSPACE: "workspace",
    CHANNEL: "channel",
    DOCUMENT: "doc",
    BOARD: "board",
    VIDEO: "video",
    WHITEBOARD: "whiteboard",
} as const;

export type RoomPrefix = (typeof ROOM_PREFIX)[keyof typeof ROOM_PREFIX];

// Helper to build room IDs
export function makeRoomId(prefix: RoomPrefix, id: string): string {
    return `${prefix}:${id}`;
}

// Helper to parse a room ID into prefix + entity ID
export function parseRoomId(room: string): { prefix: string; id: string } | null {
    const colonIndex = room.indexOf(":");
    if (colonIndex === -1) return null;
    return {
        prefix: room.substring(0, colonIndex),
        id: room.substring(colonIndex + 1),
    };
}
