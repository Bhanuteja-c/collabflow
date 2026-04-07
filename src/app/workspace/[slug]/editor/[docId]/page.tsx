"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import { Loader2, ArrowLeft, Check, Share2, Wifi, WifiOff, Save, Clock, Download, FileText } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useDocumentSync } from "@/hooks/useDocumentSync";
import dynamic from "next/dynamic";

// Dynamic import — TipTap + extensions + Yjs (~500KB) loaded only when editor page is visited
const CollaborativeEditor = dynamic(
  () => import("@/components/editor/CollaborativeEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    ),
  }
);

const getColorFromId = (id: string): string => {
    const colors = ["#958DF1", "#F98181", "#FBBC88", "#FAF594", "#70CFF8", "#94FADB", "#B9F18D"];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length] ?? "#958DF1";
};

export default function WorkspaceEditorPage({ params }: { params: Promise<{ slug: string; docId: string }> }) {
    const { slug, docId } = use(params);
    const { data: session } = useSession();

    const [title, setTitle] = useState("Untitled");
    const [initialContent, setInitialContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [permission, setPermission] = useState<"owner" | "edit" | "view">("view");
    const [copied, setCopied] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [parent, setParent] = useState<{ id: string; title: string } | null>(null);
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [workspaceMembers, setWorkspaceMembers] = useState<{ id: string; name: string | null; image?: string | null }[]>([]);

    const userId = (session?.user as any)?.id || "";
    const userName = session?.user?.name || "Anonymous";
    const userImage = session?.user?.image || "";
    const userColor = getColorFromId(userId || docId);

    // Word count state
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const contentRef = useRef("");
    const titleRef = useRef("Untitled");
    const savePendingRef = useRef<NodeJS.Timeout | null>(null);

    // Use the enhanced document sync hook
    const { ydoc, awareness, connected, connectionState, remoteUsers } = useDocumentSync({
        documentId: docId,
        userId,
        userName,
        userColor,
        userImage,
    });

    // Fetch document metadata
    useEffect(() => {
        const fetchDoc = async () => {
            try {
                const res = await fetch(`/api/documents/${docId}`);
                if (res.ok) {
                    const data = await res.json();
                    setTitle(data.title);
                    titleRef.current = data.title;
                    setInitialContent(data.content || "");
                    setPermission(data.permission || "view");
                    setParent(data.parent || null);
                    setCoverImage(data.coverImage || null);
                } else {
                    setError("Document not found");
                }
            } catch (e) {
                console.error(e);
                setError("Failed to load");
            } finally {
                setLoading(false);
            }
        };
        fetchDoc();
    }, [docId]);

    // Fetch workspace members for mention suggestions
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const res = await fetch(`/api/workspaces/${slug}/members`);
                if (res.ok) {
                    const data = await res.json();
                    setWorkspaceMembers(
                        (data.members || data || []).map((m: any) => ({
                            id: m.user?.id || m.userId || m.id,
                            name: m.user?.name || m.name || null,
                            image: m.user?.image || m.image || null,
                        }))
                    );
                }
            } catch (e) {
                console.error("Failed to fetch workspace members:", e);
            }
        };
        fetchMembers();
    }, [slug]);

    // Save title independently (on blur / Enter)
    const saveTitle = useCallback(async (newTitle: string) => {
        if (!newTitle.trim() || newTitle === titleRef.current) return;
        titleRef.current = newTitle;
        try {
            await fetch(`/api/documents/${docId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle.trim() })
            });
        } catch (e) {
            console.error("Failed to save title:", e);
        }
    }, [docId]);

    // Save cover image separately to avoid content conflicts
    const handleUpdateCoverImage = useCallback(async (url: string | null) => {
        setCoverImage(url);
        try {
            await fetch(`/api/documents/${docId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coverImage: url })
            });
        } catch (e) {
            console.error("Failed to save cover image:", e);
        }
    }, [docId]);

    const handleSave = useCallback(async (content: string, isSnapshot = false) => {
        setSaving(true);
        try {
            await fetch(`/api/documents/${docId}${isSnapshot ? '?snapshot=true' : ''}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: titleRef.current, content })
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    }, [docId]);

    // Save on page unload (navigation, tab close)
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Flush any pending content save
            if (savePendingRef.current) {
                clearTimeout(savePendingRef.current);
                savePendingRef.current = null;
            }
            // Use fetch with keepalive for reliable save on unload
            if (contentRef.current) {
                const payload = JSON.stringify({ title: titleRef.current, content: contentRef.current });
                fetch(`/api/documents/${docId}?snapshot=true`, {
                    method: "PUT",
                    keepalive: true,
                    headers: { "Content-Type": "application/json" },
                    body: payload
                }).catch(() => {});
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [docId]);

    const copyShareLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Track content for word count and export
    const handleContentChange = useCallback((content: string) => {
        contentRef.current = content;
        // Strip HTML tags for plain text counting
        const text = content.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
        const words = text ? text.split(/\s+/).length : 0;
        setWordCount(words);
        setCharCount(text.length);
    }, []);

    // Export as markdown
    const exportMarkdown = useCallback(() => {
        const content = contentRef.current;
        // Simple HTML-to-markdown conversion
        let md = content
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n")
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n")
            .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n")
            .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
            .replace(/<b>(.*?)<\/b>/gi, "**$1**")
            .replace(/<em>(.*?)<\/em>/gi, "*$1*")
            .replace(/<i>(.*?)<\/i>/gi, "*$1*")
            .replace(/<code>(.*?)<\/code>/gi, "`$1`")
            .replace(/<li>(.*?)<\/li>/gi, "- $1\n")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<p>(.*?)<\/p>/gi, "$1\n\n")
            .replace(/<blockquote>(.*?)<\/blockquote>/gi, "> $1\n")
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "document"}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }, [title]);

    if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (error) return <div className="flex items-center justify-center h-full"><p className="text-destructive">{error}</p></div>;

    // Wait for Yjs to initialize on client - also check awareness.doc exists
    const yjsReady = !!ydoc && !!awareness && !!awareness.doc;

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between p-3 gap-4">
                    {/* Left: Back + Breadcrumb/Title */}
                    <div className="flex bg-transparent items-center gap-3">
                        <Button variant="ghost" size="icon" className="shrink-0" asChild>
                            <Link href={`/workspace/${slug}/documents`}><ArrowLeft className="w-4 h-4" /></Link>
                        </Button>
                        <div className="flex flex-col">
                            {parent && (
                                <Link
                                    href={`/workspace/${slug}/editor/${parent.id}`}
                                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 -mb-1 ml-3"
                                >
                                    <FileText className="w-3 h-3" /> {parent.title} /
                                </Link>
                            )}
                            <Input value={title} onChange={(e) => {
                                setTitle(e.target.value);
                                titleRef.current = e.target.value;
                            }}
                                onBlur={(e) => saveTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        saveTitle((e.target as HTMLInputElement).value);
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                className="font-semibold border-0 bg-transparent focus-visible:ring-0 text-lg w-64 shadow-none"
                                placeholder="Untitled Document" />
                        </div>
                    </div>

                    {/* Center: Presence */}
                    <div className="flex items-center gap-3">
                        {remoteUsers.length > 0 ? (
                            <>
                                <span className="text-sm text-muted-foreground hidden sm:inline">Editing with</span>
                                <div className="flex -space-x-2">
                                    {remoteUsers.slice(0, 5).map((u) => (
                                        <Avatar key={u.socketId} className="h-8 w-8 border-2 border-background ring-2 ring-background">
                                            <UserAvatar user={{ name: u.user.name, image: u.user.image }} className="h-8 w-8" showStatus={false} />
                                        </Avatar>
                                    ))}
                                </div>
                                {remoteUsers.length > 5 && (
                                    <span className="text-sm text-muted-foreground">+{remoteUsers.length - 5}</span>
                                )}
                            </>
                        ) : (
                            <span className="text-sm text-muted-foreground hidden sm:inline">Solo editing</span>
                        )}

                        {/* Connection Status Badge */}
                        <Badge
                            variant={connected ? "default" : "secondary"}
                            className={`h-7 px-3 gap-1.5 ${connected ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : ""}`}
                        >
                            {connected ? (
                                <>
                                    <Wifi className="w-3 h-3" />
                                    <span className="hidden sm:inline">Live</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-3 h-3" />
                                    <span className="hidden sm:inline">
                                        {connectionState === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
                                    </span>
                                </>
                            )}
                        </Badge>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={exportMarkdown} title="Export as Markdown">
                            <Download className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Export</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
                            <Clock className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">History</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={copyShareLink}>
                            {copied ? <Check className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
                            <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
                        </Button>
                        <Button
                            onClick={() => handleSave(contentRef.current, true)}
                            disabled={saving}
                            variant={saved ? "outline" : "default"}
                            className={saved ? "text-emerald-600 border-emerald-600" : ""}
                            size="sm"
                        >
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            <span className="hidden sm:inline">{saving ? "Saving..." : saved ? "Saved" : "Save"}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Editor Content - Only render when Yjs is ready */}
            <div className="flex-1 overflow-hidden h-full">
                {yjsReady ? (
                    <div className="h-full flex flex-col">
                        <CollaborativeEditor
                            ydoc={ydoc}
                            awareness={awareness}
                            initialContent={initialContent}
                            permission={permission}
                            userName={userName}
                            userColor={userColor}
                            onSave={handleSave}
                            saving={saving}
                            historyOpen={historyOpen}
                            onHistoryClose={() => setHistoryOpen(false)}
                            documentId={docId}
                            onContentChange={handleContentChange}
                            workspaceMembers={workspaceMembers}
                            workspaceSlug={slug}
                            coverImage={coverImage}
                            onUpdateCoverImage={handleUpdateCoverImage}
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}
            </div>

            {/* Word Count Footer */}
            <div className="border-t bg-muted/30 px-4 py-1.5 flex items-center gap-4 text-xs text-muted-foreground">
                <span><FileText className="w-3 h-3 inline mr-1" />{wordCount} word{wordCount !== 1 ? "s" : ""}</span>
                <span>{charCount} character{charCount !== 1 ? "s" : ""}</span>
                <span>~{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
            </div>
        </div>
    );
}
