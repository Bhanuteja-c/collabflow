// src/hooks/useWorkspacePresence.ts
// Tracks which users are online in the current workspace
"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

interface OnlineUser {
    socketId: string;
    user: {
        id: string;
        name: string;
        image?: string;
    };
}

let socket: Socket | null = null;

function getSocket() {
    if (!socket) {
        socket = io({
            path: "/api/socketio",
            transports: ["websocket", "polling"],
        });
    }
    return socket;
}

export function useWorkspacePresence(workspaceId: string | undefined) {
    const { data: session } = useSession();
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

    useEffect(() => {
        if (!workspaceId || !session?.user?.id) return;

        const s = getSocket();

        const user = {
            id: session.user.id,
            name: session.user.name || "Anonymous",
            image: session.user.image || undefined,
        };

        // Join workspace room
        s.emit("join-workspace", { workspaceId, user });

        // Initial presence list
        s.on("workspace-presence", (data: { users: OnlineUser[] }) => {
            setOnlineUsers(data.users);
        });

        // Someone joined
        s.on("workspace-user-joined", (data: OnlineUser) => {
            setOnlineUsers((prev) => {
                // Avoid duplicates (same user, different socket)
                if (prev.some((u) => u.user.id === data.user.id)) return prev;
                return [...prev, data];
            });
        });

        // Someone left
        s.on("workspace-user-left", (data: { socketId: string }) => {
            setOnlineUsers((prev) => prev.filter((u) => u.socketId !== data.socketId));
        });

        return () => {
            s.emit("leave-workspace", workspaceId);
            s.off("workspace-presence");
            s.off("workspace-user-joined");
            s.off("workspace-user-left");
        };
    }, [workspaceId, session?.user?.id]);

    return { onlineUsers };
}
