// src/hooks/useFiles.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface FileItem {
    id: string;
    name: string;
    originalName: string;
    url: string;
    size: number;
    mimeType: string;
    category: string;
    sourceType: string;
    sourceId: string | null;
    createdAt: string;
    uploadedBy: {
        id: string;
        name: string | null;
        image: string | null;
    };
}

interface FileStats {
    totalFiles: number;
    totalSize: number;
}

interface FilesResponse {
    files: FileItem[];
    nextCursor: string | null;
    stats: FileStats;
    categoryCounts: Record<string, number>;
}

interface UseFilesOptions {
    workspaceSlug: string;
}

export function useFiles({ workspaceSlug }: UseFilesOptions) {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [stats, setStats] = useState<FileStats>({ totalFiles: 0, totalSize: 0 });
    const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

    // Filter state
    const [category, setCategory] = useState("all");
    const [source, setSource] = useState("all");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("newest");

    // Debounce ref
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce search input
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [search]);

    const fetchFiles = useCallback(
        async (cursor?: string) => {
            if (!workspaceSlug) return;
            if (cursor) setLoadingMore(true);
            else setLoading(true);

            try {
                const params = new URLSearchParams();
                if (category !== "all") params.set("category", category);
                if (source !== "all") params.set("source", source);
                if (debouncedSearch) params.set("search", debouncedSearch);
                params.set("sort", sort);
                if (cursor) params.set("cursor", cursor);

                const res = await fetch(`/api/workspaces/${workspaceSlug}/files?${params}`);
                if (!res.ok) throw new Error("Failed to fetch files");

                const data: FilesResponse = await res.json();

                if (cursor) {
                    setFiles((prev) => [...prev, ...data.files]);
                } else {
                    setFiles(data.files);
                }

                setNextCursor(data.nextCursor);
                setStats(data.stats);
                setCategoryCounts(data.categoryCounts);
            } catch (error) {
                console.error("[useFiles] Error:", error);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [workspaceSlug, category, source, debouncedSearch, sort]
    );

    // Refetch when filters change
    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const loadMore = useCallback(() => {
        if (nextCursor && !loadingMore) {
            fetchFiles(nextCursor);
        }
    }, [nextCursor, loadingMore, fetchFiles]);

    const deleteFile = useCallback(
        async (fileId: string) => {
            // Optimistic removal
            setFiles((prev) => prev.filter((f) => f.id !== fileId));
            setStats((prev) => ({
                totalFiles: prev.totalFiles - 1,
                totalSize: prev.totalSize - (files.find((f) => f.id === fileId)?.size || 0),
            }));

            try {
                const res = await fetch(`/api/workspaces/${workspaceSlug}/files/${fileId}`, {
                    method: "DELETE",
                });
                if (!res.ok) {
                    // Revert on failure
                    fetchFiles();
                    throw new Error("Delete failed");
                }
            } catch (error) {
                console.error("[useFiles] Delete error:", error);
                throw error;
            }
        },
        [workspaceSlug, files, fetchFiles]
    );

    return {
        files,
        loading,
        loadingMore,
        nextCursor,
        stats,
        categoryCounts,
        // Filters
        category,
        setCategory,
        source,
        setSource,
        search,
        setSearch,
        sort,
        setSort,
        // Actions
        loadMore,
        deleteFile,
        refetch: () => fetchFiles(),
    };
}
