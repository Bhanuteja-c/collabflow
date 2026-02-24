// src/components/WorkspaceHeader.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user?.image || ""} />
                                <AvatarFallback className="bg-accent text-accent-foreground text-sm font-medium">
                                    {user?.name?.[0] || "G"}
                                </AvatarFallback>
                            </Avatar>
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
