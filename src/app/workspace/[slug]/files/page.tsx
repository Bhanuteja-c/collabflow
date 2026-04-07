// src/app/workspace/[slug]/files/page.tsx
// Storage File Manager — grid/list view with filters, search, and file actions
"use client";

import { useState, use, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Search,
    Grid3X3,
    List,
    Download,
    ExternalLink,
    Trash2,
    FolderOpen,
    Loader2,
    Copy,
    ArrowUpDown,
    Filter,
    HardDrive,
    Clock,
} from "lucide-react";
import { useFiles, type FileItem } from "@/hooks/useFiles";
import { FileIcon, categoryColors, sourceColors } from "@/components/files/FileIcon";
import { ImagePreviewModal } from "@/components/files/ImagePreviewModal";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { formatFileSize } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = [
    { value: "all", label: "All" },
    { value: "IMAGE", label: "Images" },
    { value: "DOCUMENT", label: "Documents" },
    { value: "VIDEO", label: "Videos" },
    { value: "AUDIO", label: "Audio" },
    { value: "ARCHIVE", label: "Archives" },
    { value: "OTHER", label: "Other" },
];

const SOURCES = [
    { value: "all", label: "All Sources" },
    { value: "CHAT", label: "From Chat" },
    { value: "CARD", label: "From Cards" },
    { value: "DOCUMENT", label: "From Documents" },
];

const SORT_OPTIONS = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "largest", label: "Largest" },
    { value: "smallest", label: "Smallest" },
    { value: "name", label: "Name A–Z" },
];

export default function FilesPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const { data: session } = useSession();

    const {
        files,
        loading,
        loadingMore,
        nextCursor,
        stats,
        categoryCounts,
        category,
        setCategory,
        source,
        setSource,
        search,
        setSearch,
        sort,
        setSort,
        loadMore,
        deleteFile,
    } = useFiles({ workspaceSlug: slug });

    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [detailFile, setDetailFile] = useState<FileItem | null>(null);
    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

    // Image files for lightbox navigation
    const imageFiles = useMemo(
        () => files.filter((f) => f.category === "IMAGE"),
        [files]
    );

    const previewIndex = useMemo(
        () => (previewFile ? imageFiles.findIndex((f) => f.id === previewFile.id) : -1),
        [previewFile, imageFiles]
    );

    const handleFileClick = (file: FileItem) => {
        if (file.category === "IMAGE") {
            setPreviewFile(file);
        } else {
            setDetailFile(file);
        }
    };

    const handleDelete = async (fileId: string) => {
        if (!confirm("Delete this file? This action cannot be undone.")) return;
        try {
            await deleteFile(fileId);
            toast.success("File deleted");
            if (detailFile?.id === fileId) setDetailFile(null);
        } catch {
            toast.error("Failed to delete file");
        }
    };

    const handleDownload = (file: FileItem) => {
        const link = document.createElement("a");
        link.href = file.url;
        link.download = file.originalName;
        link.target = "_blank";
        link.click();
    };

    const handleCopyLink = (file: FileItem) => {
        navigator.clipboard.writeText(file.url);
        toast.success("Link copied to clipboard");
    };

    const canDeleteFile = useCallback(
        (file: FileItem) => {
            return file.uploadedBy.id === session?.user?.id;
        },
        [session]
    );

    // Storage usage as percentage (5GB cap display)
    const MAX_DISPLAY_STORAGE = 5 * 1024 * 1024 * 1024; // 5GB
    const usagePercent = Math.min((stats.totalSize / MAX_DISPLAY_STORAGE) * 100, 100);

    return (
        <div className="min-h-full p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <FolderOpen className="w-6 h-6 text-primary" />
                        Files
                    </h1>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <HardDrive className="w-3.5 h-3.5" />
                            {stats.totalFiles} files · {formatFileSize(stats.totalSize)} used
                        </span>
                    </div>
                    <Progress value={usagePercent} className="h-1.5 w-48 mt-2" />
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-3">
                {/* Search + Sort + View */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search files..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>

                    {/* Source filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 h-9">
                                <Filter className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">
                                    {SOURCES.find((s) => s.value === source)?.label}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {SOURCES.map((s) => (
                                <DropdownMenuItem
                                    key={s.value}
                                    onClick={() => setSource(s.value)}
                                    className={source === s.value ? "bg-accent" : ""}
                                >
                                    {s.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Sort */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 h-9">
                                <ArrowUpDown className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">
                                    {SORT_OPTIONS.find((s) => s.value === sort)?.label}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {SORT_OPTIONS.map((s) => (
                                <DropdownMenuItem
                                    key={s.value}
                                    onClick={() => setSort(s.value)}
                                    className={sort === s.value ? "bg-accent" : ""}
                                >
                                    {s.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* View toggle */}
                    <div className="flex items-center border rounded-md">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-l-md transition-colors ${
                                viewMode === "grid"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-r-md transition-colors ${
                                viewMode === "list"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Category tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                    {CATEGORIES.map((cat) => {
                        const count = cat.value === "all" ? stats.totalFiles : (categoryCounts[cat.value] || 0);
                        return (
                            <button
                                key={cat.value}
                                onClick={() => setCategory(cat.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                    category === cat.value
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                            >
                                {cat.label}
                                {count > 0 && (
                                    <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                            category === cat.value
                                                ? "bg-primary-foreground/20"
                                                : "bg-background"
                                        }`}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Empty state */}
            {!loading && files.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 rounded-full bg-muted/50 mb-4">
                        <FolderOpen className="w-12 h-12 text-muted-foreground opacity-40" />
                    </div>
                    <p className="text-sm font-medium">No files found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {search
                            ? `No results for "${search}"`
                            : "Files shared in chat and cards will appear here"}
                    </p>
                </div>
            )}

            {/* Grid View */}
            {!loading && files.length > 0 && viewMode === "grid" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    <AnimatePresence mode="popLayout">
                        {files.map((file, i) => (
                            <motion.div
                                key={file.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.02 }}
                                className="group relative rounded-xl border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                                onClick={() => handleFileClick(file)}
                            >
                                {/* Preview area */}
                                <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
                                    {file.category === "IMAGE" ? (
                                        <img
                                            src={file.url}
                                            alt={file.originalName}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <FileIcon mimeType={file.mimeType} className="w-10 h-10" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-2.5">
                                    <p className="text-xs font-medium truncate">{file.originalName}</p>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-[10px] text-muted-foreground">
                                            {formatFileSize(file.size)}
                                        </p>
                                        <Badge
                                            variant="secondary"
                                            className={`text-[9px] px-1 py-0 h-4 ${
                                                sourceColors[file.sourceType] || ""
                                            }`}
                                        >
                                            {file.sourceType}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Hover overlay actions */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(file.url, "_blank");
                                        }}
                                        className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(file);
                                        }}
                                        className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background transition-colors"
                                    >
                                        <Download className="w-3 h-3" />
                                    </button>
                                    {canDeleteFile(file) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(file.id);
                                            }}
                                            className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background text-destructive transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* List View */}
            {!loading && files.length > 0 && viewMode === "list" && (
                <div className="border rounded-xl overflow-hidden bg-card">
                    {/* Table header */}
                    <div className="hidden md:grid grid-cols-[1fr_100px_80px_100px_140px_100px_80px] gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground border-b bg-muted/30">
                        <span>Name</span>
                        <span>Type</span>
                        <span>Size</span>
                        <span>Source</span>
                        <span>Uploaded by</span>
                        <span>Date</span>
                        <span className="text-right">Actions</span>
                    </div>

                    <AnimatePresence mode="popLayout">
                        {files.map((file, i) => (
                            <motion.div
                                key={file.id}
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: i * 0.015 }}
                                className="group grid grid-cols-1 md:grid-cols-[1fr_100px_80px_100px_140px_100px_80px] gap-2 items-center px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                                onClick={() => handleFileClick(file)}
                            >
                                {/* Name + thumbnail */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-md bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {file.category === "IMAGE" ? (
                                            <img
                                                src={file.url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <FileIcon mimeType={file.mimeType} className="w-4 h-4" />
                                        )}
                                    </div>
                                    <span className="text-sm font-medium truncate">
                                        {file.originalName}
                                    </span>
                                </div>

                                {/* Type */}
                                <Badge
                                    variant="secondary"
                                    className={`text-[10px] w-fit ${categoryColors[file.category] || ""}`}
                                >
                                    {file.category}
                                </Badge>

                                {/* Size */}
                                <span className="text-xs text-muted-foreground">
                                    {formatFileSize(file.size)}
                                </span>

                                {/* Source */}
                                <Badge
                                    variant="secondary"
                                    className={`text-[10px] w-fit ${sourceColors[file.sourceType] || ""}`}
                                >
                                    {file.sourceType}
                                </Badge>

                                {/* Uploaded by */}
                                <div className="flex items-center gap-2">
                                    <UserAvatar
                                        user={file.uploadedBy}
                                        className="w-5 h-5"
                                        showStatus={false}
                                    />
                                    <span className="text-xs text-muted-foreground truncate">
                                        {file.uploadedBy.name || "Unknown"}
                                    </span>
                                </div>

                                {/* Date */}
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3 hidden md:block" />
                                    {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                                </span>

                                {/* Actions */}
                                <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(file);
                                        }}
                                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                    </button>
                                    {canDeleteFile(file) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(file.id);
                                            }}
                                            className="p-1.5 rounded-md hover:bg-muted text-destructive transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Load more */}
            {nextCursor && !loading && (
                <div className="flex justify-center pt-4">
                    <Button
                        variant="outline"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="gap-2"
                    >
                        {loadingMore ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : null}
                        Load more files
                    </Button>
                </div>
            )}

            {/* Image Preview Modal (lightbox) */}
            <ImagePreviewModal
                file={previewFile}
                isOpen={!!previewFile}
                onClose={() => setPreviewFile(null)}
                hasPrevious={previewIndex > 0}
                hasNext={previewIndex < imageFiles.length - 1}
                onPrevious={() => setPreviewFile(imageFiles[previewIndex - 1])}
                onNext={() => setPreviewFile(imageFiles[previewIndex + 1])}
            />

            {/* File Detail Sheet (slide-in panel) */}
            <Sheet open={!!detailFile} onOpenChange={(open) => !open && setDetailFile(null)}>
                <SheetContent className="sm:max-w-md overflow-y-auto">
                    {detailFile && (
                        <>
                            <SheetHeader>
                                <SheetTitle className="text-left truncate pr-8">
                                    {detailFile.originalName}
                                </SheetTitle>
                            </SheetHeader>

                            <div className="mt-6 space-y-6">
                                {/* Preview */}
                                <div className="rounded-xl bg-muted/30 border overflow-hidden flex items-center justify-center min-h-[200px]">
                                    {detailFile.category === "IMAGE" ? (
                                        <img
                                            src={detailFile.url}
                                            alt={detailFile.originalName}
                                            className="w-full object-contain max-h-[300px]"
                                        />
                                    ) : (
                                        <FileIcon mimeType={detailFile.mimeType} className="w-16 h-16" />
                                    )}
                                </div>

                                {/* Metadata */}
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-0.5">Size</p>
                                            <p className="font-medium">{formatFileSize(detailFile.size)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-0.5">Type</p>
                                            <Badge
                                                variant="secondary"
                                                className={categoryColors[detailFile.category] || ""}
                                            >
                                                {detailFile.category}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-0.5">Source</p>
                                            <Badge
                                                variant="secondary"
                                                className={sourceColors[detailFile.sourceType] || ""}
                                            >
                                                {detailFile.sourceType}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-0.5">Uploaded</p>
                                            <p className="font-medium text-xs">
                                                {formatDistanceToNow(new Date(detailFile.createdAt), {
                                                    addSuffix: true,
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Uploader */}
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                        <UserAvatar
                                            user={detailFile.uploadedBy}
                                            className="w-8 h-8"
                                            showStatus={false}
                                        />
                                        <div>
                                            <p className="text-sm font-medium">
                                                {detailFile.uploadedBy.name || "Unknown"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Uploaded by</p>
                                        </div>
                                    </div>

                                    {/* MIME type */}
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">MIME Type</p>
                                        <code className="text-xs bg-muted px-2 py-1 rounded">
                                            {detailFile.mimeType}
                                        </code>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => window.open(detailFile.url, "_blank")}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Open
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => handleDownload(detailFile)}
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => handleCopyLink(detailFile)}
                                    >
                                        <Copy className="w-4 h-4" />
                                        Copy Link
                                    </Button>
                                    {canDeleteFile(detailFile) && (
                                        <Button
                                            variant="destructive"
                                            className="gap-2"
                                            onClick={() => handleDelete(detailFile.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
