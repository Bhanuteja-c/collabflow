// src/hooks/useKanbanSync.ts
// Real-time kanban board synchronization using Socket.io
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface Card {
    id: string;
    title: string;
    description?: string;
    order: number;
}

interface Column {
    id: string;
    title: string;
    order: number;
    cards: Card[];
}

interface Board {
    id: string;
    title: string;
    columns: Column[];
}

interface UseKanbanSyncOptions {
    boardId: string | null;
    onCardMoved?: (data: { cardId: string; fromColumnId: string; toColumnId: string; newOrder: number }) => void;
    onCardCreated?: (data: { columnId: string; card: Card }) => void;
    onCardUpdated?: (data: { cardId: string; updates: Partial<Card> }) => void;
    onCardDeleted?: (data: { cardId: string }) => void;
}

interface UseKanbanSyncReturn {
    connected: boolean;
    emitCardMoved: (cardId: string, fromColumnId: string, toColumnId: string, newOrder: number) => void;
    emitCardCreated: (columnId: string, card: Card) => void;
    emitCardUpdated: (cardId: string, updates: Partial<Card>) => void;
    emitCardDeleted: (cardId: string) => void;
}

export function useKanbanSync({
    boardId,
    onCardMoved,
    onCardCreated,
    onCardUpdated,
    onCardDeleted,
}: UseKanbanSyncOptions): UseKanbanSyncReturn {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!boardId) return;

        // Initialize socket connection
        const socket = io({
            path: "/api/socketio",
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("[KanbanSync] Connected:", socket.id);
            setConnected(true);
            socket.emit("join-board", boardId);
        });

        socket.on("disconnect", () => {
            console.log("[KanbanSync] Disconnected");
            setConnected(false);
        });

        socket.on("reconnect", () => {
            console.log("[KanbanSync] Reconnected");
            socket.emit("join-board", boardId);
        });

        // Listen for real-time updates from other users
        socket.on("card-moved", (data: { cardId: string; fromColumnId: string; toColumnId: string; newOrder: number }) => {
            console.log("[KanbanSync] Card moved:", data);
            onCardMoved?.(data);
        });

        socket.on("card-created", (data: { columnId: string; card: Card }) => {
            console.log("[KanbanSync] Card created:", data);
            onCardCreated?.(data);
        });

        socket.on("card-updated", (data: { cardId: string; updates: Partial<Card> }) => {
            console.log("[KanbanSync] Card updated:", data);
            onCardUpdated?.(data);
        });

        socket.on("card-deleted", (data: { cardId: string }) => {
            console.log("[KanbanSync] Card deleted:", data);
            onCardDeleted?.(data);
        });

        return () => {
            socket.emit("leave-board", boardId);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [boardId, onCardMoved, onCardCreated, onCardUpdated, onCardDeleted]);

    // Emit card moved event
    const emitCardMoved = useCallback((cardId: string, fromColumnId: string, toColumnId: string, newOrder: number) => {
        if (socketRef.current?.connected && boardId) {
            socketRef.current.emit("card-moved", {
                boardId,
                cardId,
                fromColumnId,
                toColumnId,
                newOrder,
            });
        }
    }, [boardId]);

    // Emit card created event
    const emitCardCreated = useCallback((columnId: string, card: Card) => {
        if (socketRef.current?.connected && boardId) {
            socketRef.current.emit("card-created", {
                boardId,
                columnId,
                card,
            });
        }
    }, [boardId]);

    // Emit card updated event
    const emitCardUpdated = useCallback((cardId: string, updates: Partial<Card>) => {
        if (socketRef.current?.connected && boardId) {
            socketRef.current.emit("card-updated", {
                boardId,
                cardId,
                updates,
            });
        }
    }, [boardId]);

    // Emit card deleted event
    const emitCardDeleted = useCallback((cardId: string) => {
        if (socketRef.current?.connected && boardId) {
            socketRef.current.emit("card-deleted", {
                boardId,
                cardId,
            });
        }
    }, [boardId]);

    return {
        connected,
        emitCardMoved,
        emitCardCreated,
        emitCardUpdated,
        emitCardDeleted,
    };
}
