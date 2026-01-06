"use client";

import { useState, useEffect, useCallback, use, useMemo, useRef } from "react";
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

interface HistoryEntry {
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    user: { name: string | null; image: string | null };
}

const getRandomColor = () => {
    const colors = ["#958DF1", "#F98181", "#FBBC88", "#FAF594", "#70CFF8", "#94FADB", "#B9F18D"];
    return colors[Math.floor(Math.random() * colors.length)];
};

export default function WorkspaceEditorPage({ params }: { params: Promise<{ slug: string; docId: string }> }) {
    const { slug, docId } = use(params);
    const { data: session } = useSession();
    const router = useRouter();

    const [title, setTitle] = useState("Untitled");
    const [initialContent, setInitialContent] = useState("");
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [permission, setPermission] = useState<"owner" | "edit" | "view">("view");
    const [copied, setCopied] = useState(false);

    const [shareEmail, setShareEmail] = useState("");
    const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
    const [shares, setShares] = useState<any[]>([]);
    const [loadingShares, setLoadingShares] = useState(false);
    const [sharingInProgress, setSharingInProgress] = useState(false);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [userSuggestions, setUserSuggestions] = useState<any[]>([]);

    const ydoc = useMemo(() => new Y.Doc(), []);
    const userColor = useMemo(() => getRandomColor(), []);
    const contentInitialized = useRef(false);

    const userId = (session?.user as any)?.id || "";
    const userName = session?.user?.name || "Anonymous";
    const userImage = session?.user?.image || "";

    const { connected, remoteUsers, sendCursorUpdate } = useDocumentSync({
        documentId: docId,
        userId,
        userName,
        userColor,
        userImage,
        ydoc,
    });

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                const res = await fetch(`/api/documents/${docId}`);
                if (res.ok) {
                    const data = await res.json();
                    setTitle(data.title);
                    setInitialContent(data.content || "");
                    setPermission(data.permission || "view");
                } else {
                    setError("Document not found");
                }
                const histRes = await fetch(`/api/documents/${docId}/history`);
                if (histRes.ok) setHistory(await histRes.json());
            } catch (e) {
                console.error(e);
                setError("Failed to load");
            } finally {
                setLoading(false);
            }
        };
        fetchDoc();
    }, [docId]);

    useEffect(() => {
        if (shareEmail.length < 2) { setUserSuggestions([]); return; }
        const search = async () => {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(shareEmail)}`);
            if (res.ok) setUserSuggestions(await res.json());
        };
        const t = setTimeout(search, 300);
        return () => clearTimeout(t);
    }, [shareEmail]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ history: false }),
            Collaboration.configure({ document: ydoc }),
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

    useEffect(() => {
        if (!editor) return;
        let timeoutId: NodeJS.Timeout;
        const handleUpdate = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => handleSave(editor.getHTML()), 2000);
        };
        editor.on("update", handleUpdate);
        return () => { clearTimeout(timeoutId); editor.off("update", handleUpdate); };
    }, [editor]);

    useEffect(() => () => { ydoc.destroy(); }, [ydoc]);

    const handleSave = useCallback(async (content: string) => {
        setSaving(true);
        try {
            await fetch(`/api/documents/${docId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content })
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    }, [docId, title]);

    const copyShareLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const ToolbarButton = ({ onClick, isActive, children, title: t }: any) => (
        <Button variant="ghost" size="sm" onClick={onClick} title={t}
            className={`h-9 w-9 p-0 ${isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
            {children}
        </Button>
    );

    if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (error) return <div className="flex items-center justify-center h-full"><p className="text-destructive">{error}</p></div>;

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="sticky top-0 z-10 bg-background border-b">
                <div className="flex items-center justify-between p-2 gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href={`/workspace/${slug}/documents`}><ArrowLeft className="w-4 h-4" /></Link>
                        </Button>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)}
                            className="font-medium border-0 bg-transparent focus-visible:ring-0 text-lg w-64" placeholder="Untitled Document" />
                        <div className="flex items-center -space-x-2 ml-4">
                            <Avatar className="h-8 w-8 border-2" style={{ borderColor: userColor }}>
                                <AvatarImage src={userImage} />
                                <AvatarFallback style={{ backgroundColor: userColor }} className="text-xs text-white">{userName?.[0]}</AvatarFallback>
                            </Avatar>
                            {remoteUsers.map((u) => (
                                <Avatar key={u.socketId} className="h-8 w-8 border-2" style={{ borderColor: u.user.color }}>
                                    <AvatarImage src={u.user.image} />
                                    <AvatarFallback style={{ backgroundColor: u.user.color }} className="text-xs text-white">{u.user.name?.[0]}</AvatarFallback>
                                </Avatar>
                            ))}
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-xs ml-2 border">
                                <Cloud className={`w-3 h-3 mr-1 ${connected ? "text-emerald-500" : "text-muted-foreground"}`} />
                                {remoteUsers.length + 1}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={copyShareLink}>
                            {copied ? <Check className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
                            {copied ? "Copied!" : "Copy Link"}
                        </Button>
                        <Button onClick={() => editor && handleSave(editor.getHTML())} disabled={saving}
                            variant={saved ? "outline" : "default"} className={saved ? "text-emerald-600 border-emerald-600" : ""} size="sm">
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            {saving ? "Saving..." : saved ? "Saved" : "Save"}
                        </Button>
                    </div>
                </div>
                {editor && (
                    <div className="flex items-center gap-1 p-2 pt-0 flex-wrap border-t">
                        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Bold"><Bold className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italic"><Italic className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} title="Strike"><Strikethrough className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive("code")} title="Code"><Code className="w-4 h-4" /></ToolbarButton>
                        <div className="w-px h-6 bg-border mx-1" />
                        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })} title="H1"><Heading1 className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} title="H2"><Heading2 className="w-4 h-4" /></ToolbarButton>
                        <div className="w-px h-6 bg-border mx-1" />
                        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="List"><List className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} title="Ordered"><ListOrdered className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")} title="Quote"><Quote className="w-4 h-4" /></ToolbarButton>
                        <div className="w-px h-6 bg-border mx-1" />
                        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="w-4 h-4" /></ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="w-4 h-4" /></ToolbarButton>
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-auto bg-background">
                <div className="max-w-4xl mx-auto"><EditorContent editor={editor} /></div>
            </div>
        </div>
    );
}
