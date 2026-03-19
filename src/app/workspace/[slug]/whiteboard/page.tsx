// src/app/workspace/[slug]/whiteboard/page.tsx
// Whiteboard list page — displays all workspace whiteboards with create/delete
"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    PenTool,
    Plus,
    Loader2,
    Trash2,
    Clock,
    MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface Whiteboard {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    createdBy: { id: string; name: string | null; image: string | null };
}

export default function WhiteboardListPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetch(`/api/workspaces/${slug}/whiteboards`)
            .then(res => res.ok ? res.json() : [])
            .then(data => setWhiteboards(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [slug]);

    useEffect(() => {
        if (searchParams.get("new") === "true" && !creating && !loading) {
            handleCreate();
        }
    }, [searchParams, creating, loading]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCreate = async () => {
        setCreating(true);
        try {
            const res = await fetch(`/api/workspaces/${slug}/whiteboards`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Untitled Whiteboard" }),
            });
            if (res.ok) {
                const wb = await res.json();
                router.push(`/workspace/${slug}/whiteboard/${wb.id}`);
            }
        } catch (e) {
            console.error("Failed to create whiteboard:", e);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await fetch(`/api/whiteboards/${id}`, { method: "DELETE" });
            setWhiteboards(prev => prev.filter(w => w.id !== id));
        } catch (e) {
            console.error("Failed to delete whiteboard:", e);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground font-medium">Loading whiteboards...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto bg-background">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border/30">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <PenTool className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">Whiteboards</h1>
                            <p className="text-xs text-muted-foreground">Collaborative drawing canvases</p>
                        </div>
                    </div>
                    <Button onClick={handleCreate} disabled={creating} size="sm" className="gap-2">
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        New Whiteboard
                    </Button>
                </motion.div>
            </div>

            {/* Whiteboard Grid */}
            <div className="p-6 max-w-[1200px] mx-auto">
                {whiteboards.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-24"
                    >
                        <div className="p-6 rounded-full bg-muted/30 mb-6">
                            <PenTool className="w-12 h-12 text-muted-foreground/50" />
                        </div>
                        <h2 className="text-lg font-semibold text-foreground mb-1">No whiteboards yet</h2>
                        <p className="text-sm text-muted-foreground mb-6">Create your first whiteboard to start collaborating</p>
                        <Button onClick={handleCreate} disabled={creating} className="gap-2">
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create Whiteboard
                        </Button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {whiteboards.map((wb, i) => (
                                <motion.div
                                    key={wb.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => router.push(`/workspace/${slug}/whiteboard/${wb.id}`)}
                                    className="group relative cursor-pointer rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg transition-all duration-200"
                                >
                                    {/* Canvas preview area */}
                                    <div className="h-40 rounded-t-xl bg-gradient-to-br from-muted/20 via-muted/10 to-background flex items-center justify-center overflow-hidden">
                                        <PenTool className="w-10 h-10 text-muted-foreground/20 group-hover:text-primary/30 transition-colors" />
                                    </div>

                                    {/* Info */}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-semibold text-foreground truncate">{wb.title}</h3>
                                                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(wb.updatedAt), "MMM d, yyyy")}
                                                </div>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreVertical className="w-3.5 h-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-red-500 focus:text-red-500"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(wb.id);
                                                        }}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    {/* Subtle accent */}
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary/10 group-hover:bg-primary/30 rounded-b-xl transition-colors" />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
