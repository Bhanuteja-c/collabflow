// src/components/dashboard/MyTasks.tsx
// Personal task widget for workspace dashboard — with filter tabs
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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

type FilterTab = "all" | "overdue" | "today";

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

function isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate).getTime() < Date.now();
}

function isDueToday(dueDate: string | null): boolean {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    return due.toDateString() === now.toDateString();
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
    const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

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

    const overdueCount = useMemo(() => tasks.filter(t => isOverdue(t.dueDate)).length, [tasks]);
    const todayCount = useMemo(() => tasks.filter(t => isDueToday(t.dueDate)).length, [tasks]);

    const filteredTasks = useMemo(() => {
        switch (activeFilter) {
            case "overdue":
                return tasks.filter(t => isOverdue(t.dueDate));
            case "today":
                return tasks.filter(t => isDueToday(t.dueDate));
            default:
                return tasks;
        }
    }, [tasks, activeFilter]);

    const FILTER_TABS: { key: FilterTab; label: string; count: number }[] = [
        { key: "all", label: "All", count: tasks.length },
        { key: "overdue", label: "Overdue", count: overdueCount },
        { key: "today", label: "Due Today", count: todayCount },
    ];

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
        <div className="rounded-[20px] border border-border/40 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/20">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                        <ListTodo className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-bold text-[15px] tracking-tight text-foreground/90">My Tasks</h3>
                </div>
                <Link href={`/workspace/${slug}/kanban`}>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                        Board <ArrowRight className="w-3 h-3" />
                    </Button>
                </Link>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/10">
                {FILTER_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveFilter(tab.key)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            activeFilter === tab.key
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`text-[10px] px-1.5 py-0 rounded-full ${
                                activeFilter === tab.key
                                    ? "bg-primary/20 text-primary"
                                    : tab.key === "overdue" && tab.count > 0
                                    ? "bg-red-500/10 text-red-500"
                                    : "bg-muted text-muted-foreground"
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <ScrollArea className="h-[280px]">
                {filteredTasks.length === 0 && (
                    <div className="p-8 text-center">
                        <CheckSquare className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">
                            {activeFilter === "all"
                                ? "No tasks assigned to you"
                                : activeFilter === "overdue"
                                ? "No overdue tasks 🎉"
                                : "Nothing due today"}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                            {activeFilter === "all"
                                ? "Tasks will appear when you\u0027re assigned"
                                : "You\u0027re all caught up"}
                        </p>
                    </div>
                )}

                <AnimatePresence mode="popLayout">
                    <div className="space-y-1.5 p-2">
                        {filteredTasks.map((task, index) => {
                            const dueStatus = getDueStatus(task.dueDate);

                            return (
                                <motion.div
                                    key={task.id}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.03, duration: 0.2 }}
                                    className="flex items-center gap-3.5 px-3 py-2.5 rounded-[12px] bg-background/40 hover:bg-card/80 border border-transparent hover:border-border/50 hover:shadow-sm transition-all duration-300 group cursor-pointer"
                                >
                                    {/* Priority Indicator */}
                                    <div className={`w-1.5 h-6 rounded-full flex-shrink-0 ${priorityColors[task.priority] || "bg-muted"}`} />

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <p className="text-[14px] font-semibold tracking-tight truncate text-foreground/90 group-hover:text-primary transition-colors">
                                            {task.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wider bg-muted/60 px-1.5 py-0.5 rounded-md">
                                                {task.column.title}
                                            </span>
                                            {dueStatus.label && (
                                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-sm ${dueStatus.color}`}>
                                                    {dueStatus.icon}
                                                    {dueStatus.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* View link Action */}
                                    <Link
                                        href={`/workspace/${slug}/kanban?card=${task.id}`}
                                        className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0 hover:scale-110"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </AnimatePresence>
            </ScrollArea>
        </div>
    );
}
