// src/app/workspace/[slug]/epics/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useSharedSocket } from "@/components/providers/SocketProvider";
import { format } from "date-fns";
import { Target, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const EPIC_COLORS = [
    "#f87171", // red-400
    "#fb923c", // orange-400
    "#fbbf24", // amber-400
    "#4ade80", // green-400
    "#2dd4bf", // teal-400
    "#38bdf8", // sky-400
    "#818cf8", // indigo-400
    "#c084fc", // purple-400
    "#f472b6", // pink-400
    "#94a3b8", // slate-400
];

export default function EpicsPage() {
    const { data: session } = useSession();
    const params = useParams();
    const [epics, setEpics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Create dialog state
    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState(EPIC_COLORS[6]); // default indigo
    const [isCreating, setIsCreating] = useState(false);

    // Delete dialog state
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Socket
    const { socket, connected } = useSharedSocket();
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);

    // Initial fetch
    useEffect(() => {
        if (!params?.slug) return;
        
        const fetchWorkspace = async () => {
            try {
                const res = await fetch(`/api/workspaces/${params.slug}`);
                if (res.ok) {
                    const ws = await res.json();
                    setWorkspaceId(ws.id);
                }
            } catch (error) {
                console.error("Error fetching workspace details:", error);
            }
        };

        const fetchEpics = async () => {
            try {
                const res = await fetch(`/api/workspaces/${params.slug}/epics`);
                if (res.ok) {
                    const data = await res.json();
                    setEpics(data);
                }
            } catch (error) {
                console.error("Error fetching epics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkspace();
        fetchEpics();
    }, [params?.slug]);

    // Socket listeners
    useEffect(() => {
        if (!socket || !connected || !workspaceId || !session?.user) return;

        const user = {
            id: (session.user as any).id,
            name: session.user.name || "Anonymous",
            image: session.user.image || undefined,
        };

        // Join workspace room for events
        socket.emit("join-workspace", { workspaceId, user });

        const handleEpicCreated = (data: { workspaceId: string; epic: any }) => {
            setEpics(prev => {
                if (prev.find(e => e.id === data.epic.id)) return prev;
                return [data.epic, ...prev];
            });
        };

        const handleEpicUpdated = (data: { workspaceId: string; epic: any }) => {
            setEpics(prev => prev.map(e => e.id === data.epic.id ? data.epic : e));
        };

        const handleEpicDeleted = (data: { workspaceId: string; epicId: string }) => {
            setEpics(prev => prev.filter(e => e.id !== data.epicId));
        };

        socket.on("epic-created", handleEpicCreated);
        socket.on("epic-updated", handleEpicUpdated);
        socket.on("epic-deleted", handleEpicDeleted);

        return () => {
            socket.off("epic-created", handleEpicCreated);
            socket.off("epic-updated", handleEpicUpdated);
            socket.off("epic-deleted", handleEpicDeleted);
            socket.emit("leave-workspace", workspaceId);
        };
    }, [socket, connected, workspaceId, session]);

    const handleCreateEpic = async () => {
        if (!title.trim() || !params?.slug) return;
        setIsCreating(true);
        try {
            const res = await fetch(`/api/workspaces/${params.slug}/epics`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    color,
                }),
            });
            if (res.ok) {
                const newEpic = await res.json();
                setEpics(prev => [newEpic, ...prev]);
                if (workspaceId && socket && connected) {
                    socket.emit("epic-created", { workspaceId, epic: newEpic });
                }
                setCreateOpen(false);
                setTitle("");
                setDescription("");
                setColor(EPIC_COLORS[6]);
            }
        } catch (error) {
            console.error("Failed to create epic:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteEpic = async () => {
        if (!deleteId || !params?.slug) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/workspaces/${params.slug}/epics/${deleteId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setEpics(prev => prev.filter(e => e.id !== deleteId));
                if (workspaceId && socket && connected) {
                    socket.emit("epic-deleted", { workspaceId, epicId: deleteId });
                }
                setDeleteId(null);
            }
        } catch (error) {
            console.error("Failed to delete epic:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col h-full bg-background/95">
                <div className="flex-1 p-6 sm:p-8 space-y-6">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <div className="h-8 w-48 bg-muted/60 animate-pulse rounded-md mb-2" />
                            <div className="h-4 w-64 bg-muted/50 animate-pulse rounded-md" />
                        </div>
                        <div className="h-10 w-32 bg-muted/60 animate-pulse rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-background/95">
            <div className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <Target className="w-8 h-8 text-indigo-500" />
                            Epics
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage large bodies of work that can be broken down into specific tasks.
                        </p>
                    </div>
                    <Button 
                        onClick={() => setCreateOpen(true)} 
                        className="gap-2 shadow-sm rounded-lg hover:scale-[1.02] transition-transform"
                    >
                        <Plus className="w-4 h-4" />
                        Create Epic
                    </Button>
                </div>

                {/* Grid */}
                {epics.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 mt-12 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10 text-center">
                        <Target className="w-16 h-16 text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-semibold text-foreground">No epics yet</h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-sm mb-6">
                            Create an epic to organize a large project into smaller, manageable Kanban cards.
                        </p>
                        <Button onClick={() => setCreateOpen(true)}>Create your first epic</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {epics.map((epic) => (
                            <div key={epic.id} className="bg-card border border-border/60 rounded-xl overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                                <div className="h-2 w-full" style={{ backgroundColor: epic.color }} />
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-semibold text-lg hover:underline cursor-pointer flex-1 mr-4">
                                            {epic.title}
                                        </h3>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => { e.stopPropagation(); setDeleteId(epic.id); }}
                                            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 -mt-1 -mr-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
                                        {epic.description || "No description provided."}
                                    </p>
                                    
                                    <div className="mt-auto space-y-4">
                                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                                            <span>
                                                {epic.completedCards} of {epic.totalCards} tasks
                                            </span>
                                            <span>
                                                {epic.totalCards > 0 ? Math.round((epic.completedCards / epic.totalCards) * 100) : 0}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className="h-full transition-all" 
                                                style={{ 
                                                    width: `${epic.totalCards > 0 ? (epic.completedCards / epic.totalCards) * 100 : 0}%`,
                                                    backgroundColor: epic.color
                                                }} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Epic Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Epic</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
                            <Input 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                placeholder="e.g., Q3 Marketing Campaign" 
                                autoFocus 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                placeholder="What is the goal of this epic?" 
                                className="resize-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Color</label>
                            <div className="flex flex-wrap gap-2">
                                {EPIC_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                                        style={{ backgroundColor: c }}
                                    >
                                        {color === c && <div className="w-2 h-2 bg-white rounded-full opacity-80" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateEpic} disabled={!title.trim() || isCreating}>
                            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Epic
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Epic Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Epic</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground py-2">
                        Are you sure you want to delete this Epic? The Epic will be permanently removed.
                        Any cards currently assigned to this Epic will keep their existing data but will be unlinked from the Epic. 
                    </p>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteEpic} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Delete Epic
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
