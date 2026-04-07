// src/components/files/FileIcon.tsx
// Renders the correct icon based on file mimeType
"use client";

import {
    Image,
    FileText,
    FileSpreadsheet,
    Video,
    Music,
    Archive,
    File,
    Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileIconProps {
    mimeType: string;
    className?: string;
}

export function FileIcon({ mimeType, className }: FileIconProps) {
    const baseClass = cn("text-muted-foreground", className);

    if (mimeType.startsWith("image/")) return <Image className={cn("text-emerald-500", className)} />;
    if (mimeType.includes("pdf")) return <FileText className={cn("text-red-500", className)} />;
    if (mimeType.includes("word") || mimeType.includes("doc")) return <FileText className={cn("text-blue-500", className)} />;
    if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv")) return <FileSpreadsheet className={cn("text-green-500", className)} />;
    if (mimeType.includes("presentation") || mimeType.includes("pptx")) return <Presentation className={cn("text-orange-500", className)} />;
    if (mimeType.startsWith("video/")) return <Video className={cn("text-purple-500", className)} />;
    if (mimeType.startsWith("audio/")) return <Music className={cn("text-pink-500", className)} />;
    if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("gzip") || mimeType.includes("rar")) return <Archive className={cn("text-amber-500", className)} />;
    return <File className={baseClass} />;
}

// Color mapping for category badges
export const categoryColors: Record<string, string> = {
    IMAGE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    DOCUMENT: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    VIDEO: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    AUDIO: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    ARCHIVE: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    OTHER: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export const sourceColors: Record<string, string> = {
    CHAT: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    CARD: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    DOCUMENT: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    AVATAR: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    WHITEBOARD: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};
