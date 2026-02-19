// src/hooks/useKanbanSync.ts
// Real-time kanban board synchronization — uses shared socket from SocketProvider
// Previously created its own socket connection; now consumes SocketProvider's single connection
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSharedSocket } from "@/components/providers/SocketProvider";

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
    const { socket, connected } = useSharedSocket();
    const [viewers, setViewers] = useState<BoardViewer[]>([]);

    // Store callbacks in refs to avoid event re-registration on every render
    const callbacksRef = useRef({
        onCardMoved,
        onCardCreated,
        onCardUpdated,
        onCardDeleted,
        onCommentAdded,
        onCommentDeleted,
        onChecklistToggled,
    });

    // Keep refs up to date without triggering effect re-runs
    useEffect(() => {
        callbacksRef.current = {
            onCardMoved,
            onCardCreated,
            onCardUpdated,
            onCardDeleted,
            onCommentAdded,
            onCommentDeleted,
            onChecklistToggled,
        };
    });

    // Register board-related event listeners on the shared socket
    useEffect(() => {
        if (!socket || !boardId) return;

        // Presence events
        const handleViewers = (existingViewers: BoardViewer[]) => setViewers(existingViewers);
        const handleViewerJoined = (data: BoardViewer) => {
            setViewers(prev => [...prev.filter(v => v.socketId !== data.socketId), data]);
        };
        const handleViewerLeft = (data: { socketId: string }) => {
            setViewers(prev => prev.filter(v => v.socketId !== data.socketId));
        };

        // Card events — use refs to always call the latest callback
        const handleCardMoved = (data: { cardId: string; fromColumnId: string; toColumnId: string; newOrder: number }) => {
            callbacksRef.current.onCardMoved?.(data);
        };
        const handleCardCreated = (data: { columnId: string; card: Card }) => {
            callbacksRef.current.onCardCreated?.(data);
        };
        const handleCardUpdated = (data: { cardId: string; updates: Partial<Card> }) => {
            callbacksRef.current.onCardUpdated?.(data);
        };
        const handleCardDeleted = (data: { cardId: string }) => {
            callbacksRef.current.onCardDeleted?.(data);
        };
        const handleCommentAdded = (data: { cardId: string; comment: Comment }) => {
            callbacksRef.current.onCommentAdded?.(data);
        };
        const handleCommentDeleted = (data: { cardId: string; commentId: string }) => {
            callbacksRef.current.onCommentDeleted?.(data);
        };
        const handleChecklistToggled = (data: { cardId: string; itemId: string; completed: boolean }) => {
            callbacksRef.current.onChecklistToggled?.(data);
        };

        socket.on("board-viewers", handleViewers);
        socket.on("board-viewer-joined", handleViewerJoined);
        socket.on("board-viewer-left", handleViewerLeft);
        socket.on("card-moved", handleCardMoved);
        socket.on("card-created", handleCardCreated);
        socket.on("card-updated", handleCardUpdated);
        socket.on("card-deleted", handleCardDeleted);
        socket.on("card-comment-added", handleCommentAdded);
        socket.on("card-comment-deleted", handleCommentDeleted);
        socket.on("checklist-item-toggled", handleChecklistToggled);

        return () => {
            socket.off("board-viewers", handleViewers);
            socket.off("board-viewer-joined", handleViewerJoined);
            socket.off("board-viewer-left", handleViewerLeft);
            socket.off("card-moved", handleCardMoved);
            socket.off("card-created", handleCardCreated);
            socket.off("card-updated", handleCardUpdated);
            socket.off("card-deleted", handleCardDeleted);
            socket.off("card-comment-added", handleCommentAdded);
            socket.off("card-comment-deleted", handleCommentDeleted);
            socket.off("checklist-item-toggled", handleChecklistToggled);
        };
    }, [socket, boardId]);

    // Join/leave board when boardId changes or on reconnect
    useEffect(() => {
        if (!socket || !connected || !boardId) return;

        // Join with user info for presence
        if (currentUser) {
            socket.emit("join-board", { boardId, user: currentUser });
        } else {
            socket.emit("join-board", boardId);
        }

        return () => {
            socket.emit("leave-board", boardId);
            setViewers([]);
        };
    }, [socket, connected, boardId, currentUser]);

    // Rejoin board on reconnect
    useEffect(() => {
        if (!socket || !boardId) return;

        const handleReconnect = () => {
            if (currentUser) {
                socket.emit("join-board", { boardId, user: currentUser });
            } else {
                socket.emit("join-board", boardId);
            }
        };

        socket.on("reconnect", handleReconnect);
        return () => { socket.off("reconnect", handleReconnect); };
    }, [socket, boardId, currentUser]);

    // Emit helpers — all use the shared socket
    const emitCardMoved = useCallback((cardId: string, fromColumnId: string, toColumnId: string, newOrder: number) => {
        if (socket?.connected && boardId) {
            socket.emit("card-moved", { boardId, cardId, fromColumnId, toColumnId, newOrder });
        }
    }, [socket, boardId]);

    const emitCardCreated = useCallback((columnId: string, card: Card) => {
        if (socket?.connected && boardId) {
            socket.emit("card-created", { boardId, columnId, card });
        }
    }, [socket, boardId]);

    const emitCardUpdated = useCallback((cardId: string, updates: Partial<Card>) => {
        if (socket?.connected && boardId) {
            socket.emit("card-updated", { boardId, cardId, updates });
        }
    }, [socket, boardId]);

    const emitCardDeleted = useCallback((cardId: string) => {
        if (socket?.connected && boardId) {
            socket.emit("card-deleted", { boardId, cardId });
        }
    }, [socket, boardId]);

    const emitCommentAdded = useCallback((cardId: string, comment: Comment) => {
        if (socket?.connected && boardId) {
            socket.emit("card-comment-added", { boardId, cardId, comment });
        }
    }, [socket, boardId]);

    const emitCommentDeleted = useCallback((cardId: string, commentId: string) => {
        if (socket?.connected && boardId) {
            socket.emit("card-comment-deleted", { boardId, cardId, commentId });
        }
    }, [socket, boardId]);

    const emitChecklistToggled = useCallback((cardId: string, itemId: string, completed: boolean) => {
        if (socket?.connected && boardId) {
            socket.emit("checklist-item-toggled", { boardId, cardId, itemId, completed });
        }
    }, [socket, boardId]);

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
