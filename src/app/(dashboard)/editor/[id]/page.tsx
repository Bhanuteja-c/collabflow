"use client";

import { useState, useEffect, useCallback, use, useRef, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import {
    Bold, Italic, List, ListOrdered, Heading1, Heading2, Undo, Redo,
    Quote, Code, Minus, Strikethrough, Save, Loader2, ArrowLeft,
    Check, History, Share2, Cloud, UserPlus, Trash2, Users
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDocumentSync } from "@/hooks/useDocumentSync";

// --- Types ---
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

// --- Utils ---
const getRandomColor = () => {
    const colors = ["#958DF1", "#F98181", "#FBBC88", "#FAF594", "#70CFF8", "#94FADB", "#B9F18D"];
    return colors[Math.floor(Math.random() * colors.length)];
};

// --- Main Page Component ---
export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session } = useSession();
    const router = useRouter();

    // Data State
    const [title, setTitle] = useState("Untitled");
    const [initialContent, setInitialContent] = useState("");
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [permission, setPermission] = useState<"owner" | "edit" | "view">("view");
    const [copied, setCopied] = useState(false);

    // Share Dialog state
    const [shareEmail, setShareEmail] = useState("");
    const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
    const [shares, setShares] = useState<any[]>([]);
    const [loadingShares, setLoadingShares] = useState(false);
    const [sharingInProgress, setSharingInProgress] = useState(false);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);

    // Yjs State
    const ydoc = useMemo(() => new Y.Doc(), []);
    const userColor = useMemo(() => getRandomColor(), []);
    const contentInitialized = useRef(false);

    // Get user info
    const userId = (session?.user as any)?.id || "";
    const userName = session?.user?.name || "Anonymous";
    const userImage = session?.user?.image || "";

    // Use Socket.io document sync
    const { connected, remoteUsers, sendCursorUpdate } = useDocumentSync({
        documentId: id,
        userId,
        userName,
        userColor,
        userImage,
        ydoc,
    });

    // 1. Fetch Data
    useEffect(() => {
        const fetchDoc = async () => {
            try {
                const res = await fetch(`/api/documents/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setTitle(data.title);
                    setInitialContent(data.content || "");
                    setPermission(data.permission || "view");
                } else {
                    setError("Document not found");
                }

                const histRes = await fetch(`/api/documents/${id}/history`);
                if (histRes.ok) setHistory(await histRes.json());

            } catch (e) {
                console.error(e);
                setError("Failed to load");
            } finally {
                setLoading(false);
            }
        };
        fetchDoc();
    }, [id]);

    // Initialize Yjs document with content (only once)
    useEffect(() => {
        if (contentInitialized.current || !initialContent || loading) return;

        const yXmlFragment = ydoc.getXmlFragment("prosemirror");
        if (yXmlFragment.length === 0) {
            // Document is empty, we'll let TipTap handle initial content
            contentInitialized.current = true;
        }
    }, [initialContent, loading, ydoc]);

    // Editor setup
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: false, // Disable history as Yjs handles it
            }),
            Collaboration.configure({
                document: ydoc,
            }),
        ],
        content: initialContent,
        editorProps: {
            attributes: {
                class: "prose prose-lg dark:prose-invert max-w-none focus:outline-none p-8 min-h-[calc(100vh-200px)]",
            },
        },
        immediatelyRender: false,
        onSelectionUpdate: ({ editor }) => {
            const { from, to } = editor.state.selection;
            sendCursorUpdate(from, to);
        },
    }, [ydoc, initialContent]);

    // Debounced Save
    useEffect(() => {
        if (!editor) return;
        let timeoutId: NodeJS.Timeout;
        const handleUpdate = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                handleSave(editor.getHTML());
            }, 2000);
        };
        editor.on("update", handleUpdate);
        return () => {
            clearTimeout(timeoutId);
            editor.off("update", handleUpdate);
        };
    }, [editor]);

    // Cleanup Ydoc on unmount
    useEffect(() => {
        return () => {
            ydoc.destroy();
        };
    }, [ydoc]);

    // Fetch shares when dialog opens
    useEffect(() => {
        if (shareDialogOpen && permission === "owner") {
            fetchShares();
        }
    }, [shareDialogOpen, permission]);

    // Search users for autocomplete
    useEffect(() => {
        if (!shareEmail.trim() || shareEmail.length < 2) {
            setUserSuggestions([]);
            return;
        }
        const searchUsers = async () => {
            setSearchingUsers(true);
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(shareEmail)}`);
                if (res.ok) {
                    setUserSuggestions(await res.json());
                }
            } catch (e) {
                console.error(e);
            } finally {
                setSearchingUsers(false);
            }
        };
        const debounce = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounce);
    }, [shareEmail]);

    const fetchShares = async () => {
        setLoadingShares(true);
        try {
            const res = await fetch(`/api/documents/${id}/share`);
            if (res.ok) {
                setShares(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingShares(false);
        }
    };

    const handleShare = async () => {
        if (!shareEmail.trim()) return;
        setSharingInProgress(true);
        try {
            const res = await fetch(`/api/documents/${id}/share`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: shareEmail.trim(), permission: sharePermission })
            });
            if (res.ok) {
                setShareEmail("");
                setUserSuggestions([]);
                fetchShares();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to share");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSharingInProgress(false);
        }
    };

    const handleRemoveShare = async (userId: string) => {
        try {
            await fetch(`/api/documents/${id}/share?userId=${userId}`, { method: "DELETE" });
            fetchShares();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = useCallback(async (content: string) => {
        setSaving(true);
        try {
            await fetch(`/api/documents/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content })
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            fetch(`/api/documents/${id}/history`).then(res => {
                if (res.ok) res.json().then(setHistory);
            });
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    }, [id, title]);

    const copyShareLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const ToolbarButton = ({ onClick, isActive, children, title: btnTitle }: any) => (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            title={btnTitle}
            className={`h-9 w-9 p-0 ${isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
        >
            {children}
        </Button>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                            onChange={(e) => setTitle(e.target.value)}
                            className="font-medium border-0 bg-transparent focus-visible:ring-0 text-lg w-64"
                            placeholder="Untitled Document"
                        />

                        {/* Connected Users */}
                        <div className="flex items-center -space-x-2 ml-4">
                            {/* Current user */}
                            <div title="You" className="relative z-10">
                                <Avatar className="h-8 w-8 border-2 border-background ring-2" style={{ borderColor: userColor }}>
                                    <AvatarImage src={userImage} />
                                    <AvatarFallback style={{ backgroundColor: userColor }} className="text-[10px] text-white">
                                        {userName?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            {/* Remote users */}
                            {remoteUsers.map((user) => (
                                <div key={user.socketId} title={user.user.name} className="relative z-0 hover:z-10">
                                    <Avatar className="h-8 w-8 border-2" style={{ borderColor: user.user.color }}>
                                        <AvatarImage src={user.user.image} />
                                        <AvatarFallback style={{ backgroundColor: user.user.color }} className="text-[10px] text-white">
                                            {user.user.name?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            ))}
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-[10px] ml-2 border border-border" title="Connected">
                                <Cloud className={`w-3 h-3 mr-1 ${connected ? "text-emerald-500" : "text-muted-foreground"}`} />
                                {remoteUsers.length + 1}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Share Dialog - only for owner */}
                        {permission === "owner" && (
                            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        <Users className="w-4 h-4 mr-1" />
                                        Share
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Share Document</DialogTitle>
                                        <DialogDescription>
                                            Invite people to view or edit this document.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="relative">
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Enter email address"
                                                    value={shareEmail}
                                                    onChange={(e) => setShareEmail(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleShare()}
                                                />
                                                <Select value={sharePermission} onValueChange={(v: "view" | "edit") => setSharePermission(v)}>
                                                    <SelectTrigger className="w-28">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="view">View</SelectItem>
                                                        <SelectItem value="edit">Edit</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button onClick={handleShare} disabled={sharingInProgress}>
                                                    {sharingInProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                            {/* User Suggestions Dropdown */}
                                            {userSuggestions.length > 0 && (
                                                <div className="absolute top-full left-0 right-20 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-48 overflow-auto">
                                                    {userSuggestions.map((user) => (
                                                        <button
                                                            key={user.id}
                                                            className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
                                                            onClick={() => {
                                                                setShareEmail(user.email);
                                                                setUserSuggestions([]);
                                                            }}
                                                        >
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={user.image} />
                                                                <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="text-sm font-medium">{user.name}</p>
                                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Current Shares */}
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Shared with</p>
                                            {loadingShares ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : shares.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">Not shared with anyone yet.</p>
                                            ) : (
                                                shares.map((share) => (
                                                    <div key={share.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={share.user.image} />
                                                                <AvatarFallback>{share.user.name?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="text-sm font-medium">{share.user.name}</p>
                                                                <p className="text-xs text-muted-foreground">{share.user.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs px-2 py-1 rounded bg-secondary">
                                                                {share.permission === "edit" ? "Can edit" : "View only"}
                                                            </span>
                                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveShare(share.userId)}>
                                                                <Trash2 className="w-4 h-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}

                        <Button variant="ghost" size="sm" onClick={copyShareLink}>
                            {copied ? <Check className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
                            {copied ? "Copied!" : "Copy Link"}
                        </Button>

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
                                    {history.length === 0 ? <p className="text-sm text-muted-foreground">No history yet</p> :
                                        history.map((entry) => (
                                            <div key={entry.id} className="flex gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={entry.user.image || ""} />
                                                    <AvatarFallback className="text-xs">{entry.user.name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="text-sm"><span className="font-medium">{entry.user.name}</span> {entry.action}</p>
                                                    <p className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </SheetContent>
                        </Sheet>

                        <Button
                            onClick={() => editor && handleSave(editor.getHTML())}
                            disabled={saving}
                            variant={saved ? "outline" : "default"}
                            className={saved ? "text-emerald-600 border-emerald-600" : "btn-primary"}
                            size="sm"
                        >
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            {saving ? "Saving..." : saved ? "Saved" : "Save"}
                        </Button>
                    </div>
                </div>

                {/* Toolbar */}
                {editor && (
                    <div className="flex items-center gap-1 p-2 pt-0 flex-wrap border-t">
                        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Bold (Ctrl+B)"><Bold className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italic (Ctrl+I)"><Italic className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} title="Strikethrough"><Strikethrough className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive("code")} title="Code"><Code className="w-4 h-4" /></ToolbarButton>
                        <div className="w-px h-6 bg-border mx-1" />
                        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })} title="Heading 1"><Heading1 className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} title="Heading 2"><Heading2 className="w-4 h-4" /></ToolbarButton>
                        <div className="w-px h-6 bg-border mx-1" />
                        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="Bullet List"><List className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} title="Numbered List"><ListOrdered className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")} title="Quote"><Quote className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule"><Minus className="w-4 h-4" /></ToolbarButton>
                        <div className="w-px h-6 bg-border mx-1" />
                        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="w-4 h-4" /></ToolbarButton>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-auto bg-background relative">
                <div className="max-w-4xl mx-auto">
                    <EditorContent editor={editor} />
                </div>

                {/* Remote Cursor Indicators */}
                {remoteUsers.map((user) => user.cursor && (
                    <div
                        key={user.socketId}
                        className="absolute pointer-events-none z-50"
                        style={{
                            left: 0,
                            top: 0,
                        }}
                    >
                        <div
                            className="px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
                            style={{ backgroundColor: user.user.color }}
                        >
                            {user.user.name}
                        </div>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                .collaboration-cursor__caret {
                    border-left: 1px solid #0d0d0d;
                    border-right: 1px solid #0d0d0d;
                    margin-left: -1px;
                    margin-right: -1px;
                    pointer-events: none;
                    position: relative;
                }
                .collaboration-cursor__label {
                    border-radius: 3px 3px 3px 0;
                    color: #fff;
                    font-size: 12px;
                    font-weight: 600;
                    left: -1px;
                    padding: 0.1rem 0.3rem;
                    position: absolute;
                    top: -1.4em;
                    user-select: none;
                    white-space: nowrap;
                }
            `}</style>
        </div>
    );
}
