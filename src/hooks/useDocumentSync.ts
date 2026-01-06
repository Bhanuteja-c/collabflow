// src/hooks/useDocumentSync.ts
// Custom Yjs provider using Socket.io for document collaboration
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

export function useDocumentSync({
    documentId,
    userId,
    userName,
    userColor,
    userImage,
    ydoc,
}: UseDocumentSyncOptions) {
    const [connected, setConnected] = useState(false);
    const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const remoteUsersRef = useRef<Map<string, RemoteUser>>(new Map());

    useEffect(() => {
        if (!documentId || !ydoc) return;

        // Initialize socket
        const socket = io({
            path: "/api/socketio",
            transports: ["websocket", "polling"],
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("[DocumentSync] Connected:", socket.id);
            setConnected(true);

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
        });

        socket.on("disconnect", () => {
            console.log("[DocumentSync] Disconnected");
            setConnected(false);
        });

        // Handle existing users
        socket.on("existing-doc-users", (users: RemoteUser[]) => {
            console.log("[DocumentSync] Existing users:", users);
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
            console.log("[DocumentSync] User left:", data.socketId);
            remoteUsersRef.current.delete(data.socketId);
            setRemoteUsers(Array.from(remoteUsersRef.current.values()));
        });

        // Handle cursor updates
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

        // Send local Yjs updates to others
        const handleYjsUpdate = (update: Uint8Array, origin: any) => {
            if (origin !== "remote") {
                socket.emit("doc-update", {
                    documentId,
                    update: Array.from(update),
                });
            }
        };
        ydoc.on("update", handleYjsUpdate);

        return () => {
            socket.emit("leave-document", documentId);
            ydoc.off("update", handleYjsUpdate);
            socket.disconnect();
            socketRef.current = null;
            remoteUsersRef.current.clear();
        };
    }, [documentId, userId, userName, userColor, userImage, ydoc]);

    // Function to send cursor position
    const sendCursorUpdate = useCallback((from: number, to: number) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit("cursor-update", {
                documentId,
                cursor: { from, to },
            });
        }
    }, [documentId]);

    return {
        connected,
        remoteUsers,
        sendCursorUpdate,
    };
}
