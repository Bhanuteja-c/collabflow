// src/hooks/useWorkspacePresence.ts
// Workspace presence hook — now uses shared socket from SocketProvider
// Previously used a module-level singleton socket; now uses the centralized SocketProvider connection
"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSharedSocket } from "@/components/providers/SocketProvider";

interface OnlineUser {
    socketId: string;
    user: {
        id: string;
        name: string;
        image?: string;
    };
}

export function useWorkspacePresence(workspaceId: string | undefined) {
    const { data: session } = useSession();
    const { socket, connected } = useSharedSocket();
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const joinedRef = useRef(false);

    useEffect(() => {
        if (!socket || !connected || !workspaceId || !session?.user) return;

        const user = {
            id: (session.user as any).id,
            name: session.user.name || "Anonymous",
            image: session.user.image || undefined,
        };

        // Join workspace room
        socket.emit("join-workspace", { workspaceId, user });
        joinedRef.current = true;

        // Handle presence events
        const handleUserJoined = (data: OnlineUser) => {
            setOnlineUsers((prev) => {
                if (prev.find((u) => u.socketId === data.socketId)) return prev;
                return [...prev, data];
            });
        };

        const handleUserLeft = (data: { socketId: string }) => {
            setOnlineUsers((prev) => prev.filter((u) => u.socketId !== data.socketId));
        };

        const handlePresence = (data: { users: OnlineUser[] }) => {
            setOnlineUsers(data.users);
        };

        socket.on("workspace-user-joined", handleUserJoined);
        socket.on("workspace-user-left", handleUserLeft);
        socket.on("workspace-presence", handlePresence);

        return () => {
            socket.off("workspace-user-joined", handleUserJoined);
            socket.off("workspace-user-left", handleUserLeft);
            socket.off("workspace-presence", handlePresence);

            if (joinedRef.current) {
                socket.emit("leave-workspace", workspaceId);
                joinedRef.current = false;
            }
        };
    }, [socket, connected, workspaceId, session]);

    return { onlineUsers };
}
