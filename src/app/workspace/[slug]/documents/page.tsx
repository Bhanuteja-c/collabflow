"use client";

import { useState, useEffect, use, useMemo } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Badge } from "@/components/ui/badge";
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
    BookOpen,
    ListChecks,
    Presentation,
    FileQuestion,
    X,
    Sparkles,
    Star,
    ArrowUpDown,
    SortAsc,
    SortDesc,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface WorkspaceDocumentsProps {
    params: Promise<{ slug: string }>;
}

interface Template {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    content: string;
    color: string;
}

const TEMPLATES: Template[] = [
    {
        id: "blank",
        title: "Blank Document",
        description: "Start from scratch",
        icon: <FileText className="w-6 h-6" />,
        content: "",
        color: "text-muted-foreground",
    },
    {
        id: "meeting",
        title: "Meeting Notes",
        description: "Agenda, decisions & action items",
        icon: <ListChecks className="w-6 h-6" />,
        content: `# Meeting Notes

## Date
${new Date().toLocaleDateString()}

## Attendees
- 

## Agenda
1. 

## Discussion
- 

## Action Items
- [ ] 

## Next Meeting
- Date: 
- Topics: `,
        color: "text-blue-500",
    },
    {
        id: "project-brief",
        title: "Project Brief",
        description: "Goals, scope & timeline",
        icon: <Presentation className="w-6 h-6" />,
        content: `# Project Brief

## Overview
Brief description of the project.

## Goals
- 

## Scope
### In Scope
- 

### Out of Scope
- 

## Timeline
| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1 | | |
| Phase 2 | | |

## Team
| Role | Member |
|------|--------|
| Lead | |
| Dev  | |

## Success Metrics
- `,
        color: "text-orange-500",
    },
    {
        id: "wiki",
        title: "Wiki / Knowledge Base",
        description: "Document processes & knowledge",
        icon: <BookOpen className="w-6 h-6" />,
        content: `# [Topic Title]

## Overview
A brief summary of what this document covers.

## Details

### Section 1
Content here...

### Section 2
Content here...

## FAQ
**Q: **
A: 

## References
- `,
        color: "text-emerald-500",
    },
    {
        id: "standup",
        title: "Daily Standup",
        description: "Yesterday, today & blockers",
        icon: <FileQuestion className="w-6 h-6" />,
        content: `# Daily Standup — ${new Date().toLocaleDateString()}

## ✅ Yesterday
- 

## 🎯 Today
- 

## 🚧 Blockers
- None`,
        color: "text-purple-500",
    },
];

type SortOption = "updated" | "created" | "alpha";
type FilterTab = "all" | "starred";

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
    const [showTemplates, setShowTemplates] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>("updated");
    const [filterTab, setFilterTab] = useState<FilterTab>("all");

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
            handleCreateFromTemplate(TEMPLATES[0]); // blank
        }
    }, [searchParams, workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCreateFromTemplate = async (template: Template) => {
        if (!workspaceId || creating) return;
        setCreating(true);
        setShowTemplates(false);
        try {
            const res = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId,
                    title: template.id === "blank" ? undefined : template.title,
                    content: template.content || undefined,
                }),
            });
            if (res.ok) {
                const doc = await res.json();
                router.push(`/workspace/${slug}/editor/${doc.id}`);
            } else {
                toast.error("Failed to create document");
            }
        } catch (e) {
            toast.error("Failed to create document");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (docId: string) => {
        if (!confirm("Delete this document?")) return;
        try {
            await fetch(`/api/documents/${docId}`, { method: "DELETE" });
            setDocuments((prev) => prev.filter((d) => d.id !== docId));
            toast.success("Document deleted");
        } catch (e) {
            toast.error("Failed to delete document");
        }
    };

    const handleCopyLink = (docId: string) => {
        navigator.clipboard.writeText(`${window.location.origin}/workspace/${slug}/editor/${docId}`);
        toast.success("Link copied to clipboard");
    };

    const toggleStar = async (e: React.MouseEvent, docId: string) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const res = await fetch(`/api/documents/${docId}/star`, { method: "POST" });
            if (res.ok) {
                const { starred } = await res.json();
                setDocuments(prev =>
                    prev.map(d => d.id === docId ? { ...d, isStarred: starred } : d)
                );
                toast.success(starred ? "Document starred" : "Document unstarred");
            }
        } catch (e) {
            toast.error("Failed to toggle star");
        }
    };

    // Check if a doc was recently edited (within 24 hours)
    const isRecentlyEdited = (updatedAt: string) => {
        const diff = Date.now() - new Date(updatedAt).getTime();
        return diff < 24 * 60 * 60 * 1000;
    };

    // Filter and sort documents
    const filteredDocs = useMemo(() => {
        let docs = documents.filter((doc) =>
            doc.title.toLowerCase().includes(search.toLowerCase())
        );

        // Filter by tab
        if (filterTab === "starred") {
            docs = docs.filter(d => d.isStarred);
        }

        // Sort — starred always first, then by selected sort
        docs.sort((a, b) => {
            // Starred first
            if (a.isStarred && !b.isStarred) return -1;
            if (!a.isStarred && b.isStarred) return 1;

            switch (sortBy) {
                case "alpha":
                    return a.title.localeCompare(b.title);
                case "created":
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case "updated":
                default:
                    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
        });

        return docs;
    }, [documents, search, sortBy, filterTab]);

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const starredCount = documents.filter(d => d.isStarred).length;

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">Documents</h1>
                    <p className="text-sm text-muted-foreground">{documents.length} document{documents.length !== 1 ? "s" : ""}</p>
                </div>
                <Button onClick={() => setShowTemplates(true)} disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 sm:mr-2" />}
                    <span className="hidden sm:inline">New Document</span>
                </Button>
            </div>

            {/* Template picker modal */}
            <AnimatePresence>
                {showTemplates && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                            onClick={() => setShowTemplates(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-50"
                        >
                            <div className="bg-card border rounded-xl shadow-lg overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-4 border-b">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        <h2 className="font-semibold text-sm">Choose a template</h2>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTemplates(false)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {TEMPLATES.map((template) => (
                                        <button
                                            key={template.id}
                                            onClick={() => handleCreateFromTemplate(template)}
                                            className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 text-left transition-all group"
                                        >
                                            <div className={`p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors ${template.color}`}>
                                                {template.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-medium text-sm group-hover:text-primary transition-colors">{template.title}</h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Filter Tabs + Search & Controls */}
            <div className="space-y-3">
                {/* Filter tabs */}
                <div className="flex items-center gap-1 border-b">
                    <button
                        onClick={() => setFilterTab("all")}
                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                            filterTab === "all"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterTab("starred")}
                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                            filterTab === "starred"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Star className="w-3.5 h-3.5" />
                        Starred
                        {starredCount > 0 && (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                                {starredCount}
                            </Badge>
                        )}
                    </button>
                </div>

                {/* Search & Sort & View Toggle */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search documents..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Sort dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <ArrowUpDown className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Sort</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSortBy("updated")} className={sortBy === "updated" ? "bg-muted" : ""}>
                                <Clock className="w-3.5 h-3.5 mr-2" /> Last Modified
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy("created")} className={sortBy === "created" ? "bg-muted" : ""}>
                                <SortDesc className="w-3.5 h-3.5 mr-2" /> Created Date
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy("alpha")} className={sortBy === "alpha" ? "bg-muted" : ""}>
                                <SortAsc className="w-3.5 h-3.5 mr-2" /> Alphabetical
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

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
            </div>

            {/* Documents */}
            {filteredDocs.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                            {filterTab === "starred" ? "No starred documents" : "No documents found"}
                        </h3>
                        <p className="text-muted-foreground mb-6">
                            {filterTab === "starred"
                                ? "Star important documents for quick access"
                                : search ? "Try a different search term" : "Create your first document to get started"}
                        </p>
                        {!search && filterTab === "all" && (
                            <Button onClick={() => setShowTemplates(true)} disabled={creating}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Document
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                                        <div className="flex items-center gap-1">
                                            {/* Star toggle */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`h-7 w-7 ${doc.isStarred ? "text-amber-500" : "opacity-0 group-hover:opacity-100"}`}
                                                onClick={(e) => toggleStar(e, doc.id)}
                                            >
                                                <Star className={`w-4 h-4 ${doc.isStarred ? "fill-current" : ""}`} />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7">
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
                                    </div>
                                    <h3 className="font-medium truncate mb-1">{doc.title}</h3>
                                    <div className="flex items-center gap-2">
                                        {/* Author avatar */}
                                        {doc.author && (
                                            <UserAvatar user={{ name: doc.author?.name, image: doc.author?.image }} className="w-4 h-4" showStatus={false} />
                                        )}
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(doc.updatedAt)}
                                        </p>
                                        {/* Recently edited badge */}
                                        {isRecentlyEdited(doc.updatedAt) && (
                                            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-medium">
                                                Recent
                                            </Badge>
                                        )}
                                    </div>
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
                            <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium truncate">{doc.title}</p>
                                    {isRecentlyEdited(doc.updatedAt) && (
                                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-medium flex-shrink-0">
                                            Recent
                                        </Badge>
                                    )}
                                </div>
                                {doc.author && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{doc.author.name}</p>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground flex-shrink-0">{formatDate(doc.updatedAt)}</p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-7 w-7 ${doc.isStarred ? "text-amber-500" : "opacity-0 group-hover:opacity-100"}`}
                                    onClick={(e) => toggleStar(e, doc.id)}
                                >
                                    <Star className={`w-4 h-4 ${doc.isStarred ? "fill-current" : ""}`} />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7">
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
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
