// src/components/chat/AttachmentPreview.tsx
// Renders message attachments (images and PDFs)
"use client";

import Image from "next/image";
import { FileText, Download } from "lucide-react";

interface Attachment {
    type: "image" | "pdf";
    url: string;
    name: string;
    size?: number;
}

interface AttachmentPreviewProps {
    attachments: Attachment[];
}

function formatFileSize(bytes?: number): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPreview({ attachments }: AttachmentPreviewProps) {
    if (!attachments?.length) return null;

    return (
        <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((attachment, i) => {
                if (attachment.type === "image") {
                    return (
                        <a
                            key={i}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block max-w-xs rounded-lg overflow-hidden border hover:border-primary transition-colors"
                        >
                            <Image
                                src={attachment.url}
                                alt={attachment.name}
                                width={300}
                                height={200}
                                className="object-cover max-h-48"
                            />
                        </a>
                    );
                }

                // PDF attachment
                return (
                    <a
                        key={i}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={attachment.name}
                        className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors max-w-xs"
                    >
                        <div className="p-2 rounded bg-red-500/10">
                            <FileText className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{attachment.name}</p>
                            {attachment.size && (
                                <p className="text-xs text-muted-foreground">
                                    {formatFileSize(attachment.size)}
                                </p>
                            )}
                        </div>
                        <Download className="w-4 h-4 text-muted-foreground" />
                    </a>
                );
            })}
        </div>
    );
}
