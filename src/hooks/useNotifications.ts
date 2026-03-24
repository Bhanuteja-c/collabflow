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

const SOUND_PREF_KEY = "collabflow:notif-sound";

export function useNotifications(initialFilter: string = "all") {
    const { socket, connected } = useSharedSocket();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState(initialFilter);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        const stored = localStorage.getItem(SOUND_PREF_KEY);
        return stored === null ? true : stored === "true";
    });
    const router = useRouter();

    const toggleSound = useCallback(() => {
        setSoundEnabled((prev) => {
            const next = !prev;
            localStorage.setItem(SOUND_PREF_KEY, String(next));
            return next;
        });
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications/count");
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error("Failed to fetch unread count", error);
        }
    }, []);

    const fetchNotifications = useCallback(async (cursor?: string, currentFilter?: string) => {
        try {
            setLoading(true);
            const activeFilter = currentFilter || filter;
            const res = await fetch(`/api/notifications?filter=${activeFilter}&take=20${cursor ? `&cursor=${cursor}` : ""}`);
            if (res.ok) {
                const data = await res.json();
                if (cursor) {
                    setNotifications(prev => [...prev, ...(data.notifications || [])]);
                } else {
                    setNotifications(data.notifications || []);
                }
                setNextCursor(data.nextCursor || null);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchNotifications(undefined, filter);
    }, [filter, fetchNotifications]);

    useEffect(() => {
        // Poll count every 30s
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [fetchUnreadCount]);

    const loadMore = useCallback(() => {
        if (nextCursor && !loading) {
            fetchNotifications(nextCursor);
        }
    }, [nextCursor, loading, fetchNotifications]);

    useEffect(() => {
        if (!socket || !connected) return;

        const handleNewNotification = (notification: AppNotification) => {
            // Only prepend if it matches the current filter
            const matchesFilter = 
                filter === "all" ||
                (filter === "unread") || // New notifications are always unread
                (filter === "mentions" && ["mention", "message", "new_message"].includes(notification.type)) ||
                (filter === "invites" && ["workspace_invite", "new_member"].includes(notification.type));

            if (matchesFilter) {
                setNotifications(prev => [notification, ...prev]);
            }
            
            setUnreadCount(prev => prev + 1);

            // Soft notification chime using Web Audio API — only if sound is enabled
            if (soundEnabled) {
                try {
                    const ctx = new AudioContext();
                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0, ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                    gain.connect(ctx.destination);

                    // First tone (high)
                    const osc1 = ctx.createOscillator();
                    osc1.type = "sine";
                    osc1.frequency.setValueAtTime(880, ctx.currentTime);
                    osc1.connect(gain);
                    osc1.start(ctx.currentTime);
                    osc1.stop(ctx.currentTime + 0.15);

                    // Second tone (mid) — slight delay for two-note "ding"
                    const osc2 = ctx.createOscillator();
                    osc2.type = "sine";
                    osc2.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
                    osc2.connect(gain);
                    osc2.start(ctx.currentTime + 0.12);
                    osc2.stop(ctx.currentTime + 0.4);
                } catch {
                    // AudioContext not available (SSR or blocked by browser policy)
                }
            }

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
    }, [socket, connected, router, soundEnabled]);

    const markAsRead = async (notificationId?: string) => {
        try {
            await fetch("/api/notifications", {
                method: "POST",
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

    return { 
        notifications, 
        unreadCount, 
        markAsRead, 
        soundEnabled, 
        toggleSound,
        filter,
        setFilter,
        nextCursor,
        loadMore,
        loading
    };
}
