"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/ui/Logo";
import { Loader2, ArrowRight, Building2, Users, FileText, Sparkles } from "lucide-react";

export default function CreateWorkspacePage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Logo size="lg" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Create Your Workspace</h1>
                    <p className="text-muted-foreground">
                        A workspace is where your team collaborates on documents, tasks, and more.
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-card border rounded-xl p-6 shadow-lg">
                    <form onSubmit={handleSubmit} className="space-y-6">
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

                        <Button
                            type="submit"
                            className="w-full btn-primary"
                            size="lg"
                            disabled={loading || !name.trim()}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4 mr-2" />
                            )}
                            Create Workspace
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </form>
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
