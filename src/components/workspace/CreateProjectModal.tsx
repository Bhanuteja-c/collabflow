"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
    LayoutGrid, 
    Layers, 
    Megaphone, 
    Code2, 
    Sparkles,
    CheckCircle2,
    Loader2,
    Calendar,
    Users,
    ArrowRight
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
interface User {
    id: string;
    name: string | null;
    image: string | null;
}

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    workspaceSlug: string;
    workspaceMembers: User[];
}

const TEMPLATES = [
    { id: "standard", title: "Standard Project", icon: <Layers className="w-5 h-5" />, desc: "A basic setup for any project." },
    { id: "software", title: "Software Dev", icon: <Code2 className="w-5 h-5" />, desc: "Includes code review and backlog columns." },
    { id: "marketing", title: "Marketing Campaign", icon: <Megaphone className="w-5 h-5" />, desc: "Optimized for content and launches." },
];

export function CreateProjectModal({ 
    isOpen, 
    onClose, 
    workspaceId, 
    workspaceSlug,
    workspaceMembers 
}: CreateProjectModalProps) {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    
    // Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [targetDate, setTargetDate] = useState("");
    const [template, setTemplate] = useState("standard");
    const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

    // Creation State
    const [isCreating, setIsCreating] = useState(false);
    const [progress, setProgress] = useState({
        epic: "pending", // pending, creating, done, error
        board: "pending",
        channel: "pending",
        whiteboard: "pending",
        document: "pending"
    });

    const resetForm = () => {
        setStep(1);
        setName("");
        setDescription("");
        setTargetDate("");
        setTemplate("standard");
        setSelectedMembers(new Set());
        setProgress({
            epic: "pending",
            board: "pending",
            channel: "pending",
            whiteboard: "pending",
            document: "pending"
        });
        setIsCreating(false);
    };

    const handleClose = () => {
        if (isCreating && step === 3) return; // Prevent closing while creating
        resetForm();
        onClose();
    };

    const toggleMember = (userId: string) => {
        setSelectedMembers(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const handleCreate = async () => {
        if (!name.trim()) return;
        setStep(3);
        setIsCreating(true);

        const progressUpdates = { ...progress };
        const updateProgress = (key: keyof typeof progress, status: string) => {
            progressUpdates[key] = status;
            setProgress({ ...progressUpdates });
        };

        try {
            // 1. Create Epic
            updateProgress("epic", "creating");
            const epicRes = await fetch(`/api/workspaces/${workspaceSlug}/epics`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: name,
                    description,
                    targetDate: targetDate || undefined,
                })
            });
            if (!epicRes.ok) throw new Error("Failed to create Epic");
            await epicRes.json();
            updateProgress("epic", "done");

            // 2. Create Board
            updateProgress("board", "creating");
            const boardRes = await fetch("/api/boards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: `${name} Board`,
                    workspaceId,
                    template // Pass template if API supports it later, currently defaults to To Do/In Progress/Review/Done
                })
            });
            if (!boardRes.ok) throw new Error("Failed to create Board");
            const board = await boardRes.json();
            updateProgress("board", "done");

            // 3. Create Whiteboard
            updateProgress("whiteboard", "creating");
            const wbRes = await fetch(`/api/workspaces/${workspaceSlug}/whiteboards`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: `${name} Brainstorm`,
                })
            });
            if (!wbRes.ok) throw new Error("Failed to create Whiteboard");
            const whiteboard = await wbRes.json();
            updateProgress("whiteboard", "done");

            // 4. Create Channel
            updateProgress("channel", "creating");
            const channelRes = await fetch("/api/channels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `project-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                    type: "private",
                    workspaceId,
                    memberIds: Array.from(selectedMembers)
                })
            });
            if (!channelRes.ok) throw new Error("Failed to create Channel");
            const channel = await channelRes.json();
            
            // Send Welcome Message to Channel
            await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    channelId: channel.id,
                    content: [
                        `🚀 **Welcome to the ${name} project!**`,
                        description ? `\n> ${description}` : '',
                        `\n---\n`,
                        `**Here's everything that's been set up for you:**\n`,
                        `📋 [**Kanban Board**](/workspace/${workspaceSlug}/kanban) — track tasks and progress`,
                        `\n🎨 [**Whiteboard**](/workspace/${workspaceSlug}/whiteboard/${whiteboard.id}) — brainstorm and sketch ideas`,
                        targetDate ? `\n\n📅 **Target Date:** ${new Date(targetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : '',
                        `\n\nLet's build something great! 💪`,
                    ].filter(Boolean).join(''),
                })
            });
            updateProgress("channel", "done");

            // 5. Create Document (Brief)
            updateProgress("document", "creating");
            
            let docContent = `# ${name}\n\n## Project Goal\n${description || 'No description provided.'}\n\n## Quick Links\n- [Kanban Board](/workspace/${workspaceSlug}/boards)\n- [Whiteboard](/workspace/${workspaceSlug}/whiteboard/${whiteboard.id})\n- [Team Channel](/workspace/${workspaceSlug}/chat/${channel.id})`;
            
            if (template === "marketing") {
                docContent += `\n\n## Target Audience\n-\n\n## Key Messages\n-`;
            } else if (template === "software") {
                docContent += `\n\n## Technical Requirements\n-\n\n## Architecture\n-`;
            }

            const docRes = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: `${name} Brief`,
                    content: docContent,
                    workspaceId,
                })
            });
            if (!docRes.ok) throw new Error("Failed to create Document");
            await docRes.json();
            updateProgress("document", "done");

            // Success! Send welcome message linking to the specific document too
            toast.success("Project created successfully!");
            
            // Redirect to the new Kanban board
            setTimeout(() => {
                handleClose();
                router.push(`/workspace/${workspaceSlug}/kanban?boardId=${board.id}`); // Or just /kanban depending on routing
            }, 1000);

        } catch (error) {
            console.error(error);
            toast.error("An error occurred while creating the project suite.");
            setIsCreating(false);
            setStep(2); // Go back to final step to retry
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[550px] overflow-hidden p-0 border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-muted">
                    <motion.div 
                        className="h-full bg-primary"
                        initial={{ width: "33%" }}
                        animate={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                <div className="p-6 pt-8">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                        Project Vision
                                    </DialogTitle>
                                    <DialogDescription className="mt-1.5">
                                        Let&apos;s start with the basics. What are we building?
                                    </DialogDescription>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Project Name <span className="text-destructive">*</span></Label>
                                        <Input 
                                            placeholder="e.g. Website Redesign 2026" 
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            autoFocus
                                            className="text-lg py-6"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Goal / Brief</Label>
                                        <Textarea 
                                            placeholder="What does success look like for this project?" 
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="resize-none h-24"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Calendar className="w-4 h-4"/> Target Date</Label>
                                        <Input 
                                            type="date" 
                                            value={targetDate}
                                            onChange={e => setTargetDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button 
                                        onClick={() => setStep(2)} 
                                        disabled={!name.trim()}
                                        className="gap-2"
                                    >
                                        Next Steps <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <DialogTitle className="text-2xl font-bold">Team & Template</DialogTitle>
                                    <DialogDescription className="mt-1.5">
                                        How should we configure the workspace?
                                    </DialogDescription>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <Label>Project Template</Label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {TEMPLATES.map(t => (
                                                <Card 
                                                    key={t.id}
                                                    onClick={() => setTemplate(t.id)}
                                                    className={`p-4 cursor-pointer transition-all border-2 ${template === t.id ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${template === t.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                            {t.icon}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm">{t.title}</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                                                        </div>
                                                        {template === t.id && <CheckCircle2 className="w-5 h-5 ml-auto text-primary" />}
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="flex items-center gap-2"><Users className="w-4 h-4"/> Invite Team</Label>
                                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                                            {workspaceMembers.map(member => (
                                                <button
                                                    key={member.id}
                                                    onClick={() => toggleMember(member.id)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors border ${
                                                        selectedMembers.has(member.id) 
                                                            ? 'bg-primary text-primary-foreground border-primary' 
                                                            : 'bg-background hover:bg-muted border-border'
                                                    }`}
                                                >
                                                    <UserAvatar user={member} className="w-5 h-5" showStatus={false} />
                                                    {member.name}
                                                </button>
                                            ))}
                                            {workspaceMembers.length === 0 && (
                                                <p className="text-sm text-muted-foreground italic">No other members in this workspace.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                                    <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
                                        Create Project Suite <Sparkles className="w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-8 space-y-8 flex flex-col items-center text-center"
                            >
                                <div className="relative">
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                                        {Object.values(progress).every(v => v === "done") 
                                            ? <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-in zoom-in duration-300" />
                                            : <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                        }
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold">
                                        {Object.values(progress).every(v => v === "done") 
                                            ? "Project Ready!" 
                                            : "Building your workspace..."}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                                        We are automatically provisioning your Epic, Board, Whiteboard, Channel, and Brief.
                                    </p>
                                </div>

                                <div className="w-full max-w-sm space-y-3 text-left bg-muted/30 p-4 rounded-xl">
                                    <ProgressItem status={progress.epic} label="Creating Epic Container" icon={<Layers className="w-4 h-4"/>} />
                                    <ProgressItem status={progress.board} label="Setting up Kanban Board" icon={<LayoutGrid className="w-4 h-4"/>} />
                                    <ProgressItem status={progress.whiteboard} label="Preparing Whiteboard" icon={<Sparkles className="w-4 h-4"/>} />
                                    <ProgressItem status={progress.channel} label="Opening Team Channel" icon={<Megaphone className="w-4 h-4"/>} />
                                    <ProgressItem status={progress.document} label="Drafting Project Brief" icon={<Code2 className="w-4 h-4"/>} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ProgressItem({ status, label, icon }: { status: string, label: string, icon: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-md ${status === 'done' ? 'bg-emerald-500/10 text-emerald-500' : status === 'creating' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {icon}
                </div>
                <span className={`text-sm ${status === 'pending' ? 'text-muted-foreground' : 'font-medium'}`}>
                    {label}
                </span>
            </div>
            {status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {status === "creating" && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
            {status === "pending" && <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mr-1" />}
        </div>
    );
}
