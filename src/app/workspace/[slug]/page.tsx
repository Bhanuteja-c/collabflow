"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    FileText,
    Kanban,
    MessageSquare,
    Users,
    Plus,
    Clock,
    TrendingUp,
    Calendar,
} from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

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
                // Fetch workspace by slug
                const wsRes = await fetch(`/api/workspaces`);
                if (wsRes.ok) {
                    const workspaces = await wsRes.json();
                    const ws = workspaces.find((w: any) => w.slug === slug);
                    setWorkspace(ws);

                    if (ws) {
                        // Fetch recent documents for this workspace
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
            <div className="p-4 sm:p-6 lg:p-8 animate-pulse space-y-4">
                <div className="h-8 w-48 bg-muted rounded" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 bg-muted rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
            {/* Greeting */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                    {getGreeting()}, {session?.user?.name?.split(" ")[0] || "there"}!
                </h1>
                <p className="text-muted-foreground mt-1">
                    Welcome to <span className="font-medium text-foreground">{workspace?.name}</span>
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Documents
                        </CardTitle>
                        <FileText className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{workspace?._count?.documents || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Boards
                        </CardTitle>
                        <Kanban className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{workspace?._count?.boards || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Team Members
                        </CardTitle>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{workspace?._count?.members || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Activity
                        </CardTitle>
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">Active</div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                    <Button asChild>
                        <Link href={`/workspace/${slug}/documents?new=true`}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Document
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/workspace/${slug}/kanban`}>
                            <Kanban className="w-4 h-4 mr-2" />
                            View Boards
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/workspace/${slug}/chat`}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Open Chat
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/workspace/${slug}/members`}>
                            <Users className="w-4 h-4 mr-2" />
                            Invite Members
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Recent Documents & Activity Feed - Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Documents */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Recent Documents</h2>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={`/workspace/${slug}/documents`}>View all</Link>
                        </Button>
                    </div>

                    {recentDocs.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground mb-4">No documents yet</p>
                                <Button asChild>
                                    <Link href={`/workspace/${slug}/documents?new=true`}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create your first document
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-3">
                            {recentDocs.map((doc) => (
                                <Link
                                    key={doc.id}
                                    href={`/workspace/${slug}/editor/${doc.id}`}
                                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                >
                                    <FileText className="w-5 h-5 text-primary" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{doc.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Updated {formatDate(doc.updatedAt)}
                                        </p>
                                    </div>
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Activity Feed */}
                <ActivityFeed />
            </div>
        </div>
    );
}
