// src/hooks/useDocumentSync.ts
// Production-ready Yjs provider using Socket.io for document collaboration
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import * as Y from "yjs";

interface RemoteUser {
    socketId: string;
    user: {
        id: string;
        name: string;
        color: string;
        image?: string;
    };
    cursor?: { from: number; to: number };
}

interface UseDocumentSyncOptions {
    documentId: string;
    userId: string;
    userName: string;
    userColor: string;
    userImage?: string;
    ydoc: Y.Doc;
}

// Debounce helper for cursor updates
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeoutId: NodeJS.Timeout | null = null;
    return ((...args: any[]) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), wait);
    }) as T;
}

export function useDocumentSync({
    documentId,
    userId,
    userName,
    userColor,
    userImage,
    ydoc,
}: UseDocumentSyncOptions) {
    const [connected, setConnected] = useState(false);
    const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
    const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const remoteUsersRef = useRef<Map<string, RemoteUser>>(new Map());
    const pendingUpdatesRef = useRef<Uint8Array[]>([]);
    const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!documentId || !ydoc) return;

        // Initialize socket with production settings
        const socket = io({
            path: "/api/socketio",
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("[DocumentSync] Connected:", socket.id);
            setConnected(true);
            setConnectionState('connected');

            // Join the document room
            socket.emit("join-document", {
                documentId,
                user: {
                    id: userId,
                    name: userName,
                    color: userColor,
                    image: userImage,
                },
            });

            // Flush any pending updates on reconnection
            if (pendingUpdatesRef.current.length > 0) {
                pendingUpdatesRef.current.forEach(update => {
                    socket.emit("doc-update", {
                        documentId,
                        update: Array.from(update),
                    });
                });
                pendingUpdatesRef.current = [];
            }
        });

        socket.on("disconnect", () => {
            console.log("[DocumentSync] Disconnected");
            setConnected(false);
            setConnectionState('disconnected');
        });

        socket.on("reconnect_attempt", () => {
            setConnectionState('reconnecting');
        });

        socket.on("reconnect", () => {
            console.log("[DocumentSync] Reconnected");
            setConnected(true);
            setConnectionState('connected');

            // Rejoin document room
            socket.emit("join-document", {
                documentId,
                user: { id: userId, name: userName, color: userColor, image: userImage },
            });
        });

        // Handle existing users
        socket.on("existing-doc-users", (users: RemoteUser[]) => {
            console.log("[DocumentSync] Existing users:", users.length);
            users.forEach((u) => {
                remoteUsersRef.current.set(u.socketId, u);
            });
            setRemoteUsers(Array.from(remoteUsersRef.current.values()));
        });

        // Handle new user joining
        socket.on("user-joined-doc", (data: { socketId: string; user: RemoteUser["user"] }) => {
            console.log("[DocumentSync] User joined:", data.user.name);
            remoteUsersRef.current.set(data.socketId, { socketId: data.socketId, user: data.user });
            setRemoteUsers(Array.from(remoteUsersRef.current.values()));
        });

        // Handle user leaving
        socket.on("user-left-doc", (data: { socketId: string }) => {
            remoteUsersRef.current.delete(data.socketId);
            setRemoteUsers(Array.from(remoteUsersRef.current.values()));
        });

        // Handle cursor updates with throttling
        socket.on("cursor-update", (data: { socketId: string; user: RemoteUser["user"]; cursor: { from: number; to: number } }) => {
            const existing = remoteUsersRef.current.get(data.socketId);
            if (existing) {
                existing.cursor = data.cursor;
                remoteUsersRef.current.set(data.socketId, existing);
                setRemoteUsers(Array.from(remoteUsersRef.current.values()));
            }
        });

        // Handle Yjs document updates from others
        socket.on("doc-update", (data: { update: number[] }) => {
            try {
                const update = new Uint8Array(data.update);
                Y.applyUpdate(ydoc, update, "remote");
            } catch (e) {
                console.error("[DocumentSync] Error applying update:", e);
            }
        });

        // Batch and send local Yjs updates for better performance
        const handleYjsUpdate = (update: Uint8Array, origin: any) => {
            if (origin === "remote") return;

            if (socket.connected) {
                // Send immediately for low latency
                socket.emit("doc-update", {
                    documentId,
                    update: Array.from(update),
                });
            } else {
                // Queue updates when disconnected
                pendingUpdatesRef.current.push(update);
            }
        };
        ydoc.on("update", handleYjsUpdate);

        return () => {
            socket.emit("leave-document", documentId);
            ydoc.off("update", handleYjsUpdate);
            socket.disconnect();
            socketRef.current = null;
            remoteUsersRef.current.clear();
            if (flushTimeoutRef.current) {
                clearTimeout(flushTimeoutRef.current);
            }
        };
    }, [documentId, userId, userName, userColor, userImage, ydoc]);

    // Debounced cursor position sender (50ms debounce for smooth updates)
    const sendCursorUpdate = useCallback(
        debounce((from: number, to: number) => {
            if (socketRef.current?.connected) {
                socketRef.current.emit("cursor-update", {
                    documentId,
                    cursor: { from, to },
                });
            }
        }, 50),
        [documentId]
    );

    return {
        connected,
        connectionState,
        remoteUsers,
        sendCursorUpdate,
    };
}
