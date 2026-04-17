// src/components/dashboard/MyTasks.tsx
// Enhanced personal task widget — with filter tabs, completed tasks, stats bar, epic progress
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
    RefreshCw,
    CheckCircle2,
    Target,
    TrendingUp,
    CircleDot,
} from "lucide-react";

interface TaskCard {
    id: string;
    title: string;
    priority: string;
    dueDate: string | null;
    updatedAt?: string;
    column: { id: string; title: string };
    assignee?: { id: string; name: string | null; image: string | null };
    epic?: { id: string; title: string; color: string } | null;
}

interface EpicProgress {
    id: string;
    title: string;
    color: string;
    total: number;
    completed: number;
}

interface TaskStats {
    totalActive: number;
    totalCompleted: number;
    overdue: number;
}

type ViewTab = "active" | "completed" | "epics";

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

    const [activeTasks, setActiveTasks] = useState<TaskCard[]>([]);
    const [completedTasks, setCompletedTasks] = useState<TaskCard[]>([]);
    const [epicProgress, setEpicProgress] = useState<EpicProgress[]>([]);
    const [stats, setStats] = useState<TaskStats>({ totalActive: 0, totalCompleted: 0, overdue: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewTab, setViewTab] = useState<ViewTab>("active");
    const [activeFilter, setActiveFilter] = useState<"all" | "overdue" | "today">("all");
    const fetchingRef = useRef(false);

    const fetchTasks = useCallback(async (silent = false) => {
        if (!workspaceId || fetchingRef.current) return;
        fetchingRef.current = true;
        if (!silent) setRefreshing(true);
        try {
            const res = await fetch(`/api/cards/my-tasks?workspaceId=${workspaceId}`);
            if (res.ok) {
                const data = await res.json();
                setActiveTasks(data.active || []);
                setCompletedTasks(data.completed || []);
                setEpicProgress(data.epicProgress || []);
                setStats(data.stats || { totalActive: 0, totalCompleted: 0, overdue: 0 });
            }
        } catch (e) {
            console.error("[MyTasks] Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
            fetchingRef.current = false;
        }
    }, [workspaceId]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);
    useEffect(() => {
        if (!workspaceId) return;
        const interval = setInterval(() => fetchTasks(true), 30000);
        return () => clearInterval(interval);
    }, [workspaceId, fetchTasks]);
    useEffect(() => {
        const handleFocus = () => fetchTasks(true);
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [fetchTasks]);

    const overdueCount = useMemo(() => activeTasks.filter(t => isOverdue(t.dueDate)).length, [activeTasks]);
    const todayCount = useMemo(() => activeTasks.filter(t => isDueToday(t.dueDate)).length, [activeTasks]);

    const filteredActiveTasks = useMemo(() => {
        switch (activeFilter) {
            case "overdue": return activeTasks.filter(t => isOverdue(t.dueDate));
            case "today": return activeTasks.filter(t => isDueToday(t.dueDate));
            default: return activeTasks;
        }
    }, [activeTasks, activeFilter]);

    const VIEW_TABS: { key: ViewTab; label: string; count: number; icon: React.ReactNode }[] = [
        { key: "active", label: "Active", count: stats.totalActive, icon: <ListTodo className="w-3.5 h-3.5" /> },
        { key: "completed", label: "Completed", count: stats.totalCompleted, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
        { key: "epics", label: "Epics", count: epicProgress.length, icon: <Target className="w-3.5 h-3.5" /> },
    ];

    const FILTER_TABS: { key: "all" | "overdue" | "today"; label: string; count: number }[] = [
        { key: "all", label: "All", count: activeTasks.length },
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
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => fetchTasks()}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                        title="Refresh tasks"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                    <Link href={`/workspace/${slug}/kanban`}>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                            Board <ArrowRight className="w-3 h-3" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border/30 bg-muted/10">
                <div className="flex items-center gap-1.5">
                    <CircleDot className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-foreground/80">{stats.totalActive}</span>
                    <span className="text-[10px] text-muted-foreground">active</span>
                </div>
                <div className="w-px h-3.5 bg-border/60" />
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-foreground/80">{stats.totalCompleted}</span>
                    <span className="text-[10px] text-muted-foreground">done</span>
                </div>
                <div className="w-px h-3.5 bg-border/60" />
                <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span className={`text-xs font-semibold ${stats.overdue > 0 ? "text-red-500" : "text-foreground/80"}`}>{stats.overdue}</span>
                    <span className="text-[10px] text-muted-foreground">overdue</span>
                </div>
                {epicProgress.length > 0 && (
                    <>
                        <div className="w-px h-3.5 bg-border/60" />
                        <div className="flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-purple-500" />
                            <span className="text-xs font-semibold text-foreground/80">{epicProgress.length}</span>
                            <span className="text-[10px] text-muted-foreground">epics</span>
                        </div>
                    </>
                )}
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/10">
                {VIEW_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setViewTab(tab.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            viewTab === tab.key
                                ? "bg-primary/10 text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`text-[10px] px-1.5 rounded-full ${
                                viewTab === tab.key ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Sub-filters for Active tab */}
            {viewTab === "active" && (
                <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border/20 bg-background/30">
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveFilter(tab.key)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                                activeFilter === tab.key
                                    ? "bg-foreground/10 text-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`text-[9px] px-1 rounded-full ${
                                    activeFilter === tab.key ? "bg-foreground/15" :
                                    tab.key === "overdue" && tab.count > 0 ? "bg-red-500/10 text-red-500" : "bg-muted"
                                }`}>{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Content */}
            <ScrollArea className="h-[320px]">
                {/* ── Active Tasks View ── */}
                {viewTab === "active" && (
                    <>
                        {filteredActiveTasks.length === 0 && (
                            <div className="p-8 text-center">
                                <CheckSquare className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    {activeFilter === "all" ? "No tasks assigned to you"
                                        : activeFilter === "overdue" ? "No overdue tasks 🎉"
                                        : "Nothing due today"}
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    {activeFilter === "all" ? "Tasks will appear when you\u0027re assigned" : "You\u0027re all caught up"}
                                </p>
                            </div>
                        )}
                        <AnimatePresence mode="popLayout">
                            <div className="space-y-1.5 p-2">
                                {filteredActiveTasks.map((task, index) => (
                                    <TaskRow key={task.id} task={task} index={index} slug={slug} />
                                ))}
                            </div>
                        </AnimatePresence>
                    </>
                )}

                {/* ── Completed Tasks View ── */}
                {viewTab === "completed" && (
                    <>
                        {completedTasks.length === 0 && (
                            <div className="p-8 text-center">
                                <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">No completed tasks yet</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Completed tasks will appear here</p>
                            </div>
                        )}
                        <AnimatePresence mode="popLayout">
                            <div className="space-y-1.5 p-2">
                                {completedTasks.map((task, index) => (
                                    <motion.div
                                        key={task.id}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.03, duration: 0.2 }}
                                        className="flex items-center gap-3.5 px-3 py-2.5 rounded-[12px] bg-background/40 hover:bg-card/80 border border-transparent hover:border-border/50 transition-all duration-300 group"
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <p className="text-[14px] font-medium tracking-tight truncate text-foreground/60 line-through decoration-muted-foreground/40">
                                                {task.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-medium text-emerald-600/80 uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                                    {task.column.title}
                                                </span>
                                                {task.epic && (
                                                    <span className="text-[10px] font-medium text-muted-foreground/70 px-1.5 py-0.5 rounded-md bg-muted/50 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.epic.color || "#6366f1" }} />
                                                        {task.epic.title}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </AnimatePresence>
                    </>
                )}

                {/* ── Epic Progress View ── */}
                {viewTab === "epics" && (
                    <>
                        {epicProgress.length === 0 && (
                            <div className="p-8 text-center">
                                <Target className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">No epics tracked</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    Assign tasks to epics on the Kanban board
                                </p>
                            </div>
                        )}
                        <div className="space-y-3 p-4">
                            {epicProgress.map((epic, index) => {
                                const pct = epic.total > 0 ? Math.round((epic.completed / epic.total) * 100) : 0;
                                return (
                                    <motion.div
                                        key={epic.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05, duration: 0.25 }}
                                        className="p-3.5 rounded-[14px] bg-background/50 border border-border/30 hover:border-border/60 transition-all duration-300"
                                    >
                                        <div className="flex items-center justify-between mb-2.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-background shadow-sm" style={{ backgroundColor: epic.color || "#6366f1" }} />
                                                <span className="text-[13px] font-semibold truncate text-foreground/90">{epic.title}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <span className={`text-xs font-bold ${pct === 100 ? "text-emerald-500" : "text-foreground/70"}`}>{pct}%</span>
                                                <span className="text-[10px] text-muted-foreground/60">{epic.completed}/{epic.total}</span>
                                            </div>
                                        </div>
                                        <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.1 }}
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    backgroundColor: pct === 100 ? "#10b981" : (epic.color || "#6366f1"),
                                                    opacity: pct === 100 ? 1 : 0.85,
                                                }}
                                            />
                                        </div>
                                        {pct === 100 && (
                                            <div className="flex items-center gap-1 mt-2">
                                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                                <span className="text-[10px] font-medium text-emerald-500">All tasks complete!</span>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </>
                )}
            </ScrollArea>
        </div>
    );
}

// ── Task Row Component ──
function TaskRow({ task, index, slug }: { task: TaskCard; index: number; slug: string }) {
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
            <div className={`w-1.5 h-6 rounded-full flex-shrink-0 ${priorityColors[task.priority] || "bg-muted"}`} />
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
                    {task.epic && (
                        <span className="text-[10px] font-medium text-muted-foreground/70 px-1.5 py-0.5 rounded-md bg-muted/50 flex items-center gap-1 max-w-[100px] truncate">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: task.epic.color || "#6366f1" }} />
                            {task.epic.title}
                        </span>
                    )}
                </div>
            </div>
            <Link
                href={`/workspace/${slug}/kanban?card=${task.id}`}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0 hover:scale-110"
            >
                <ArrowRight className="w-4 h-4" />
            </Link>
        </motion.div>
    );
}
