// src/app/(dashboard)/documents/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Plus,
    FileText,
    Clock,
    Search,
    MoreHorizontal,
    Trash2,
    Loader2,
    Pencil,
    Grid3X3,
    List,
    Filter,
    SortAsc,
    Star,
    StarOff,
    Copy,
} from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

interface Document {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

type ViewMode = "grid" | "list";
type SortMode = "updated" | "created" | "name";

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showNameInput, setShowNameInput] = useState(false);
    const [newDocName, setNewDocName] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [sortMode, setSortMode] = useState<SortMode>("updated");

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const res = await fetch("/api/documents");
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setLoading(false);
        }
    };

    const router = useRouter();

    const createDocument = async () => {
        if (!newDocName.trim()) {
            alert("Please enter a document name");
            return;
        }

        setCreating(true);
        try {
            const res = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newDocName.trim() }),
            });
            if (res.ok) {
                const doc = await res.json();
                setShowNameInput(false);
                setNewDocName("");
                router.push(`/editor/${doc.id}`);
            } else {
                const err = await res.json();
                console.error("Create failed:", err);
                alert(`Failed to create: ${err.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error creating document:", error);
            alert("Failed to create document.");
        } finally {
            setCreating(false);
        }
    };

    const deleteDocument = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

        try {
            const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
            if (res.ok) {
                setDocuments(documents.filter((d) => d.id !== id));
            } else {
                const err = await res.json();
                alert("Failed to delete: " + (err.details || err.error));
            }
        } catch (error) {
            console.error("Error deleting document:", error);
            alert("Failed to delete document");
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor(diff / (1000 * 60));

        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return "Yesterday";
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const sortedDocuments = [...documents].sort((a, b) => {
        switch (sortMode) {
            case "name":
                return a.title.localeCompare(b.title);
            case "created":
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case "updated":
            default:
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
    });

    const filteredDocuments = sortedDocuments.filter((doc) =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                        Documents
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {documents.length} document{documents.length !== 1 ? "s" : ""} in your workspace
                    </p>
                </div>

                {showNameInput ? (
                    <div className="flex gap-2">
                        <Input
                            placeholder="Document name..."
                            value={newDocName}
                            onChange={(e) => setNewDocName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && createDocument()}
                            className="w-64"
                            autoFocus
                        />
                        <Button onClick={createDocument} disabled={creating} className="btn-glow">
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                        </Button>
                        <Button variant="outline" onClick={() => { setShowNameInput(false); setNewDocName(""); }}>
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <Button onClick={() => setShowNameInput(true)} className="btn-glow w-fit">
                        <Plus className="w-4 h-4 mr-2" />
                        New Document
                    </Button>
                )}
            </motion.div>

            {/* Toolbar */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"
            >
                {/* Search */}
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* View Controls */}
                <div className="flex items-center gap-2">
                    {/* Sort Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <SortAsc className="w-4 h-4" />
                                <span className="hidden sm:inline">Sort</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSortMode("updated")} className={sortMode === "updated" ? "bg-accent" : ""}>
                                Last updated
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortMode("created")} className={sortMode === "created" ? "bg-accent" : ""}>
                                Date created
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortMode("name")} className={sortMode === "name" ? "bg-accent" : ""}>
                                Name
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* View Toggle */}
                    <div className="flex border border-border rounded-lg overflow-hidden">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-9 w-9 rounded-none ${viewMode === "grid" ? "bg-accent" : ""}`}
                            onClick={() => setViewMode("grid")}
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-9 w-9 rounded-none ${viewMode === "list" ? "bg-accent" : ""}`}
                            onClick={() => setViewMode("list")}
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Documents */}
            {loading ? (
                <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="rounded-xl border bg-card p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-muted" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 w-32 bg-muted rounded" />
                                        <div className="h-3 w-20 bg-muted rounded" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredDocuments.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                >
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                        {searchQuery ? "No documents found" : "No documents yet"}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                        {searchQuery ? "Try a different search term" : "Create your first document to start collaborating"}
                    </p>
                    {!searchQuery && (
                        <Button onClick={() => setShowNameInput(true)} className="btn-glow">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Document
                        </Button>
                    )}
                </motion.div>
            ) : viewMode === "grid" ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    {filteredDocuments.map((doc, index) => (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                        >
                            <Card className="group hover:shadow-lg hover:border-accent/50 transition-all hover:scale-[1.02]">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <Link href={`/editor/${doc.id}`} className="flex-1">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
                                                <FileText className="w-5 h-5 text-white" />
                                            </div>
                                        </Link>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/editor/${doc.id}`}>
                                                        <Pencil className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`${window.location.origin}/editor/${doc.id}`)}>
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copy link
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => deleteDocument(doc.id, doc.title)}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <Link href={`/editor/${doc.id}`}>
                                        <h3 className="font-medium group-hover:text-accent transition-colors line-clamp-2 mb-2">
                                            {doc.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(doc.updatedAt)}
                                        </p>
                                    </Link>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}

                    {/* Create New Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: filteredDocuments.length * 0.03 }}
                    >
                        <Card
                            className="group hover:shadow-lg hover:border-accent/50 transition-all cursor-pointer h-full border-dashed hover:scale-[1.02]"
                            onClick={() => setShowNameInput(true)}
                        >
                            <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[140px] text-muted-foreground group-hover:text-accent">
                                <div className="w-12 h-12 rounded-xl border-2 border-dashed border-current flex items-center justify-center mb-2">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-medium">Create New</span>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            ) : (
                /* List View */
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                >
                    {filteredDocuments.map((doc, index) => (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                        >
                            <Card className="group hover:shadow-md hover:border-accent/50 transition-all">
                                <CardContent className="p-3 flex items-center gap-4">
                                    <Link href={`/editor/${doc.id}`} className="flex items-center gap-4 flex-1">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium group-hover:text-accent transition-colors truncate">
                                                {doc.title}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                Updated {formatDate(doc.updatedAt)}
                                            </p>
                                        </div>
                                    </Link>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/editor/${doc.id}`}>
                                                    <Pencil className="w-4 h-4 mr-2" />
                                                    Edit
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`${window.location.origin}/editor/${doc.id}`)}>
                                                <Copy className="w-4 h-4 mr-2" />
                                                Copy link
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => deleteDocument(doc.id, doc.title)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
