"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/ui/Logo";
import { Loader2, ArrowRight, Building2, Users, FileText, Sparkles, UserPlus, Plus } from "lucide-react";

export default function CreateWorkspacePage() {
    const router = useRouter();
    const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || name.length < 2) {
            setError("Workspace name must be at least 2 characters");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/workspaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), description: description.trim() }),
            });

            if (res.ok) {
                const workspace = await res.json();
                router.push(`/workspace/${workspace.slug}`);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to create workspace");
            }
        } catch (err) {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) {
            setError("Please enter an invite code or workspace slug");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/workspaces/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: inviteCode.trim() }),
            });

            if (res.ok) {
                const workspace = await res.json();
                router.push(`/workspace/${workspace.slug}`);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to join workspace");
            }
        } catch (err) {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    // Choose mode screen
    if (mode === "choose") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <Logo size="lg" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Get Started</h1>
                        <p className="text-muted-foreground">
                            Create a new workspace or join an existing one
                        </p>
                    </div>

                    {/* Options */}
                    <div className="grid gap-4">
                        <button
                            onClick={() => setMode("create")}
                            className="bg-card border rounded-xl p-6 shadow-lg hover:border-primary hover:shadow-xl transition-all text-left group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-semibold mb-1">Create Workspace</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Start fresh with a new workspace for your team
                                    </p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                            </div>
                        </button>

                        <button
                            onClick={() => setMode("join")}
                            className="bg-card border rounded-xl p-6 shadow-lg hover:border-primary hover:shadow-xl transition-all text-left group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                    <UserPlus className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-semibold mb-1">Join Workspace</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Join an existing workspace with an invite code
                                    </p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 transition-colors mt-1" />
                            </div>
                        </button>
                    </div>

                    {/* Features Preview */}
                    <div className="mt-8 grid grid-cols-3 gap-4">
                        <div className="text-center p-4 rounded-lg bg-card/50 border">
                            <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
                            <p className="text-sm font-medium">Documents</p>
                            <p className="text-xs text-muted-foreground">Real-time editing</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-card/50 border">
                            <Building2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                            <p className="text-sm font-medium">Kanban</p>
                            <p className="text-xs text-muted-foreground">Task management</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-card/50 border">
                            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                            <p className="text-sm font-medium">Team Chat</p>
                            <p className="text-xs text-muted-foreground">Real-time messaging</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Create workspace form
    if (mode === "create") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <Logo size="lg" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Create Your Workspace</h1>
                        <p className="text-muted-foreground">
                            A workspace is where your team collaborates on documents, tasks, and more.
                        </p>
                    </div>

                    <div className="bg-card border rounded-xl p-6 shadow-lg">
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">
                                    Workspace Name *
                                </label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Acme Inc. or Marketing Team"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="text-lg"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="description" className="text-sm font-medium">
                                    Description <span className="text-muted-foreground">(optional)</span>
                                </label>
                                <Textarea
                                    id="description"
                                    placeholder="What's this workspace for?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setMode("choose"); setError(""); }}
                                    className="flex-1"
                                >
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 btn-primary"
                                    disabled={loading || !name.trim()}
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-4 h-4 mr-2" />
                                    )}
                                    Create
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // Join workspace form
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Logo size="lg" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Join a Workspace</h1>
                    <p className="text-muted-foreground">
                        Enter the invite code or workspace slug shared with you
                    </p>
                </div>

                <div className="bg-card border rounded-xl p-6 shadow-lg">
                    <form onSubmit={handleJoin} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="code" className="text-sm font-medium">
                                Invite Code or Workspace Slug *
                            </label>
                            <Input
                                id="code"
                                placeholder="e.g., acme-inc or abc123"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                                className="text-lg"
                                autoFocus
                            />
                            <p className="text-xs text-muted-foreground">
                                Ask your team admin for the workspace invite code
                            </p>
                        </div>

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => { setMode("choose"); setError(""); }}
                                className="flex-1"
                            >
                                Back
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={loading || !inviteCode.trim()}
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <UserPlus className="w-4 h-4 mr-2" />
                                )}
                                Join
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
