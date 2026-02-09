// src/app/workspace/[slug]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    FileText,
    Kanban,
    MessageSquare,
    Users,
    Plus,
    Clock,
    TrendingUp,
    Calendar,
    ArrowRight,
    Sparkles,
    MoreHorizontal,
    Video,
    Settings,
    Search
} from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
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
    const [loading, setLoading] = useState(true);

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
                        // Fetch recent docs
                        const docsRes = await fetch(`/api/documents?workspaceId=${ws.id}&limit=5`);
                        if (docsRes.ok) {
                            setRecentDocs(await docsRes.json());
                        }
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
        <div className="min-h-full p-6 space-y-8 max-w-7xl mx-auto">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-muted-foreground font-medium flex items-center gap-2 mb-1"
                    >
                        <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl font-bold tracking-tight"
                    >
                        {getGreeting()}, <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{session?.user?.name?.split(" ")[0]}</span>
                    </motion.h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="rounded-full">
                        <Search className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full">
                        <Settings className="w-4 h-4" />
                    </Button>
                    <Button asChild className="rounded-full px-6 shadow-lg shadow-primary/20">
                        <Link href={`/workspace/${slug}/documents?new=true`}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Project
                        </Link>
                    </Button>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Documents"
                    value={workspace?._count?.documents || 0}
                    icon={FileText}
                    trend="+12% this week"
                    color="text-blue-500"
                    bgColor="bg-blue-500/10"
                    delay={0.1}
                />
                <StatsCard
                    title="Boards"
                    value={workspace?._count?.boards || 0}
                    icon={Kanban}
                    trend="Active Projects"
                    color="text-orange-500"
                    bgColor="bg-orange-500/10"
                    delay={0.2}
                />
                <StatsCard
                    title="Team Members"
                    value={workspace?._count?.members || 0}
                    icon={Users}
                    trend="2 Online Now"
                    color="text-emerald-500"
                    bgColor="bg-emerald-500/10"
                    delay={0.3}
                />
                <StatsCard
                    title="Meetings"
                    value="Start"
                    icon={Video}
                    trend="HD Video Ready"
                    color="text-purple-500"
                    bgColor="bg-purple-500/10"
                    delay={0.4}
                    isAction
                    href={`/workspace/${slug}/video`}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Quick Actions */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            Quick Actions
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <QuickAction
                                icon={FileText}
                                label="New Doc"
                                desc="Start writing"
                                href={`/workspace/${slug}/documents?new=true`}
                                color="bg-blue-500"
                            />
                            <QuickAction
                                icon={Kanban}
                                label="New Board"
                                desc="Plan tasks"
                                href={`/workspace/${slug}/kanban`}
                                color="bg-orange-500"
                            />
                            <QuickAction
                                icon={Video}
                                label="Start Meeting"
                                desc="Join room"
                                href={`/workspace/${slug}/video`}
                                color="bg-purple-500"
                            />
                            <QuickAction
                                icon={Users}
                                label="Invite Team"
                                desc="Add members"
                                href={`/workspace/${slug}/members`}
                                color="bg-emerald-500"
                            />
                        </div>
                    </section>

                    {/* Recent Documents */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Recent Work</h2>
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
                                            <Card className="hover:shadow-md transition-all border-l-4 border-l-primary/0 hover:border-l-primary cursor-pointer group">
                                                <CardContent className="p-4 flex gap-4 items-start">
                                                    <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                                                        <FileText className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
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

                    {/* Mini Calendar / Tips could go here too */}
                    <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                Pro Tip
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground/80 leading-relaxed">
                                Use <kbd className="bg-background border rounded px-1 text-[10px] font-mono mx-1">Cmd+K</kbd> to open the command palette and quickly navigate between documents and boards.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, trend, color, bgColor, delay, isAction, href }: any) {
    const content = (
        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg ${bgColor}`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    {isAction && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <h3 className="text-2xl font-bold mt-1">{value}</h3>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500 font-medium">{trend}</span>
                    </p>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
        >
            {isAction && href ? <Link href={href}>{content}</Link> : content}
        </motion.div>
    );
}

function QuickAction({ icon: Icon, label, desc, href, color }: any) {
    return (
        <Link href={href} className="block group">
            <div className="bg-card hover:bg-accent/50 border rounded-xl p-4 transition-all duration-200 hover:shadow-md h-full flex flex-col items-center text-center gap-3 group-hover:-translate-y-1">
                <div className={`p-3 rounded-full text-white shadow-md ${color} bg-opacity-90 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-medium text-sm">{label}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
            </div>
        </Link>
    );
}
