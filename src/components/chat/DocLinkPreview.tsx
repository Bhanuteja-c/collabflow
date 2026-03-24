// src/components/chat/DocLinkPreview.tsx
// Inline document reference with hover preview
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { FileText, User, Clock } from "lucide-react";

interface DocData {
    id: string;
    title: string;
    author?: {
        id: string;
        name: string;
        image?: string;
    };
    updatedAt?: string;
    createdAt?: string;
}

interface DocLinkPreviewProps {
    docId: string;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

export function DocLinkPreview({ docId }: DocLinkPreviewProps) {
    const params = useParams();
    const workspaceSlug = params?.slug as string;
    const [doc, setDoc] = useState<DocData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const fetchDoc = async () => {
        if (doc || loading) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/documents/${docId}`);
            if (res.ok) {
                const data = await res.json();
                setDoc(data);
            } else {
                setError(true);
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
                <Link
                    href={`/workspace/${workspaceSlug}/editor/${docId}`}
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline bg-blue-500/10 rounded px-1.5 py-0.5 -mx-0.5 font-medium text-sm"
                    onMouseEnter={fetchDoc}
                >
                    <FileText className="w-3 h-3" />
                    <span>{doc?.title || "Document"}</span>
                </Link>
            </HoverCardTrigger>
            <HoverCardContent className="w-72 p-4" side="top" align="start">
                {loading && (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                )}
                {error && (
                    <div className="text-sm text-red-500">Document not found</div>
                )}
                {doc && (
                    <div className="space-y-3">
                        {/* Document Title */}
                        <div className="flex items-start gap-2">
                            <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-sm">{doc.title}</h4>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t">
                            {doc.author ? (
                                <div className="flex items-center gap-2">
                                    <UserAvatar user={{ name: doc.author.name, image: doc.author.image }} className="h-5 w-5" showStatus={false} />
                                    <span className="text-xs text-muted-foreground">
                                        {doc.author.name}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <User className="w-3 h-3" />
                                    <span>Unknown</span>
                                </div>
                            )}
                            {doc.updatedAt && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDate(doc.updatedAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </HoverCardContent>
        </HoverCard>
    );
}
