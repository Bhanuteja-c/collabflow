// src/components/kanban/KanbanCard.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Pencil, Trash2, Check, X } from "lucide-react";

interface CardProps {
    card: {
        id: string;
        title: string;
        description?: string;
    };
    isDragging?: boolean;
    onUpdate?: (id: string, title: string) => void;
    onDelete?: (id: string) => void;
}

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
            className={`
        bg-card shadow-sm border
        hover:shadow-md hover:border-primary/20
        transition-all cursor-pointer group
        ${dragging ? "opacity-80 shadow-lg ring-2 ring-primary rotate-2" : ""}
      `}
        >
            <CardContent className="p-3">
                <div className="flex items-start gap-2">
                    <button
                        {...attributes}
                        {...listeners}
                        className="mt-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <div className="flex gap-1">
                                <Input
                                    ref={inputRef}
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={handleSave}
                                    className="h-7 text-sm"
                                />
                            </div>
                        ) : (
                            <p
                                className="font-medium text-sm text-foreground cursor-text"
                                onClick={() => setIsEditing(true)}
                            >
                                {card.title}
                            </p>
                        )}
                        {card.description && !isEditing && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {card.description}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setIsEditing(true)}
                            >
                                <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => onDelete?.(card.id)}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
