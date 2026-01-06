// src/components/DashboardHeader.tsx
"use client";

import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { Search, Bell, Command } from "lucide-react";

export default function DashboardHeader() {
    const { data: session } = useSession();
    const user = session?.user;
    const [searchFocused, setSearchFocused] = useState(false);

    return (
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1" />

            {/* Search Bar */}
            <div className="flex-1 flex items-center max-w-md">
                <div
                    className={`relative flex items-center w-full transition-all ${searchFocused ? "ring-2 ring-accent" : ""
                        }`}
                >
                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        className="w-full h-9 pl-9 pr-12 text-sm rounded-lg border border-border bg-muted/50 focus:outline-none focus:bg-background transition-colors"
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                    />
                    <div className="absolute right-2 flex items-center gap-0.5 text-xs text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5">
                        <Command className="h-3 w-3" />
                        <span>K</span>
                    </div>
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-4 w-4" />
                    {/* Notification dot */}
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
                </Button>

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
