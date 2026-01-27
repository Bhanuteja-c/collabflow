"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
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
} from "lucide-react";

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
    const baseUrl = `/workspace/${workspaceSlug}`;

    return (
        <>
            {/* Logo */}
            <div className="p-4 border-b">
                <Link href="/" className="flex items-center gap-2">
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
                            className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors touch-manipulation ${isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted"
                                }`}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t text-xs text-muted-foreground text-center">
                CollabFlow v1.0
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
