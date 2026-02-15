"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    FileText,
    MessageSquare,
    Kanban,
    Users,
    Video,
    Settings,
    Hash,
    LayoutDashboard,
    ArrowRight,
    Command,
    CornerDownLeft,
} from "lucide-react";

interface SearchResult {
    id: string;
    type: "document" | "channel" | "member" | "card" | "action";
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    href?: string;
    image?: string;
}

interface CommandPaletteProps {
    workspaceSlug?: string;
    workspaceId?: string;
}

// Quick actions available in the palette
const getQuickActions = (slug: string): SearchResult[] => [
    { id: "nav-dashboard", type: "action", title: "Go to Dashboard", subtitle: "Workspace overview", href: `/workspace/${slug}`, icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "nav-docs", type: "action", title: "Go to Documents", subtitle: "Browse & create documents", href: `/workspace/${slug}/documents`, icon: <FileText className="w-4 h-4" /> },
    { id: "nav-chat", type: "action", title: "Go to Chat", subtitle: "Team messaging", href: `/workspace/${slug}/chat`, icon: <MessageSquare className="w-4 h-4" /> },
    { id: "nav-kanban", type: "action", title: "Go to Kanban", subtitle: "Task boards", href: `/workspace/${slug}/kanban`, icon: <Kanban className="w-4 h-4" /> },
    { id: "nav-video", type: "action", title: "Go to Video", subtitle: "Video conferencing", href: `/workspace/${slug}/video`, icon: <Video className="w-4 h-4" /> },
    { id: "nav-members", type: "action", title: "Go to Members", subtitle: "Manage team", href: `/workspace/${slug}/members`, icon: <Users className="w-4 h-4" /> },
    { id: "nav-settings", type: "action", title: "Go to Settings", subtitle: "Workspace settings", href: `/workspace/${slug}/settings`, icon: <Settings className="w-4 h-4" /> },
];

export function CommandPalette({ workspaceSlug, workspaceId }: CommandPaletteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    // Extract workspace slug from pathname if not provided
    const slug = workspaceSlug || pathname.match(/\/workspace\/([^/]+)/)?.[1] || "";

    // Quick actions (filtered by query)
    const quickActions = slug ? getQuickActions(slug) : [];

    // Keyboard shortcut to open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery("");
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Search API call (debounced)
    const performSearch = useCallback(
        async (searchQuery: string) => {
            if (searchQuery.length < 1) {
                setResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                const params = new URLSearchParams({ q: searchQuery });
                if (workspaceId) params.set("workspaceId", workspaceId);
                const res = await fetch(`/api/search?${params}`);
                if (!res.ok) throw new Error("Search failed");

                const data = await res.json();
                const searchResults: SearchResult[] = [];

                // Documents
                data.documents?.forEach((doc: any) => {
                    searchResults.push({
                        id: doc.id,
                        type: "document",
                        title: doc.title || "Untitled Document",
                        subtitle: `Updated ${new Date(doc.updatedAt).toLocaleDateString()}`,
                        href: `/workspace/${doc.workspaceSlug || slug}/editor/${doc.id}`,
                        icon: <FileText className="w-4 h-4" />,
                    });
                });

                // Channels
                data.channels?.forEach((ch: any) => {
                    searchResults.push({
                        id: ch.id,
                        type: "channel",
                        title: `#${ch.name}`,
                        subtitle: ch.channelType === "direct" ? "Direct message" : "Channel",
                        href: `/workspace/${ch.workspaceSlug || slug}/chat`,
                        icon: <Hash className="w-4 h-4" />,
                    });
                });

                // Cards
                data.cards?.forEach((c: any) => {
                    searchResults.push({
                        id: c.id,
                        type: "card",
                        title: c.title,
                        subtitle: `${c.boardName} ‣ ${c.columnName}${c.priority ? ` · ${c.priority}` : ""}`,
                        href: `/workspace/${slug}/kanban`,
                        icon: <Kanban className="w-4 h-4" />,
                    });
                });

                // Members
                data.members?.forEach((m: any) => {
                    searchResults.push({
                        id: m.id,
                        type: "member",
                        title: m.name || m.email,
                        subtitle: m.role,
                        image: m.image,
                        href: `/workspace/${slug}/members`,
                        icon: <Users className="w-4 h-4" />,
                    });
                });

                setResults(searchResults);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        },
        [workspaceId, slug]
    );

    // Debounced search
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (query.trim()) {
            debounceTimer.current = setTimeout(() => performSearch(query.trim()), 200);
        } else {
            setResults([]);
        }
        setSelectedIndex(0);
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [query, performSearch]);

    // Combined list: search results + filtered actions
    const combinedResults = query.trim()
        ? [
            ...results,
            ...quickActions.filter(
                (a) =>
                    a.title.toLowerCase().includes(query.toLowerCase()) ||
                    a.subtitle?.toLowerCase().includes(query.toLowerCase())
            ),
        ]
        : quickActions;

    // Navigate to selected result
    const handleSelect = useCallback(
        (result: SearchResult) => {
            if (result.href) {
                router.push(result.href);
            }
            setIsOpen(false);
        },
        [router]
    );

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((i) => Math.min(i + 1, combinedResults.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((i) => Math.max(i - 1, 0));
                    break;
                case "Enter":
                    e.preventDefault();
                    if (combinedResults[selectedIndex]) {
                        handleSelect(combinedResults[selectedIndex]);
                    }
                    break;
            }
        },
        [combinedResults, selectedIndex, handleSelect]
    );

    // Scroll selected item into view
    useEffect(() => {
        const container = resultsRef.current;
        if (!container) return;
        const selectedEl = container.children[selectedIndex] as HTMLElement;
        if (selectedEl) {
            selectedEl.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex]);

    // Group results by type for display
    const groupedResults: { label: string; items: SearchResult[] }[] = [];
    if (query.trim() && results.length > 0) {
        const docs = results.filter((r) => r.type === "document");
        const cards = results.filter((r) => r.type === "card");
        const channels = results.filter((r) => r.type === "channel");
        const members = results.filter((r) => r.type === "member");
        if (docs.length) groupedResults.push({ label: "Documents", items: docs });
        if (cards.length) groupedResults.push({ label: "Cards", items: cards });
        if (channels.length) groupedResults.push({ label: "Channels", items: channels });
        if (members.length) groupedResults.push({ label: "Members", items: members });
    }
    const actions = query.trim()
        ? quickActions.filter(
            (a) =>
                a.title.toLowerCase().includes(query.toLowerCase()) ||
                a.subtitle?.toLowerCase().includes(query.toLowerCase())
        )
        : quickActions;
    if (actions.length) groupedResults.push({ label: query.trim() ? "Actions" : "Quick Actions", items: actions });

    // Flatten for index tracking
    const flatResults = groupedResults.flatMap((g) => g.items);
    let globalIndex = 0;

    return (
        <>
            {/* Trigger button */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-2.5 md:px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted border rounded-lg transition-colors"
            >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Search</span>
                <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ml-2">
                    <Command className="w-2.5 h-2.5" />K
                </kbd>
            </button>

            {/* Modal backdrop + palette */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Palette */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="fixed top-[15%] md:top-[20%] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl z-50"
                        >
                            <div className="bg-card border rounded-xl shadow-lg overflow-hidden">
                                {/* Search Input */}
                                <div className="flex items-center gap-3 px-4 border-b">
                                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Search documents, channels, members..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="flex-1 py-3.5 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                                    />
                                    {isSearching && (
                                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    )}
                                </div>

                                {/* Results */}
                                <div
                                    ref={resultsRef}
                                    className="max-h-[320px] overflow-y-auto p-2"
                                >
                                    {groupedResults.length === 0 && query.trim() && !isSearching ? (
                                        <div className="py-8 text-center text-sm text-muted-foreground">
                                            No results found for &ldquo;{query}&rdquo;
                                        </div>
                                    ) : (
                                        groupedResults.map((group) => (
                                            <div key={group.label} className="mb-2">
                                                <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                                    {group.label}
                                                </div>
                                                {group.items.map((item) => {
                                                    const itemIndex = globalIndex++;
                                                    const isSelected = itemIndex === selectedIndex;
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => handleSelect(item)}
                                                            onMouseEnter={() => setSelectedIndex(itemIndex)}
                                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${isSelected
                                                                ? "bg-accent/10 text-accent-foreground"
                                                                : "text-foreground hover:bg-muted/50"
                                                                }`}
                                                        >
                                                            <span className={`shrink-0 ${isSelected ? "text-accent" : "text-muted-foreground"}`}>
                                                                {item.image ? (
                                                                    <img
                                                                        src={item.image}
                                                                        alt=""
                                                                        className="w-5 h-5 rounded-full"
                                                                    />
                                                                ) : (
                                                                    item.icon
                                                                )}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="truncate font-medium">
                                                                    {item.title}
                                                                </div>
                                                                {item.subtitle && (
                                                                    <div className="truncate text-xs text-muted-foreground">
                                                                        {item.subtitle}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {isSelected && (
                                                                <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Footer hints */}
                                <div className="flex items-center gap-4 px-4 py-2 border-t text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <kbd className="inline-flex items-center rounded border bg-background px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
                                        navigate
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="inline-flex items-center rounded border bg-background px-1 py-0.5 font-mono text-[10px]">↵</kbd>
                                        select
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="inline-flex items-center rounded border bg-background px-1 py-0.5 font-mono text-[10px]">esc</kbd>
                                        close
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
