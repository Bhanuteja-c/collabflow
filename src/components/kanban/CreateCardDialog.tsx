// src/components/kanban/CreateCardDialog.tsx
// Rich card creation dialog with priority, assignee, due date, and labels
"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Calendar,
    Flag,
    User,
    Tag,
    Loader2,
    Target,
    AlertCircle,
} from "lucide-react";

interface UserType {
    id: string;
    name: string | null;
    image: string | null;
}

interface Epic {
    id: string;
    title: string;
    color: string;
}

interface CreateCardData {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    assigneeId?: string;
    dueDate?: string;
    labels?: string[];
    epicId?: string;
}

interface CreateCardDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateCard: (columnId: string, title: string, extra?: Partial<CreateCardData>) => void;
    columnId: string;
    columnTitle: string;
    workspaceMembers: UserType[];
    epics: Epic[];
}

const priorityConfig = {
    high: { textColor: "text-red-600 dark:text-red-400", label: "High", icon: "🔴" },
    medium: { textColor: "text-amber-600 dark:text-amber-400", label: "Medium", icon: "🟡" },
    low: { textColor: "text-emerald-600 dark:text-emerald-400", label: "Low", icon: "🟢" },
};

const PRESET_LABELS = ["Bug", "Feature", "Enhancement", "Documentation", "Design", "Urgent", "Backend", "Frontend"];

const labelColorMap: Record<string, string> = {
    Bug: "bg-red-500/15 text-red-700 dark:text-red-300",
    Feature: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    Enhancement: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    Documentation: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    Design: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
    Urgent: "bg-red-600/15 text-red-800 dark:text-red-200",
    Backend: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    Frontend: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
};

export default function CreateCardDialog({
    isOpen,
    onClose,
    onCreateCard,
    columnId,
    columnTitle,
    workspaceMembers,
    epics,
}: CreateCardDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
    const [assigneeId, setAssigneeId] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [epicId, setEpicId] = useState("");
    const [labels, setLabels] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedAssignee = workspaceMembers.find(m => m.id === assigneeId);

    const handleLabelToggle = (label: string) => {
        setLabels(prev =>
            prev.includes(label)
                ? prev.filter(l => l !== label)
                : [...prev, label]
        );
    };

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setPriority("medium");
        setAssigneeId("");
        setEpicId("");
        setDueDate("");
        setLabels([]);
    };

    const handleSubmit = async () => {
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            await onCreateCard(columnId, title.trim(), {
                description: description.trim() || undefined,
                priority,
                assigneeId: assigneeId || undefined,
                epicId: epicId || undefined,
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
                labels: labels.length > 0 ? labels : undefined,
            });
            resetForm();
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
                    <DialogTitle className="text-lg font-semibold tracking-tight">
                        Create Card
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        Adding to <span className="font-medium text-foreground">{columnTitle}</span>
                    </p>
                </DialogHeader>

                {/* Form */}
                <div className="px-6 py-4 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
                            placeholder="What needs to be done?"
                            autoFocus
                            className="text-sm rounded-lg"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                            Description
                        </label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add more details..."
                            className="min-h-[72px] resize-none text-sm bg-muted/20 border-border/50 rounded-xl"
                        />
                    </div>

                    {/* Priority + Assignee + Due Date row */}
                    <div className="flex flex-wrap gap-2">
                        {/* Priority */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 rounded-lg text-xs">
                                    <Flag className={`w-3.5 h-3.5 ${priorityConfig[priority].textColor}`} />
                                    {priorityConfig[priority].label}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {(["high", "medium", "low"] as const).map((p) => (
                                    <DropdownMenuItem
                                        key={p}
                                        onClick={() => setPriority(p)}
                                        className="gap-2"
                                    >
                                        <span>{priorityConfig[p].icon}</span>
                                        {priorityConfig[p].label}
                                        {priority === p && <span className="ml-auto">✓</span>}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Assignee */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 rounded-lg text-xs">
                                    {selectedAssignee ? (
                                        <>
                                            <UserAvatar user={selectedAssignee} className="w-4 h-4" showStatus={false} />
                                            <span className="max-w-24 truncate">{selectedAssignee.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <User className="w-3.5 h-3.5" />
                                            Assign
                                        </>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setAssigneeId("")}>
                                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                                    Unassigned
                                </DropdownMenuItem>
                                {workspaceMembers.map((member) => (
                                    <DropdownMenuItem
                                        key={member.id}
                                        onClick={() => setAssigneeId(member.id)}
                                        className="gap-2"
                                    >
                                        <UserAvatar user={member} className="w-5 h-5" showStatus={false} />
                                        {member.name}
                                        {assigneeId === member.id && <span className="ml-auto">✓</span>}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Due Date */}
                        <div className="inline-flex items-center rounded-lg border border-border h-8 px-2 text-xs">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="border-0 bg-transparent p-0 h-auto text-xs w-[110px] focus-visible:ring-0 shadow-none"
                            />
                        </div>
                    </div>

                    {/* Epic — Always visible and prominent */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-primary" />
                            Epic
                            <span className="text-[10px] text-muted-foreground/70 font-normal normal-case ml-0.5">(recommended)</span>
                        </label>
                        {epics && epics.length > 0 ? (
                            <div className="space-y-1.5">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={`w-full justify-start gap-2 h-9 rounded-lg text-xs ${
                                                epicId
                                                    ? "border-primary/30 bg-primary/5"
                                                    : "border-dashed border-border/80"
                                            }`}
                                        >
                                            {epicId ? (
                                                <>
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full"
                                                        style={{ backgroundColor: epics.find(e => e.id === epicId)?.color }}
                                                    />
                                                    <span className="truncate">
                                                        {epics.find(e => e.id === epicId)?.title}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-2.5 h-2.5 rounded-full border border-dashed border-muted-foreground/50" />
                                                    <span className="text-muted-foreground">Select an epic...</span>
                                                </>
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                        <DropdownMenuItem onClick={() => setEpicId("")}>
                                            <div className="w-2.5 h-2.5 rounded-full border border-current mr-2" />
                                            None
                                        </DropdownMenuItem>
                                        {epics.map((epic) => (
                                            <DropdownMenuItem
                                                key={epic.id}
                                                onClick={() => setEpicId(epic.id)}
                                                className="gap-2"
                                            >
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{ backgroundColor: epic.color }}
                                                />
                                                {epic.title}
                                                {epicId === epic.id && <span className="ml-auto">✓</span>}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                {!epicId && (
                                    <p className="text-[11px] text-amber-500/80 flex items-center gap-1 pl-0.5">
                                        <AlertCircle className="w-3 h-3" />
                                        Linking to an epic helps track progress
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
                                <Target className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-muted-foreground">No epics yet — create one from the Epics page to organize tasks.</span>
                            </div>
                        )}
                    </div>

                    {/* Labels */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5" />
                            Labels
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_LABELS.map((label) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleLabelToggle(label)}
                                    className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${labels.includes(label)
                                            ? `${labelColorMap[label] || "bg-violet-500/15 text-violet-700"} border-current/20 ring-1 ring-current/20`
                                            : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60"
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border/50 flex items-center justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClose}
                        className="rounded-lg text-xs"
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={!title.trim() || isSubmitting}
                        className="rounded-lg text-xs btn-glow"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : null}
                        Create Card
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
