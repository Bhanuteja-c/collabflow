// src/components/kanban/CardDetailModal.tsx
// Full card detail view with description, assignee, due date, priority, comments, and checklist
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
import { Progress } from "@/components/ui/progress";
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
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
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Saving...
                                </span>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    {/* Metadata Row */}
                    <div className="flex flex-wrap gap-3">
                        {/* Priority */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Flag className={`w-4 h-4 ${priorityConfig[priority].textColor}`} />
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
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => handleDueDateChange(e.target.value)}
                                className={`w-auto h-9 ${isOverdue
                                    ? "border-red-500 text-red-600"
                                    : isDueSoon
                                        ? "border-amber-500 text-amber-600"
                                        : ""
                                    }`}
                            />
                            {isOverdue && (
                                <Badge variant="destructive" className="text-xs">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Overdue
                                </Badge>
                            )}
                        </div>

                        {/* Assignee */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    {selectedAssignee ? (
                                        <>
                                            <Avatar className="w-5 h-5">
                                                <AvatarImage src={selectedAssignee.image || undefined} />
                                                <AvatarFallback className="text-xs">
                                                    {selectedAssignee.name?.[0] || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="max-w-24 truncate">{selectedAssignee.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <User className="w-4 h-4" />
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
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">Description</h4>
                        <Textarea
                            value={description}
                            onChange={(e) => handleDescriptionChange(e.target.value)}
                            placeholder="Add a more detailed description..."
                            className="min-h-[100px] resize-none"
                        />
                    </div>

                    {/* Checklist */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                                <CheckSquare className="w-4 h-4" />
                                Checklist
                                {totalItems > 0 && (
                                    <span className="text-muted-foreground">
                                        ({completedItems}/{totalItems})
                                    </span>
                                )}
                            </h4>
                            {totalItems > 0 && (
                                <Progress value={checklistProgress} className="w-24 h-2" />
                            )}
                        </div>

                        <div className="space-y-2">
                            <AnimatePresence>
                                {checklist.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center gap-2 group"
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
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                            onClick={() => deleteChecklistItem(item.id)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            <div className="flex gap-2">
                                <Input
                                    value={newChecklistItem}
                                    onChange={(e) => setNewChecklistItem(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                                    placeholder="Add an item..."
                                    className="h-8 text-sm"
                                />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={addChecklistItem}
                                    disabled={!newChecklistItem.trim()}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Comments */}
                    <div className="space-y-3">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Comments
                            {comments.length > 0 && (
                                <span className="text-muted-foreground">({comments.length})</span>
                            )}
                        </h4>

                        {isLoadingComments ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-48 overflow-y-auto">
                                <AnimatePresence>
                                    {comments.map((comment) => (
                                        <motion.div
                                            key={comment.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex gap-3 group"
                                        >
                                            <Avatar className="w-7 h-7 flex-shrink-0">
                                                <AvatarImage src={comment.author.image || undefined} />
                                                <AvatarFallback className="text-xs">
                                                    {comment.author.name?.[0] || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">
                                                        {comment.author.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                                                    </span>
                                                    {comment.authorId === currentUserId && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 opacity-0 group-hover:opacity-100"
                                                            onClick={() => deleteComment(comment.id)}
                                                        >
                                                            <Trash2 className="w-3 h-3 text-destructive" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-0.5">
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
                                className="flex-1"
                            />
                            <Button onClick={addComment} disabled={!newComment.trim()}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
