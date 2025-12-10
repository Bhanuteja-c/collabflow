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
} from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

interface Document {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showNameInput, setShowNameInput] = useState(false);
    const [newDocName, setNewDocName] = useState("");

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

    const router = useRouter(); // add this hook at top

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
                alert(`Failed to create: ${err.error || "Unknown error"}\nDetails: ${err.details || ""}`);
            }
        } catch (error) {
            console.error("Error creating document:", error);
            alert("Failed to create document. Check console for details.");
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
        if (mins < 60) return `${mins} min ago`;
        if (hours < 24) return `${hours} hours ago`;
        if (days === 1) return "Yesterday";
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    const filteredDocuments = documents.filter((doc) =>
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
                    <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">
                        Documents
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Create and manage your documents
                    </p>
                </div>

                {showNameInput ? (
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter document name..."
                            value={newDocName}
                            onChange={(e) => setNewDocName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && createDocument()}
                            className="w-64"
                            autoFocus
                        />
                        <Button onClick={createDocument} disabled={creating} className="btn-primary">
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                        </Button>
                        <Button variant="outline" onClick={() => { setShowNameInput(false); setNewDocName(""); }}>
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <Button onClick={() => setShowNameInput(true)} className="btn-primary w-fit">
                        <Plus className="w-4 h-4 mr-2" />
                        New Document
                    </Button>
                )}
            </motion.div>

            {/* Search */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </motion.div>

            {/* Documents Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="rounded-xl border bg-card p-5 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-muted" />
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 bg-muted rounded" />
                                            <div className="h-3 w-24 bg-muted rounded" />
                                        </div>
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
                    className="text-center py-12"
                >
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-lg mb-2">
                        {searchQuery ? "No documents found" : "No documents yet"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        {searchQuery ? "Try a different search" : "Create your first document to get started"}
                    </p>
                    {!searchQuery && (
                        <Button onClick={() => setShowNameInput(true)} className="btn-primary">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Document
                        </Button>
                    )}
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    {filteredDocuments.map((doc, index) => (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="group hover:shadow-md hover:border-primary/20 transition-all">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <Link href={`/editor/${doc.id}`} className="flex-1">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-primary" />
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
                                        <h3 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2 mb-2">
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
                        transition={{ delay: filteredDocuments.length * 0.05 }}
                    >
                        <Card
                            className="group hover:shadow-md hover:border-primary/20 transition-all cursor-pointer h-full border-dashed"
                            onClick={() => setShowNameInput(true)}
                        >
                            <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[120px] text-muted-foreground group-hover:text-primary">
                                <Plus className="w-8 h-8 mb-2" />
                                <span className="text-sm font-medium">Create New</span>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}
