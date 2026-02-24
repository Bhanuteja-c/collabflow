"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, ChevronsUpDown, Plus, Building2, LogIn, Search, Loader2, Users, Globe, Hash } from "lucide-react";
import { toast } from "sonner";

interface Workspace {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    _count: {
        members: number;
    };
}

interface PublicWorkspace {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    owner: { id: string; name: string | null; image: string | null };
    memberCount: number;
    documentCount: number;
    boardCount: number;
    isMember: boolean;
}

interface WorkspaceSwitcherProps {
    currentSlug?: string;
}

export function WorkspaceSwitcher({ currentSlug }: WorkspaceSwitcherProps) {
    const router = useRouter();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [joinDialogOpen, setJoinDialogOpen] = useState(false);

    const currentWorkspace = workspaces.find((w) => w.slug === currentSlug);

    useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                const res = await fetch("/api/workspaces");
                if (res.ok) {
                    setWorkspaces(await res.json());
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchWorkspaces();
    }, []);

    const handleSelect = (slug: string) => {
        setOpen(false);
        router.push(`/workspace/${slug}`);
    };

    if (loading) {
        return (
            <div className="flex h-10 w-full animate-pulse items-center gap-2 rounded-md bg-muted/30 px-3" />
        );
    }

    return (
        <>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="w-full justify-between px-3 h-10 bg-muted/30 hover:bg-muted/50"
                    >
                        <div className="flex items-center gap-2 truncate">
                            {currentWorkspace ? (
                                <>
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={currentWorkspace.image || ""} />
                                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                            {currentWorkspace.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate font-medium">{currentWorkspace.name}</span>
                                </>
                            ) : (
                                <>
                                    <Building2 className="w-4 h-4" />
                                    <span>Select Workspace</span>
                                </>
                            )}
                        </div>
                        <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                    {workspaces.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No workspaces yet
                        </div>
                    ) : (
                        workspaces.map((workspace) => (
                            <DropdownMenuItem
                                key={workspace.id}
                                onClick={() => handleSelect(workspace.slug)}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={workspace.image || ""} />
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                        {workspace.name[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 truncate">
                                    <p className="truncate font-medium">{workspace.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {workspace._count.members} member{workspace._count.members !== 1 ? "s" : ""}
                                    </p>
                                </div>
                                {workspace.slug === currentSlug && (
                                    <Check className="w-4 h-4 text-primary" />
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => {
                            setOpen(false);
                            setJoinDialogOpen(true);
                        }}
                        className="cursor-pointer"
                    >
                        <LogIn className="w-4 h-4 mr-2" />
                        Join Workspace
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => router.push("/workspace/new")}
                        className="cursor-pointer"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Workspace
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <JoinWorkspaceDialog
                open={joinDialogOpen}
                onOpenChange={setJoinDialogOpen}
                onJoined={(slug) => {
                    // Refresh workspaces list then navigate
                    fetch("/api/workspaces").then(r => r.json()).then(setWorkspaces).catch(() => { });
                    router.push(`/workspace/${slug}`);
                }}
            />
        </>
    );
}

// ──────────────────────────────────────────────────────────
// Join Workspace Dialog — Invite Code + Browse Public tabs
// ──────────────────────────────────────────────────────────

function JoinWorkspaceDialog({
    open,
    onOpenChange,
    onJoined,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onJoined: (slug: string) => void;
}) {
    const [tab, setTab] = useState<"code" | "browse">("code");
    const [code, setCode] = useState("");
    const [joining, setJoining] = useState(false);

    // Browse public state
    const [publicWorkspaces, setPublicWorkspaces] = useState<PublicWorkspace[]>([]);
    const [search, setSearch] = useState("");
    const [browseLoading, setBrowseLoading] = useState(false);
    const [joiningSlug, setJoiningSlug] = useState<string | null>(null);

    // Fetch public workspaces when browse tab is shown
    const fetchPublic = useCallback(async (searchTerm: string) => {
        setBrowseLoading(true);
        try {
            const params = new URLSearchParams({ limit: "20" });
            if (searchTerm) params.set("search", searchTerm);
            const res = await fetch(`/api/workspaces/public?${params}`);
            if (res.ok) {
                const data = await res.json();
                setPublicWorkspaces(data.workspaces || []);
            }
        } catch (e) {
            console.error("Failed to fetch public workspaces:", e);
        } finally {
            setBrowseLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open && tab === "browse") {
            fetchPublic(search);
        }
    }, [open, tab]);

    // Debounced search
    useEffect(() => {
        if (tab !== "browse") return;
        const timer = setTimeout(() => fetchPublic(search), 300);
        return () => clearTimeout(timer);
    }, [search, tab, fetchPublic]);

    const handleJoinByCode = async () => {
        if (!code.trim()) return;
        setJoining(true);
        try {
            const res = await fetch("/api/workspaces/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: code.trim() }),
            });
            const data = await res.json();
            if (res.ok && data.slug) {
                toast.success(data.message || "Joined workspace!");
                onOpenChange(false);
                setCode("");
                onJoined(data.slug);
            } else {
                toast.error(data.error || "Failed to join");
            }
        } catch {
            toast.error("Failed to join workspace");
        } finally {
            setJoining(false);
        }
    };

    const handleJoinPublic = async (ws: PublicWorkspace) => {
        setJoiningSlug(ws.slug);
        try {
            const res = await fetch(`/api/workspaces/${ws.slug}/join`, {
                method: "POST",
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `Joined ${ws.name}!`);
                onOpenChange(false);
                onJoined(ws.slug);
            } else {
                toast.error(data.error || "Failed to join");
            }
        } catch {
            toast.error("Failed to join workspace");
        } finally {
            setJoiningSlug(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Join a Workspace</DialogTitle>
                </DialogHeader>

                {/* Tab switcher */}
                <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                    <button
                        onClick={() => setTab("code")}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${tab === "code"
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Hash className="w-3.5 h-3.5" />
                        Invite Code
                    </button>
                    <button
                        onClick={() => setTab("browse")}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${tab === "browse"
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <Globe className="w-3.5 h-3.5" />
                        Browse Public
                    </button>
                </div>

                {/* Invite Code tab */}
                {tab === "code" && (
                    <div className="space-y-4 pt-2">
                        <div>
                            <p className="text-sm text-muted-foreground mb-3">
                                Enter the invite code or workspace slug to join an existing workspace.
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g. my-workspace"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
                                    className="flex-1"
                                    autoFocus
                                />
                                <Button onClick={handleJoinByCode} disabled={!code.trim() || joining}>
                                    {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Browse Public tab */}
                {tab === "browse" && (
                    <div className="space-y-3 pt-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search public workspaces..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                                autoFocus
                            />
                        </div>

                        <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                            {browseLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : publicWorkspaces.length === 0 ? (
                                <div className="text-center py-8 text-sm text-muted-foreground">
                                    {search ? "No workspaces match your search" : "No public workspaces available"}
                                </div>
                            ) : (
                                publicWorkspaces.map((ws) => (
                                    <div
                                        key={ws.id}
                                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                                    >
                                        <Avatar className="h-10 w-10 flex-shrink-0 mt-0.5">
                                            <AvatarImage src={ws.image || ""} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                {ws.name[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{ws.name}</p>
                                            {ws.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                                    {ws.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {ws.memberCount} member{ws.memberCount !== 1 ? "s" : ""}
                                                </span>
                                                {ws.owner?.name && (
                                                    <span>by {ws.owner.name}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {ws.isMember ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-500/10 px-2.5 py-1.5 rounded-md">
                                                    <Check className="w-3 h-3" />
                                                    Member
                                                </span>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleJoinPublic(ws)}
                                                    disabled={joiningSlug === ws.slug}
                                                    className="h-8"
                                                >
                                                    {joiningSlug === ws.slug ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        "Join"
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
