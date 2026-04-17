"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles, Loader2, CheckCircle2, LayoutGrid, MessageSquare,
    PenTool, Layers, Plus, ArrowRight, ArrowLeft,
    Code2, Megaphone, Palette, Rocket, FileText,
    Users, Calendar, Check, Circle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/ui/UserAvatar";
// ── Types ───────────────────────────────────────────────────────────────
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
    workspaceMembers?: User[];
}

type Step = 1 | 2 | 3 | 4;
type CreationStatus = "pending" | "creating" | "done" | "error";

// ── Project Templates ───────────────────────────────────────────────────
const TEMPLATES = [
    {
        id: "blank",
        title: "Blank Project",
        desc: "Start fresh with a clean slate",
        icon: <Sparkles className="w-5 h-5" />,
        color: "from-violet-500/20 to-purple-500/20",
        border: "border-violet-500/30",
        features: { kanban: true, chat: true, whiteboard: true, epics: false, document: false },
    },
    {
        id: "software",
        title: "Software Dev",
        desc: "Board with backlog, sprint, review columns",
        icon: <Code2 className="w-5 h-5" />,
        color: "from-blue-500/20 to-cyan-500/20",
        border: "border-blue-500/30",
        features: { kanban: true, chat: true, whiteboard: true, epics: true, document: true },
    },
    {
        id: "marketing",
        title: "Marketing Campaign",
        desc: "Content calendar, briefs, and launch planning",
        icon: <Megaphone className="w-5 h-5" />,
        color: "from-pink-500/20 to-rose-500/20",
        border: "border-pink-500/30",
        features: { kanban: true, chat: true, whiteboard: false, epics: true, document: true },
    },
    {
        id: "design",
        title: "Design Sprint",
        desc: "Whiteboard-first with rapid iteration workflow",
        icon: <Palette className="w-5 h-5" />,
        color: "from-amber-500/20 to-orange-500/20",
        border: "border-amber-500/30",
        features: { kanban: true, chat: true, whiteboard: true, epics: false, document: false },
    },
] as const;

// ── Feature Config ──────────────────────────────────────────────────────
const FEATURE_OPTIONS = [
    { key: "kanban" as const,     label: "Kanban Board",     desc: "Track tasks and sprints",       icon: <LayoutGrid className="w-4 h-4" />,   color: "text-primary" },
    { key: "chat" as const,       label: "Chat Channel",     desc: "Team communication hub",        icon: <MessageSquare className="w-4 h-4" />, color: "text-emerald-500" },
    { key: "whiteboard" as const, label: "Whiteboard",       desc: "Visual brainstorming canvas",   icon: <PenTool className="w-4 h-4" />,      color: "text-orange-500" },
    { key: "epics" as const,      label: "Epics",            desc: "High-level planning container", icon: <Layers className="w-4 h-4" />,       color: "text-violet-500" },
    { key: "document" as const,   label: "Project Brief",    desc: "Auto-generated project doc",    icon: <FileText className="w-4 h-4" />,     color: "text-blue-500" },
];

// ── Progress Item Component ─────────────────────────────────────────────
function ProgressItem({ status, label, icon }: { status: CreationStatus; label: string; icon: React.ReactNode }) {
    return (
        <motion.div
            className="flex items-center justify-between py-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
        >
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg transition-colors ${
                    status === "done" ? "bg-emerald-500/15 text-emerald-500" :
                    status === "creating" ? "bg-primary/15 text-primary" :
                    status === "error" ? "bg-destructive/15 text-destructive" :
                    "bg-muted text-muted-foreground"
                }`}>
                    {icon}
                </div>
                <span className={`text-sm ${status === "pending" ? "text-muted-foreground" : "font-medium"}`}>
                    {label}
                </span>
            </div>
            {status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {status === "creating" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
            {status === "error" && <span className="text-xs text-destructive font-medium">Failed</span>}
            {status === "pending" && <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />}
        </motion.div>
    );
}

// ── Main Component ──────────────────────────────────────────────────────
export function CreateProjectModal({
    isOpen,
    onClose,
    workspaceId,
    workspaceSlug,
    workspaceMembers = [],
}: CreateProjectModalProps) {
    const router = useRouter();
    const [step, setStep] = useState<Step>(1);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [targetDate, setTargetDate] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState("blank");
    const [features, setFeatures] = useState({
        kanban: true, chat: true, whiteboard: true, epics: false, document: false,
    });
    const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

    // Creation state
    const [isCreating, setIsCreating] = useState(false);
    const [progress, setProgress] = useState<Record<string, CreationStatus>>({
        epic: "pending", board: "pending", channel: "pending",
        whiteboard: "pending", document: "pending",
    });
    const [createdAssets, setCreatedAssets] = useState<{
        boardId?: string; channelId?: string; whiteboardId?: string;
        epicId?: string; documentId?: string;
    }>({});

    // ── Handlers ────────────────────────────────────────────────────────
    const reset = useCallback(() => {
        setStep(1);
        setName("");
        setDescription("");
        setTargetDate("");
        setSelectedTemplate("blank");
        setFeatures({ kanban: true, chat: true, whiteboard: true, epics: false, document: false });
        setSelectedMembers(new Set());
        setIsCreating(false);
        setProgress({ epic: "pending", board: "pending", channel: "pending", whiteboard: "pending", document: "pending" });
        setCreatedAssets({});
    }, []);

    const handleClose = () => {
        if (isCreating) return;
        reset();
        onClose();
    };

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplate(templateId);
        const t = TEMPLATES.find(t => t.id === templateId);
        if (t) setFeatures({ ...t.features });
    };

    const toggleFeature = (key: keyof typeof features) => {
        setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleMember = (userId: string) => {
        setSelectedMembers(prev => {
            const next = new Set(prev);
            next.has(userId) ? next.delete(userId) : next.add(userId);
            return next;
        });
    };

    const handleCreate = async () => {
        if (!name.trim() || name.length < 2) return;
        setStep(4);
        setIsCreating(true);

        const assets: typeof createdAssets = {};
        const updateProgress = (key: string, status: CreationStatus) => {
            setProgress(prev => ({ ...prev, [key]: status }));
        };

        try {
            // Epic
            if (features.epics) {
                updateProgress("epic", "creating");
                const res = await fetch(`/api/workspaces/${workspaceSlug}/epics`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: name, description, targetDate: targetDate || undefined }),
                });
                if (res.ok) { assets.epicId = (await res.json()).id; updateProgress("epic", "done"); }
                else { updateProgress("epic", "error"); }
            } else { updateProgress("epic", "done"); }

            // Kanban Board
            if (features.kanban) {
                updateProgress("board", "creating");
                const res = await fetch("/api/boards", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: `${name} Board`, workspaceId, template: selectedTemplate }),
                });
                if (res.ok) { assets.boardId = (await res.json()).id; updateProgress("board", "done"); }
                else { updateProgress("board", "error"); }
            } else { updateProgress("board", "done"); }

            // Whiteboard
            if (features.whiteboard) {
                updateProgress("whiteboard", "creating");
                const res = await fetch(`/api/workspaces/${workspaceSlug}/whiteboards`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: `${name} Whiteboard` }),
                });
                if (res.ok) { assets.whiteboardId = (await res.json()).id; updateProgress("whiteboard", "done"); }
                else { updateProgress("whiteboard", "error"); }
            } else { updateProgress("whiteboard", "done"); }

            // Chat Channel
            if (features.chat) {
                updateProgress("channel", "creating");
                const channelSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                const res = await fetch("/api/channels", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: `project-${channelSlug}`,
                        type: "public",
                        workspaceId,
                        memberIds: Array.from(selectedMembers),
                    }),
                });
                if (res.ok) {
                    const channel = await res.json();
                    assets.channelId = channel.id;

                    // Welcome message
                    await fetch("/api/messages", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            channelId: channel.id,
                            content: [
                            `🚀 <strong>Welcome to the ${name} project!</strong>`,
                            description ? `<br><blockquote>${description}</blockquote>` : '',
                            `<br><hr><br>`,
                            `<strong>Here's everything that's been set up for you:</strong><br>`,
                            assets.boardId ? `<br>📋 <a href="/workspace/${workspaceSlug}/kanban"><strong>Kanban Board</strong></a> — track tasks and progress` : '',
                            assets.whiteboardId ? `<br>🎨 <a href="/workspace/${workspaceSlug}/whiteboard/${assets.whiteboardId}"><strong>Whiteboard</strong></a> — brainstorm and sketch ideas` : '',
                            assets.documentId ? `<br>📄 <a href="/workspace/${workspaceSlug}/editor/${assets.documentId}"><strong>Project Brief</strong></a> — goals, specs, and notes` : '',
                            assets.epicId ? `<br>🎯 <strong>Epic</strong> created — group related tasks under one goal` : '',
                            targetDate ? `<br><br>📅 <strong>Target Date:</strong> ${new Date(targetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : '',
                            `<br><br>Let's build something great! 💪`,
                        ].filter(Boolean).join(''),
                        }),
                    });
                    updateProgress("channel", "done");
                } else { updateProgress("channel", "error"); }
            } else { updateProgress("channel", "done"); }

            // Project Brief Document
            if (features.document) {
                updateProgress("document", "creating");
                let docContent = `# ${name}\n\n## Project Goal\n${description || "No description provided."}\n\n## Quick Links\n`;
                if (assets.boardId) docContent += `- [Kanban Board](/workspace/${workspaceSlug}/boards)\n`;
                if (assets.whiteboardId) docContent += `- [Whiteboard](/workspace/${workspaceSlug}/whiteboard/${assets.whiteboardId})\n`;
                if (assets.channelId) docContent += `- [Team Channel](/workspace/${workspaceSlug}/chat/${assets.channelId})\n`;

                if (selectedTemplate === "software") {
                    docContent += `\n## Technical Requirements\n- \n\n## Architecture\n- `;
                } else if (selectedTemplate === "marketing") {
                    docContent += `\n## Target Audience\n- \n\n## Key Messages\n- `;
                }

                const res = await fetch("/api/documents", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: `${name} Brief`, content: docContent, workspaceId }),
                });
                if (res.ok) { assets.documentId = (await res.json()).id; updateProgress("document", "done"); }
                else { updateProgress("document", "error"); }
            } else { updateProgress("document", "done"); }

            setCreatedAssets(assets);
            setIsCreating(false);
            toast.success(`"${name}" project created!`);
            router.refresh();

        } catch (error) {
            console.error("Project creation error:", error);
            toast.error("An error occurred during project creation.");
            setIsCreating(false);
        }
    };

    // ── Computed values ─────────────────────────────────────────────────
    const enabledFeatureCount = Object.values(features).filter(Boolean).length;
    const allDone = Object.values(progress).every(v => v === "done");
    const hasErrors = Object.values(progress).some(v => v === "error");

    const slideVariants = {
        enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[560px] overflow-hidden p-0 border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
                <VisuallyHidden><DialogTitle>New Project</DialogTitle></VisuallyHidden>

                {/* ── Progress Bar ──────────────────────────────────────── */}
                <div className="absolute top-0 left-0 w-full h-1 bg-muted z-10">
                    <motion.div
                        className="h-full bg-gradient-to-r from-primary to-primary/70"
                        animate={{ width: `${(step / 4) * 100}%` }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                    />
                </div>

                {/* ── Step Indicators ───────────────────────────────────── */}
                {step < 4 && (
                    <div className="flex items-center justify-center gap-2 pt-6 pb-0 px-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    i < step ? "bg-primary text-primary-foreground" :
                                    i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                                    "bg-muted text-muted-foreground"
                                }`}>
                                    {i < step ? <Check className="w-3.5 h-3.5" /> : i}
                                </div>
                                {i < 3 && (
                                    <div className={`w-12 h-0.5 rounded-full transition-colors ${
                                        i < step ? "bg-primary" : "bg-muted"
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="p-6 pt-4">
                    <AnimatePresence mode="wait" custom={step}>

                        {/* ═══ STEP 1: Name & Template ═══════════════════ */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                custom={1}
                                variants={slideVariants}
                                initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.25 }}
                                className="space-y-5"
                            >
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <Rocket className="w-5 h-5 text-primary" />
                                        Create a Project
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Name your project and pick a starting template.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="pname">Project Name <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="pname"
                                            placeholder="e.g. Website Redesign 2026"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="text-base h-11"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Template</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {TEMPLATES.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => handleTemplateSelect(t.id)}
                                                    className={`relative p-3.5 rounded-xl border-2 text-left transition-all hover:shadow-md group ${
                                                        selectedTemplate === t.id
                                                            ? `${t.border} bg-gradient-to-br ${t.color} shadow-sm`
                                                            : "border-border/60 hover:border-border bg-card"
                                                    }`}
                                                >
                                                    {selectedTemplate === t.id && (
                                                        <div className="absolute top-2 right-2">
                                                            <CheckCircle2 className="w-4 h-4 text-primary" />
                                                        </div>
                                                    )}
                                                    <div className={`mb-2 ${selectedTemplate === t.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}>
                                                        {t.icon}
                                                    </div>
                                                    <p className="font-semibold text-sm">{t.title}</p>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button onClick={() => setStep(2)} disabled={name.length < 2} className="gap-2">
                                        Next <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* ═══ STEP 2: Features & Details ════════════════ */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                custom={2}
                                variants={slideVariants}
                                initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.25 }}
                                className="space-y-5"
                            >
                                <div>
                                    <h2 className="text-xl font-bold">Configure Features</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Toggle the tools you need. You can change these later.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    {FEATURE_OPTIONS.map(f => {
                                        const isOn = features[f.key];
                                        return (
                                            <button
                                                key={f.key}
                                                onClick={() => toggleFeature(f.key)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                                    isOn
                                                        ? "border-primary/30 bg-primary/5"
                                                        : "border-border/50 bg-card hover:border-border hover:bg-muted/30"
                                                }`}
                                            >
                                                <div className={`p-1.5 rounded-md transition-colors ${
                                                    isOn ? `bg-primary/10 ${f.color}` : "bg-muted text-muted-foreground"
                                                }`}>
                                                    {f.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold">{f.label}</p>
                                                    <p className="text-[11px] text-muted-foreground">{f.desc}</p>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                                    isOn ? "bg-primary border-primary" : "border-muted-foreground/30"
                                                }`}>
                                                    {isOn && <Check className="w-3 h-3 text-primary-foreground" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="pdesc">Goal / Description</Label>
                                        <Textarea
                                            id="pdesc"
                                            placeholder="What's the objective of this project?"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="resize-none h-20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pdate" className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" /> Target Date
                                        </Label>
                                        <Input
                                            id="pdate"
                                            type="date"
                                            value={targetDate}
                                            onChange={(e) => setTargetDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between pt-2">
                                    <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </Button>
                                    <Button onClick={() => setStep(3)} className="gap-2">
                                        Next <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* ═══ STEP 3: Team & Confirm ════════════════════ */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                custom={3}
                                variants={slideVariants}
                                initial="enter" animate="center" exit="exit"
                                transition={{ duration: 0.25 }}
                                className="space-y-5"
                            >
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <Users className="w-5 h-5 text-primary" />
                                        Invite & Launch
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Add teammates and review your setup before creating.
                                    </p>
                                </div>

                                {/* Team Selection */}
                                {workspaceMembers.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>Add Team Members</Label>
                                        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                                            {workspaceMembers.map(member => (
                                                <button
                                                    key={member.id}
                                                    onClick={() => toggleMember(member.id)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all border ${
                                                        selectedMembers.has(member.id)
                                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                            : "bg-card hover:bg-muted border-border/60"
                                                    }`}
                                                >
                                                    <UserAvatar user={member} className="w-5 h-5" showStatus={false} />
                                                    <span className="truncate max-w-[100px]">{member.name || "User"}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Review Summary */}
                                <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Summary</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Project</span>
                                            <span className="font-semibold truncate max-w-[200px]">{name}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Template</span>
                                            <span className="font-medium capitalize">{selectedTemplate}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Features</span>
                                            <span className="font-medium">{enabledFeatureCount} tool{enabledFeatureCount !== 1 ? "s" : ""}</span>
                                        </div>
                                        {targetDate && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Target</span>
                                                <span className="font-medium">{new Date(targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                            </div>
                                        )}
                                        {selectedMembers.size > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Team</span>
                                                <span className="font-medium">{selectedMembers.size} member{selectedMembers.size !== 1 ? "s" : ""}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {FEATURE_OPTIONS.filter(f => features[f.key]).map(f => (
                                            <span
                                                key={f.key}
                                                className="inline-flex items-center gap-1 text-[11px] bg-background border rounded-md px-2 py-1 text-muted-foreground"
                                            >
                                                {f.icon} {f.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-between pt-2">
                                    <Button variant="ghost" onClick={() => setStep(2)} className="gap-2">
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </Button>
                                    <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
                                        <Sparkles className="w-4 h-4" /> Create Project
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* ═══ STEP 4: Creation Progress + Success ═══════ */}
                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className="py-4 space-y-6"
                            >
                                {/* Header */}
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="relative w-16 h-16">
                                        <div className={`absolute inset-0 rounded-full ${allDone ? "bg-emerald-500/10" : "bg-primary/10"}`} />
                                        {allDone ? (
                                            <motion.div
                                                className="absolute inset-0 flex items-center justify-center"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                            >
                                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                            </motion.div>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">
                                            {allDone ? (hasErrors ? "Partially Created" : "Project Ready!") : "Setting things up..."}
                                        </h2>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {allDone
                                                ? <><span className="font-semibold text-foreground">"{name}"</span> is ready for your team.</>
                                                : "Creating your project resources..."
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* Progress List */}
                                <div className="bg-muted/20 rounded-xl p-4 border space-y-0.5">
                                    {features.epics && <ProgressItem status={progress.epic} label="Epic Container" icon={<Layers className="w-3.5 h-3.5" />} />}
                                    {features.kanban && <ProgressItem status={progress.board} label="Kanban Board" icon={<LayoutGrid className="w-3.5 h-3.5" />} />}
                                    {features.whiteboard && <ProgressItem status={progress.whiteboard} label="Whiteboard" icon={<PenTool className="w-3.5 h-3.5" />} />}
                                    {features.chat && <ProgressItem status={progress.channel} label="Chat Channel" icon={<MessageSquare className="w-3.5 h-3.5" />} />}
                                    {features.document && <ProgressItem status={progress.document} label="Project Brief" icon={<FileText className="w-3.5 h-3.5" />} />}
                                </div>

                                {/* Success Actions */}
                                {allDone && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="space-y-3"
                                    >
                                        <div className="grid grid-cols-1 gap-2">
                                            {createdAssets.boardId && (
                                                <Button variant="outline" className="w-full justify-start h-11" asChild>
                                                    <Link href={`/workspace/${workspaceSlug}/boards`} onClick={handleClose}>
                                                        <LayoutGrid className="w-4 h-4 mr-3 text-primary" />
                                                        Open Board
                                                    </Link>
                                                </Button>
                                            )}
                                            {createdAssets.channelId && (
                                                <Button variant="outline" className="w-full justify-start h-11" asChild>
                                                    <Link href={`/workspace/${workspaceSlug}/chat/${createdAssets.channelId}`} onClick={handleClose}>
                                                        <MessageSquare className="w-4 h-4 mr-3 text-emerald-500" />
                                                        Open Channel
                                                    </Link>
                                                </Button>
                                            )}
                                            {createdAssets.whiteboardId && (
                                                <Button variant="outline" className="w-full justify-start h-11" asChild>
                                                    <Link href={`/workspace/${workspaceSlug}/whiteboard/${createdAssets.whiteboardId}`} onClick={handleClose}>
                                                        <PenTool className="w-4 h-4 mr-3 text-orange-500" />
                                                        Open Whiteboard
                                                    </Link>
                                                </Button>
                                            )}
                                            {createdAssets.documentId && (
                                                <Button variant="outline" className="w-full justify-start h-11" asChild>
                                                    <Link href={`/workspace/${workspaceSlug}/editor/${createdAssets.documentId}`} onClick={handleClose}>
                                                        <FileText className="w-4 h-4 mr-3 text-blue-500" />
                                                        Open Project Brief
                                                    </Link>
                                                </Button>
                                            )}
                                            <Button variant="secondary" className="w-full justify-start h-11" asChild>
                                                <Link href={`/workspace/${workspaceSlug}/members`} onClick={handleClose}>
                                                    <Plus className="w-4 h-4 mr-3" />
                                                    Invite Teammates
                                                </Link>
                                            </Button>
                                        </div>
                                        <Button className="w-full" onClick={handleClose}>
                                            Go to Dashboard
                                        </Button>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
