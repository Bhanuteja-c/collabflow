// src/components/WorkspaceHeader.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar, UserStatus } from "@/components/ui/UserAvatar";
import { useSession } from "next-auth/react";
import { Menu, LogOut, Settings as SettingsIcon, User } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { CommandPalette } from "./CommandPalette";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { getDiceBearAvatar } from "@/lib/avatar-colors";

interface WorkspaceHeaderProps {
    onMenuClick?: () => void;
    workspaceSlug?: string;
    workspaceId?: string;
}

export function WorkspaceHeader({ onMenuClick, workspaceSlug, workspaceId }: WorkspaceHeaderProps) {
    const { data: session, update } = useSession();
    const user = session?.user;

    const handleStatusChange = async (status: UserStatus) => {
        try {
            await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });
            // Instantly update UI without reloading the page
            await update({ status });
        } catch (e) {
            console.error("Failed to update status", e);
        }
    };

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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0">
                            <UserAvatar user={user as any} className="h-8 w-8" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase opacity-70">Set Status</div>
                        <DropdownMenuItem onClick={() => handleStatusChange("AVAILABLE")} className="cursor-pointer gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" /> Available
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange("BUSY")} className="cursor-pointer gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" /> Busy
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange("DND")} className="cursor-pointer gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-600 flex items-center justify-center"><div className="w-1.5 h-[2px] bg-white rounded-sm" /></div> Do not disturb
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange("BRB")} className="cursor-pointer gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" /> Be right back
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange("AWAY")} className="cursor-pointer gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" /> Appear away
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange("OFFLINE")} className="cursor-pointer gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-500 flex items-center justify-center"><div className="text-[10px] leading-none text-white font-bold">x</div></div> Appear offline
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange("AVAILABLE")} className="cursor-pointer text-muted-foreground">
                            Reset status
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        {workspaceSlug && (
                            <>
                                <DropdownMenuItem asChild className="cursor-pointer">
                                    <Link href={`/workspace/${workspaceSlug}/settings`}>
                                        <SettingsIcon className="mr-2 h-4 w-4" />
                                        <span>Workspace Settings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem
                            className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer"
                            onClick={() => signOut({ callbackUrl: "/" })}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
