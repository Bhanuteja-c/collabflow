// src/components/Sidebar.tsx
"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarFooter,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";
import {
    FileText,
    LayoutGrid,
    Settings,
    Plus,
    LogOut,
    Moon,
    Sun,
    Home,
    MessageSquare,
    Video,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";

export default function AppSidebar() {
    const { data: session } = useSession();
    const { setTheme, resolvedTheme } = useTheme();
    const pathname = usePathname();
    const isDark = resolvedTheme === "dark";

    const user = session?.user;

    const menuItems = [
        { icon: Home, label: "Dashboard", href: "/dashboard" },
        { icon: FileText, label: "Documents", href: "/documents" },
        { icon: LayoutGrid, label: "Kanban", href: "/kanban" },
        { icon: MessageSquare, label: "Chat", href: "/chat" },
        { icon: Video, label: "Video Call", href: "/video" },
        { icon: Settings, label: "Settings", href: "/settings" },
    ];

    return (
        <Sidebar collapsible="icon" className="border-r border-border">
            {/* Header */}
            <SidebarHeader className="p-4 border-b border-border">
                <Link href="/dashboard" className="flex items-center gap-3">
                    {/* Full logo - shown when expanded */}
                    <div className="group-data-[collapsible=icon]:hidden">
                        <Logo size="sm" />
                    </div>
                    {/* Icon only - shown when collapsed */}
                    <div className="hidden group-data-[collapsible=icon]:block">
                        <Logo size="sm" showText={false} />
                    </div>
                </Link>
            </SidebarHeader>

            {/* Content */}
            <SidebarContent className="px-2">
                {/* Quick Actions */}
                <SidebarGroup className="mt-4">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="New Document">
                                <Link
                                    href="/editor"
                                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>New Document</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                {/* Navigation */}
                <SidebarGroup className="mt-2">
                    <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-2">
                        Navigation
                    </SidebarGroupLabel>
                    <SidebarMenu>
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                            return (
                                <SidebarMenuItem key={item.label}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isActive}
                                        tooltip={item.label}
                                        className={isActive ? "bg-accent/10 text-accent font-medium" : ""}
                                    >
                                        <Link href={item.href}>
                                            <item.icon className={`h-4 w-4 ${isActive ? "text-accent" : ""}`} />
                                            <span>{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            {/* Footer */}
            <SidebarFooter className="p-3 border-t border-border">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-8 w-8 ring-2 ring-border">
                        <AvatarImage src={user?.image || ""} />
                        <AvatarFallback className="bg-accent text-accent-foreground text-sm font-medium">
                            {user?.name?.[0] || "G"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                        <p className="text-sm font-medium truncate">
                            {user?.name || "Guest"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {user?.email || "Free Plan"}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 group-data-[collapsible=icon]:hidden"
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                    >
                        {isDark ? (
                            <Sun className="h-4 w-4" />
                        ) : (
                            <Moon className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground hover:text-destructive group-data-[collapsible=icon]:justify-center mt-1"
                    onClick={() => signOut({ callbackUrl: "/" })}
                >
                    <LogOut className="h-4 w-4" />
                    <span className="ml-2 group-data-[collapsible=icon]:hidden">
                        Sign out
                    </span>
                </Button>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
