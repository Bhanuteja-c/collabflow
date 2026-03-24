"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { DocumentTree } from "@/components/DocumentTree";
import { useWorkspacePresence } from "@/hooks/useWorkspacePresence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "lucide-react";
import { avatarFallbackClass, getDiceBearAvatar } from "@/lib/avatar-colors";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { useSidebarUnread } from "@/hooks/useSidebarUnread";

interface WorkspaceSidebarProps {
    workspaceSlug: string;
    isOpen?: boolean;
    onClose?: () => void;
    isMobile?: boolean;
}

const navGroups = [
    {
        label: "MAIN",
        items: [
            { icon: LayoutDashboard, label: "Dashboard", href: "" },
        ]
    },
    {
        label: "COLLABORATE",
        items: [
            { icon: MessageSquare, label: "Chat", href: "/chat" },
            { icon: Video, label: "Video", href: "/video" },
            { icon: PenTool, label: "Whiteboard", href: "/whiteboard" },
        ]
    },
    {
        label: "PLAN",
        items: [
            { icon: Target, label: "Epics", href: "/epics" },
            { icon: Kanban, label: "Kanban", href: "/kanban" },
        ]
    },
    {
        label: "INSIGHTS",
        items: [
            { icon: BarChart3, label: "Analytics", href: "/analytics" },
        ]
    },
    {
        label: "WORKSPACE",
        items: [
            { icon: Users, label: "Members", href: "/members" },
            { icon: Settings, label: "Settings", href: "/settings" },
        ]
    }
];

function SidebarContent({ workspaceSlug, onItemClick }: { workspaceSlug: string; onItemClick?: () => void }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const baseUrl = `/workspace/${workspaceSlug}`;
    const [workspaceId, setWorkspaceId] = useState<string>("");
    const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
    const [dmsOpen, setDmsOpen] = useState(true);

    const { unreadCounts } = useSidebarUnread(workspaceId);

    // Fetch workspace ID from slug
    useEffect(() => {
        setIsLoadingWorkspace(true);
        fetch(`/api/workspaces/${workspaceSlug}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data?.id) setWorkspaceId(data.id); })
            .catch(() => { })
            .finally(() => setIsLoadingWorkspace(false));
    }, [workspaceSlug]);

    const { onlineUsers } = useWorkspacePresence(workspaceId);

    return (
        <>
            {/* Logo */}
            <div className="p-4 border-b">
                <Link href="/" onClick={onItemClick} className="flex items-center gap-2">
                    <Logo size="sm" showText={true} />
                </Link>
            </div>

            {/* Workspace Switcher */}
            <div className="p-3 border-b">
                <WorkspaceSwitcher currentSlug={workspaceSlug} />
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navGroups.map((group, groupIndex) => (
                    <div key={group.label} className="flex flex-col">
                        {groupIndex > 0 && <div className="mx-3 border-t my-1 border-border/50" />}
                        <div className="px-3 pb-1 pt-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase">
                            {group.label}
                        </div>
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const href = `${baseUrl}${item.href}`;
                                const isActive = item.href === ""
                                    ? pathname === baseUrl
                                    : pathname.startsWith(href);

                                return (
                                    <Link
                                        key={item.label}
                                        href={href}
                                        onClick={onItemClick}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all active:scale-[0.98] touch-manipulation ${
                                            isActive
                                                ? "bg-primary/10 text-primary font-medium"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        }`}
                                    >
                                        <item.icon className="w-4 h-4 flex-shrink-0" />
                                        <span className="flex-1 flex items-center min-w-0">
                                            <span className="truncate">{item.label}</span>
                                            {item.label === "Chat" && unreadCounts.totalUnreadMessages > 0 && (
                                                <span className="ml-auto bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                                                    {unreadCounts.totalUnreadMessages > 99 ? "99+" : unreadCounts.totalUnreadMessages}
                                                </span>
                                            )}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
                <div className="mx-3 border-t my-1 border-border/50" />

                {/* Direct Messages */}
                {workspaceId && (
                    <div className="pt-2 pb-1">
                        <button
                            onClick={() => setDmsOpen(!dmsOpen)}
                            className="flex items-center w-full gap-1 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground group transition-colors"
                        >
                            {dmsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>Direct Messages</span>
                            {unreadCounts.totalUnreadDMs > 0 && !dmsOpen && (
                                <span className="ml-auto flex h-2 w-2 rounded-full bg-primary" />
                            )}
                        </button>
                        
                        {dmsOpen && (
                            <div className="mt-1 space-y-0.5">
                                {unreadCounts.channels.filter(c => c.type === 'direct' || c.type === 'DIRECT').slice(0, 5).map((channel) => {
                                    const displayName = channel.otherUser?.name || "Deleted User";
                                    const avatarImage = channel.otherUser?.image || null;
                                    const href = `${baseUrl}/chat?dm=${channel.id}`;
                                    
                                    // Use basic pathname matching for DMs without assuming URLSearchParams scope since we're in a regular component rendering cycle
                                    const isActive = false; 

                                    return (
                                        <Link
                                            key={channel.id}
                                            href={href}
                                            onClick={onItemClick}
                                            className={`flex items-center gap-2.5 px-3 py-1.5 text-sm rounded-lg group transition-all ${
                                                isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                            }`}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <UserAvatar user={{ name: displayName, image: avatarImage, status: "AVAILABLE" } as any} className="h-5 w-5" showStatus={false} />
                                            </div>
                                            <span className="truncate flex-1 text-[13px]">{displayName}</span>
                                            {channel.unreadCount > 0 && (
                                                <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center flex-shrink-0">
                                                    {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                                {unreadCounts.channels.filter(c => c.type === 'direct' || c.type === 'DIRECT').length === 0 && (
                                    <p className="px-5 py-2 text-xs text-muted-foreground italic">No recent messages</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Render the unified Document Tree representing the Wiki */}
                {workspaceId && (
                    <DocumentTree 
                        workspaceId={workspaceId} 
                        workspaceSlug={workspaceSlug} 
                        onItemClick={onItemClick} 
                    />
                )}
            </nav>

            {/* Online Members Section */}
            {isLoadingWorkspace ? (
                <div className="p-3 border-t">
                    <div className="h-3 w-20 bg-muted/60 rounded animate-pulse mb-3 ml-1" />
                    <div className="space-y-1">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
                                <div className="h-6 w-6 rounded-full bg-muted/60 animate-pulse flex-shrink-0" />
                                <div className="h-3 w-24 bg-muted/60 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : onlineUsers.length > 0 && (
                <div className="p-3 border-t">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                        Online — {onlineUsers.length}
                    </p>
                    <div className="space-y-1">
                        {onlineUsers.slice(0, 5).map((u) => (
                            <div key={u.socketId} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
                                <div className="relative flex-shrink-0">
                                    <UserAvatar user={{ ...u.user, status: (u.user as any).status || "AVAILABLE" }} className="h-6 w-6" />
                                </div>
                                <span className="text-xs text-foreground truncate">{u.user.name}</span>
                            </div>
                        ))}
                        {onlineUsers.length > 5 && (
                            <p className="text-[10px] text-muted-foreground px-2 py-1">
                                +{onlineUsers.length - 5} more online
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* User Profile + Sign Out */}
            <div className="border-t p-3">
                <div className="flex items-center gap-2.5">
                    <UserAvatar user={{ ...session?.user, status: (session?.user as any)?.status || "AVAILABLE" } as any} className="h-8 w-8 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{session?.user?.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{session?.user?.email}</p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex-shrink-0 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Sign out"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                    </button>
                </div>
                <p className="text-[10px] text-muted-foreground/50 text-center mt-2">CollabFlow v1.0</p>
            </div>
        </>
    );
}

// Desktop Sidebar
export function WorkspaceSidebar({ workspaceSlug }: WorkspaceSidebarProps) {
    return (
        <aside className="hidden lg:flex w-64 h-screen bg-card border-r flex-col">
            <SidebarContent workspaceSlug={workspaceSlug} />
        </aside>
    );
}

// Mobile Sidebar (Sheet/Drawer)
export function MobileSidebar({
    workspaceSlug,
    isOpen = false,
    onClose
}: {
    workspaceSlug: string;
    isOpen: boolean;
    onClose: () => void;
}) {
    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                </SheetHeader>
                <SidebarContent
                    workspaceSlug={workspaceSlug}
                    onItemClick={onClose}
                />
            </SheetContent>
        </Sheet>
    );
}

