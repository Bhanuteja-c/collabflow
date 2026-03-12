// src/app/workspace/[slug]/page.tsx
"use client";
// Force Next.js recompile

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    FileText,
    Plus,
    Clock,
    ArrowRight,
    Settings,
    Search,
    Calendar,
    Users,
    MessageSquare,
    LayoutGrid,
    PenTool
} from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { MyTasks } from "@/components/dashboard/MyTasks";
import { useWorkspacePresence } from "@/hooks/useWorkspacePresence";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WorkspaceDashboardProps {
    params: Promise<{ slug: string }>;
}

export default function WorkspaceDashboard({ params }: WorkspaceDashboardProps) {
    const { slug } = use(params);
    const { data: session } = useSession();
    const [workspace, setWorkspace] = useState<any>(null);
    const [recentDocs, setRecentDocs] = useState<any[]>([]);
    const [stats, setStats] = useState({
        docsCount: 0,
        tasksCount: 0,
        channelsCount: 0,
        membersCount: 0
    });
    const [loading, setLoading] = useState(true);
    const { onlineUsers } = useWorkspacePresence(workspace?.id);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch workspace
                const wsRes = await fetch(`/api/workspaces`);
                if (wsRes.ok) {
                    const workspaces = await wsRes.json();
                    const ws = workspaces.find((w: any) => w.slug === slug);
                    setWorkspace(ws);

                    if (ws) {
                        // Fetch recent docs & metrics in parallel
                        const [docsRes, allDocsRes, tasksRes, channelsRes, membersRes] = await Promise.all([
                            fetch(`/api/documents?workspaceId=${ws.id}&limit=5`),
                            fetch(`/api/documents?workspaceId=${ws.id}`), // for count
                            fetch(`/api/cards?workspaceId=${ws.id}`), // for count
                            fetch(`/api/channels?workspaceId=${ws.id}`), // for count
                            fetch(`/api/workspaces/${slug}/members`) // for count
                        ]);

                        if (docsRes.ok) setRecentDocs(await docsRes.json());
                        
                        const docsData = allDocsRes.ok ? await allDocsRes.json() : [];
                        const tasksData = tasksRes.ok ? await tasksRes.json() : [];
                        const channelsData = channelsRes.ok ? await channelsRes.json() : [];
                        const membersData = membersRes.ok ? await membersRes.json() : [];

                        setStats({
                            docsCount: docsData.length || 0,
                            tasksCount: tasksData.length || 0,
                            channelsCount: channelsData.filter((c: any) => c.type !== "direct").length || 0,
                            membersCount: membersData.length || 0
                        });
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
        // Trigger the global command palette
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    };

    if (loading) {
        return (
            <div className="p-8 space-y-8 animate-pulse">
                <div className="h-12 w-64 bg-muted rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-muted rounded-xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 h-96 bg-muted rounded-xl" />
                    <div className="h-96 bg-muted rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full p-4 md:p-6 space-y-6 md:space-y-8 max-w-7xl mx-auto">
            {/* Header / Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 md:p-8">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-primary font-medium flex items-center gap-2 mb-2"
                        >
                            <Calendar className="w-4 h-4" />
                            <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
                        >
                            {getGreeting()},{" "}
                            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                {session?.user?.name?.split(" ")[0]}
                            </span>
                        </motion.h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="rounded-full bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-background/80"
                            onClick={handleSearchClick}
                        >
                            <Search className="w-4 h-4" />
                        </Button>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            asChild
                            className="rounded-full bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-background/80"
                        >
                            <Link href={`/workspace/${slug}/settings`}>
                                <Settings className="w-4 h-4" />
                            </Link>
                        </Button>
                        <Button asChild className="rounded-full px-4 sm:px-6 shadow-lg shadow-primary/20">
                            <Link href={`/workspace/${slug}/documents?new=true`}>
                                <Plus className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Create Project</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-8">
                    {/* My Tasks (Moved here for prominence) */}
                    <div className="flex flex-col gap-4">
                        <MyTasks workspaceId={workspace?.id} />
                    </div>

                    {/* Recent Documents */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold tracking-tight">Recent Work</h2>
                            <Button variant="ghost" size="sm" asChild className="hover:bg-transparent hover:text-primary">
                                <Link href={`/workspace/${slug}/documents`} className="flex items-center gap-1">
                                    View all <ArrowRight className="w-4 h-4" />
                                </Link>
                            </Button>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {recentDocs.length > 0 ? (
                                recentDocs.map((doc, i) => (
                                    <motion.div
                                        key={doc.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Link href={`/workspace/${slug}/editor/${doc.id}`}>
                                            <Card className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary cursor-pointer group h-full">
                                                <CardContent className="p-4 flex gap-4 items-start">
                                                    <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                                        <FileText className="w-6 h-6 text-blue-500 transition-colors" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-medium truncate group-hover:text-primary transition-colors">{doc.title}</h3>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                            <Clock className="w-3 h-3" />
                                                            Updated {formatDate(doc.updatedAt)}
                                                        </p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    </motion.div>
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

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <ActivityFeed />
                    
                    {/* Online Team Widget */}
                    <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    Online Team
                                </div>
                                <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[pulse_2s_ease-in-out_infinite]" />
                                    {onlineUsers.length + 1}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="flex flex-col gap-4">
                                {/* Current User */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Avatar className="h-9 w-9 border border-border/50">
                                                <AvatarImage src={session?.user?.image || ""} />
                                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                                    {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium leading-none">{session?.user?.name} (You)</span>
                                            <span className="text-xs text-muted-foreground mt-1">Active now</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Online Peers */}
                                {onlineUsers.map((onlineUser: any) => {
                                    const userId = onlineUser.user.id;
                                    const member = workspace?.members?.find((m: any) => m.userId === userId);
                                    let name = onlineUser.user.name || member?.user?.name || "Team Member";
                                    let image = onlineUser.user.image || member?.user?.image;

                                    return (
                                        <div key={onlineUser.socketId} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <Avatar className="h-9 w-9 border border-border/50">
                                                        <AvatarImage src={image || ""} />
                                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                                            {name.charAt(0)?.toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium leading-none truncate max-w-[140px]">{name}</span>
                                                    <span className="text-xs text-muted-foreground mt-1">Active now</span>
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
