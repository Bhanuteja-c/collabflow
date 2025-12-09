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
import Image from "next/image";

export default function AppSidebar() {
    const { data: session } = useSession();
    const { theme, setTheme, resolvedTheme } = useTheme();
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
        <Sidebar collapsible="icon" className="border-r">
            {/* Header */}
            <SidebarHeader className="p-4 border-b">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <Image
                        src={isDark ? "/DarkMode-CollabFlow-logo-transparent.png" : "/whiteMode-CollabFlow-minimal-icon.png"}
                        alt="CollabFlow"
                        width={180}
                        height={48}
                        className="h-12 w-auto group-data-[collapsible=icon]:hidden"
                        priority
                    />
                    <Image
                        src="/Minimal-CollabFlow-Icon.png"
                        alt="CollabFlow"
                        width={40}
                        height={40}
                        className="h-10 w-10 hidden group-data-[collapsible=icon]:block"
                    />
                </Link>
            </SidebarHeader>

            {/* Content */}
            <SidebarContent className="px-2">
                {/* Quick Actions */}
                <SidebarGroup className="mt-2">
                    <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Quick Actions
                    </SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="New Document">
                                <Link
                                    href="/editor"
                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>New Document</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                {/* Navigation */}
                <SidebarGroup className="mt-4">
                    <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Navigation
                    </SidebarGroupLabel>
                    <SidebarMenu>
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <SidebarMenuItem key={item.label}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isActive}
                                        tooltip={item.label}
                                    >
                                        <Link href={item.href}>
                                            <item.icon className="h-4 w-4" />
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
            <SidebarFooter className="p-3 border-t">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.image || ""} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
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
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
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
                    className="w-full justify-start text-muted-foreground hover:text-destructive group-data-[collapsible=icon]:justify-center"
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
