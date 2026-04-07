// src/app/workspace/[slug]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    FileText,
    Plus,
    Clock,
    ArrowRight,
    Settings,
    Search,
    Calendar,
    Users,
    LayoutGrid,
    PenTool,
    Sparkles,
    ListTodo,
    MessageSquare,
    Kanban,
    Video,
} from "lucide-react";
import { useWorkspacePresence } from "@/hooks/useWorkspacePresence";
import { Avatar } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Lazy-load heavy widgets to reduce initial JS bundle & TBT
// Each has a loading skeleton placeholder to prevent CLS
const ActivityFeed = dynamic(
    () => import("@/components/dashboard/ActivityFeed").then(m => ({ default: m.ActivityFeed })),
    { ssr: false, loading: () => <div className="w-full min-h-[280px] bg-muted/40 shimmer border border-border/40 rounded-[20px]" /> }
);
const MyTasks = dynamic(
    () => import("@/components/dashboard/MyTasks").then(m => ({ default: m.MyTasks })),
    { ssr: false, loading: () => <div className="w-full min-h-[400px] bg-muted/40 shimmer border border-border/40 rounded-[20px]" /> }
);
const CreateProjectModal = dynamic(
    () => import("@/components/dashboard/CreateProjectModal").then(m => ({ default: m.CreateProjectModal })),
    { ssr: false }
);
const OnboardingChecklist = dynamic(
    () => import("@/components/onboarding/OnboardingChecklist").then(m => ({ default: m.OnboardingChecklist })),
    { ssr: false }
);

interface WorkspaceDashboardProps {
    params: Promise<{ slug: string }>;
}

interface Workspace {
    id: string;
    slug: string;
    name: string;
    members?: { userId: string, user: { name?: string | null, image?: string | null } }[];
    onboardingCompleted?: boolean;
    userRole?: string;
    _count?: {
        boards: number;
        channels: number;
        documents: number;
    };
}

interface User {
    id: string;
    name: string | null;
    image: string | null;
}

interface Document {
    id: string;
    title: string;
    updatedAt: string;
    author: { name: string | null, image: string | null };
}

export default function WorkspaceDashboard({ params }: WorkspaceDashboardProps) {
    const { slug } = use(params);
    const { data: session } = useSession();
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [recentDocs, setRecentDocs] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const { onlineUsers } = useWorkspacePresence(workspace?.id);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch workspace
                const wsRes = await fetch(`/api/workspaces`);
                if (wsRes.ok) {
                    const workspaces = await wsRes.json();
                    const ws = workspaces.find((w: Workspace) => w.slug === slug);
                    setWorkspace(ws);

                    if (ws) {
                        // Fetch recent docs, members, tasks, unread in parallel
                        const [docsRes, membersRes, tasksRes] = await Promise.all([
                            fetch(`/api/documents?workspaceId=${ws.id}&limit=5`),
                            fetch(`/api/workspaces/${slug}/members`),
                            fetch(`/api/cards/my-tasks?workspaceId=${ws.id}`),
                        ]);

                        if (docsRes.ok) setRecentDocs(await docsRes.json());

                        const membersData = membersRes.ok ? await membersRes.json() : [];
                        setWorkspaceMembers(membersData.map((m: { user: User } | User) => 'user' in m ? m.user : m));

                        if (tasksRes.ok) {
                            const tasksData = await tasksRes.json();
                            setTaskCount(Array.isArray(tasksData) ? tasksData.length : 0);
                        }

                        // Fetch unread count
                        try {
                            const channelsRes = await fetch(`/api/channels?workspaceId=${ws.id}`);
                            if (channelsRes.ok) {
                                const channels = await channelsRes.json();
                                const total = (channels || []).reduce(
                                    (sum: number, ch: any) => sum + (ch.unreadCount || 0), 0
                                );
                                setUnreadCount(total);
                            }
                        } catch { /* ignore */ }
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    const handleSearchClick = () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    };

    // Stat cards data
    const statCards = [
        {
            label: "Tasks Assigned",
            value: taskCount,
            icon: ListTodo,
            color: "text-primary",
            bgColor: "bg-primary/10",
            borderColor: "border-primary/20",
        },
        {
            label: "Active Boards",
            value: workspace?._count?.boards ?? 0,
            icon: LayoutGrid,
            color: "text-violet-500",
            bgColor: "bg-violet-500/10",
            borderColor: "border-violet-500/20",
        },
        {
            label: "Team Members",
            value: workspaceMembers.length,
            icon: Users,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20",
        },
        {
            label: "Unread Messages",
            value: unreadCount,
            icon: MessageSquare,
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            borderColor: "border-amber-500/20",
        },
    ];

    // Quick access shortcuts
    const quickLinks = [
        {
            label: "Kanban Board",
            description: "Manage tasks & sprints",
            href: `/workspace/${slug}/kanban`,
            icon: Kanban,
            color: "text-primary",
            bgColor: "bg-primary/10",
            hoverBg: "hover:bg-primary/5 hover:border-primary/30",
        },
        {
            label: "Chat",
            description: "Team messaging",
            href: `/workspace/${slug}/chat`,
            icon: MessageSquare,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            hoverBg: "hover:bg-emerald-500/5 hover:border-emerald-500/30",
        },
        {
            label: "Documents",
            description: "Collaborate on docs",
            href: `/workspace/${slug}/documents`,
            icon: FileText,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            hoverBg: "hover:bg-blue-500/5 hover:border-blue-500/30",
        },
        {
            label: "Whiteboard",
            description: "Visual brainstorming",
            href: `/workspace/${slug}/whiteboard`,
            icon: PenTool,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            hoverBg: "hover:bg-orange-500/5 hover:border-orange-500/30",
        },
    ];

    if (loading) {
        return (
            <div className="min-h-full p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
                {/* ── Welcome Banner ── */}
                <div className="h-[120px] md:h-[136px] bg-muted/40 shimmer border border-border/40 rounded-2xl mb-4" />

                {/* Overview Stats (Row 1) — matches grid-cols-2 lg:grid-cols-4 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-[104px] bg-muted/40 shimmer border border-border/40 rounded-[20px]" />
                    ))}
                </div>

                {/* Quick Access Section — matches grid-cols-2 md:grid-cols-4 gap-4 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-[76px] bg-muted/40 shimmer border border-border/40 rounded-[18px]" />
                    ))}
                </div>

                {/* Two column layout: My Tasks | Recent Work/Activity Feed */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        {/* My Tasks */}
                        <div className="w-full min-h-[400px] bg-muted/40 shimmer border border-border/40 rounded-[20px]" />
                        {/* Recent Work */}
                        <div className="w-full min-h-[180px] bg-muted/40 shimmer border border-border/40 rounded-[20px]" />
                    </div>

                    <div className="lg:col-span-4 space-y-5">
                        {/* Activity Feed */}
                        <div className="w-full min-h-[280px] bg-muted/40 shimmer border border-border/40 rounded-[20px]" />
                        {/* Online Team */}
                        <div className="w-full min-h-[200px] bg-muted/40 shimmer border border-border/40 rounded-[20px]" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
            {/* ── Welcome Banner ── */}
            <div className="relative overflow-hidden rounded-2xl mb-4 p-6 md:p-8 bg-gradient-to-br from-primary/10 via-background to-background border border-border shadow-sm">
                
                {/* Decorative circles */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -bottom-8 right-32 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />

                {/* Content */}
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        {/* Workspace badge */}
                        <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="text-xs font-medium text-primary">
                                {workspace?.name || slug}
                            </span>
                        </div>

                        {/* Greeting */}
                        <h1
                            className="text-2xl md:text-3xl font-bold text-foreground mb-1"
                        >
                            {getGreeting()},{" "}
                            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                {session?.user?.name?.split(" ")[0]}
                            </span>
                        </h1>

                        {/* Date + quick info */}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                            {taskCount > 0 && (
                                <>
                                    <span>·</span>
                                    <span className="text-primary font-medium">
                                        {taskCount} task{taskCount !== 1 ? "s" : ""} assigned to you
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Action buttons row (moved inside the banner on desktop, or stacked on mobile) */}
                    <div className="flex items-center gap-2 mt-4 md:mt-0">
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-background/80 h-9 w-9"
                            onClick={handleSearchClick}
                        >
                            <Search className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            asChild
                            className="rounded-full bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-background/80 h-9 w-9"
                        >
                            <Link href={`/workspace/${slug}/settings`}>
                                <Settings className="w-4 h-4" />
                            </Link>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="rounded-full px-4 shadow-lg shadow-primary/20 h-9">
                                    <Plus className="w-4 h-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline text-sm">Create New</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[280px]">
                                <DropdownMenuLabel className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1">
                                    QUICK CREATE
                                </DropdownMenuLabel>
                                <DropdownMenuItem asChild className="mb-1 py-2 cursor-pointer">
                                    <Link href={`/workspace/${slug}/boards?new=true`}>
                                        <LayoutGrid className="w-5 h-5 mr-3 text-primary/70" />
                                        <div className="flex flex-col">
                                            <span className="font-bold">Kanban Board</span>
                                            <span className="text-[11px] text-muted-foreground">Start a new project board</span>
                                        </div>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="mb-2 py-2 cursor-pointer">
                                    <Link href={`/workspace/${slug}/documents?new=true`}>
                                        <FileText className="w-5 h-5 mr-3 text-blue-500/70" />
                                        <div className="flex flex-col">
                                            <span className="font-bold">Document</span>
                                            <span className="text-[11px] text-muted-foreground">Start a new document</span>
                                        </div>
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuLabel className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mt-2 mb-1">
                                    NEW PROJECT
                                </DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setIsProjectModalOpen(true)} className="mb-2 py-2 cursor-pointer focus:bg-primary/10">
                                    <Sparkles className="w-5 h-5 mr-3 text-primary" />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-primary">New Project</span>
                                        <span className="text-[11px] text-muted-foreground">Board · Chat · Whiteboard</span>
                                    </div>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuLabel className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mt-2 mb-1">
                                    OTHER
                                </DropdownMenuLabel>
                                <DropdownMenuItem asChild className="mb-1 py-2 cursor-pointer">
                                    <Link href={`/workspace/${slug}/whiteboard?new=true`}>
                                        <PenTool className="w-5 h-5 mr-3 text-orange-500/70" />
                                        <div className="flex flex-col">
                                            <span className="font-bold">Whiteboard</span>
                                            <span className="text-[11px] text-muted-foreground">New blank canvas</span>
                                        </div>
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Project Wizard Modal */}
            <CreateProjectModal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
                workspaceId={workspace?.id || ""}
                workspaceSlug={slug}
                workspaceMembers={workspaceMembers}
            />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, i) => (
                <div
                    key={stat.label}
                >
                    <div className="relative overflow-hidden rounded-[20px] border border-border/40 bg-card/60 backdrop-blur-md p-5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 group">
                        {/* Soft background glow on hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br from-transparent to-${stat.color.split('-')[1]}-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                        <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                            <div className="flex items-start justify-between">
                                <div className={`p-2.5 rounded-2xl ${stat.bgColor} shadow-sm ring-1 ring-black/5 dark:ring-white/5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <div className={`h-1.5 w-1.5 rounded-full ${stat.bgColor} opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100`} />
                            </div>
                            <div>
                                <p className="text-3xl font-extrabold tracking-tight text-foreground/90">{stat.value}</p>
                                <p className="text-[13px] font-medium text-muted-foreground/80 mt-1">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* ── Quick Access Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map((link, i) => (
                <div
                    key={link.label}
                >
                    <Link href={link.href} className="block h-full">
                        <div className={`relative overflow-hidden rounded-[18px] border border-border/40 bg-card/50 backdrop-blur-sm p-4 h-full transition-all duration-300 cursor-pointer group ${link.hoverBg} hover:shadow-md`}>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div className={`p-2 rounded-xl ${link.bgColor} ring-1 ring-black/5 dark:ring-white/5 transition-transform duration-300 group-hover:scale-110`}>
                                        <link.icon className={`w-4 h-4 ${link.color}`} />
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground/70 transition-all duration-300 group-hover:translate-x-1" />
                                </div>
                                <div>
                                    <p className="text-[15px] font-semibold tracking-tight text-foreground/90">{link.label}</p>
                                    <p className="text-[12px] text-muted-foreground/70 mt-0.5 line-clamp-1 hidden sm:block">{link.description}</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

            ))}
        </div>

            {/* ── Onboarding (conditional) ── */}
            {workspace && workspace.onboardingCompleted === false && (workspace.userRole === "owner" || workspace.userRole === "admin") && (
                <OnboardingChecklist
                    workspace={workspace}
                    onDismiss={() => setWorkspace({ ...workspace, onboardingCompleted: true })}
                />
            )}

            {/* ── Main Content Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Tasks + Recent Work */}
                <div className="lg:col-span-8 space-y-6">
                    <MyTasks workspaceId={workspace?.id || ""} />

                    {/* Recent Documents */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold tracking-tight">Recent Work</h2>
                            <Button variant="ghost" size="sm" asChild className="hover:bg-transparent hover:text-primary h-8 text-xs">
                                <Link href={`/workspace/${slug}/documents`} className="flex items-center gap-1">
                                    View all <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </Button>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                            {recentDocs.length > 0 ? (
                                recentDocs.map((doc, i) => (
                                    <div
                                        key={doc.id}
                                    >
                                        <Link href={`/workspace/${slug}/editor/${doc.id}`}>
                                            <Card className="border border-border/40 bg-card/60 backdrop-blur-md rounded-[16px] hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group h-full overflow-hidden relative">
                                                <div className="absolute inset-y-0 left-0 w-1 bg-primary/0 group-hover:bg-primary/80 transition-colors duration-300" />
                                                <CardContent className="p-4 flex gap-3.5 items-start relative z-10">
                                                    <div className="p-2.5 bg-blue-500/10 rounded-[10px] group-hover:bg-blue-500/20 group-hover:scale-105 transition-all duration-300 flex-shrink-0">
                                                        <FileText className="w-4 h-4 text-blue-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-[14px] tracking-tight truncate group-hover:text-primary transition-colors text-foreground/90">{doc.title}</h3>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            {doc.author?.name && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <UserAvatar user={doc.author as any} className="h-4 w-4 shadow-sm" showStatus={false} />
                                                                    <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[90px]">{doc.author.name}</span>
                                                                </div>
                                                            )}
                                                            <span className="text-[11px] text-muted-foreground/30">·</span>
                                                            <span className="text-[11px] font-medium text-muted-foreground/80 flex items-center gap-1">
                                                                <Clock className="w-3 h-3 text-muted-foreground/50" />
                                                                {formatDate(doc.updatedAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                                    <FileText className="w-10 h-10 mb-3 opacity-50" />
                                    <p>No documents yet</p>
                                    <Button variant="link" asChild className="mt-2">
                                        <Link href={`/workspace/${slug}/documents?new=true`}>Create one now</Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right: Activity Feed + Online Team */}
                <div className="lg:col-span-4 space-y-5">
                    <ActivityFeed />

                    {/* Online Team Widget */}
                    <Card className="rounded-[20px] border border-border/40 shadow-sm bg-card/60 backdrop-blur-md overflow-hidden">
                        <CardHeader className="py-4 border-b border-border/40 bg-muted/20">
                            <CardTitle className="text-[15px] font-bold tracking-tight text-foreground/90 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                                        <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    Online Team
                                </div>
                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] animate-[pulse_2s_ease-in-out_infinite]" />
                                    {onlineUsers.length + 1}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                            <div className="flex flex-col gap-3">
                                {/* Current User */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="relative">
                                            <UserAvatar user={{ name: session?.user?.name, image: session?.user?.image }} className="h-8 w-8 border border-border/50" showStatus={false} />
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium leading-none">{session?.user?.name} (You)</span>
                                            <span className="text-xs text-muted-foreground mt-0.5">Active now</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Online Peers */}
                                {onlineUsers.map((onlineUser: { socketId: string; user: { id: string; name?: string; image?: string } }) => {
                                    const userId = onlineUser.user.id;
                                    const member = workspace?.members?.find((m) => m.userId === userId);
                                    const name = onlineUser.user.name || member?.user?.name || "Team Member";
                                    const image = onlineUser.user.image || member?.user?.image;

                                    return (
                                        <div key={onlineUser.socketId} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="relative">
                                                    <Avatar className="h-8 w-8 border border-border/50">
                                                        <UserAvatar user={{ name, image }} className="h-8 w-8" showStatus={false} />
                                                    </Avatar>
                                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium leading-none truncate max-w-[140px]">{name}</span>
                                                    <span className="text-xs text-muted-foreground mt-0.5">Active now</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
