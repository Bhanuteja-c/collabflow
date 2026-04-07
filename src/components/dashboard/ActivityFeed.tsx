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
            <div className="rounded-[20px] border border-border/40 bg-card/60 backdrop-blur-md shadow-sm p-6 overflow-hidden">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-[20px] border border-border/40 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/20">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <ActivityIcon className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-bold text-[15px] tracking-tight text-foreground/90">Activity Feed</h3>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fetchActivities(true)}
                    disabled={refreshing}
                    className="h-8 w-8 rounded-md hover:bg-muted"
                >
                    <RefreshCw className={`w-4 h-4 text-muted-foreground/70 ${refreshing ? 'animate-spin text-primary' : ''}`} />
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
                    <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                            <ActivityIcon className="w-6 h-6 text-muted-foreground/40" />
                        </div>
                        <p className="text-[14px] font-medium text-foreground/70 tracking-tight">No activity yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                            Actions will appear here
                        </p>
                    </div>
                )}

                <AnimatePresence mode="popLayout">
                    <div className="divide-y divide-border/30">
                        {activities.map((activity, index) => {
                            const iconInfo = activityIcons[activity.type] || {
                                icon: <ActivityIcon className="w-4 h-4" />,
                                color: "text-muted-foreground bg-muted"
                            };
                            const entityLink = getEntityLink(workspaceSlug, activity);

                            return (
                                <motion.div
                                    key={activity.id}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                                >
                                    {/* User Avatar */}
                                    <UserAvatar user={activity.user} className="h-9 w-9 border border-border/50 shadow-sm" showStatus={false} />

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-[13px] tracking-tight truncate text-foreground/90">
                                                {activity.user.name || "Unknown"}
                                            </span>
                                            <span className={`p-1 rounded-md shadow-sm border border-black/5 dark:border-white/5 ${iconInfo.color}`}>
                                                {iconInfo.icon}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-muted-foreground/90 leading-snug line-clamp-2 pr-4">
                                            {activity.action}
                                        </p>
                                        {entityLink && (
                                            <Link
                                                href={entityLink}
                                                className="text-[11px] font-medium text-primary/80 hover:text-primary transition-colors hover:underline mt-1.5 inline-flex items-center gap-1 group/link"
                                            >
                                                View <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                                            </Link>
                                        )}
                                    </div>

                                    {/* Time */}
                                    <span className="text-[11px] font-medium text-muted-foreground/60 whitespace-nowrap pt-1">
                                        {formatTimeAgo(activity.createdAt)}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </AnimatePresence>
            </ScrollArea>
        </div>
    );
}
