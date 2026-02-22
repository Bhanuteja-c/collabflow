// src/components/kanban/KanbanCard.tsx
// Premium Kanban card with glassmorphism, priority strip, progress bar, and hover animations
"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Pencil,
    Trash2,
    GripVertical,
    Calendar,
    MessageSquare,
    CheckSquare,
    AlertCircle,
} from "lucide-react";
import { format, isBefore, addDays } from "date-fns";

interface User {
    id: string;
    name: string | null;
    image: string | null;
}

interface CardData {
    id: string;
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
    startDate?: string;
    labels?: string[];
    status?: string;
    assignee?: User;
    assigneeId?: string;
    commentsCount?: number;
    checklistCompleted?: number;
    checklistTotal?: number;
    order?: number;
}

interface CardProps {
    card: CardData;
    isDragging?: boolean;
    onUpdate?: (id: string, title: string) => void;
    onDelete?: (id: string) => void;
    onOpenDetail?: (card: CardData) => void;
}

const priorityConfig = {
    low: { color: "bg-emerald-500", strip: "from-emerald-400 to-emerald-600", textColor: "text-emerald-600 dark:text-emerald-400", label: "Low" },
    medium: { color: "bg-amber-500", strip: "from-amber-400 to-amber-500", textColor: "text-amber-600 dark:text-amber-400", label: "Medium" },
    high: { color: "bg-red-500", strip: "from-red-400 to-rose-600", textColor: "text-red-600 dark:text-red-400", label: "High" },
};

const labelColors = [
    { dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-300" },
    { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
    { dot: "bg-violet-500", text: "text-violet-700 dark:text-violet-300" },
    { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" },
    { dot: "bg-pink-500", text: "text-pink-700 dark:text-pink-300" },
    { dot: "bg-cyan-500", text: "text-cyan-700 dark:text-cyan-300" },
];

export default function KanbanCard({
    card,
    isDragging,
    onUpdate,
    onDelete,
    onOpenDetail,
}: CardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(card.title);
    const [showActions, setShowActions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({ id: card.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editTitle.trim() && editTitle.trim() !== card.title) {
            onUpdate?.(card.id, editTitle.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditTitle(card.title);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") handleCancel();
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if (isEditing) return;
        if ((e.target as HTMLElement).closest("button")) return;
        onOpenDetail?.(card);
    };

    const formatDueDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return format(date, "MMM d");
    };

    const isOverdue = card.dueDate && isBefore(new Date(card.dueDate), new Date());
    const isDueSoon = card.dueDate && !isOverdue && isBefore(new Date(card.dueDate), addDays(new Date(), 2));
    const priority = card.priority && priorityConfig[card.priority];
    const checklistProgress = card.checklistTotal && card.checklistTotal > 0
        ? Math.round((card.checklistCompleted || 0) / card.checklistTotal * 100)
        : null;

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                zIndex: isDragging ? 999 : "auto",
            }}
            className={`group outline-none ${isSortableDragging && !isDragging ? "opacity-30 mix-blend-luminosity" : ""}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div
                className={`
                    relative overflow-hidden rounded-xl
                    bg-card/80 backdrop-blur-sm
                    border border-border/60 
                    shadow-sm
                    transition-all duration-200 ease-out
                    hover:-translate-y-0.5 hover:shadow-md hover:border-border
                    cursor-pointer
                    ${isOverdue ? "ring-1 ring-red-500/30" : ""}
                    ${isDragging ? "shadow-[0_20px_60px_-15px_rgba(37,99,235,0.2)] rotate-3 scale-105 border-primary/40 ring-2 ring-primary/20 brightness-110" : ""}
                    ${card.status === "completed" && !isDragging ? "opacity-60" : ""}
                `}
                onClick={handleCardClick}
            >
                {/* Priority strip — left edge */}
                {priority && (
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${priority.strip}`} />
                )}

                <div className={`p-3 space-y-2.5 ${priority ? "pl-3.5" : ""}`}>
                    {/* Labels */}
                    {card.labels && card.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {card.labels.map((label, i) => {
                                const lc = labelColors[i % labelColors.length];
                                return (
                                    <span
                                        key={i}
                                        className={`inline-flex items-center gap-1 text-[10px] font-medium ${lc.text}`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${lc.dot}`} />
                                        {label}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Title row */}
                    <div className="flex items-start justify-between gap-1">
                        {isEditing ? (
                            <Input
                                ref={inputRef}
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleSave}
                                className="text-sm h-7"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                <div
                                    className="mt-0.5 cursor-grab active:cursor-grabbing flex-shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
                                    {...attributes}
                                    {...listeners}
                                >
                                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <span className={`text-[13px] font-medium leading-snug ${card.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                    {card.title}
                                </span>
                            </div>
                        )}

                        {/* Actions */}
                        {showActions && !isEditing && (
                            <div className="flex gap-0.5 flex-shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-lg opacity-60 hover:opacity-100"
                                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                                >
                                    <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-lg text-red-500 hover:text-red-600 opacity-60 hover:opacity-100"
                                    onClick={(e) => { e.stopPropagation(); onDelete?.(card.id); }}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Due date */}
                        {card.dueDate && (
                            <div className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-md px-1.5 py-0.5 ${
                                isOverdue
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : isDueSoon
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                        : "bg-muted/80 text-muted-foreground"
                            }`}>
                                {isOverdue && <AlertCircle className="w-3 h-3" />}
                                <Calendar className="w-3 h-3" />
                                {formatDueDate(card.dueDate)}
                            </div>
                        )}

                        {/* Checklist count */}
                        {card.checklistTotal != null && card.checklistTotal > 0 && (
                            <div className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                card.checklistCompleted === card.checklistTotal
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground"
                            }`}>
                                <CheckSquare className="w-3 h-3" />
                                {card.checklistCompleted}/{card.checklistTotal}
                            </div>
                        )}

                        {/* Comments */}
                        {card.commentsCount != null && card.commentsCount > 0 && (
                            <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <MessageSquare className="w-3 h-3" />
                                {card.commentsCount}
                            </div>
                        )}

                        {/* Spacer + Assignee */}
                        <div className="flex-1" />
                        {card.assignee && (
                            <Avatar className="w-6 h-6 ring-2 ring-background" title={card.assignee.name || "Assigned"}>
                                <AvatarImage src={card.assignee.image || undefined} />
                                <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary">
                                    {card.assignee.name?.[0] || "?"}
                                </AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                </div>

                {/* Checklist progress bar — bottom edge */}
                {checklistProgress !== null && (
                    <div className="h-[2px] bg-muted/50">
                        <div
                            className={`h-full transition-all duration-500 ${
                                checklistProgress === 100
                                    ? "bg-emerald-500"
                                    : "bg-primary/60"
                            }`}
                            style={{ width: `${checklistProgress}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
