"use client";

import { useState, useEffect, use } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sun, Moon, Monitor, Loader2, Save, Trash2, LogOut } from "lucide-react";

export default function WorkspaceSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const { data: session } = useSession();
    const { theme, setTheme } = useTheme();

    const [workspace, setWorkspace] = useState<any>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userRole, setUserRole] = useState("");

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

                        const detailRes = await fetch(`/api/workspaces/${ws.id}`);
                        if (detailRes.ok) {
                            const detail = await detailRes.json();
                            setUserRole(detail.userRole);
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
                body: JSON.stringify({ name, description }),
            });
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!workspace || !confirm("Delete this workspace? This action cannot be undone.")) return;
        try {
            await fetch(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
            window.location.href = "/workspace/new";
        } catch (e) { console.error(e); }
    };

    const canManage = ["owner", "admin"].includes(userRole);
    const isOwner = userRole === "owner";

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
        <div className="p-8 space-y-6 max-w-2xl">
            <h1 className="text-2xl font-bold">Settings</h1>

            {/* Profile */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Profile</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={session?.user?.image || ""} />
                        <AvatarFallback className="text-xl">{session?.user?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium text-lg">{session?.user?.name}</p>
                        <p className="text-muted-foreground">{session?.user?.email}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Theme */}
            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Choose your preferred theme</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-3">
                    {[
                        { value: "light", icon: Sun, label: "Light" },
                        { value: "dark", icon: Moon, label: "Dark" },
                        { value: "system", icon: Monitor, label: "System" },
                    ].map((t) => (
                        <Button key={t.value} variant={theme === t.value ? "default" : "outline"}
                            onClick={() => setTheme(t.value)} className="flex-1">
                            <t.icon className="w-4 h-4 mr-2" />{t.label}
                        </Button>
                    ))}
                </CardContent>
            </Card>

            {/* Workspace Settings */}
            {canManage && (
                <Card>
                    <CardHeader>
                        <CardTitle>Workspace Settings</CardTitle>
                        <CardDescription>Manage workspace details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Name</label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Description</label>
                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                                className="mt-1" rows={3} />
                        </div>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Changes
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Danger Zone */}
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })} className="w-full justify-start">
                        <LogOut className="w-4 h-4 mr-2" />Sign Out
                    </Button>
                    {isOwner && (
                        <Button variant="destructive" onClick={handleDelete} className="w-full justify-start">
                            <Trash2 className="w-4 h-4 mr-2" />Delete Workspace
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
