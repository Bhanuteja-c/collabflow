// src/components/dashboard/MyTasks.tsx
// Personal task widget for workspace dashboard
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import {
    CheckSquare,
    Clock,
    AlertTriangle,
    Loader2,
    ArrowRight,
    CalendarDays,
    ListTodo,
} from "lucide-react";

interface TaskCard {
    id: string;
    title: string;
    priority: string;
    dueDate: string | null;
    column: { id: string; title: string };
    assignee?: { id: string; name: string | null; image: string | null };
}

function getDueStatus(dueDate: string | null): { label: string; color: string; icon: React.ReactNode } {
    if (!dueDate) return { label: "", color: "", icon: null };

    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return {
            label: `${Math.abs(diffDays)}d overdue`,
            color: "text-red-500 bg-red-500/10",
            icon: <AlertTriangle className="w-3 h-3" />,
        };
    }
    if (diffDays <= 2) {
        return {
            label: diffDays === 0 ? "Due today" : `${diffDays}d left`,
            color: "text-amber-500 bg-amber-500/10",
            icon: <Clock className="w-3 h-3" />,
        };
    }
    return {
        label: `${diffDays}d left`,
        color: "text-emerald-500 bg-emerald-500/10",
        icon: <CalendarDays className="w-3 h-3" />,
    };
}

const priorityColors: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-amber-500",
    low: "bg-emerald-500",
};

export function MyTasks({ workspaceId }: { workspaceId?: string }) {
    const params = useParams();
    const slug = params?.slug as string;

    const [tasks, setTasks] = useState<TaskCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!workspaceId) return;

        const fetchTasks = async () => {
            try {
                const res = await fetch(`/api/cards/my-tasks?workspaceId=${workspaceId}`);
                if (res.ok) {
                    const data = await res.json();
                    setTasks(data);
                }
            } catch (e) {
                console.error("[MyTasks] Error:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [workspaceId]);

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
                    <ListTodo className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">My Tasks</h3>
                    {tasks.length > 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            {tasks.length}
                        </span>
                    )}
                </div>
                <Link href={`/workspace/${slug}/kanban`}>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                        Board <ArrowRight className="w-3 h-3" />
                    </Button>
                </Link>
            </div>

            {/* Content */}
            <ScrollArea className="h-[320px]">
                {tasks.length === 0 && (
                    <div className="p-8 text-center">
                        <CheckSquare className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No tasks assigned to you</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                            Tasks will appear when you&apos;re assigned
                        </p>
                    </div>
                )}

                <AnimatePresence mode="popLayout">
                    {tasks.map((task, index) => {
                        const dueStatus = getDueStatus(task.dueDate);

                        return (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b last:border-0 group"
                            >
                                {/* Priority dot */}
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[task.priority] || "bg-muted"}`} />

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                        {task.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                            {task.column.title}
                                        </span>
                                        {dueStatus.label && (
                                            <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${dueStatus.color}`}>
                                                {dueStatus.icon}
                                                {dueStatus.label}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* View link */}
                                <Link
                                    href={`/workspace/${slug}/kanban?card=${task.id}`}
                                    className="text-xs text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    View →
                                </Link>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </ScrollArea>
        </div>
    );
}
