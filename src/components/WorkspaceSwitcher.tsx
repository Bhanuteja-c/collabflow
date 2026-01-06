"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react";

interface Workspace {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    _count: {
        members: number;
    };
}

interface WorkspaceSwitcherProps {
    currentSlug?: string;
}

export function WorkspaceSwitcher({ currentSlug }: WorkspaceSwitcherProps) {
    const router = useRouter();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    const currentWorkspace = workspaces.find((w) => w.slug === currentSlug);

    useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                const res = await fetch("/api/workspaces");
                if (res.ok) {
                    setWorkspaces(await res.json());
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchWorkspaces();
    }, []);

    const handleSelect = (slug: string) => {
        setOpen(false);
        router.push(`/workspace/${slug}`);
    };

    if (loading) {
        return (
            <div className="h-10 w-48 bg-muted/50 rounded-md animate-pulse" />
        );
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="w-full justify-between px-3 h-10 bg-muted/30 hover:bg-muted/50"
                >
                    <div className="flex items-center gap-2 truncate">
                        {currentWorkspace ? (
                            <>
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={currentWorkspace.image || ""} />
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                        {currentWorkspace.name[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="truncate font-medium">{currentWorkspace.name}</span>
                            </>
                        ) : (
                            <>
                                <Building2 className="w-4 h-4" />
                                <span>Select Workspace</span>
                            </>
                        )}
                    </div>
                    <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                {workspaces.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No workspaces yet
                    </div>
                ) : (
                    workspaces.map((workspace) => (
                        <DropdownMenuItem
                            key={workspace.id}
                            onClick={() => handleSelect(workspace.slug)}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={workspace.image || ""} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {workspace.name[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 truncate">
                                <p className="truncate font-medium">{workspace.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {workspace._count.members} member{workspace._count.members !== 1 ? "s" : ""}
                                </p>
                            </div>
                            {workspace.slug === currentSlug && (
                                <Check className="w-4 h-4 text-primary" />
                            )}
                        </DropdownMenuItem>
                    ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => router.push("/workspace/new")}
                    className="cursor-pointer"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Workspace
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
