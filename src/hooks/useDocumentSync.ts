// src/hooks/useDocumentSync.ts
// Production-ready Yjs provider — uses shared socket from SocketProvider
// Also integrates Task 5: receives persisted Yjs state on join for late-joiner support
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import * as Y from "yjs";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from "y-protocols/awareness";
import { useSharedSocket } from "@/components/providers/SocketProvider";

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

    const { socket, connected, connectionState } = useSharedSocket();
    const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
    const pendingUpdatesRef = useRef<Uint8Array[]>([]);
    const joinedRef = useRef(false);

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

    // Register document-specific event listeners on the shared socket
    useEffect(() => {
        if (!socket || !documentId || !ydoc) return;

        // Handle existing users
        const handleExistingUsers = (users: RemoteUser[]) => {
            setRemoteUsers(users);
        };

        // Handle new user joining
        const handleUserJoined = (data: { socketId: string; user: RemoteUser["user"] }) => {
            setRemoteUsers(prev => [...prev.filter(u => u.socketId !== data.socketId), { socketId: data.socketId, user: data.user }]);
        };

        // Handle user leaving
        const handleUserLeft = (data: { socketId: string }) => {
            setRemoteUsers(prev => prev.filter(u => u.socketId !== data.socketId));
        };

        // TASK 5: Handle persisted Yjs state from server (for late joiners)
        const handleInitialState = (data: { state: number[] }) => {
            try {
                const state = new Uint8Array(data.state);
                Y.applyUpdate(ydoc, state, "remote");
                console.log("[DocumentSync] Applied persisted document state");
            } catch (e) {
                console.error("[DocumentSync] Error applying initial state:", e);
            }
        };

        // Handle Yjs document updates from others
        const handleDocUpdate = (data: { update: number[] }) => {
            try {
                const update = new Uint8Array(data.update);
                Y.applyUpdate(ydoc, update, "remote");
            } catch (e) {
                console.error("[DocumentSync] Error applying update:", e);
            }
        };

        // Handle awareness updates from others (native y-protocols)
        const handleAwarenessUpdate = (data: { update: number[] }) => {
            if (!awareness) return;
            try {
                const update = new Uint8Array(data.update);
                applyAwarenessUpdate(awareness, update, null);
            } catch (e) {
                console.error("[DocumentSync] Error applying awareness:", e);
            }
        };

        socket.on("existing-doc-users", handleExistingUsers);
        socket.on("user-joined-doc", handleUserJoined);
        socket.on("user-left-doc", handleUserLeft);
        socket.on("doc-initial-state", handleInitialState);
        socket.on("doc-update", handleDocUpdate);
        socket.on("awareness-update", handleAwarenessUpdate);

        // Send local Yjs updates via shared socket
        const handleLocalYjsUpdate = (update: Uint8Array, origin: any) => {
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
        ydoc.on("update", handleLocalYjsUpdate);

        // Send local awareness updates (native y-protocols)
        const handleLocalAwareness = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
            if (!awareness) return;
            const changedClients = added.concat(updated).concat(removed);
            if (changedClients.length === 0 || !socket.connected) return;

            const update = encodeAwarenessUpdate(awareness, changedClients);
            socket.emit("awareness-update", {
                documentId,
                update: Array.from(update),
            });
        };
        awareness?.on("update", handleLocalAwareness);

        return () => {
            socket.off("existing-doc-users", handleExistingUsers);
            socket.off("user-joined-doc", handleUserJoined);
            socket.off("user-left-doc", handleUserLeft);
            socket.off("doc-initial-state", handleInitialState);
            socket.off("doc-update", handleDocUpdate);
            socket.off("awareness-update", handleAwarenessUpdate);
            ydoc.off("update", handleLocalYjsUpdate);
            awareness?.off("update", handleLocalAwareness);
        };
    }, [socket, documentId, ydoc, awareness]);

    // Join/leave document room
    useEffect(() => {
        if (!socket || !connected || !documentId || !ydoc) return;

        const userInfo = { id: userId, name: userName, color: userColor, image: userImage };

        socket.emit("join-document", { documentId, user: userInfo });
        joinedRef.current = true;

        // Send full awareness state on join
        if (awareness) {
            const awarenessUpdate = encodeAwarenessUpdate(awareness, [awareness.clientID]);
            socket.emit("awareness-update", {
                documentId,
                update: Array.from(awarenessUpdate),
            });
        }

        // Flush any pending updates
        if (pendingUpdatesRef.current.length > 0) {
            pendingUpdatesRef.current.forEach(update => {
                socket.emit("doc-update", {
                    documentId,
                    update: Array.from(update),
                });
            });
            pendingUpdatesRef.current = [];
        }

        return () => {
            socket.emit("leave-document", documentId);
            joinedRef.current = false;
        };
    }, [socket, connected, documentId, userId, userName, userColor, userImage, ydoc, awareness]);

    // Rejoin document on reconnect
    useEffect(() => {
        if (!socket || !documentId) return;

        const handleReconnect = () => {
            socket.emit("join-document", {
                documentId,
                user: { id: userId, name: userName, color: userColor, image: userImage },
            });
        };

        socket.on("reconnect", handleReconnect);
        return () => { socket.off("reconnect", handleReconnect); };
    }, [socket, documentId, userId, userName, userColor, userImage]);

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
        socket,
    };
}
