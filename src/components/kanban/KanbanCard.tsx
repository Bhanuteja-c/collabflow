// src/components/kanban/KanbanCard.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, GripVertical, Calendar, MessageSquare, Flag } from "lucide-react";

interface CardProps {
    card: {
        id: string;
        title: string;
        description?: string;
        priority?: "low" | "medium" | "high";
        dueDate?: string;
        comments?: number;
        labels?: string[];
    };
    isDragging?: boolean;
    onUpdate?: ((id: string, title: string) => void) | undefined;
    onDelete?: ((id: string) => void) | undefined;
}

const priorityColors = {
    low: "text-emerald-500",
    medium: "text-amber-500",
    high: "text-red-500",
};

const labelColors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-pink-500",
    "bg-cyan-500",
];

export default function KanbanCard({ card, isDragging, onUpdate, onDelete }: CardProps) {
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

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...(!isEditing ? { ...attributes, ...listeners } : {})}
            className={`
                bg-card border shadow-sm
                transition-all duration-200
                ${dragging
                    ? "opacity-90 shadow-xl ring-2 ring-accent scale-[1.02] rotate-1 z-50"
                    : "hover:shadow-md hover:border-accent/30 cursor-grab active:cursor-grabbing"
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
                        <Flag className={`w-3.5 h-3.5 flex-shrink-0 ${priorityColors[card.priority]}`} />
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
                {(card.dueDate || card.comments) && !isEditing && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        {card.dueDate && (
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {card.dueDate}
                            </span>
                        )}
                        {card.comments && card.comments > 0 && (
                            <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {card.comments}
                            </span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
