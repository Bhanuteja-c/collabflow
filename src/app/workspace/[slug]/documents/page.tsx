"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    FileText,
    Plus,
    Search,
    Grid3X3,
    List,
    Clock,
    MoreVertical,
    Trash2,
    Copy,
    Loader2,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WorkspaceDocumentsProps {
    params: Promise<{ slug: string }>;
}

export default function WorkspaceDocuments({ params }: WorkspaceDocumentsProps) {
    const { slug } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();

    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [search, setSearch] = useState("");
    const [view, setView] = useState<"grid" | "list">("grid");
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);

    // Fetch workspace ID first
    useEffect(() => {
        const fetchWorkspace = async () => {
            const res = await fetch("/api/workspaces");
            if (res.ok) {
                const workspaces = await res.json();
                const ws = workspaces.find((w: any) => w.slug === slug);
                if (ws) {
                    setWorkspaceId(ws.id);
                }
            }
        };
        fetchWorkspace();
    }, [slug]);

    // Fetch documents once we have workspaceId
    useEffect(() => {
        if (!workspaceId) return;

        const fetchDocs = async () => {
            try {
                const res = await fetch(`/api/documents?workspaceId=${workspaceId}`);
                if (res.ok) {
                    setDocuments(await res.json());
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchDocs();
    }, [workspaceId]);

    // Auto-create new document if ?new=true
    useEffect(() => {
        if (searchParams.get("new") === "true" && workspaceId && !creating) {
            handleCreateDocument();
        }
    }, [searchParams, workspaceId]);

    const handleCreateDocument = async () => {
        if (!workspaceId || creating) return;
        setCreating(true);
        try {
            const res = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId }),
            });
            if (res.ok) {
                const doc = await res.json();
                router.push(`/workspace/${slug}/editor/${doc.id}`);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (docId: string) => {
        if (!confirm("Delete this document?")) return;
        try {
            await fetch(`/api/documents/${docId}`, { method: "DELETE" });
            setDocuments((prev) => prev.filter((d) => d.id !== docId));
        } catch (e) {
            console.error(e);
        }
    };

    const handleCopyLink = (docId: string) => {
        navigator.clipboard.writeText(`${window.location.origin}/workspace/${slug}/editor/${docId}`);
    };

    const filteredDocs = documents.filter((doc) =>
        doc.title.toLowerCase().includes(search.toLowerCase())
    );

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Documents</h1>
                    <p className="text-muted-foreground">{documents.length} document{documents.length !== 1 ? "s" : ""}</p>
                </div>
                <Button onClick={handleCreateDocument} disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    New Document
                </Button>
            </div>

            {/* Search & View Toggle */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search documents..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex border rounded-lg">
                    <Button
                        variant={view === "grid" ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setView("grid")}
                    >
                        <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={view === "list" ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setView("list")}
                    >
                        <List className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Documents */}
            {filteredDocs.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No documents found</h3>
                        <p className="text-muted-foreground mb-6">
                            {search ? "Try a different search term" : "Create your first document to get started"}
                        </p>
                        {!search && (
                            <Button onClick={handleCreateDocument} disabled={creating}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Document
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : view === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredDocs.map((doc) => (
                        <Link
                            key={doc.id}
                            href={`/workspace/${slug}/editor/${doc.id}`}
                            className="group"
                        >
                            <Card className="hover:border-primary/50 transition-colors h-full">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-primary" />
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleCopyLink(doc.id); }}>
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copy Link
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={(e) => { e.preventDefault(); handleDelete(doc.id); }}
                                                    className="text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <h3 className="font-medium truncate mb-1">{doc.title}</h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(doc.updatedAt)}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredDocs.map((doc) => (
                        <Link
                            key={doc.id}
                            href={`/workspace/${slug}/editor/${doc.id}`}
                            className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                        >
                            <FileText className="w-5 h-5 text-primary" />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{doc.title}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">{formatDate(doc.updatedAt)}</p>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleCopyLink(doc.id); }}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Link
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={(e) => { e.preventDefault(); handleDelete(doc.id); }}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
