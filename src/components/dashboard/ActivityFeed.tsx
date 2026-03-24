// src/components/dashboard/ActivityFeed.tsx
// Real-time activity feed widget for workspace dashboard
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
    CheckSquare,
    FileText,
    Users,
    MessageSquare,
    ArrowRight,
    Loader2,
    Activity as ActivityIcon,
    Hash,
    LayoutGrid,
    RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface ActivityUser {
    id: string;
    name: string | null;
    image: string | null;
}

interface ActivityItem {
    id: string;
    userId: string;
    user: ActivityUser;
    type: string;
    action: string;
    entityType?: string;
    entityId?: string;
    entityTitle?: string;
    metadata?: Record<string, any>;
    createdAt: string;
}

// Icon mapping for activity types
const activityIcons: Record<string, { icon: React.ReactNode; color: string }> = {
    card_created: { icon: <CheckSquare className="w-4 h-4" />, color: "text-green-500 bg-green-500/10" },
    card_moved: { icon: <ArrowRight className="w-4 h-4" />, color: "text-blue-500 bg-blue-500/10" },
    card_completed: { icon: <CheckSquare className="w-4 h-4" />, color: "text-purple-500 bg-purple-500/10" },
    card_assigned: { icon: <Users className="w-4 h-4" />, color: "text-amber-500 bg-amber-500/10" },
    card_updated: { icon: <CheckSquare className="w-4 h-4" />, color: "text-blue-400 bg-blue-400/10" },
    document_created: { icon: <FileText className="w-4 h-4" />, color: "text-emerald-500 bg-emerald-500/10" },
    document_edited: { icon: <FileText className="w-4 h-4" />, color: "text-teal-500 bg-teal-500/10" },
    member_joined: { icon: <Users className="w-4 h-4" />, color: "text-indigo-500 bg-indigo-500/10" },
    member_left: { icon: <Users className="w-4 h-4" />, color: "text-red-400 bg-red-400/10" },
    channel_created: { icon: <Hash className="w-4 h-4" />, color: "text-cyan-500 bg-cyan-500/10" },
    message_sent: { icon: <MessageSquare className="w-4 h-4" />, color: "text-pink-500 bg-pink-500/10" },
    board_created: { icon: <LayoutGrid className="w-4 h-4" />, color: "text-orange-500 bg-orange-500/10" },
};

function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function getEntityLink(workspaceSlug: string, activity: ActivityItem): string | null {
    if (!activity.entityId) return null;

    switch (activity.entityType) {
        case "card":
            return `/workspace/${workspaceSlug}/kanban?card=${activity.entityId}`;
        case "document":
            return `/workspace/${workspaceSlug}/editor/${activity.entityId}`;
        case "channel":
            return `/workspace/${workspaceSlug}/chat?channel=${activity.entityId}`;
        case "board":
            return `/workspace/${workspaceSlug}/kanban`;
        default:
            return null;
    }
}

export function ActivityFeed() {
    const params = useParams();
    const workspaceSlug = params?.slug as string;

    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchActivities = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await fetch(`/api/workspaces/${workspaceSlug}/activities?limit=15`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setActivities(data.activities);
            setError(null);
        } catch (err) {
            setError("Failed to load activities");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (workspaceSlug) {
            fetchActivities();
        }
    }, [workspaceSlug]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => fetchActivities(true), 30000);
        return () => clearInterval(interval);
    }, [workspaceSlug]);

    if (loading) {
        return (
            <div className="bg-card rounded-xl border p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">Activity Feed</h3>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchActivities(true)}
                    disabled={refreshing}
                    className="h-7 w-7 p-0"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Content */}
            <ScrollArea className="h-[320px]">
                {error && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        {error}
                    </div>
                )}

                {!error && activities.length === 0 && (
                    <div className="p-8 text-center">
                        <ActivityIcon className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No activity yet</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                            Actions will appear here
                        </p>
                    </div>
                )}

                <AnimatePresence mode="popLayout">
                    {activities.map((activity, index) => {
                        const iconInfo = activityIcons[activity.type] || {
                            icon: <ActivityIcon className="w-4 h-4" />,
                            color: "text-muted-foreground bg-muted"
                        };
                        const entityLink = getEntityLink(workspaceSlug, activity);

                        return (
                            <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b last:border-0"
                            >
                                {/* User Avatar */}
                                <UserAvatar user={activity.user} className="h-8 w-8" showStatus={false} />

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm truncate">
                                            {activity.user.name || "Unknown"}
                                        </span>
                                        <span className={`p-1 rounded-md ${iconInfo.color}`}>
                                            {iconInfo.icon}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                        {activity.action}
                                    </p>
                                    {entityLink && (
                                        <Link
                                            href={entityLink}
                                            className="text-xs text-primary hover:underline mt-1 inline-block"
                                        >
                                            View →
                                        </Link>
                                    )}
                                </div>

                                {/* Time */}
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatTimeAgo(activity.createdAt)}
                                </span>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </ScrollArea>
        </div>
    );
}
