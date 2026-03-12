"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    FileText, ChevronRight, ChevronDown, Plus, Loader2,
    MoreHorizontal, Trash2, Pencil, FilePlus, FolderPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface Doc {
    id: string;
    title: string;
    parentId: string | null;
    updatedAt?: string;
}

interface DocumentTreeProps {
    workspaceId: string;
    workspaceSlug: string;
    onItemClick?: () => void;
}

export function DocumentTree({ workspaceId, workspaceSlug, onItemClick }: DocumentTreeProps) {
    const [documents, setDocuments] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchDocs = async () => {
        try {
            const res = await fetch(`/api/documents?workspaceId=${workspaceId}`);
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (err) {
            console.error("Failed to load documents tree", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!workspaceId) return;
        fetchDocs();
    }, [workspaceId]);

    const rootDocs = useMemo(() => {
        return documents.filter(doc => !doc.parentId);
    }, [documents]);

    const handleCreateRoot = async () => {
        try {
            const res = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId, title: "Untitled Document" })
            });
            if (res.ok) {
                const doc = await res.json();
                setDocuments(prev => [...prev, doc]);
                router.push(`/workspace/${workspaceSlug}/editor/${doc.id}`);
                if (onItemClick) onItemClick();
            } else {
                toast.error("Failed to create document");
            }
        } catch (e) {
            toast.error("An error occurred");
        }
    };

    const handleDelete = async (docId: string) => {
        try {
            const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
            if (res.ok) {
                setDocuments(prev => prev.filter(d => d.id !== docId));
                toast.success("Document deleted");
            } else {
                toast.error("Failed to delete document");
            }
        } catch (e) {
            toast.error("An error occurred");
        }
    };

    const handleRename = async (docId: string, newTitle: string) => {
        if (!newTitle.trim()) return;
        try {
            const res = await fetch(`/api/documents/${docId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle.trim() }),
            });
            if (res.ok) {
                setDocuments(prev => prev.map(d => d.id === docId ? { ...d, title: newTitle.trim() } : d));
            } else {
                toast.error("Failed to rename");
            }
        } catch (e) {
            toast.error("An error occurred");
        }
    };

    const handleCreateChild = async (parentId: string) => {
        try {
            const res = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId, parentId, title: "Untitled Document" })
            });
            if (res.ok) {
                const newDoc = await res.json();
                setDocuments(prev => [...prev, newDoc]);
                router.push(`/workspace/${workspaceSlug}/editor/${newDoc.id}`);
                if (onItemClick) onItemClick();
            } else {
                toast.error("Failed to create nested document");
            }
        } catch (err) {
            toast.error("An error occurred");
        }
    };

    if (loading) {
        return (
            <div className="px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Loading docs...</span>
            </div>
        );
    }

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between px-3 mb-1 group">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Documents
                </p>
                <button
                    onClick={handleCreateRoot}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground transition-all"
                    title="New Document"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="space-y-0.5">
                {rootDocs.length === 0 ? (
                    <button
                        onClick={handleCreateRoot}
                        className="w-full px-3 py-3 flex flex-col items-center gap-1.5 text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors cursor-pointer"
                    >
                        <FilePlus className="w-5 h-5" />
                        <span className="text-[11px]">No pages yet — click to create</span>
                    </button>
                ) : (
                    rootDocs.map(doc => (
                        <DocumentNode
                            key={doc.id}
                            doc={doc}
                            allDocs={documents}
                            workspaceSlug={workspaceSlug}
                            level={0}
                            onItemClick={onItemClick}
                            onDelete={handleDelete}
                            onRename={handleRename}
                            onCreateChild={handleCreateChild}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function DocumentNode({
    doc,
    allDocs,
    workspaceSlug,
    level,
    onItemClick,
    onDelete,
    onRename,
    onCreateChild,
}: {
    doc: Doc;
    allDocs: Doc[];
    workspaceSlug: string;
    level: number;
    onItemClick?: () => void;
    onDelete: (id: string) => void;
    onRename: (id: string, title: string) => void;
    onCreateChild: (parentId: string) => void;
}) {
    const pathname = usePathname();
    const children = allDocs.filter(d => d.parentId === doc.id);

    const isActive = pathname === `/workspace/${workspaceSlug}/editor/${doc.id}`;
    const [expanded, setExpanded] = useState(
        pathname.includes(`/workspace/${workspaceSlug}/editor/`) && children.length > 0
    );

    // Inline rename state
    const [renaming, setRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(doc.title);
    const renameInputRef = useRef<HTMLInputElement>(null);

    const startRename = () => {
        setRenameValue(doc.title);
        setRenaming(true);
        setTimeout(() => renameInputRef.current?.select(), 50);
    };

    const commitRename = () => {
        if (renameValue.trim() && renameValue.trim() !== doc.title) {
            onRename(doc.id, renameValue.trim());
        }
        setRenaming(false);
    };

    const timeAgo = doc.updatedAt
        ? formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })
        : null;

    return (
        <div>
            <div
                className={cn(
                    "group flex items-center justify-between py-1.5 px-2 rounded-md transition-colors cursor-pointer text-sm",
                    isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                style={{ paddingLeft: `${(level * 12) + 8}px` }}
            >
                <div className="flex items-center gap-1 overflow-hidden flex-1 min-w-0">
                    {/* Expand/collapse toggle */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setExpanded(!expanded);
                        }}
                        className={cn(
                            "p-0.5 rounded hover:bg-muted/80 transition-colors shrink-0",
                            children.length === 0 && "opacity-0 pointer-events-none"
                        )}
                    >
                        {expanded
                            ? <ChevronDown className="w-3.5 h-3.5" />
                            : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>

                    {renaming ? (
                        <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename();
                                if (e.key === "Escape") setRenaming(false);
                            }}
                            autoFocus
                            className="flex-1 min-w-0 bg-muted/50 border border-border/50 rounded px-1.5 py-0.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/40"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <Link
                            href={`/workspace/${workspaceSlug}/editor/${doc.id}`}
                            onClick={onItemClick}
                            className="flex items-center gap-2 truncate min-w-0"
                            title={timeAgo ? `Last edited ${timeAgo}` : doc.title}
                        >
                            <FileText className="w-4 h-4 shrink-0 opacity-70" />
                            <span className="truncate">{doc.title}</span>
                        </Link>
                    )}
                </div>

                {/* Actions dropdown */}
                {!renaming && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted/80 text-muted-foreground transition-all shrink-0"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => startRename()} className="gap-2 text-xs">
                                <Pencil className="w-3.5 h-3.5" />
                                Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    setExpanded(true);
                                    onCreateChild(doc.id);
                                }}
                                className="gap-2 text-xs"
                            >
                                <FolderPlus className="w-3.5 h-3.5" />
                                Add sub-page
                            </DropdownMenuItem>
                            {timeAgo && (
                                <>
                                    <DropdownMenuSeparator />
                                    <div className="px-2 py-1 text-[10px] text-muted-foreground">
                                        Edited {timeAgo}
                                    </div>
                                </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    if (confirm(`Delete "${doc.title}"? This cannot be undone.`)) {
                                        onDelete(doc.id);
                                    }
                                }}
                                className="gap-2 text-xs text-red-500 focus:text-red-500"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {expanded && children.length > 0 && (
                <div className="flex flex-col">
                    {children.map(child => (
                        <DocumentNode
                            key={child.id}
                            doc={child}
                            allDocs={allDocs}
                            workspaceSlug={workspaceSlug}
                            level={level + 1}
                            onItemClick={onItemClick}
                            onDelete={onDelete}
                            onRename={onRename}
                            onCreateChild={onCreateChild}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
