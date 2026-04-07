// src/components/layout/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    Home,
    MessageSquare,
    Kanban,
    FileText,
    LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarUnread } from "@/hooks/useSidebarUnread";

interface BottomNavProps {
    workspaceSlug: string;
    onMoreClick: () => void;
}

const BOTTOM_TABS = [
    { label: "Home", href: "", icon: Home, showBadge: false },
    { label: "Chat", href: "/chat", icon: MessageSquare, showBadge: true },
    { label: "Board", href: "/kanban", icon: Kanban, showBadge: false },
    { label: "Docs", href: "/documents", icon: FileText, showBadge: false },
];

export function BottomNav({ workspaceSlug, onMoreClick }: BottomNavProps) {
    const pathname = usePathname() || "";
    const baseUrl = `/workspace/${workspaceSlug}`;
    const [workspaceId, setWorkspaceId] = useState("");

    useEffect(() => {
        fetch(`/api/workspaces/${workspaceSlug}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => { if (data?.id) setWorkspaceId(data.id); })
            .catch(() => {});
    }, [workspaceSlug]);

    const { unreadCounts } = useSidebarUnread(workspaceId);
    const unreadCount = unreadCounts.totalUnreadMessages;

    const isActive = (href: string) => {
        const fullHref = `${baseUrl}${href}`;
        if (href === "") return pathname === baseUrl;
        return pathname.startsWith(fullHref);
    };

    // Don't render if we're on a full-screen page (video room)
    const segments = pathname.split("/").filter(Boolean);
    const isVideoRoom =
        segments.includes("video") &&
        segments.length >= 4 &&
        segments[segments.length - 1] !== "video";
    if (isVideoRoom) return null;

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-card border-t border-border flex items-stretch safe-area-bottom">
            {BOTTOM_TABS.map((tab) => {
                const active = isActive(tab.href);
                return (
                    <Link
                        key={tab.label}
                        href={`${baseUrl}${tab.href}`}
                        className="flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 transition-colors active:scale-95 touch-manipulation"
                    >
                        <div className="relative">
                            <tab.icon
                                className={cn(
                                    "w-5 h-5",
                                    active ? "text-primary" : "text-muted-foreground"
                                )}
                            />
                            {tab.showBadge && unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </div>
                        <span
                            className={cn(
                                "text-[10px] font-medium leading-none",
                                active ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            {tab.label}
                        </span>
                    </Link>
                );
            })}

            {/* More tab — opens mobile sidebar sheet */}
            <button
                onClick={onMoreClick}
                className="flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 transition-colors active:scale-95 touch-manipulation"
            >
                <LayoutGrid className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] font-medium leading-none text-muted-foreground">
                    More
                </span>
            </button>
        </nav>
    );
}
