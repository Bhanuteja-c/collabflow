// src/components/kanban/KanbanCard.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    assignee?: User;
    assigneeId?: string;
    commentsCount?: number;
    checklistCompleted?: number;
    checklistTotal?: number;
    labels?: string[];
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
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-pink-500",
    "bg-cyan-500",
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
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({
        id: card.id,
        data: {
            type: "card",
            card,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const dragging = isDragging || isSortableDragging;

    // Computed date status
    const isOverdue = card.dueDate && isBefore(new Date(card.dueDate), new Date());
    const isDueSoon = card.dueDate && !isOverdue && isBefore(new Date(card.dueDate), addDays(new Date(), 1));

    // Checklist progress
    const hasChecklist = (card.checklistTotal ?? 0) > 0;
    const checklistProgress = hasChecklist
        ? ((card.checklistCompleted ?? 0) / (card.checklistTotal ?? 1)) * 100
        : 0;

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editTitle.trim() && editTitle !== card.title) {
            onUpdate?.(card.id, editTitle.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditTitle(card.title);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if (!isEditing && onOpenDetail) {
            e.stopPropagation();
            onOpenDetail(card);
        }
    };

    const formatDueDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), "MMM d");
        } catch {
            return dateStr;
        }
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...(!isEditing ? { ...attributes, ...listeners } : {})}
            onClick={handleCardClick}
            className={`
                bg-card border shadow-sm
                transition-all duration-200
                ${dragging
                    ? "opacity-90 shadow-xl ring-2 ring-accent scale-[1.02] rotate-1 z-50"
                    : "hover:shadow-md hover:border-accent/30 cursor-pointer active:cursor-grabbing"
                }
                ${isEditing ? "ring-2 ring-accent" : ""}
                group
            `}
        >
            <CardContent className="p-3 space-y-2">
                {/* Labels */}
                {card.labels && card.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {card.labels.map((label, i) => (
                            <span
                                key={i}
                                className={`${labelColors[i % labelColors.length]} h-1.5 w-8 rounded-full`}
                            />
                        ))}
                    </div>
                )}

                <div className="flex items-start gap-2">
                    {/* Drag indicator */}
                    <div className="mt-0.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0">
                        <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <Input
                                ref={inputRef}
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleSave}
                                className="h-7 text-sm"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <p className="font-medium text-sm text-foreground leading-snug">
                                {card.title}
                            </p>
                        )}
                        {card.description && !isEditing && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {card.description}
                            </p>
                        )}
                    </div>

                    {/* Priority indicator */}
                    {card.priority && !isEditing && (
                        <Flag className={`w-3.5 h-3.5 flex-shrink-0 ${priorityConfig[card.priority].textColor}`} />
                    )}

                    {/* Actions */}
                    {!isEditing && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }}
                            >
                                <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete?.(card.id);
                                }}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer with metadata */}
                {(card.dueDate || hasChecklist || card.commentsCount || card.assignee) && !isEditing && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {/* Due date with status indicator */}
                            {card.dueDate && (
                                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${isOverdue
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : isDueSoon
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                        : ""
                                    }`}>
                                    {isOverdue && <AlertCircle className="w-3 h-3" />}
                                    <Calendar className="w-3 h-3" />
                                    {formatDueDate(card.dueDate)}
                                </span>
                            )}

                            {/* Checklist progress */}
                            {hasChecklist && (
                                <span className="flex items-center gap-1.5">
                                    <CheckSquare className="w-3 h-3" />
                                    <span>{card.checklistCompleted}/{card.checklistTotal}</span>
                                    <Progress value={checklistProgress} className="w-10 h-1.5" />
                                </span>
                            )}

                            {/* Comments count */}
                            {card.commentsCount && card.commentsCount > 0 && (
                                <span className="flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" />
                                    {card.commentsCount}
                                </span>
                            )}
                        </div>

                        {/* Assignee avatar */}
                        {card.assignee && (
                            <Avatar className="w-5 h-5">
                                <AvatarImage src={card.assignee.image || undefined} />
                                <AvatarFallback className="text-[10px]">
                                    {card.assignee.name?.[0] || "?"}
                                </AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
