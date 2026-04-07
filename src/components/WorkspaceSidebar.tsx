"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { DocumentTree } from "@/components/DocumentTree";
import { useWorkspacePresence } from "@/hooks/useWorkspacePresence";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    LayoutDashboard,
    FileText,
    Kanban,
    MessageSquare,
    Settings,
    Users,
    Video,
    LogOut,
    Target,
    BarChart3,
    PenTool,
    ChevronDown,
    ChevronRight,
    FolderOpen,
    Hash,
    SquareKanban,
    Pen,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useSidebarUnread } from "@/hooks/useSidebarUnread";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ─── Sidebar nav groups ───────────────────────────────────────────────
interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
}

const SIDEBAR_GROUPS: { label: string; items: NavItem[] }[] = [
    {
        label: "DISCOVER",
        items: [
            { label: "Dashboard", href: "", icon: LayoutDashboard },
            { label: "Video", href: "/video", icon: Video },
            { label: "Whiteboard", href: "/whiteboard", icon: PenTool },
            { label: "Epics", href: "/epics", icon: Target },
        ],
    },
    {
        label: "MANAGE",
        items: [
            { label: "Files", href: "/files", icon: FolderOpen },
            { label: "Analytics", href: "/analytics", icon: BarChart3 },
            { label: "Members", href: "/members", icon: Users },
            { label: "Settings", href: "/settings", icon: Settings },
        ],
    },
];

// Full nav for mobile sheet (includes navbar items too)
const ALL_NAV_ITEMS = [
    { icon: LayoutDashboard, label: "Dashboard", href: "" },
    { icon: MessageSquare, label: "Chat", href: "/chat" },
    { icon: Kanban, label: "Kanban", href: "/kanban" },
    { icon: FileText, label: "Docs", href: "/documents" },
    { icon: PenTool, label: "Whiteboard", href: "/whiteboard" },
    { icon: Video, label: "Video", href: "/video" },
    { icon: FolderOpen, label: "Files", href: "/files" },
    { icon: Target, label: "Epics", href: "/epics" },
    { icon: BarChart3, label: "Analytics", href: "/analytics" },
    { icon: Users, label: "Members", href: "/members" },
    { icon: Settings, label: "Settings", href: "/settings" },
];

interface WorkspaceSidebarProps {
    workspaceSlug: string;
}

// ─── Context Panel: route-aware sub-navigation ────────────────────────
function ContextPanel({
    workspaceSlug,
    workspaceId,
    pathname,
    onItemClick,
}: {
    workspaceSlug: string;
    workspaceId: string;
    pathname: string;
    onItemClick?: () => void;
}) {
    const baseUrl = `/workspace/${workspaceSlug}`;
    const isChat = pathname.startsWith(`${baseUrl}/chat`);
    const isKanban = pathname.startsWith(`${baseUrl}/kanban`);
    const isWhiteboard = pathname.startsWith(`${baseUrl}/whiteboard`);
    const isVideo = pathname.startsWith(`${baseUrl}/video`);

    if (!isChat && !isKanban && !isWhiteboard && !isVideo) return null;

    return (
        <div className="border-b">
            {isKanban && (
                <BoardList workspaceId={workspaceId} workspaceSlug={workspaceSlug} pathname={pathname} onItemClick={onItemClick} />
            )}
            {isWhiteboard && (
                <WhiteboardList workspaceSlug={workspaceSlug} pathname={pathname} onItemClick={onItemClick} />
            )}
            {isVideo && (
                <VideoRoomPanel workspaceSlug={workspaceSlug} onItemClick={onItemClick} />
            )}
        </div>
    );
}

// ─── Channel List ─────────────────────────────────────────────────────
function ChannelList({ workspaceId, workspaceSlug, pathname, onItemClick }: {
    workspaceId: string; workspaceSlug: string; pathname: string; onItemClick?: () => void;
}) {
    const [channels, setChannels] = useState<any[]>([]);
    const [open, setOpen] = useState(true);
    const baseUrl = `/workspace/${workspaceSlug}`;

    useEffect(() => {
        if (!workspaceId) return;
        fetch(`/api/channels?workspaceId=${workspaceId}`)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setChannels(Array.isArray(data) ? data.filter((c: any) => c.type !== "direct" && c.type !== "DIRECT") : []))
            .catch(() => {});
    }, [workspaceId]);

    return (
        <div className="p-2">
            <button onClick={() => setOpen(!open)} className="flex items-center w-full gap-1 px-2 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/60 hover:text-foreground transition-colors uppercase">
                {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span>Channels</span>
                {channels.length > 0 && <span className="ml-auto text-[9px] text-muted-foreground/40">{channels.length}</span>}
            </button>
            {open && (
                <div className="mt-0.5 space-y-0.5">
                    {channels.map((ch) => {
                        const isActive = pathname.includes(`channel=${ch.id}`) || pathname.includes(`channelId=${ch.id}`);
                        return (
                            <Link key={ch.id} href={`${baseUrl}/chat?channel=${ch.id}`} onClick={onItemClick}
                                className={cn("flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-md transition-all",
                                    isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}>
                                <Hash className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                                <span className="truncate flex-1">{ch.name}</span>
                                {ch.unreadCount > 0 && (
                                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center flex-shrink-0">
                                        {ch.unreadCount > 99 ? "99+" : ch.unreadCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                    {channels.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground/50 italic">No channels</p>}
                </div>
            )}
        </div>
    );
}

// ─── Board List ───────────────────────────────────────────────────────
function BoardList({ workspaceId, workspaceSlug, pathname, onItemClick }: {
    workspaceId: string; workspaceSlug: string; pathname: string; onItemClick?: () => void;
}) {
    const [boards, setBoards] = useState<any[]>([]);
    const [open, setOpen] = useState(true);
    const baseUrl = `/workspace/${workspaceSlug}`;

    useEffect(() => {
        if (!workspaceId) return;
        fetch(`/api/boards?workspaceId=${workspaceId}`)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setBoards(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, [workspaceId]);

    return (
        <div className="p-2">
            <button onClick={() => setOpen(!open)} className="flex items-center w-full gap-1 px-2 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/60 hover:text-foreground transition-colors uppercase">
                {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span>Boards</span>
            </button>
            {open && (
                <div className="mt-0.5 space-y-0.5">
                    {boards.map((b) => {
                        const isActive = pathname.includes(`board=${b.id}`);
                        return (
                            <Link key={b.id} href={`${baseUrl}/kanban?board=${b.id}`} onClick={onItemClick}
                                className={cn("flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-md transition-all",
                                    isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}>
                                <SquareKanban className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                                <span className="truncate">{b.title}</span>
                            </Link>
                        );
                    })}
                    {boards.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground/50 italic">No boards</p>}
                </div>
            )}
        </div>
    );
}

// ─── Whiteboard List ──────────────────────────────────────────────────
function WhiteboardList({ workspaceSlug, pathname, onItemClick }: {
    workspaceSlug: string; pathname: string; onItemClick?: () => void;
}) {
    const [whiteboards, setWhiteboards] = useState<any[]>([]);
    const [open, setOpen] = useState(true);
    const baseUrl = `/workspace/${workspaceSlug}`;

    useEffect(() => {
        fetch(`/api/workspaces/${workspaceSlug}/whiteboards`)
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setWhiteboards(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, [workspaceSlug]);

    return (
        <div className="p-2">
            <button onClick={() => setOpen(!open)} className="flex items-center w-full gap-1 px-2 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/60 hover:text-foreground transition-colors uppercase">
                {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span>Whiteboards</span>
            </button>
            {open && (
                <div className="mt-0.5 space-y-0.5">
                    {whiteboards.map((wb) => {
                        const isActive = pathname.includes(wb.id);
                        return (
                            <Link key={wb.id} href={`${baseUrl}/whiteboard/${wb.id}`} onClick={onItemClick}
                                className={cn("flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-md transition-all",
                                    isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}>
                                <Pen className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                                <span className="truncate">{wb.name || "Untitled"}</span>
                            </Link>
                        );
                    })}
                    {whiteboards.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground/50 italic">No whiteboards</p>}
                </div>
            )}
        </div>
    );
}

// ─── Video Room Panel ─────────────────────────────────────────────────
function VideoRoomPanel({ workspaceSlug, onItemClick }: { workspaceSlug: string; onItemClick?: () => void; }) {
    const baseUrl = `/workspace/${workspaceSlug}`;
    return (
        <div className="p-2">
            <div className="px-2 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">Video Rooms</div>
            <Link href={`${baseUrl}/video`} onClick={onItemClick}
                className="flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all">
                <Video className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                <span>Browse Rooms</span>
            </Link>
        </div>
    );
}

// ─── Shared sidebar content ───────────────────────────────────────────
function SidebarContent({ workspaceSlug, onItemClick, showNav }: {
    workspaceSlug: string;
    onItemClick?: () => void;
    showNav?: boolean;
}) {
    const pathname = usePathname() || "";
    const { data: session } = useSession();
    const baseUrl = `/workspace/${workspaceSlug}`;
    const [workspaceId, setWorkspaceId] = useState<string>("");
    const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
    const [dmsOpen, setDmsOpen] = useState(true);

    const { unreadCounts } = useSidebarUnread(workspaceId);

    useEffect(() => {
        setIsLoadingWorkspace(true);
        fetch(`/api/workspaces/${workspaceSlug}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data?.id) setWorkspaceId(data.id); })
            .catch(() => {})
            .finally(() => setIsLoadingWorkspace(false));
    }, [workspaceSlug]);

    const { onlineUsers } = useWorkspacePresence(workspaceId);

    const isNavActive = (href: string) => {
        const fullHref = `${baseUrl}${href}`;
        if (href === "") return pathname === baseUrl;
        return pathname.startsWith(fullHref);
    };

    return (
        <>
            {/* CollabFlow Logo */}
            <div className="flex items-center px-4 py-[14px] border-b border-border">
                <Link href="/" className="flex items-center">
                    <Logo size="sm" showText={true} />
                </Link>
            </div>

            {/* Workspace Switcher */}
            <div className="p-3 border-b">
                <WorkspaceSwitcher currentSlug={workspaceSlug} />
            </div>

            {/* Mobile-only: Full flat nav */}
            {showNav && (
                <div className="p-2 border-b">
                    <div className="space-y-0.5">
                        {ALL_NAV_ITEMS.map((item) => {
                            const active = isNavActive(item.href);
                            return (
                                <Link key={item.label} href={`${baseUrl}${item.href}`} onClick={onItemClick}
                                    className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all active:scale-[0.98] touch-manipulation",
                                        active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    )}>
                                    <item.icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="flex-1 flex items-center min-w-0">
                                        <span className="truncate">{item.label}</span>
                                        {item.label === "Chat" && unreadCounts.totalUnreadMessages > 0 && (
                                            <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                                                {unreadCounts.totalUnreadMessages > 99 ? "99+" : unreadCounts.totalUnreadMessages}
                                            </span>
                                        )}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Desktop: DISCOVER + MANAGE nav groups */}
            {!showNav && (
                <div className="p-2 space-y-1 border-b">
                    {SIDEBAR_GROUPS.map((group) => (
                        <div key={group.label}>
                            <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground/50 uppercase">
                                {group.label}
                            </p>
                            {group.items.map((item) => {
                                const active = isNavActive(item.href);
                                return (
                                    <Link key={item.label} href={`${baseUrl}${item.href}`} onClick={onItemClick}
                                        className={cn(
                                            "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors",
                                            active
                                                ? "bg-accent text-accent-foreground font-medium"
                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        )}>
                                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}

            {/* Context Panel (route-aware) */}
            {workspaceId && (
                <ContextPanel workspaceSlug={workspaceSlug} workspaceId={workspaceId} pathname={pathname} onItemClick={onItemClick} />
            )}

            {/* Scrollable: DMs + Documents */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                {/* Direct Messages Removed -> Moved to Chat Inner Sidebar */}

                {/* Document Tree */}
                {workspaceId && (
                    <DocumentTree workspaceId={workspaceId} workspaceSlug={workspaceSlug} onItemClick={onItemClick} />
                )}
            </nav>

            {/* Online Members */}
            {!isLoadingWorkspace && onlineUsers.length > 0 && (
                <div className="p-2 border-t">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1.5 px-1">
                        Online — {onlineUsers.length}
                    </p>
                    <div className="flex flex-wrap gap-1 px-1">
                        {onlineUsers.slice(0, 8).map((u) => (
                            <div key={u.socketId} title={u.user.name || ""} className="flex-shrink-0">
                                <UserAvatar user={{ ...u.user, status: (u.user as any).status || "AVAILABLE" }} className="h-6 w-6" />
                            </div>
                        ))}
                        {onlineUsers.length > 8 && (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[9px] text-muted-foreground font-medium">
                                +{onlineUsers.length - 8}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* User footer */}
            <div className="border-t p-2">
                <div className="flex items-center gap-2">
                    <UserAvatar user={{ ...session?.user, status: (session?.user as any)?.status || "AVAILABLE" } as any} className="h-7 w-7 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">{session?.user?.name}</p>
                        <p className="text-[10px] text-muted-foreground/50 truncate">{session?.user?.email}</p>
                    </div>
                    <button onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex-shrink-0 p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Sign out">
                        <LogOut className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────
export function WorkspaceSidebar({ workspaceSlug }: WorkspaceSidebarProps) {
    return (
        <aside className="hidden lg:flex w-56 h-screen bg-card border-r flex-col flex-shrink-0">
            <SidebarContent workspaceSlug={workspaceSlug} />
        </aside>
    );
}

// ─── Mobile Sidebar (Sheet) ───────────────────────────────────────────
export function MobileSidebar({ workspaceSlug, isOpen = false, onClose }: {
    workspaceSlug: string; isOpen: boolean; onClose: () => void;
}) {
    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                </SheetHeader>
                <SidebarContent workspaceSlug={workspaceSlug} onItemClick={onClose} showNav={true} />
            </SheetContent>
        </Sheet>
    );
}
