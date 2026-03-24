// src/app/explore/page.tsx
// Public workspace discovery page
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Users,
    FileText,
    Kanban,
    ArrowRight,
    Loader2,
    Globe,
    CheckCircle,
    Sparkles,
} from "lucide-react";

interface PublicWorkspace {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    owner: { id: string; name: string; image: string | null };
    memberCount: number;
    documentCount: number;
    boardCount: number;
    isMember: boolean;
    memberRole: string | null;
    createdAt: string;
}

export default function ExplorePage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [workspaces, setWorkspaces] = useState<PublicWorkspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [joining, setJoining] = useState<string | null>(null);

    useEffect(() => {
        fetchWorkspaces();
    }, [search]);

    const fetchWorkspaces = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);

            const res = await fetch(`/api/workspaces/public?${params}`);
            if (res.ok) {
                const data = await res.json();
                setWorkspaces(data.workspaces);
            }
        } catch (error) {
            console.error("Failed to fetch workspaces:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (workspace: PublicWorkspace) => {
        if (!session) {
            router.push("/sign-in");
            return;
        }

        setJoining(workspace.slug);
        try {
            const res = await fetch(`/api/workspaces/${workspace.slug}/join`, {
                method: "POST",
            });

            if (res.ok) {
                // Update local state
                setWorkspaces(prev => prev.map(ws =>
                    ws.id === workspace.id
                        ? { ...ws, isMember: true, memberRole: "member" }
                        : ws
                ));
                // Navigate to workspace
                router.push(`/workspace/${workspace.slug}`);
            } else {
                const data = await res.json();
                alert(data.error || "Failed to join");
            }
        } catch (error) {
            console.error("Failed to join:", error);
        } finally {
            setJoining(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
            {/* Header */}
            <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-primary" />
                        <span className="font-bold text-xl">CollabFlow</span>
                    </Link>
                    {session ? (
                        <Button asChild variant="outline">
                            <Link href="/workspaces">My Workspaces</Link>
                        </Button>
                    ) : (
                        <Button asChild>
                            <Link href="/sign-in">Sign In</Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* Hero */}
            <div className="max-w-6xl mx-auto px-4 py-12 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Globe className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl sm:text-4xl font-bold">Explore Public Workspaces</h1>
                </div>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
                    Discover and join open communities, projects, and teams
                </p>

                {/* Search */}
                <div className="max-w-md mx-auto relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        placeholder="Search workspaces..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-12 text-lg"
                    />
                </div>
            </div>

            {/* Workspaces Grid */}
            <div className="max-w-6xl mx-auto px-4 pb-12">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : workspaces.length === 0 ? (
                    <div className="text-center py-12">
                        <Globe className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No public workspaces found</p>
                        {search && (
                            <Button
                                variant="link"
                                onClick={() => setSearch("")}
                                className="mt-2"
                            >
                                Clear search
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workspaces.map((ws, index) => (
                            <motion.div
                                key={ws.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="h-full hover:shadow-lg transition-shadow group">
                                    <CardContent className="p-6">
                                        {/* Header */}
                                        <div className="flex items-start gap-4 mb-4">
                                            <UserAvatar user={ws} className="h-12 w-12 rounded-lg" showStatus={false} />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                                                    {ws.name}
                                                </h3>
                                                <p className="text-sm text-muted-foreground truncate">
                                                    by {ws.owner.name}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {ws.description && (
                                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                                {ws.description}
                                            </p>
                                        )}

                                        {/* Stats */}
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                            <div className="flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                <span>{ws.memberCount}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <FileText className="w-4 h-4" />
                                                <span>{ws.documentCount}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Kanban className="w-4 h-4" />
                                                <span>{ws.boardCount}</span>
                                            </div>
                                        </div>

                                        {/* Action */}
                                        {ws.isMember ? (
                                            <Button asChild className="w-full" variant="outline">
                                                <Link href={`/workspace/${ws.slug}`}>
                                                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                                    Open Workspace
                                                </Link>
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-full"
                                                onClick={() => handleJoin(ws)}
                                                disabled={joining === ws.slug}
                                            >
                                                {joining === ws.slug ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <ArrowRight className="w-4 h-4 mr-2" />
                                                )}
                                                Join Workspace
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
