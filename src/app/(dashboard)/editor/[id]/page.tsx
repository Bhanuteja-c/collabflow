// src/app/(dashboard)/editor/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Undo,
    Redo,
    Quote,
    Code,
    Minus,
    Strikethrough,
    Save,
    Loader2,
    ArrowLeft,
    Check,
    History,
    Share2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

interface HistoryEntry {
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    user: {
        name: string | null;
        image: string | null;
    };
}

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session } = useSession();
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [copied, setCopied] = useState(false);

    const editor = useEditor({
        extensions: [StarterKit],
        content: "",
        editorProps: {
            attributes: {
                class: "prose prose-lg dark:prose-invert max-w-none focus:outline-none p-8 min-h-[calc(100vh-200px)]",
            },
        },
        immediatelyRender: false,
        onUpdate: () => {
            setSaved(false);
        },
    });

    // Fetch document
    useEffect(() => {
        const fetchDocument = async () => {
            try {
                const res = await fetch(`/api/documents/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setTitle(data.title);
                    if (editor && data.content) {
                        editor.commands.setContent(data.content);
                    }
                } else if (res.status === 404) {
                    setError("Document not found");
                } else {
                    const err = await res.json();
                    setError(err.details || err.error || "Failed to load");
                }
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Failed to load document");
            } finally {
                setLoading(false);
            }
        };

        if (id && editor) fetchDocument();
    }, [id, editor]);

    // Fetch history
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch(`/api/documents/${id}/history`);
                if (res.ok) {
                    setHistory(await res.json());
                }
            } catch (err) {
                console.error("Failed to fetch history:", err);
            }
        };
        if (id) fetchHistory();
    }, [id]);

    const saveDocument = useCallback(async () => {
        if (!editor || saving) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/documents/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    content: editor.getHTML(),
                }),
            });

            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
                // Refresh history
                const histRes = await fetch(`/api/documents/${id}/history`);
                if (histRes.ok) {
                    setHistory(await histRes.json());
                }
            } else {
                const err = await res.json();
                console.error("Save failed:", err);
                alert("Failed to save: " + (err.details || err.error));
            }
        } catch (err) {
            console.error("Failed to save:", err);
            alert("Failed to save document");
        } finally {
            setSaving(false);
        }
    }, [editor, id, title, saving]);

    // Auto-save on Ctrl+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                saveDocument();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [saveDocument]);

    const copyShareLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-background">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading document...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-background">
                <div className="text-center">
                    <p className="text-destructive mb-4">{error}</p>
                    <Button onClick={() => router.push("/documents")} variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Documents
                    </Button>
                </div>
            </div>
        );
    }

    const ToolbarButton = ({
        onClick,
        isActive,
        children,
        title,
    }: {
        onClick: () => void;
        isActive?: boolean;
        children: React.ReactNode;
        title: string;
    }) => (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            title={title}
            className={`h-9 w-9 p-0 ${isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
        >
            {children}
        </Button>
    );

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);

        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b">
                <div className="flex items-center justify-between p-2 gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/documents">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                        </Button>
                        <Input
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                setSaved(false);
                            }}
                            className="font-medium border-0 bg-transparent focus-visible:ring-0 text-lg w-64"
                            placeholder="Untitled Document"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Share Button */}
                        <Button variant="ghost" size="sm" onClick={copyShareLink}>
                            {copied ? <Check className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
                            {copied ? "Copied!" : "Share"}
                        </Button>

                        {/* History */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <History className="w-4 h-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>Document History</SheetTitle>
                                </SheetHeader>
                                <div className="mt-4 space-y-4">
                                    {history.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No history yet</p>
                                    ) : (
                                        history.map((entry) => (
                                            <div key={entry.id} className="flex gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={entry.user.image || ""} />
                                                    <AvatarFallback className="text-xs">
                                                        {entry.user.name?.[0] || "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="text-sm">
                                                        <span className="font-medium">{entry.user.name}</span>
                                                        {" "}{entry.action} the document
                                                    </p>
                                                    {entry.details && (
                                                        <p className="text-xs text-muted-foreground">{entry.details}</p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {formatDate(entry.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>

                        {/* Save Button */}
                        <Button
                            onClick={saveDocument}
                            disabled={saving}
                            variant={saved ? "outline" : "default"}
                            className={saved ? "text-emerald-600 border-emerald-600" : "btn-primary"}
                            size="sm"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : saved ? (
                                <Check className="w-4 h-4 mr-2" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            {saving ? "Saving..." : saved ? "Saved" : "Save"}
                        </Button>
                    </div>
                </div>

                {/* Toolbar */}
                {editor && (
                    <div className="flex items-center gap-1 p-2 pt-0 flex-wrap border-t">
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            isActive={editor.isActive("bold")}
                            title="Bold (Ctrl+B)"
                        >
                            <Bold className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            isActive={editor.isActive("italic")}
                            title="Italic (Ctrl+I)"
                        >
                            <Italic className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            isActive={editor.isActive("strike")}
                            title="Strikethrough"
                        >
                            <Strikethrough className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            isActive={editor.isActive("code")}
                            title="Code"
                        >
                            <Code className="w-4 h-4" />
                        </ToolbarButton>

                        <div className="w-px h-6 bg-border mx-1" />

                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            isActive={editor.isActive("heading", { level: 1 })}
                            title="Heading 1"
                        >
                            <Heading1 className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            isActive={editor.isActive("heading", { level: 2 })}
                            title="Heading 2"
                        >
                            <Heading2 className="w-4 h-4" />
                        </ToolbarButton>

                        <div className="w-px h-6 bg-border mx-1" />

                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            isActive={editor.isActive("bulletList")}
                            title="Bullet List"
                        >
                            <List className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            isActive={editor.isActive("orderedList")}
                            title="Numbered List"
                        >
                            <ListOrdered className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            isActive={editor.isActive("blockquote")}
                            title="Quote"
                        >
                            <Quote className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().setHorizontalRule().run()}
                            title="Horizontal Rule"
                        >
                            <Minus className="w-4 h-4" />
                        </ToolbarButton>

                        <div className="w-px h-6 bg-border mx-1" />

                        <ToolbarButton
                            onClick={() => editor.chain().focus().undo().run()}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={() => editor.chain().focus().redo().run()}
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            <Redo className="w-4 h-4" />
                        </ToolbarButton>
                    </div>
                )}
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto bg-background">
                <div className="max-w-4xl mx-auto">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}
