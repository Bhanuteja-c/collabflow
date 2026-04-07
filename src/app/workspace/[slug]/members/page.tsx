"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { avatarFallbackClass } from "@/lib/avatar-colors";
import {
    Users, UserPlus, Loader2, Mail, Trash2, Crown, Search, Shield, Eye, UserCog, MoreHorizontal
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type RoleFilter = "all" | "owner" | "admin" | "member" | "viewer";

const roleConfig: Record<string, { label: string; icon: typeof Crown; color: string; badgeVariant: "default" | "secondary" | "outline" }> = {
    owner: { label: "Owner", icon: Crown, color: "text-amber-500", badgeVariant: "default" },
    admin: { label: "Admin", icon: Shield, color: "text-blue-500", badgeVariant: "secondary" },
    member: { label: "Member", icon: Users, color: "text-emerald-500", badgeVariant: "outline" },
    viewer: { label: "Viewer", icon: Eye, color: "text-muted-foreground", badgeVariant: "outline" },
};

export default function WorkspaceMembersPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [workspace, setWorkspace] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [inviting, setInviting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [userRole, setUserRole] = useState("");
    const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const wsRes = await fetch("/api/workspaces");
                if (wsRes.ok) {
                    const workspaces = await wsRes.json();
                    const ws = workspaces.find((w: any) => w.slug === slug);
                    if (ws) {
                        setWorkspace(ws);
                        const detailRes = await fetch(`/api/workspaces/${ws.id}`);
                        if (detailRes.ok) {
                            const detail = await detailRes.json();
                            setMembers(detail.members || []);
                            setUserRole(detail.userRole);
                        }
                    }
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchData();
    }, [slug]);

    useEffect(() => {
        if (inviteEmail.length < 2) { setUserSuggestions([]); return; }
        const search = async () => {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(inviteEmail)}`);
            if (res.ok) setUserSuggestions(await res.json());
        };
        const t = setTimeout(search, 300);
        return () => clearTimeout(t);
    }, [inviteEmail]);

    const handleInvite = async () => {
        if (!inviteEmail.trim() || !workspace) return;
        setInviting(true);
        try {
            const res = await fetch(`/api/workspaces/${workspace.id}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
            });
            if (res.ok) {
                const member = await res.json();
                setMembers((prev) => [...prev, member]);
                setInviteEmail("");
                setDialogOpen(false);
                toast.success("Member invited successfully");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to invite member");
            }
        } catch (e) { toast.error("Failed to invite member"); }
        finally { setInviting(false); }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm("Remove this member from the workspace?") || !workspace) return;
        try {
            await fetch(`/api/workspaces/${workspace.id}/members?userId=${userId}`, { method: "DELETE" });
            setMembers((prev) => prev.filter((m) => m.userId !== userId));
            toast.success("Member removed");
        } catch (e) { toast.error("Failed to remove member"); }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        if (!workspace) return;
        try {
            await fetch(`/api/workspaces/${workspace.id}/members`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role: newRole }),
            });
            setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, role: newRole } : m));
            toast.success(`Role updated to ${newRole}`);
        } catch (e) { toast.error("Failed to update role"); }
    };

    const canManage = ["owner", "admin"].includes(userRole);

    // Filter and search
    const filteredMembers = members.filter((m) => {
        const matchesSearch = searchQuery === "" ||
            (m.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.user?.email || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "all" || m.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Sort: owner first, then admin, member, viewer
    const roleOrder = { owner: 0, admin: 1, member: 2, viewer: 3 };
    const sortedMembers = [...filteredMembers].sort((a, b) =>
        (roleOrder[a.role as keyof typeof roleOrder] ?? 4) - (roleOrder[b.role as keyof typeof roleOrder] ?? 4)
    );

    // Role counts
    const roleCounts = members.reduce((acc, m) => {
        acc[m.role] = (acc[m.role] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading members...</p>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* ── Sleek Minimal Header ── */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border/40">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        Team Directory
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1.5 font-medium">
                        Manage access and roles for <span className="text-foreground">{workspace?.name || "this workspace"}</span>
                    </p>
                </div>
                    {canManage && (
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="lg" className="gap-2 shadow-md rounded-xl hover:-translate-y-0.5 transition-transform">
                                    <UserPlus className="w-4 h-4" />Invite Colleague
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md rounded-[20px] border-border/50 bg-card/95 backdrop-blur-xl">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-xl">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <UserPlus className="w-5 h-5" />
                                        </div>
                                        Invite Member
                                    </DialogTitle>
                                    <DialogDescription className="pt-2">Add a new team member by their email address.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-5 py-3">
                                    <div className="relative space-y-2">
                                        <Label className="text-sm font-semibold">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="colleague@company.com"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                                                className="pl-9 bg-background/50 h-11 rounded-xl"
                                            />
                                        </div>
                                        {userSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-popover/90 backdrop-blur-md border border-border/50 rounded-xl shadow-xl z-50 max-h-48 overflow-auto py-1">
                                                {userSuggestions.map((u) => (
                                                    <button key={u.id} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 text-left transition-colors"
                                                        onClick={() => { setInviteEmail(u.email); setUserSuggestions([]); }}>
                                                        <UserAvatar user={u} className="h-8 w-8" showStatus={false} />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate">{u.name}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Role Access</Label>
                                        <Select value={inviteRole} onValueChange={setInviteRole}>
                                            <SelectTrigger className="bg-background/50 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-border/50">
                                                <SelectItem value="admin">
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="w-4 h-4 text-blue-500" />
                                                        <span className="font-medium">Admin</span>
                                                        <span className="text-xs text-muted-foreground hidden sm:inline">— Full access</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="member">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-emerald-500" />
                                                        <span className="font-medium">Member</span>
                                                        <span className="text-xs text-muted-foreground hidden sm:inline">— Can edit workflow</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="viewer">
                                                    <div className="flex items-center gap-2">
                                                        <Eye className="w-4 h-4 text-muted-foreground" />
                                                        <span className="font-medium">Viewer</span>
                                                        <span className="text-xs text-muted-foreground hidden sm:inline">— Read-only access</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="w-full gap-2 h-10 rounded-lg font-medium">
                                        {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                        Send Invitation
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
            </div>

            {/* ── Control Bar ── */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground mr-1 hidden sm:inline-block">Filter:</span>
                    {(["owner", "admin", "member", "viewer"] as const).map((role) => {
                        const config = roleConfig[role];
                        const count = roleCounts[role] || 0;
                        if (count === 0) return null;
                        return (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(roleFilter === role ? "all" : role)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border ${roleFilter === role
                                        ? `bg-muted text-foreground border-border`
                                        : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/50"
                                    }`}
                            >
                                <config.icon className={`w-3.5 h-3.5 ${roleFilter === role ? config.color : "opacity-70"}`} />
                                <span className="capitalize tracking-tight">{config.label}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-background border border-border/50 ml-1">
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
                
                <div className="relative w-full lg:w-80 flex-shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                    <Input
                        placeholder="Search team members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 bg-muted/40 border-border/60 rounded-lg text-sm transition-all focus-visible:ring-1 focus-visible:ring-primary/50"
                    />
                </div>
            </div>

            {/* ── Directory Grid ── */}
            <div className="py-2">
                {sortedMembers.length === 0 ? (
                    <div className="py-20 text-center rounded-[20px] border border-dashed border-border mb-4 bg-muted/10 backdrop-blur-sm">
                        <div className="mx-auto w-16 h-16 mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                            <Users className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">No matches found</h3>
                        <p className="text-muted-foreground">
                            {searchQuery || roleFilter !== "all" ? "Try adjusting your filters or search query" : "No team members are here yet"}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                        {sortedMembers.map((member) => {
                            const config = roleConfig[member.role] || roleConfig.member;
                            const RoleIcon = config.icon;
                            return (
                                <div
                                    key={member.id}
                                    className="relative flex flex-col p-5 rounded-xl border border-border/40 bg-card/20 hover:bg-card/60 transition-colors duration-200 group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="relative">
                                            <UserAvatar user={{ name: member.user?.name, image: member.user?.image }} className="h-12 w-12 ring-2 ring-background shadow-sm" showStatus={false} />
                                            {/* Minimal status dot */}
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background"></div>
                                        </div>

                                        {/* Minimal Action Dropdown */}
                                        {canManage && member.role !== "owner" && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity -mr-1 -mt-1">
                                                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44 rounded-lg border-border/50 p-1">
                                                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Change Role</div>
                                                    {(["admin", "member", "viewer"] as const).map((role) => {
                                                        const rc = roleConfig[role];
                                                        return (
                                                            <DropdownMenuItem
                                                                key={role}
                                                                onClick={() => handleRoleChange(member.userId, role)}
                                                                className="rounded-md cursor-pointer text-sm"
                                                            >
                                                                <rc.icon className={`w-3.5 h-3.5 mr-2 ${member.role === role ? rc.color : "text-muted-foreground/50"}`} />
                                                                <span>{rc.label}</span>
                                                                {member.role === role && <Shield className="ml-auto w-3 h-3 text-muted-foreground" />}
                                                            </DropdownMenuItem>
                                                        );
                                                    })}
                                                    <DropdownMenuSeparator className="my-1" />
                                                    <DropdownMenuItem onClick={() => handleRemove(member.userId)} className="rounded-md text-destructive focus:bg-destructive/10 cursor-pointer text-sm">
                                                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                        Remove Access
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>

                                    {/* Profile Text */}
                                    <div>
                                        <h3 className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                                            {member.user?.name || "Unknown"}
                                        </h3>
                                        <p className="text-xs text-muted-foreground truncate font-medium">
                                            {member.user?.email}
                                        </p>
                                    </div>

                                    {/* Minimal Role Badge */}
                                    <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                            <RoleIcon className={`w-3.5 h-3.5 ${config.color}`} />
                                            <span className="text-[11px] font-semibold text-muted-foreground tracking-wide capitalize">{config.label}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Summary */}
            {members.length > 0 && (
                <div className="flex justify-center pt-2 pb-8">
                    <p className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-muted/40 border border-border/40 text-xs font-medium text-muted-foreground">
                        Showing {sortedMembers.length} of {members.length} team member{members.length !== 1 ? "s" : ""}
                    </p>
                </div>
            )}
        </div>
    );
}
