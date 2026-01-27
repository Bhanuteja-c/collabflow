// src/components/WorkspaceHeader.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { Search, Command, Menu } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";

interface WorkspaceHeaderProps {
    onMenuClick?: () => void;
}

export function WorkspaceHeader({ onMenuClick }: WorkspaceHeaderProps) {
    const { data: session } = useSession();
    const user = session?.user;
    const [searchFocused, setSearchFocused] = useState(false);

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

            {/* Search Bar */}
            <div className="flex-1 flex items-center max-w-md">
                <div
                    className={`relative flex items-center w-full transition-all ${searchFocused ? "ring-2 ring-accent" : ""
                        }`}
                >
                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full h-9 pl-9 pr-4 sm:pr-12 text-sm rounded-lg border border-border bg-muted/50 focus:outline-none focus:bg-background transition-colors"
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                    />
                    {/* Keyboard shortcut - hidden on mobile */}
                    <div className="hidden sm:flex absolute right-2 items-center gap-0.5 text-xs text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5">
                        <Command className="h-3 w-3" />
                        <span>K</span>
                    </div>
                </div>
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
