"use client";

import React, { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ImageCropperModal } from "@/components/ui/ImageCropperModal";
import { avatarFallbackClass, getDiceBearAvatar, getRandomDiceBearAvatar } from "@/lib/avatar-colors";
import {
    Sun, Moon, Monitor, Loader2, Save, Trash2, LogOut, Globe,
    User, Palette, Settings2, Shield, Bell, ChevronRight, Mail, Crown, Users, Key, RefreshCw, Copy, Camera, Dices
} from "lucide-react";

type SettingsTab = "profile" | "appearance" | "workspace" | "integrations" | "notifications" | "danger";

const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "appearance" as const, label: "Appearance", icon: Palette },
    { id: "workspace" as const, label: "Workspace", icon: Settings2 },
    { id: "integrations" as const, label: "Integrations", icon: Globe },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "danger" as const, label: "Danger Zone", icon: Shield },
];

const THEMES = [
    {
        id: "light",
        name: "Light",
        description: "Clean white interface",
        preview: {
            bg: "#ffffff",
            sidebar: "#f8fafc",
            accent: "#6366f1",
            card: "#f1f5f9"
        }
    },
    {
        id: "dark",
        name: "Dark",
        description: "Easy on the eyes",
        preview: {
            bg: "#1a1a1a",
            sidebar: "#111111",
            accent: "#6366f1",
            card: "#2a2a2a"
        }
    },
    {
        id: "midnight",
        name: "Midnight Blue",
        description: "Deep navy with blue accents",
        preview: {
            bg: "#0f172a",
            sidebar: "#0a0f1e",
            accent: "#3b82f6",
            card: "#1e293b"
        }
    },
    {
        id: "forest",
        name: "Forest",
        description: "Dark green, earthy and calm",
        preview: {
            bg: "#0d1f0f",
            sidebar: "#081208",
            accent: "#22c55e",
            card: "#14291a"
        }
    },
    {
        id: "sunset",
        name: "Sunset",
        description: "Warm orange on dark base",
        preview: {
            bg: "#1a0e05",
            sidebar: "#120a03",
            accent: "#f97316",
            card: "#2d1a0a"
        }
    },
    {
        id: "nord",
        name: "Nord",
        description: "Arctic blues and muted greys",
        preview: {
            bg: "#2e3440",
            sidebar: "#242933",
            accent: "#88c0d0",
            card: "#3b4252"
        }
    },
    {
        id: "catppuccin",
        name: "Catppuccin",
        description: "Pastel purple, popular dev theme",
        preview: {
            bg: "#1e1e2e",
            sidebar: "#181825",
            accent: "#cba6f7",
            card: "#313244"
        }
    },
];

export default function WorkspaceSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const { data: session, update } = useSession();
    const { theme, setTheme } = useTheme();

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
    const [githubIntegration, setGithubIntegration] = useState<any>(null);
    const [webhookUrl, setWebhookUrl] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const avatarInputRef = React.useRef<HTMLInputElement>(null);

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

                        // Fetch Integrations
                        const intRes = await fetch(`/api/workspaces/${ws.id}/integrations/github`);
                        if (intRes.ok) {
                            const intData = await intRes.json();
                            setGithubIntegration(intData.integration);
                        }
                        
                        // Set the current origin for the webhook URL display
                        setWebhookUrl(`${window.location.origin}/api/webhooks/github?workspaceId=${ws.id}`);
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

    const handleGithubAction = async (action: "create" | "regenerate" | "toggle" | "delete") => {
        if (action === "delete" && !confirm("Delete this integration? Smart commits will stop working.")) return;
        if (action === "regenerate" && !confirm("Regenerate secret? You must update GitHub with the new secret immediately.")) return;
        
        try {
            if (action === "delete") {
                await fetch(`/api/workspaces/${workspace.id}/integrations/github`, { method: "DELETE" });
                setGithubIntegration(null);
                toast.success("Integration deleted");
            } else {
                const res = await fetch(`/api/workspaces/${workspace.id}/integrations/github`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setGithubIntegration(data.integration);
                    toast.success(action === "toggle" ? "Integration status updated" : "Webhook secret generated");
                }
            }
        } catch (e) { toast.error("Failed to manage integration"); }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
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
                    // Hide workspace and integrations tabs for non-admins
                    if ((tab.id === "workspace" || tab.id === "integrations") && !canManage) return null;
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
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                                    <Avatar className="h-24 w-24 border-4 border-background shadow-sm ring-1 ring-border">
                                        <UserAvatar user={{ name: session?.user?.name, image: avatarUrl || session?.user?.image }} className="h-24 w-24" showStatus={false} />
                                    </Avatar>
                                    {/* Upload overlay */}
                                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {uploadingAvatar ? (
                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        ) : (
                                            <Camera className="w-6 h-6 text-white" />
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 w-full mt-1">
                                    <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}>
                                        <Camera className="w-3.5 h-3.5 mr-2" /> Upload Photo
                                    </Button>
                                    <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        className="w-full text-xs h-8 bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                                        disabled={uploadingAvatar}
                                        onClick={async () => {
                                            const randomUrl = getRandomDiceBearAvatar(120);
                                            setUploadingAvatar(true);
                                            try {
                                                const profileRes = await fetch("/api/user/profile", {
                                                    method: "PATCH",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ image: randomUrl }),
                                                });
                                                if (!profileRes.ok) throw new Error("Update failed");
                                                await update({ image: randomUrl });
                                                setAvatarUrl(randomUrl);
                                                toast.success("Avatar randomized!");
                                            } catch(e) { toast.error("Failed to update avatar"); }
                                            finally { setUploadingAvatar(false); }
                                        }}
                                    >
                                        <Dices className="w-3.5 h-3.5 mr-2" /> Randomize
                                    </Button>
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            if (file.size > 5 * 1024 * 1024) {
                                                toast.error("Image must be under 5MB");
                                                return;
                                            }
                                            
                                            const reader = new FileReader();
                                            reader.addEventListener("load", () => {
                                                setCropImageSrc(reader.result?.toString() || null);
                                            });
                                            reader.readAsDataURL(file);
                                            e.target.value = "";
                                        }}
                                    />
                                    <ImageCropperModal
                                        isOpen={!!cropImageSrc}
                                        imageSrc={cropImageSrc}
                                        onClose={() => setCropImageSrc(null)}
                                        onCropCompleteAction={async (croppedFile) => {
                                            setCropImageSrc(null);
                                            setUploadingAvatar(true);
                                            try {
                                                const formData = new FormData();
                                                formData.append("file", croppedFile);
                                                const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
                                                if (!uploadRes.ok) throw new Error("Upload failed");
                                                const { url } = await uploadRes.json();
                                                
                                                const profileRes = await fetch("/api/user/profile", {
                                                    method: "PATCH",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ image: url }),
                                                });
                                                if (!profileRes.ok) throw new Error("Profile update failed");

                                                await update({ image: url });
                                                setAvatarUrl(url);
                                                toast.success("Profile picture updated!");
                                            } catch (err) {
                                                toast.error(err instanceof Error ? err.message : "Failed to upload");
                                            } finally {
                                                setUploadingAvatar(false);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 w-full space-y-3">
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const name = formData.get("name") as string;
                                    const handle = formData.get("handle") as string;
                                    const bio = formData.get("bio") as string;
                                    
                                    try {
                                        const res = await fetch("/api/user/profile", {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ name, handle, bio })
                                        });
                                        if (!res.ok) {
                                            const error = await res.json();
                                            throw new Error(error.error || "Failed to update profile");
                                        }
                                        await update({ name, handle, bio });
                                        toast.success("Profile saved successfully!");
                                    } catch (err: any) {
                                        toast.error(err.message);
                                    }
                                }} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Display Name</Label>
                                            <Input name="name" defaultValue={session?.user?.name || ""} placeholder="Your name" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Username Handle</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">@</span>
                                                <Input name="handle" className="pl-7" defaultValue={(session?.user as any)?.handle || ""} placeholder="john_doe" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bio</Label>
                                        <Textarea name="bio" rows={3} defaultValue={(session?.user as any)?.bio || ""} placeholder="A short bio about yourself... (max 160 chars)" maxLength={160} className="resize-none" />
                                    </div>
                                    
                                    <div className="flex items-center justify-between pt-2 border-t mt-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Email Linked</Label>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <p className="text-xs font-medium">{session?.user?.email}</p>
                                                </div>
                                            </div>
                                            <div className="w-px h-8 bg-border hidden sm:block" />
                                            <div className="flex flex-col hidden sm:flex">
                                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Workspace Role</Label>
                                                <div className="mt-0.5">
                                                    <Badge variant={isOwner ? "default" : "secondary"} className="text-[10px] capitalize px-1.5 py-0 h-4">
                                                        {isOwner && <Crown className="w-2.5 h-2.5 mr-1" />}
                                                        {userRole || "member"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <Button type="submit" size="sm" className="gap-2 h-8">
                                            <Save className="w-3.5 h-3.5" /> Save Changes
                                        </Button>
                                    </div>
                                </form>
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
                                            <UserAvatar user={{ name: m.user?.name, image: m.user?.image }} className="h-8 w-8" showStatus={false} />
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
                        <section className="mb-8">
                            <h2 className="text-lg font-semibold mb-1">
                                Appearance
                            </h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Choose a theme for your workspace.
                                Your preference is saved automatically.
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {THEMES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`group rounded-xl border-2 p-3 text-left transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary ${
                                            theme === t.id
                                                ? "border-primary shadow-sm"
                                                : "border-border hover:border-primary/50"
                                        }`}
                                    >
                                        {/* Mini UI Preview */}
                                        <div
                                            className="w-full h-16 rounded-lg mb-3 overflow-hidden flex"
                                            style={{ backgroundColor: t.preview.bg }}
                                        >
                                            {/* Sidebar strip */}
                                            <div
                                                className="w-1/3 h-full flex flex-col gap-1 p-1.5"
                                                style={{ backgroundColor: t.preview.sidebar }}
                                            >
                                                <div
                                                    className="h-1.5 rounded-full w-3/4"
                                                    style={{ backgroundColor: t.preview.accent, opacity: 0.8 }}
                                                />
                                                <div
                                                    className="h-1 rounded-full w-1/2"
                                                    style={{ backgroundColor: t.preview.accent, opacity: 0.4 }}
                                                />
                                                <div
                                                    className="h-1 rounded-full w-2/3"
                                                    style={{ backgroundColor: t.preview.accent, opacity: 0.4 }}
                                                />
                                            </div>
                                            {/* Main area */}
                                            <div className="flex-1 p-1.5 flex flex-col gap-1">
                                                <div
                                                    className="h-2 rounded w-full"
                                                    style={{ backgroundColor: t.preview.card }}
                                                />
                                                <div
                                                    className="h-5 rounded w-full"
                                                    style={{ backgroundColor: t.preview.card }}
                                                />
                                                <div
                                                    className="h-1.5 rounded w-2/3"
                                                    style={{ backgroundColor: t.preview.accent, opacity: 0.6 }}
                                                />
                                            </div>
                                        </div>

                                        {/* Theme info */}
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium leading-tight">
                                                    {t.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {t.description}
                                                </p>
                                            </div>
                                            {theme === t.id && (
                                                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                                                    <svg width="8" height="8" viewBox="0 0 8 8">
                                                        <path
                                                            d="M1.5 4L3 5.5L6.5 2"
                                                            stroke="white"
                                                            strokeWidth="1.5"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            fill="none"
                                                        />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
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

                {/* Integrations Tab */}
                {activeTab === "integrations" && canManage && (
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-xl font-semibold">Integrations</h1>
                            <p className="text-sm text-muted-foreground mt-1">Connect CollabFlow to your external tools</p>
                        </div>

                        <Separator />

                        {/* GitHub Integration */}
                        <div className="border rounded-xl p-5 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center">
                                        {/* Simple SVG fallback for GitHub icon */}
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold">GitHub Smart Commits</h3>
                                        <p className="text-sm text-muted-foreground">Auto-move cards when PRs are opened/merged</p>
                                    </div>
                                </div>
                                {githubIntegration && (
                                    <Switch 
                                        checked={githubIntegration.enabled} 
                                        onCheckedChange={() => handleGithubAction("toggle")} 
                                    />
                                )}
                            </div>

                            {githubIntegration ? (
                                <div className="space-y-4 pt-4 border-t">
                                    {githubIntegration.repoName && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            Connected repository: <strong className="text-foreground">{githubIntegration.repoName}</strong>
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <div>
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Payload URL</Label>
                                            <div className="flex gap-2">
                                                <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                                                <Button variant="secondary" onClick={() => copyToClipboard(webhookUrl, "Webhook URL")} size="sm">Copy</Button>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Secret</Label>
                                            <div className="flex gap-2">
                                                <Input readOnly value={githubIntegration.webhookSecret} type="password" className="font-mono text-xs" />
                                                <Button variant="secondary" onClick={() => copyToClipboard(githubIntegration.webhookSecret, "Secret")} size="sm">Copy</Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <Button variant="outline" size="sm" onClick={() => handleGithubAction("regenerate")}>
                                            Regenerate Secret
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleGithubAction("delete")}>
                                            Remove Integration
                                        </Button>
                                    </div>
                                    <div className="bg-muted p-3 rounded-lg text-xs space-y-2">
                                        <p><strong>How to set up:</strong></p>
                                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                            <li>Go to your GitHub Repository Settings → Webhooks</li>
                                            <li>Click "Add webhook"</li>
                                            <li>Set <strong>Payload URL</strong> and <strong>Secret</strong> to the values above</li>
                                            <li>Set Content type to `application/json`</li>
                                            <li>Select "Let me select individual events" and check <strong>Pushes</strong> and <strong>Pull requests</strong></li>
                                        </ol>
                                        <p className="pt-2 text-muted-foreground">Now just include `#123` or `KAN-123` in commit messages or PR titles to link cards!</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="pt-4 border-t">
                                    <Button onClick={() => handleGithubAction("create")}>Configure Integration</Button>
                                </div>
                            )}
                        </div>
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
