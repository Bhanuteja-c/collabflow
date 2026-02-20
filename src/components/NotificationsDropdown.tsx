// src/components/NotificationsDropdown.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Check, Users, FileText, MessageSquare, UserPlus, CheckCheck, Filter } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { useRouter } from "next/navigation";
import { useNotifications, AppNotification as Notification } from "@/hooks/useNotifications";

type FilterType = "all" | "unread" | "mentions" | "invites";

const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "mentions", label: "Mentions" },
    { key: "invites", label: "Invites" },
];

function getTimeGroup(dateStr: string): string {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    if (isThisWeek(date)) return "This Week";
    return "Earlier";
}

export function NotificationsDropdown() {
    const router = useRouter();
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<FilterType>("all");

    // Filter notifications
    const filtered = useMemo(() => {
        switch (filter) {
            case "unread":
                return notifications.filter((n) => !n.isRead);
            case "mentions":
                return notifications.filter((n) => n.type === "mention" || n.type === "message");
            case "invites":
                return notifications.filter((n) => n.type === "workspace_invite" || n.type === "new_member");
            default:
                return notifications;
        }
    }, [notifications, filter]);

    // Group by time
    const grouped = useMemo(() => {
        const groups: Record<string, Notification[]> = {};
        const order = ["Today", "Yesterday", "This Week", "Earlier"];

        filtered.forEach((n) => {
            const group = getTimeGroup(n.createdAt);
            if (!groups[group]) groups[group] = [];
            groups[group].push(n);
        });

        // Return in chronological order
        return order.filter((g) => groups[g]?.length).map((g) => ({ label: g, items: groups[g] }));
    }, [filtered]);

    const handleMarkAllAsRead = async () => {
        await markAsRead();
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }
        if (notification.link) {
            router.push(notification.link);
            setOpen(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "workspace_invite":
            case "new_member":
                return <UserPlus className="h-4 w-4 text-emerald-500" />;
            case "document_shared":
                return <FileText className="h-4 w-4 text-blue-500" />;
            case "message":
            case "mention":
                return <MessageSquare className="h-4 w-4 text-purple-500" />;
            case "task_assigned":
                return <Check className="h-4 w-4 text-orange-500" />;
            default:
                return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground animate-in zoom-in-50">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs hover:text-primary"
                            onClick={handleMarkAllAsRead}
                        >
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${filter === f.key
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                }`}
                        >
                            {f.label}
                            {f.key === "unread" && unreadCount > 0 && (
                                <span className="ml-1 text-[10px] opacity-80">({unreadCount})</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Grouped notifications */}
                <div className="max-h-96 overflow-y-auto">
                    {grouped.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-medium">
                                {filter === "all" ? "No notifications yet" : `No ${filter} notifications`}
                            </p>
                            <p className="text-xs mt-1 opacity-70">
                                {filter === "all"
                                    ? "You're all caught up!"
                                    : "Try a different filter"}
                            </p>
                        </div>
                    ) : (
                        grouped.map((group) => (
                            <div key={group.label}>
                                {/* Time group header */}
                                <div className="px-3 py-1.5 bg-muted/40 border-b">
                                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                        {group.label}
                                    </span>
                                </div>

                                {group.items.map((notification) => (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0 ${!notification.isRead ? "bg-primary/5" : ""
                                            }`}
                                    >
                                        <div className="mt-0.5 p-1.5 rounded-lg bg-muted/60">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm leading-snug ${!notification.isRead ? "font-medium" : ""}`}>
                                                {notification.title}
                                            </p>
                                            {notification.message && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                                    {notification.message}
                                                </p>
                                            )}
                                            <p className="text-[11px] text-muted-foreground/70 mt-1">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
