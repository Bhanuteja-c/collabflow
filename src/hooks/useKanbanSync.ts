// src/hooks/useKanbanSync.ts
// Real-time kanban board synchronization using Socket.io
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface User {
    id: string;
    name: string;
    image?: string;
}

interface BoardViewer {
    socketId: string;
    user: User;
}

interface Comment {
    id: string;
    content: string;
    authorId: string;
    author: User;
    createdAt: string;
}

interface Card {
    id: string;
    title: string;
    description?: string;
    order: number;
}

interface UseKanbanSyncOptions {
    boardId: string | null;
    currentUser?: User;
    onCardMoved?: (data: { cardId: string; fromColumnId: string; toColumnId: string; newOrder: number }) => void;
    onCardCreated?: (data: { columnId: string; card: Card }) => void;
    onCardUpdated?: (data: { cardId: string; updates: Partial<Card> }) => void;
    onCardDeleted?: (data: { cardId: string }) => void;
    onCommentAdded?: (data: { cardId: string; comment: Comment }) => void;
    onCommentDeleted?: (data: { cardId: string; commentId: string }) => void;
    onChecklistToggled?: (data: { cardId: string; itemId: string; completed: boolean }) => void;
}

interface UseKanbanSyncReturn {
    connected: boolean;
    viewers: BoardViewer[];
    emitCardMoved: (cardId: string, fromColumnId: string, toColumnId: string, newOrder: number) => void;
    emitCardCreated: (columnId: string, card: Card) => void;
    emitCardUpdated: (cardId: string, updates: Partial<Card>) => void;
    emitCardDeleted: (cardId: string) => void;
    emitCommentAdded: (cardId: string, comment: Comment) => void;
    emitCommentDeleted: (cardId: string, commentId: string) => void;
    emitChecklistToggled: (cardId: string, itemId: string, completed: boolean) => void;
}

export function useKanbanSync({
    boardId,
    currentUser,
    onCardMoved,
    onCardCreated,
    onCardUpdated,
    onCardDeleted,
    onCommentAdded,
    onCommentDeleted,
    onChecklistToggled,
}: UseKanbanSyncOptions): UseKanbanSyncReturn {
    const [connected, setConnected] = useState(false);
    const [viewers, setViewers] = useState<BoardViewer[]>([]);
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

            // Join with user info for presence
            if (currentUser) {
                socket.emit("join-board", { boardId, user: currentUser });
            } else {
                socket.emit("join-board", boardId);
            }
        });

        socket.on("disconnect", () => {
            console.log("[KanbanSync] Disconnected");
            setConnected(false);
            setViewers([]);
        });

        socket.on("reconnect", () => {
            console.log("[KanbanSync] Reconnected");
            if (currentUser) {
                socket.emit("join-board", { boardId, user: currentUser });
            } else {
                socket.emit("join-board", boardId);
            }
        });

        // Presence events
        socket.on("board-viewers", (existingViewers: BoardViewer[]) => {
            console.log("[KanbanSync] Existing viewers:", existingViewers);
            setViewers(existingViewers);
        });

        socket.on("board-viewer-joined", (data: BoardViewer) => {
            console.log("[KanbanSync] Viewer joined:", data.user.name);
            setViewers(prev => [...prev.filter(v => v.socketId !== data.socketId), data]);
        });

        socket.on("board-viewer-left", (data: { socketId: string }) => {
            console.log("[KanbanSync] Viewer left:", data.socketId);
            setViewers(prev => prev.filter(v => v.socketId !== data.socketId));
        });

        // Card events
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

        // Comment events
        socket.on("card-comment-added", (data: { cardId: string; comment: Comment }) => {
            console.log("[KanbanSync] Comment added:", data);
            onCommentAdded?.(data);
        });

        socket.on("card-comment-deleted", (data: { cardId: string; commentId: string }) => {
            console.log("[KanbanSync] Comment deleted:", data);
            onCommentDeleted?.(data);
        });

        // Checklist events
        socket.on("checklist-item-toggled", (data: { cardId: string; itemId: string; completed: boolean }) => {
            console.log("[KanbanSync] Checklist toggled:", data);
            onChecklistToggled?.(data);
        });

        return () => {
            socket.emit("leave-board", boardId);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [boardId, currentUser, onCardMoved, onCardCreated, onCardUpdated, onCardDeleted, onCommentAdded, onCommentDeleted, onChecklistToggled]);

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

    // Emit comment added event
    const emitCommentAdded = useCallback((cardId: string, comment: Comment) => {
        if (socketRef.current?.connected && boardId) {
            socketRef.current.emit("card-comment-added", {
                boardId,
                cardId,
                comment,
            });
        }
    }, [boardId]);

    // Emit comment deleted event
    const emitCommentDeleted = useCallback((cardId: string, commentId: string) => {
        if (socketRef.current?.connected && boardId) {
            socketRef.current.emit("card-comment-deleted", {
                boardId,
                cardId,
                commentId,
            });
        }
    }, [boardId]);

    // Emit checklist item toggled event
    const emitChecklistToggled = useCallback((cardId: string, itemId: string, completed: boolean) => {
        if (socketRef.current?.connected && boardId) {
            socketRef.current.emit("checklist-item-toggled", {
                boardId,
                cardId,
                itemId,
                completed,
            });
        }
    }, [boardId]);

    return {
        connected,
        viewers,
        emitCardMoved,
        emitCardCreated,
        emitCardUpdated,
        emitCardDeleted,
        emitCommentAdded,
        emitCommentDeleted,
        emitChecklistToggled,
    };
}
