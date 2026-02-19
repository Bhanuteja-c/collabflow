// src/components/kanban/CardDetailModal.tsx
// Polished card detail view with progress ring, section dividers, and consistent design
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
    MessageSquare,
    CheckSquare,
    Plus,
    Send,
    Trash2,
    X,
    Loader2,
    AlertCircle,
    Tag,
    Clock,
    CircleCheck,
} from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";

interface User {
    id: string;
    name: string | null;
    image: string | null;
}

interface Comment {
    id: string;
    content: string;
    authorId: string;
    author: User;
    createdAt: string;
}

interface ChecklistItem {
    id: string;
    content: string;
    completed: boolean;
    order: number;
}

interface Card {
    id: string;
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
    startDate?: string;
    labels?: string[];
    status?: string;
    assigneeId?: string;
    assignee?: User;
    comments?: Comment[];
    checklist?: ChecklistItem[];
    columnId?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface CardDetailModalProps {
    card: Card | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (cardId: string, updates: Partial<Card>) => void;
    workspaceMembers: User[];
    currentUserId: string;
}

const priorityConfig = {
    high: { color: "bg-red-500", textColor: "text-red-600 dark:text-red-400", label: "High", icon: "🔴" },
    medium: { color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400", label: "Medium", icon: "🟡" },
    low: { color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", label: "Low", icon: "🟢" },
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

// SVG Progress Ring component
function ProgressRing({ progress, size = 28, strokeWidth = 3 }: { progress: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    const isComplete = progress === 100;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/40"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={`transition-all duration-500 ${isComplete ? "text-emerald-500" : "text-primary"}`}
            />
        </svg>
    );
}

export default function CardDetailModal({
    card,
    isOpen,
    onClose,
    onUpdate,
    workspaceMembers,
    currentUserId,
}: CardDetailModalProps) {
    const [title, setTitle] = useState(card?.title || "");
    const [description, setDescription] = useState(card?.description || "");
    const [priority, setPriority] = useState<"low" | "medium" | "high">(card?.priority || "medium");
    const [dueDate, setDueDate] = useState(card?.dueDate || "");
    const [startDate, setStartDate] = useState(card?.startDate || "");
    const [labels, setLabels] = useState<string[]>(card?.labels || []);
    const [status, setStatus] = useState(card?.status || "active");
    const [assigneeId, setAssigneeId] = useState(card?.assigneeId || "");
    const [comments, setComments] = useState<Comment[]>(card?.comments || []);
    const [checklist, setChecklist] = useState<ChecklistItem[]>(card?.checklist || []);
    const [newComment, setNewComment] = useState("");
    const [newChecklistItem, setNewChecklistItem] = useState("");
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const commentsEndRef = useRef<HTMLDivElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Reset state when card changes
    useEffect(() => {
        if (card) {
            setTitle(card.title);
            setDescription(card.description || "");
            setPriority(card.priority || "medium");
            setDueDate(card.dueDate ? card.dueDate.split("T")[0] : "");
            setStartDate(card.startDate ? card.startDate.split("T")[0] : "");
            setLabels(card.labels || []);
            setStatus(card.status || "active");
            setAssigneeId(card.assigneeId || "");
            fetchCardDetails();
        }
    }, [card?.id]);

    const fetchCardDetails = async () => {
        if (!card) return;
        setIsLoadingComments(true);
        try {
            const res = await fetch(`/api/cards/${card.id}/details`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments || []);
                setChecklist(data.checklist || []);
            }
        } catch (error) {
            console.error("Failed to fetch card details:", error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    // Auto-save on field changes (debounced)
    const saveField = (field: string, value: any) => {
        if (!card) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            try {
                await fetch(`/api/cards/${card.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ [field]: value }),
                });
                onUpdate(card.id, { [field]: value });
            } catch (error) {
                console.error("Failed to save:", error);
            } finally {
                setIsSaving(false);
            }
        }, 500);
    };

    const handleTitleChange = (value: string) => {
        setTitle(value);
        saveField("title", value);
    };

    const handleDescriptionChange = (value: string) => {
        setDescription(value);
        saveField("description", value);
    };

    const handlePriorityChange = (value: "low" | "medium" | "high") => {
        setPriority(value);
        saveField("priority", value);
    };

    const handleDueDateChange = (value: string) => {
        setDueDate(value);
        saveField("dueDate", value ? new Date(value).toISOString() : null);
    };

    const handleAssigneeChange = (userId: string) => {
        setAssigneeId(userId);
        saveField("assigneeId", userId || null);
    };

    const handleStartDateChange = (value: string) => {
        setStartDate(value);
        saveField("startDate", value ? new Date(value).toISOString() : null);
    };

    const handleLabelToggle = (label: string) => {
        const newLabels = labels.includes(label)
            ? labels.filter(l => l !== label)
            : [...labels, label];
        setLabels(newLabels);
        saveField("labels", newLabels);
    };

    const handleStatusToggle = () => {
        const newStatus = status === "active" ? "completed" : "active";
        setStatus(newStatus);
        saveField("status", newStatus);
    };

    // Comments
    const addComment = async () => {
        if (!card || !newComment.trim()) return;

        try {
            const res = await fetch(`/api/cards/${card.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newComment }),
            });

            if (res.ok) {
                const comment = await res.json();
                setComments(prev => [...prev, comment]);
                setNewComment("");
                commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        } catch (error) {
            console.error("Failed to add comment:", error);
        }
    };

    const deleteComment = async (commentId: string) => {
        try {
            await fetch(`/api/cards/${card?.id}/comments/${commentId}`, {
                method: "DELETE",
            });
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (error) {
            console.error("Failed to delete comment:", error);
        }
    };

    // Checklist
    const addChecklistItem = async () => {
        if (!card || !newChecklistItem.trim()) return;

        try {
            const res = await fetch(`/api/cards/${card.id}/checklist`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newChecklistItem }),
            });

            if (res.ok) {
                const item = await res.json();
                setChecklist(prev => [...prev, item]);
                setNewChecklistItem("");
            }
        } catch (error) {
            console.error("Failed to add checklist item:", error);
        }
    };

    const toggleChecklistItem = async (itemId: string, completed: boolean) => {
        try {
            await fetch(`/api/cards/${card?.id}/checklist/${itemId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed }),
            });
            setChecklist(prev =>
                prev.map(item =>
                    item.id === itemId ? { ...item, completed } : item
                )
            );
        } catch (error) {
            console.error("Failed to toggle checklist item:", error);
        }
    };

    const deleteChecklistItem = async (itemId: string) => {
        try {
            await fetch(`/api/cards/${card?.id}/checklist/${itemId}`, {
                method: "DELETE",
            });
            setChecklist(prev => prev.filter(item => item.id !== itemId));
        } catch (error) {
            console.error("Failed to delete checklist item:", error);
        }
    };

    // Computed values
    const completedItems = checklist.filter(item => item.completed).length;
    const totalItems = checklist.length;
    const checklistProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    const isOverdue = dueDate && isBefore(new Date(dueDate), new Date());
    const isDueSoon = dueDate && !isOverdue && isBefore(new Date(dueDate), addDays(new Date(), 1));

    const selectedAssignee = workspaceMembers.find(m => m.id === assigneeId);

    if (!card) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                {/* Header */}
                <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border/50">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <Input
                                value={title}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                className="text-xl font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0"
                                placeholder="Task title..."
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {isSaving && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Saving
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Metadata pills row */}
                    <div className="flex flex-wrap gap-2 mt-3">
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
                                        onClick={() => handlePriorityChange(p)}
                                        className="gap-2"
                                    >
                                        <span>{priorityConfig[p].icon}</span>
                                        {priorityConfig[p].label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Due Date */}
                        <div className="flex items-center gap-1.5">
                            <div className={`inline-flex items-center rounded-lg border h-8 px-2 text-xs font-medium ${
                                isOverdue
                                    ? "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/5"
                                    : isDueSoon
                                        ? "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/5"
                                        : "border-border"
                            }`}>
                                <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => handleDueDateChange(e.target.value)}
                                    className="border-0 bg-transparent p-0 h-auto text-xs w-[110px] focus-visible:ring-0 shadow-none"
                                />
                            </div>
                            {isOverdue && (
                                <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                                    Overdue
                                </span>
                            )}
                        </div>

                        {/* Start Date */}
                        <div className="inline-flex items-center rounded-lg border border-border h-8 px-2 text-xs">
                            <Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => handleStartDateChange(e.target.value)}
                                className="border-0 bg-transparent p-0 h-auto text-xs w-[110px] focus-visible:ring-0 shadow-none"
                                title="Start date"
                            />
                        </div>

                        {/* Assignee */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 rounded-lg text-xs">
                                    {selectedAssignee ? (
                                        <>
                                            <Avatar className="w-4 h-4">
                                                <AvatarImage src={selectedAssignee.image || undefined} />
                                                <AvatarFallback className="text-[8px]">
                                                    {selectedAssignee.name?.[0] || "?"}
                                                </AvatarFallback>
                                            </Avatar>
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
                                <DropdownMenuItem onClick={() => handleAssigneeChange("")}>
                                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                                    Unassigned
                                </DropdownMenuItem>
                                {workspaceMembers.map((member) => (
                                    <DropdownMenuItem
                                        key={member.id}
                                        onClick={() => handleAssigneeChange(member.id)}
                                        className="gap-2"
                                    >
                                        <Avatar className="w-5 h-5">
                                            <AvatarImage src={member.image || undefined} />
                                            <AvatarFallback className="text-xs">
                                                {member.name?.[0] || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        {member.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Status toggle */}
                        <Button
                            variant={status === "completed" ? "default" : "outline"}
                            size="sm"
                            onClick={handleStatusToggle}
                            className={`gap-1.5 h-8 rounded-lg text-xs ${status === "completed" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                        >
                            <CircleCheck className="w-3.5 h-3.5" />
                            {status === "completed" ? "Completed" : "Mark Done"}
                        </Button>
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Labels */}
                    <div className="px-6 py-4 border-b border-border/30">
                        <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2.5">
                            <Tag className="w-3.5 h-3.5" />
                            Labels
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_LABELS.map((label) => (
                                <button
                                    key={label}
                                    onClick={() => handleLabelToggle(label)}
                                    className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
                                        labels.includes(label)
                                            ? `${labelColorMap[label] || "bg-violet-500/15 text-violet-700"} border-current/20 ring-1 ring-current/20`
                                            : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="px-6 py-4 border-b border-border/30">
                        <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-2.5">Description</h4>
                        <Textarea
                            value={description}
                            onChange={(e) => handleDescriptionChange(e.target.value)}
                            placeholder="Add a more detailed description..."
                            className="min-h-[80px] resize-none text-sm bg-muted/20 border-border/50 rounded-xl"
                        />
                    </div>

                    {/* Checklist */}
                    <div className="px-6 py-4 border-b border-border/30">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <CheckSquare className="w-3.5 h-3.5" />
                                Checklist
                                {totalItems > 0 && (
                                    <span className="normal-case tracking-normal text-[11px]">
                                        {completedItems}/{totalItems}
                                    </span>
                                )}
                            </h4>
                            {totalItems > 0 && (
                                <ProgressRing progress={checklistProgress} />
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <AnimatePresence>
                                {checklist.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center gap-2.5 group py-1 px-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors"
                                    >
                                        <Checkbox
                                            checked={item.completed}
                                            onCheckedChange={(checked) =>
                                                toggleChecklistItem(item.id, checked as boolean)
                                            }
                                        />
                                        <span className={`flex-1 text-sm ${item.completed ? "line-through text-muted-foreground" : ""
                                            }`}>
                                            {item.content}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => deleteChecklistItem(item.id)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            <div className="flex gap-2 pt-1">
                                <Input
                                    value={newChecklistItem}
                                    onChange={(e) => setNewChecklistItem(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                                    placeholder="Add an item..."
                                    className="h-8 text-sm rounded-lg"
                                />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={addChecklistItem}
                                    disabled={!newChecklistItem.trim()}
                                    className="rounded-lg h-8 w-8 p-0"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Comments */}
                    <div className="px-6 py-4">
                        <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Comments
                            {comments.length > 0 && (
                                <span className="normal-case tracking-normal text-[11px]">({comments.length})</span>
                            )}
                        </h4>

                        {isLoadingComments ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-48 overflow-y-auto kanban-scroll mb-3">
                                <AnimatePresence>
                                    {comments.map((comment) => (
                                        <motion.div
                                            key={comment.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex gap-3 group p-2.5 -mx-2 rounded-xl hover:bg-muted/20 transition-colors"
                                        >
                                            <Avatar className="w-7 h-7 flex-shrink-0 ring-1 ring-border/30">
                                                <AvatarImage src={comment.author.image || undefined} />
                                                <AvatarFallback className="text-[10px] font-semibold">
                                                    {comment.author.name?.[0] || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">
                                                        {comment.author.name}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                                                    </span>
                                                    {comment.authorId === currentUserId && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                                            onClick={() => deleteComment(comment.id)}
                                                        >
                                                            <Trash2 className="w-3 h-3 text-destructive" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                                                    {comment.content}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                <div ref={commentsEndRef} />
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Input
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addComment()}
                                placeholder="Write a comment..."
                                className="flex-1 rounded-lg text-sm"
                            />
                            <Button
                                onClick={addComment}
                                disabled={!newComment.trim()}
                                size="sm"
                                className="rounded-lg h-9 px-3"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
