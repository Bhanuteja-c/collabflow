"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
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

export function WorkspaceSidebar({ workspaceSlug }: WorkspaceSidebarProps) {
    const pathname = usePathname();
    const baseUrl = `/workspace/${workspaceSlug}`;

    return (
        <aside className="w-64 h-screen bg-card border-r flex flex-col">
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
            <nav className="flex-1 p-3 space-y-1">
                {navItems.map((item) => {
                    const href = `${baseUrl}${item.href}`;
                    const isActive = item.href === ""
                        ? pathname === baseUrl
                        : pathname.startsWith(href);

                    return (
                        <Link
                            key={item.label}
                            href={href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t text-xs text-muted-foreground text-center">
                CollabFlow v1.0
            </div>
        </aside>
    );
}
