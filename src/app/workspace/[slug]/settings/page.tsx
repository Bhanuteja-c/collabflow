"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { avatarFallbackClass } from "@/lib/avatar-colors";
import {
    Sun, Moon, Monitor, Loader2, Save, Trash2, LogOut, Globe,
    User, Palette, Settings2, Shield, Bell, ChevronRight, Mail, Crown, Users, Key, RefreshCw, Copy
} from "lucide-react";

type SettingsTab = "profile" | "appearance" | "workspace" | "notifications" | "danger";

const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "appearance" as const, label: "Appearance", icon: Palette },
    { id: "workspace" as const, label: "Workspace", icon: Settings2 },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "danger" as const, label: "Danger Zone", icon: Shield },
];

export default function WorkspaceSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const { data: session } = useSession();
    const { theme, setTheme, resolvedTheme } = useTheme();

    const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
    const [workspace, setWorkspace] = useState<any>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [inviteCode, setInviteCode] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [userRole, setUserRole] = useState("");
    const [members, setMembers] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);

    // Notification preferences (local state — no backend for these)
    const [notifMentions, setNotifMentions] = useState(true);
    const [notifReplies, setNotifReplies] = useState(true);
    const [notifReactions, setNotifReactions] = useState(false);
    const [notifSound, setNotifSound] = useState(true);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const wsRes = await fetch("/api/workspaces");
                if (wsRes.ok) {
                    const workspaces = await wsRes.json();
                    const ws = workspaces.find((w: any) => w.slug === slug);
                    if (ws) {
                        setWorkspace(ws);
                        setName(ws.name);
                        setDescription(ws.description || "");
                        setIsPublic(ws.isPublic || false);
                        setInviteCode(ws.inviteCode || "");

                        const detailRes = await fetch(`/api/workspaces/${ws.id}`);
                        if (detailRes.ok) {
                            const detail = await detailRes.json();
                            setUserRole(detail.userRole);
                            setMembers(detail.members || []);
                        }
                    }
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchData();
    }, [slug]);

    const handleSave = async () => {
        if (!workspace) return;
        setSaving(true);
        try {
            await fetch(`/api/workspaces/${workspace.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description, isPublic }),
            });
            toast.success("Settings saved");
        } catch (e) { toast.error("Failed to save settings"); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!workspace || !confirm("Delete this workspace? This action cannot be undone.")) return;
        try {
            await fetch(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
            toast.success("Workspace deleted");
            window.location.href = "/workspace/new";
        } catch (e) { toast.error("Failed to delete workspace"); }
    };

    const handleRegenerateInvite = async () => {
        if (!workspace || !confirm("Regenerate invite code? The old code will no longer work.")) return;
        setRegenerating(true);
        try {
            const res = await fetch(`/api/workspaces/${workspace.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "regenerate_invite" }),
            });
            if (res.ok) {
                const updated = await res.json();
                setInviteCode(updated.inviteCode);
                setWorkspace(updated);
                toast.success("Invite code regenerated");
            } else {
                toast.error("Failed to regenerate code");
            }
        } catch (e) {
            toast.error("Failed to regenerate code");
        } finally {
            setRegenerating(false);
        }
    };

    const copyInviteCode = () => {
        if (!inviteCode) return;
        navigator.clipboard.writeText(inviteCode);
        toast.success("Invite code copied to clipboard");
    };

    const canManage = ["owner", "admin"].includes(userRole);
    const isOwner = userRole === "owner";

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading settings...</p>
            </div>
        </div>
    );

    const themeOptions = [
        { value: "light", icon: Sun, label: "Light", desc: "Clean and bright" },
        { value: "dark", icon: Moon, label: "Dark", desc: "Easy on the eyes" },
        { value: "system", icon: Monitor, label: "System", desc: "Follow your OS" },
    ];

    return (
        <div className="flex min-h-[calc(100vh-60px)]">
            {/* Sidebar Navigation */}
            <div className="w-56 flex-shrink-0 border-r bg-muted/20 p-4 space-y-1">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">Settings</h2>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    // Hide workspace tab for non-admins
                    if (tab.id === "workspace" && !canManage) return null;
                    // Hide danger zone as a tab if not owner (still show sign out in profile)
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                }`}
                        >
                            <tab.icon className="w-4 h-4 flex-shrink-0" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8 max-w-2xl">
                {/* Profile Tab */}
                {activeTab === "profile" && (
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-xl font-semibold">Profile</h1>
                            <p className="text-sm text-muted-foreground mt-1">Manage your personal information</p>
                        </div>

                        <Separator />

                        {/* Avatar + Info */}
                        <div className="flex items-start gap-5">
                            <div className="relative group">
                                <Avatar className="h-20 w-20 border-2 border-border">
                                    <AvatarImage src={session?.user?.image || ""} />
                                    <AvatarFallback className={avatarFallbackClass(session?.user?.name, "text-2xl font-bold")}>
                                        {session?.user?.name?.[0]?.toUpperCase() || "?"}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="flex-1 space-y-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Display Name</Label>
                                    <p className="text-lg font-semibold mt-0.5">{session?.user?.name}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                        <p className="text-sm">{session?.user?.email}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Role</Label>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant={isOwner ? "default" : "secondary"} className="text-xs capitalize">
                                            {isOwner && <Crown className="w-3 h-3 mr-1" />}
                                            {userRole || "member"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Members list */}
                        {members.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold">Team Members</h3>
                                        <p className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""} in this workspace</p>
                                    </div>
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-1 max-h-[240px] overflow-y-auto">
                                    {members.map((m: any) => (
                                        <div key={m.id || m.userId} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={m.user?.image || m.image || ""} />
                                                <AvatarFallback className={avatarFallbackClass(m.user?.name || m.name, "text-[11px] font-semibold")}>
                                                    {(m.user?.name || m.name)?.[0]?.toUpperCase() || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{m.user?.name || m.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{m.user?.email || m.email}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] capitalize flex-shrink-0">
                                                {m.role || "member"}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* Sign Out */}
                        <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })} className="gap-2">
                            <LogOut className="w-4 h-4" />Sign Out
                        </Button>
                    </div>
                )}

                {/* Appearance Tab */}
                {activeTab === "appearance" && (
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-xl font-semibold">Appearance</h1>
                            <p className="text-sm text-muted-foreground mt-1">Customize how CollabFlow looks for you</p>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Theme</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {themeOptions.map((t) => {
                                    const isActive = mounted && resolvedTheme === t.value || (!mounted && t.value === "system");
                                    const isSelected = theme === t.value;
                                    return (
                                        <button
                                            key={t.value}
                                            onClick={() => setTheme(t.value)}
                                            className={`group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${isSelected
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-border hover:border-primary/40 hover:bg-muted/30"
                                                }`}
                                        >
                                            <div className={`p-3 rounded-lg ${isSelected ? "bg-primary/10" : "bg-muted/50 group-hover:bg-muted"} transition-colors`}>
                                                <t.icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                            </div>
                                            <div className="text-center">
                                                <p className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>{t.label}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <Separator />

                        {/* Preview */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Preview</Label>
                            <div className="p-4 rounded-xl border bg-card">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                        <span className="text-sm font-bold text-primary">C</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">CollabFlow</p>
                                        <p className="text-[10px] text-muted-foreground">Just now</p>
                                    </div>
                                </div>
                                <p className="text-sm text-foreground">This is how your messages will look with the current theme. 🎨</p>
                                <div className="flex gap-1 mt-2">
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">👍 2</span>
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted border border-border">❤️ 1</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Workspace Tab */}
                {activeTab === "workspace" && canManage && (
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-xl font-semibold">Workspace Settings</h1>
                            <p className="text-sm text-muted-foreground mt-1">Manage your workspace identity and visibility</p>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Workspace Name</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Workspace" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Description</Label>
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                                    rows={3} placeholder="What is this workspace about?" />
                                <p className="text-xs text-muted-foreground">Visible to all workspace members</p>
                            </div>
                        </div>

                        <Separator />

                        {/* Public Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Globe className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <Label htmlFor="public-toggle" className="font-medium cursor-pointer">Public Workspace</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Allow anyone to discover and join this workspace
                                    </p>
                                </div>
                            </div>
                            <Switch id="public-toggle" checked={isPublic} onCheckedChange={setIsPublic} />
                        </div>

                        <Separator />

                        {/* Invite Code */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium">Invite Code</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Share this code with others so they can join your workspace</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        readOnly
                                        value={inviteCode || "No code generated"}
                                        className="pl-9 font-mono bg-muted/30"
                                    />
                                </div>
                                <Button variant="secondary" onClick={copyInviteCode} disabled={!inviteCode}>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy
                                </Button>
                                <Button variant="outline" onClick={handleRegenerateInvite} disabled={regenerating}>
                                    {regenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                    Regenerate
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </Button>
                    </div>
                )}

                {/* Notifications Tab */}
                {activeTab === "notifications" && (
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-xl font-semibold">Notifications</h1>
                            <p className="text-sm text-muted-foreground mt-1">Control how you receive notifications</p>
                        </div>

                        <Separator />

                        <div className="space-y-1">
                            {[
                                { label: "Mentions", desc: "When someone @mentions you in a message", checked: notifMentions, onChange: setNotifMentions },
                                { label: "Replies", desc: "When someone replies to your message or thread", checked: notifReplies, onChange: setNotifReplies },
                                { label: "Reactions", desc: "When someone reacts to your message", checked: notifReactions, onChange: setNotifReactions },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium">{item.label}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                                    </div>
                                    <Switch checked={item.checked} onCheckedChange={item.onChange} />
                                </div>
                            ))}
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <h3 className="text-sm font-medium">Sound</h3>
                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                                <div>
                                    <p className="text-sm font-medium">Notification Sound</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Play a sound when you receive a notification</p>
                                </div>
                                <Switch checked={notifSound} onCheckedChange={setNotifSound} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Danger Zone Tab */}
                {activeTab === "danger" && (
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-xl font-semibold text-destructive">Danger Zone</h1>
                            <p className="text-sm text-muted-foreground mt-1">Irreversible actions for your account and workspace</p>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            {/* Sign Out */}
                            <div className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-muted">
                                        <LogOut className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Sign Out</p>
                                        <p className="text-xs text-muted-foreground">Sign out of your account on this device</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                                    Sign Out
                                </Button>
                            </div>

                            {/* Delete Workspace */}
                            {isOwner && (
                                <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-destructive/10">
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-destructive">Delete Workspace</p>
                                            <p className="text-xs text-muted-foreground">Permanently delete this workspace and all its data</p>
                                        </div>
                                    </div>
                                    <Button variant="destructive" size="sm" onClick={handleDelete}>
                                        Delete
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
