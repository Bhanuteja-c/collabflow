// src/app/workspace/[slug]/whiteboard/[id]/page.tsx
// Individual whiteboard page — renders tldraw canvas full-screen
"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Save, Check } from "lucide-react";
import Link from "next/link";

// Dynamic import — tldraw requires browser APIs
const CollaborativeWhiteboard = dynamic(
    () => import("@/components/whiteboard/CollaborativeWhiteboard"),
    { ssr: false, loading: () => (
        <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )}
);

export default function WhiteboardEditorPage({
    params,
}: {
    params: Promise<{ slug: string; id: string }>;
}) {
    const { slug, id } = use(params);
    const router = useRouter();

    const [title, setTitle] = useState("Untitled Whiteboard");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Fetch whiteboard metadata
    useEffect(() => {
        const fetchWhiteboard = async () => {
            try {
                const res = await fetch(`/api/whiteboards/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setTitle(data.title);
                } else {
                    setError("Whiteboard not found");
                }
            } catch (e) {
                console.error(e);
                setError("Failed to load");
            } finally {
                setLoading(false);
            }
        };
        fetchWhiteboard();
    }, [id]);

    // Save title
    const saveTitle = useCallback(async (newTitle: string) => {
        if (!newTitle.trim()) return;
        setSaving(true);
        try {
            await fetch(`/api/whiteboards/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle.trim() }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            console.error("Failed to save title:", e);
        } finally {
            setSaving(false);
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-destructive">{error}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between p-3 gap-4">
                    {/* Left: Back + Title */}
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="shrink-0" asChild>
                            <Link href={`/workspace/${slug}/whiteboard`}>
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                        </Button>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={(e) => saveTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    saveTitle((e.target as HTMLInputElement).value);
                                    (e.target as HTMLInputElement).blur();
                                }
                            }}
                            className="font-semibold border-0 bg-transparent focus-visible:ring-0 text-lg w-64 shadow-none"
                            placeholder="Untitled Whiteboard"
                        />
                    </div>

                    {/* Right: Save indicator */}
                    <div className="flex items-center gap-2">
                        {saving && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Saving...
                            </span>
                        )}
                        {saved && (
                            <span className="text-xs text-emerald-500 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Saved
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Tldraw Canvas */}
            <div className="flex-1 overflow-hidden">
                <CollaborativeWhiteboard
                    whiteboardId={id}
                    title={title}
                    onTitleChange={(t) => {
                        setTitle(t);
                        saveTitle(t);
                    }}
                />
            </div>
        </div>
    );
}
