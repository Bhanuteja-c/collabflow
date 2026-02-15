// src/components/WorkspaceHeader.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { CommandPalette } from "./CommandPalette";

interface WorkspaceHeaderProps {
    onMenuClick?: () => void;
    workspaceSlug?: string;
    workspaceId?: string;
}

export function WorkspaceHeader({ onMenuClick, workspaceSlug, workspaceId }: WorkspaceHeaderProps) {
    const { data: session } = useSession();
    const user = session?.user;

    return (
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 sm:gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-4">
            {/* Mobile Menu Button */}
            <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 flex-shrink-0"
                onClick={onMenuClick}
                aria-label="Open menu"
            >
                <Menu className="h-5 w-5" />
            </Button>

            {/* Search / Command Palette */}
            <div className="flex-1 flex items-center">
                <CommandPalette
                    workspaceSlug={workspaceSlug}
                    workspaceId={workspaceId}
                />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
                {/* Notifications */}
                <NotificationsDropdown />

                {/* User Avatar */}
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.image || ""} />
                        <AvatarFallback className="bg-accent text-accent-foreground text-sm font-medium">
                            {user?.name?.[0] || "G"}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </div>
        </header>
    );
}
