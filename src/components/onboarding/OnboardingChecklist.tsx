"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, LayoutGrid, MessageSquare, PenTool, Sparkles, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Workspace {
    id: string;
    slug: string;
    members?: { userId: string }[];
    _count?: {
        boards: number;
        channels: number;
        documents: number;
    };
    onboardingCompleted?: boolean;
}

interface OnboardingChecklistProps {
    workspace: Workspace;
    onDismiss: () => void;
}

export function OnboardingChecklist({ workspace, onDismiss }: OnboardingChecklistProps) {
    const router = useRouter();
    const [isDismissing, setIsDismissing] = useState(false);
    
    // Derived task state checking counts locally from initial workspace pull or fetching dynamically
    const tasks = [
        {
            id: "project",
            title: "Create your first project",
            description: "Spin up a kanban board, chat, and whiteboard",
            icon: <Sparkles className="w-5 h-5" />,
            isDone: (workspace?._count?.boards ?? 0) > 0 || (workspace?._count?.channels ?? 0) > 1,
            action: null, // Relies on the external creation nav logically or we could bind a prop
            path: null 
        },
        {
            id: "invite",
            title: "Invite a teammate",
            description: "Collaboration is better together",
            icon: <UserPlus className="w-5 h-5" />,
            isDone: (workspace?.members?.length ?? 0) > 1,
            action: "Invite Team",
            path: `/workspace/${workspace.slug}/members`
        },
        {
            id: "board",
            title: "Create a Kanban card",
            description: "Track your first unit of work",
            icon: <LayoutGrid className="w-5 h-5" />,
            isDone: (workspace?._count?.boards ?? 0) > 0, // Simplified signal
            action: "Open Boards",
            path: `/workspace/${workspace.slug}/boards`
        },
        {
            id: "chat",
            title: "Send a message in chat",
            description: "Say hello to your team channel",
            icon: <MessageSquare className="w-5 h-5" />,
            isDone: (workspace?._count?.channels ?? 0) > 1, // Assumes default "general" exists, requiring a second
            action: "Open Chat",
            path: `/workspace/${workspace.slug}/chat`
        },
        {
            id: "whiteboard",
            title: "Try the whiteboard",
            description: "Sketch out your architecture or ideas",
            icon: <PenTool className="w-5 h-5" />,
            isDone: false, // Strict counting requires complex polling, relying on basic boolean dismissal for now
            action: "Open Whiteboards",
            path: `/workspace/${workspace.slug}/whiteboard`
        }
    ];

    const completedCount = tasks.filter(t => t.isDone).length;
    const progressPercent = Math.round((completedCount / tasks.length) * 100);
    const isAllDone = completedCount === tasks.length;

    const handleDismiss = async () => {
        setIsDismissing(true);
        try {
            const res = await fetch(`/api/workspaces/${workspace.slug}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ onboardingCompleted: true })
            });
            if (!res.ok) throw new Error("Failed to dismiss checklist");
            onDismiss(); // Hide immediately from parent
            router.refresh();
        } catch (e) {
            console.error(e);
            toast.error("Failed to dismiss onboarding.");
            setIsDismissing(false);
        }
    };

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background mb-8 overflow-hidden relative">
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-muted-foreground hover:bg-muted" 
                onClick={handleDismiss}
                disabled={isDismissing}
            >
                <X className="w-4 h-4" />
            </Button>

            <CardContent className="p-6 md:p-8">
                <div className="grid lg:grid-cols-5 gap-8">
                    {/* Header Side */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-xl mb-2 text-primary">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold">Welcome to CollabFlow</h2>
                        <p className="text-muted-foreground">
                            Let's get your workspace set up and ready for your team. Complete these steps to master the basics.
                        </p>

                        <div className="pt-4 space-y-2">
                            <div className="flex items-center justify-between text-sm font-medium">
                                <span>{completedCount} of {tasks.length} tasks completed</span>
                                <span className={isAllDone ? "text-emerald-500 font-bold" : "text-primary"}>{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border">
                                <motion.div 
                                    className={`h-full ${isAllDone ? "bg-emerald-500" : "bg-primary"}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>
                        </div>

                        <AnimatePresence>
                            {isAllDone && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="pt-4"
                                >
                                    <p className="text-emerald-600 font-medium mb-3">🎉 You're fully set up!</p>
                                    <Button onClick={handleDismiss} disabled={isDismissing} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
                                        Dismiss Checklist
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Checkbox Grid */}
                    <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
                        {tasks.map((task) => (
                            <div 
                                key={task.id} 
                                className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                                    task.isDone 
                                        ? "bg-muted/50 border-muted opacity-60" 
                                        : "bg-background border-border shadow-sm hover:border-primary/30 hover:shadow-md"
                                }`}
                            >
                                <div className="mt-0.5 text-primary shrink-0">
                                    {task.isDone ? (
                                        <CheckCircle2 className="w-[22px] h-[22px] text-emerald-500" />
                                    ) : (
                                        <Circle className="w-[22px] h-[22px] text-muted-foreground opacity-50" />
                                    )}
                                </div>
                                <div>
                                    <h4 className={`font-semibold text-sm ${task.isDone ? "line-through text-muted-foreground" : ""}`}>
                                        {task.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1 mb-3 pr-2">
                                        {task.description}
                                    </p>
                                    
                                    {!task.isDone && task.path && (
                                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                            <Link href={task.path}>{task.action}</Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
