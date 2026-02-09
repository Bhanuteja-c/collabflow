// src/hooks/useDocumentSync.ts
// Production-ready Yjs provider using Socket.io with native Awareness sync
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import * as Y from "yjs";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from "y-protocols/awareness";

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
}

export function useDocumentSync({
    documentId,
    userId,
    userName,
    userColor,
    userImage,
}: UseDocumentSyncOptions) {
    // Create stable ydoc and awareness (only on client, using state to trigger re-render)
    const [yjsState, setYjsState] = useState<{ ydoc: Y.Doc; awareness: Awareness } | null>(null);
    const initRef = useRef(false);

    // Initialize Yjs on client only
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;

        const ydoc = new Y.Doc();
        const awareness = new Awareness(ydoc);
        setYjsState({ ydoc, awareness });
    }, []);

    const ydoc = yjsState?.ydoc ?? null;
    const awareness = yjsState?.awareness ?? null;

    const [connected, setConnected] = useState(false);
    const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
    const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const pendingUpdatesRef = useRef<Uint8Array[]>([]);

    // Set local user state in awareness
    useEffect(() => {
        if (!awareness || !userId) return;

        awareness.setLocalStateField('user', {
            id: userId,
            name: userName,
            color: userColor,
            image: userImage,
        });

        return () => {
            awareness.setLocalStateField('user', null);
        };
    }, [awareness, userId, userName, userColor, userImage]);

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

            // Send full awareness state on connect
            if (awareness) {
                const awarenessUpdate = encodeAwarenessUpdate(awareness, [awareness.clientID]);
                socket.emit("awareness-update", {
                    documentId,
                    update: Array.from(awarenessUpdate),
                });
            }

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
            socket.emit("join-document", {
                documentId,
                user: { id: userId, name: userName, color: userColor, image: userImage },
            });
        });

        // Handle existing users
        socket.on("existing-doc-users", (users: RemoteUser[]) => {
            console.log("[DocumentSync] Existing users:", users.length);
            setRemoteUsers(users);
        });

        // Handle new user joining
        socket.on("user-joined-doc", (data: { socketId: string; user: RemoteUser["user"] }) => {
            console.log("[DocumentSync] User joined:", data.user.name);
            setRemoteUsers(prev => [...prev.filter(u => u.socketId !== data.socketId), { socketId: data.socketId, user: data.user }]);
        });

        // Handle user leaving
        socket.on("user-left-doc", (data: { socketId: string }) => {
            setRemoteUsers(prev => prev.filter(u => u.socketId !== data.socketId));
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

        // Handle awareness updates from others (native y-protocols)
        socket.on("awareness-update", (data: { update: number[] }) => {
            if (!awareness) return;
            try {
                const update = new Uint8Array(data.update);
                applyAwarenessUpdate(awareness, update, null);
            } catch (e) {
                console.error("[DocumentSync] Error applying awareness:", e);
            }
        });

        // Send local Yjs updates
        const handleYjsUpdate = (update: Uint8Array, origin: any) => {
            if (origin === "remote") return;

            if (socket.connected) {
                socket.emit("doc-update", {
                    documentId,
                    update: Array.from(update),
                });
            } else {
                pendingUpdatesRef.current.push(update);
            }
        };
        ydoc.on("update", handleYjsUpdate);

        // Send local awareness updates (native y-protocols)
        const handleAwarenessUpdate = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
            if (!awareness) return;
            const changedClients = added.concat(updated).concat(removed);
            if (changedClients.length === 0 || !socket.connected) return;

            const update = encodeAwarenessUpdate(awareness, changedClients);
            socket.emit("awareness-update", {
                documentId,
                update: Array.from(update),
            });
        };
        awareness?.on("update", handleAwarenessUpdate);

        return () => {
            socket.emit("leave-document", documentId);
            ydoc?.off("update", handleYjsUpdate);
            awareness?.off("update", handleAwarenessUpdate);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [documentId, userId, userName, userColor, userImage, ydoc, awareness]);

    // Get remote users from awareness
    const getAwarenessUsers = useCallback(() => {
        if (!awareness) return [];
        const states = awareness.getStates();
        const users: Array<{ clientId: number; user: any }> = [];
        states.forEach((state, clientId) => {
            if (clientId !== awareness.clientID && state?.user) {
                users.push({ clientId, user: state.user });
            }
        });
        return users;
    }, [awareness]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            awareness?.destroy();
            ydoc?.destroy();
        };
    }, [ydoc, awareness]);

    return {
        ydoc,
        awareness,
        connected,
        connectionState,
        remoteUsers,
        getAwarenessUsers,
        socket: socketRef.current,
    };
}
