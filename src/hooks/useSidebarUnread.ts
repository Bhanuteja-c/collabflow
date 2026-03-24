"use client";

import { useState, useEffect, useCallback } from "react";
import { useSharedSocket } from "@/components/providers/SocketProvider";

export interface SidebarChannel {
    id: string;
    name: string;
    type: string;
    unreadCount: number;
    otherUser?: {
        id: string;
        name: string;
        image: string | null;
    };
}

export interface SidebarUnreadCounts {
    totalUnreadMessages: number;
    totalUnreadDMs: number;
    unreadNotifications: number;
    channels: SidebarChannel[];
}

export function useSidebarUnread(workspaceId: string) {
    const { socket, connected } = useSharedSocket();
    const [unreadCounts, setUnreadCounts] = useState<SidebarUnreadCounts>({
        totalUnreadMessages: 0,
        totalUnreadDMs: 0,
        unreadNotifications: 0,
        channels: []
    });

    const refetch = useCallback(async () => {
        if (!workspaceId) return;
        try {
            const [channelsRes, notifRes] = await Promise.all([
                fetch(`/api/channels/unread?workspaceId=${workspaceId}`),
                fetch(`/api/notifications/count`)
            ]);

            let totalUnreadMessages = 0;
            let totalUnreadDMs = 0;
            let channels: SidebarChannel[] = [];
            let unreadNotifications = 0;

            if (channelsRes.ok) {
                const data = await channelsRes.json();
                totalUnreadMessages = data.totalUnread || 0;
                totalUnreadDMs = data.dmUnread || 0;
                channels = data.channels || [];
            }
            if (notifRes.ok) {
                const data = await notifRes.json();
                unreadNotifications = data.unreadCount || 0;
            }

            setUnreadCounts({
                totalUnreadMessages,
                totalUnreadDMs,
                unreadNotifications,
                channels
            });
        } catch (error) {
            console.error("Failed to fetch sidebar unread counts:", error);
        }
    }, [workspaceId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    useEffect(() => {
        if (!socket || !connected) return;

        const onNewMessage = () => refetch();
        const onMessagesRead = () => refetch();
        const onNewNotification = () => refetch();

        socket.on("new-message", onNewMessage);
        socket.on("messages-read", onMessagesRead);
        socket.on("new-notification", onNewNotification);

        return () => {
            socket.off("new-message", onNewMessage);
            socket.off("messages-read", onMessagesRead);
            socket.off("new-notification", onNewNotification);
        };
    }, [socket, connected, refetch]);

    // Independent polling for notifications (every 30s) as backup
    useEffect(() => {
        const interval = setInterval(() => refetch(), 30000);
        return () => clearInterval(interval);
    }, [refetch]);

    return { unreadCounts, refetch };
}
