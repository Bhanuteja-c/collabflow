"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, Loader2, Mail, Shield, Trash2, Crown } from "lucide-react";

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
            } else {
                const err = await res.json();
                alert(err.error || "Failed to invite");
            }
        } catch (e) { console.error(e); }
        finally { setInviting(false); }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm("Remove this member?") || !workspace) return;
        try {
            await fetch(`/api/workspaces/${workspace.id}/members?userId=${userId}`, { method: "DELETE" });
            setMembers((prev) => prev.filter((m) => m.userId !== userId));
        } catch (e) { console.error(e); }
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
        } catch (e) { console.error(e); }
    };

    const canManage = ["owner", "admin"].includes(userRole);

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
        <div className="p-8 space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Team Members</h1>
                    <p className="text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</p>
                </div>
                {canManage && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><UserPlus className="w-4 h-4 mr-2" />Invite Member</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Invite Member</DialogTitle>
                                <DialogDescription>Add a team member by email</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="relative">
                                    <Input placeholder="Email address" value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleInvite()} />
                                    {userSuggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-48 overflow-auto">
                                            {userSuggestions.map((u) => (
                                                <button key={u.id} className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
                                                    onClick={() => { setInviteEmail(u.email); setUserSuggestions([]); }}>
                                                    <Avatar className="h-6 w-6"><AvatarImage src={u.image} /><AvatarFallback>{u.name?.[0]}</AvatarFallback></Avatar>
                                                    <div><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Select value={inviteRole} onValueChange={setInviteRole}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin (can manage)</SelectItem>
                                        <SelectItem value="member">Member (can edit)</SelectItem>
                                        <SelectItem value="viewer">Viewer (read only)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleInvite} disabled={inviting} className="w-full">
                                    {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                                    Send Invite
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="space-y-3">
                {members.map((member) => (
                    <Card key={member.id}>
                        <CardContent className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={member.user.image} />
                                    <AvatarFallback>{member.user.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium">{member.user.name}</p>
                                        {member.role === "owner" && <Crown className="w-4 h-4 text-amber-500" />}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {canManage && member.role !== "owner" ? (
                                    <Select value={member.role} onValueChange={(v) => handleRoleChange(member.userId, v)}>
                                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Admin</SelectItem>
                                            <SelectItem value="member">Member</SelectItem>
                                            <SelectItem value="viewer">Viewer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <span className="text-sm text-muted-foreground capitalize px-3 py-1 bg-muted rounded">
                                        {member.role}
                                    </span>
                                )}
                                {canManage && member.role !== "owner" && (
                                    <Button variant="ghost" size="icon" onClick={() => handleRemove(member.userId)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
