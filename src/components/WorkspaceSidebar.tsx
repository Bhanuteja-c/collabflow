"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
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
} from "lucide-react";
import { avatarFallbackClass } from "@/lib/avatar-colors";

interface WorkspaceSidebarProps {
    workspaceSlug: string;
    isOpen?: boolean;
    onClose?: () => void;
    isMobile?: boolean;
}

const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "" },
    { icon: FileText, label: "Documents", href: "/documents" },
    { icon: Kanban, label: "Kanban", href: "/kanban" },
    { icon: MessageSquare, label: "Chat", href: "/chat" },
    { icon: Video, label: "Video", href: "/video" },
    { icon: Users, label: "Members", href: "/members" },
    { icon: Settings, label: "Settings", href: "/settings" },
];

function SidebarContent({ workspaceSlug, onItemClick }: { workspaceSlug: string; onItemClick?: () => void }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const baseUrl = `/workspace/${workspaceSlug}`;
    const [workspaceId, setWorkspaceId] = useState<string | undefined>();
    const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);

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
                {navItems.map((item) => {
                    const href = `${baseUrl}${item.href}`;
                    const isActive = item.href === ""
                        ? pathname === baseUrl
                        : pathname.startsWith(href);

                    return (
                        <Link
                            key={item.label}
                            href={href}
                            onClick={onItemClick}
                            className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all active:scale-[0.98] touch-manipulation ${isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    );
                })}
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
                                    <Avatar className="h-6 w-6">
                                        {u.user.image && <AvatarImage src={u.user.image} />}
                                        <AvatarFallback className="text-[10px] bg-primary/15 text-primary">
                                            {u.user.name?.[0]?.toUpperCase() || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-card" />
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
                    <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={session?.user?.image || ""} />
                        <AvatarFallback className={avatarFallbackClass(session?.user?.name, "text-xs font-semibold")}>
                            {session?.user?.name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                    </Avatar>
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

