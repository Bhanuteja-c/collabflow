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
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Team Members</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage who has access to <span className="font-medium text-foreground">{workspace?.name || "this workspace"}</span>
                    </p>
                </div>
                {canManage && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 shadow-sm">
                                <UserPlus className="w-4 h-4" />Invite
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-primary" />
                                    Invite Member
                                </DialogTitle>
                                <DialogDescription>Add a team member by their email address</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="relative">
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="colleague@company.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                                            className="pl-9"
                                        />
                                    </div>
                                    {userSuggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-xl z-50 max-h-48 overflow-auto py-1">
                                            {userSuggestions.map((u) => (
                                                <button key={u.id} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left transition-colors"
                                                    onClick={() => { setInviteEmail(u.email); setUserSuggestions([]); }}>
                                                    <UserAvatar user={u} className="h-7 w-7" showStatus={false} />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate">{u.name}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Role</Label>
                                    <Select value={inviteRole} onValueChange={setInviteRole}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                                                    <span>Admin</span>
                                                    <span className="text-xs text-muted-foreground">— Full access</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="member">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span>Member</span>
                                                    <span className="text-xs text-muted-foreground">— Can edit</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="viewer">
                                                <div className="flex items-center gap-2">
                                                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span>Viewer</span>
                                                    <span className="text-xs text-muted-foreground">— Read only</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="w-full gap-2">
                                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                    Send Invite
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Stats Row */}
            <div className="flex gap-3">
                {(["owner", "admin", "member", "viewer"] as const).map((role) => {
                    const config = roleConfig[role];
                    const count = roleCounts[role] || 0;
                    if (count === 0) return null;
                    return (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(roleFilter === role ? "all" : role)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${roleFilter === role
                                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                                }`}
                        >
                            <config.icon className={`w-3.5 h-3.5 ${config.color}`} />
                            <span className="font-medium capitalize">{config.label}</span>
                            <span className="text-xs text-muted-foreground">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            <Separator />

            {/* Members List */}
            <div className="space-y-1">
                {sortedMembers.length === 0 ? (
                    <div className="py-12 text-center">
                        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {searchQuery || roleFilter !== "all" ? "No members match your filter" : "No members yet"}
                        </p>
                    </div>
                ) : (
                    sortedMembers.map((member) => {
                        const config = roleConfig[member.role] || roleConfig.member;
                        const RoleIcon = config.icon;
                        return (
                            <div
                                key={member.id}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors group"
                            >
                                {/* Avatar */}
                                <UserAvatar user={{ name: member.user?.name, image: member.user?.image }} className="h-9 w-9 flex-shrink-0" showStatus={false} />

                                {/* Name + Email */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium truncate">{member.user?.name || "Unknown"}</p>
                                        {member.role === "owner" && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{member.user?.email}</p>
                                </div>

                                {/* Role Badge */}
                                <Badge variant={config.badgeVariant} className="capitalize text-[11px] gap-1 flex-shrink-0">
                                    <RoleIcon className={`w-3 h-3 ${config.color}`} />
                                    {config.label}
                                </Badge>

                                {/* Actions */}
                                {canManage && member.role !== "owner" ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-44">
                                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Change Role</div>
                                            {(["admin", "member", "viewer"] as const).map((role) => {
                                                const rc = roleConfig[role];
                                                return (
                                                    <DropdownMenuItem
                                                        key={role}
                                                        onClick={() => handleRoleChange(member.userId, role)}
                                                        className={member.role === role ? "bg-muted" : ""}
                                                    >
                                                        <rc.icon className={`w-3.5 h-3.5 mr-2 ${rc.color}`} />
                                                        {rc.label}
                                                        {member.role === role && <span className="ml-auto text-xs text-muted-foreground">Current</span>}
                                                    </DropdownMenuItem>
                                                );
                                            })}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleRemove(member.userId)} className="text-destructive focus:text-destructive">
                                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                Remove
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <div className="w-7" /> /* spacer for alignment */
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer count */}
            {members.length > 0 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                    Showing {sortedMembers.length} of {members.length} member{members.length !== 1 ? "s" : ""}
                </p>
            )}
        </div>
    );
}

