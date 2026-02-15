// src/components/kanban/KanbanCard.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Pencil,
    Trash2,
    GripVertical,
    Calendar,
    MessageSquare,
    Flag,
    CheckSquare,
    AlertCircle
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
    low: { color: "bg-emerald-500", textColor: "text-emerald-500 dark:text-emerald-400", label: "Low" },
    medium: { color: "bg-amber-500", textColor: "text-amber-500 dark:text-amber-400", label: "Medium" },
    high: { color: "bg-red-500", textColor: "text-red-500 dark:text-red-400", label: "High" },
};

const labelColors = [
    "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20",
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
    "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/20",
    "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
];

export default function KanbanCard({
    card,
    isDragging,
    onUpdate,
    onDelete,
    onOpenDetail
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

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group ${isDragging || isSortableDragging ? "opacity-50" : ""}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <Card
                className={`
                    shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer
                    border hover:border-accent/50
                    ${isOverdue ? "border-red-500/40 ring-1 ring-red-500/20" : ""}
                    ${isDragging ? "shadow-lg rotate-2 scale-105" : ""}
                    ${card.status === "completed" ? "opacity-60" : ""}
                `}
                onClick={handleCardClick}
            >
                <CardContent className="p-3 space-y-2">
                    {/* Labels */}
                    {card.labels && card.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {card.labels.map((label, i) => (
                                <span
                                    key={i}
                                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${labelColors[i % labelColors.length]}`}
                                >
                                    {label}
                                </span>
                            ))}
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
                                    className="mt-1 cursor-grab active:cursor-grabbing flex-shrink-0 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
                                    {...attributes}
                                    {...listeners}
                                >
                                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <span className={`text-sm leading-snug ${card.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
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
                                    className="h-6 w-6"
                                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                                >
                                    <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500 hover:text-red-600"
                                    onClick={(e) => { e.stopPropagation(); onDelete?.(card.id); }}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Priority */}
                        {priority && (
                            <div className="flex items-center gap-1">
                                <Flag className={`w-3 h-3 ${priority.textColor}`} />
                                <span className={`text-[10px] font-medium ${priority.textColor}`}>
                                    {priority.label}
                                </span>
                            </div>
                        )}

                        {/* Due date */}
                        {card.dueDate && (
                            <div className={`flex items-center gap-1 text-[10px] font-medium rounded-full px-1.5 py-0.5 ${
                                isOverdue
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : isDueSoon
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                        : "text-muted-foreground"
                            }`}>
                                {isOverdue && <AlertCircle className="w-3 h-3" />}
                                <Calendar className="w-3 h-3" />
                                {formatDueDate(card.dueDate)}
                            </div>
                        )}

                        {/* Checklist progress */}
                        {card.checklistTotal != null && card.checklistTotal > 0 && (
                            <div className={`flex items-center gap-1 text-[10px] font-medium ${
                                card.checklistCompleted === card.checklistTotal
                                    ? "text-emerald-500"
                                    : "text-muted-foreground"
                            }`}>
                                <CheckSquare className="w-3 h-3" />
                                {card.checklistCompleted}/{card.checklistTotal}
                            </div>
                        )}

                        {/* Comments */}
                        {card.commentsCount != null && card.commentsCount > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <MessageSquare className="w-3 h-3" />
                                {card.commentsCount}
                            </div>
                        )}

                        {/* Spacer + Assignee */}
                        <div className="flex-1" />
                        {card.assignee && (
                            <Avatar className="w-5 h-5" title={card.assignee.name || "Assigned"}>
                                <AvatarImage src={card.assignee.image || undefined} />
                                <AvatarFallback className="text-[8px]">
                                    {card.assignee.name?.[0] || "?"}
                                </AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
