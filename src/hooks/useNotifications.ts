"use client";

import { useEffect, useState, useCallback } from "react";
import { useSharedSocket } from "@/components/providers/SocketProvider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface AppNotification {
    id: string;
    type: string;
    title: string;
    message: string | null;
    link: string | null;
    isRead: boolean;
    createdAt: string;
    sender: { name: string; image: string | null } | null;
}

export function useNotifications() {
    const { socket, connected } = useSharedSocket();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        if (!socket || !connected) return;

        const handleNewNotification = (notification: AppNotification) => {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Show toast visually 
            toast(notification.title, {
                description: notification.message || "",
                action: notification.link ? {
                    label: "View",
                    onClick: () => router.push(notification.link!)
                } : undefined
            });
        };

        socket.on("notification", handleNewNotification);

        return () => {
            socket.off("notification", handleNewNotification);
        };
    }, [socket, connected, router]);

    const markAsRead = async (notificationId?: string) => {
        try {
            await fetch("/api/notifications", {
                method: "POST", // The existing API uses POST
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(notificationId ? { notificationIds: [notificationId] } : { markAllRead: true })
            });
            
            if (notificationId) {
                setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } else {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error("Failed to mark notifications read", error);
        }
    };

    return { notifications, unreadCount, markAsRead };
}
