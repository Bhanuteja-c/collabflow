// src/components/kanban/KanbanColumn.tsx
"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, X } from "lucide-react";
import KanbanCard from "./KanbanCard";

interface User {
    id: string;
    name: string | null;
    image: string | null;
}

interface CardType {
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

interface ColumnProps {
    column: {
        id: string;
        title: string;
        cards: CardType[];
    };
    onAddCard: (columnId: string, title: string) => void;
    onUpdateCard?: (cardId: string, title: string) => void;
    onDeleteCard?: (cardId: string) => void;
    onOpenDetail?: (card: CardType) => void;
}

// Color coding for columns
const columnColors: Record<string, { bg: string; text: string; dot: string }> = {
    "To Do": { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-500" },
    "In Progress": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
    "Review": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    "Done": { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
};

const defaultColors = { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" };

export default function KanbanColumn({ column, onAddCard, onUpdateCard, onDeleteCard, onOpenDetail }: ColumnProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newCardTitle, setNewCardTitle] = useState("");

    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
    });

    const colors = columnColors[column.title] || defaultColors;

    const handleAddCard = () => {
        if (newCardTitle.trim()) {
            onAddCard(column.id, newCardTitle.trim());
            setNewCardTitle("");
            setIsAdding(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleAddCard();
        } else if (e.key === "Escape") {
            setIsAdding(false);
            setNewCardTitle("");
        }
    };

    return (
        <div className="w-72 sm:w-80 flex-shrink-0">
            <Card
                ref={setNodeRef}
                className={`
                    bg-muted/30 border shadow-sm h-[calc(100vh-11rem)] sm:h-[calc(100vh-12rem)] flex flex-col
                    transition-all duration-200
                    ${isOver ? "ring-2 ring-accent bg-accent/5" : ""}
                `}
            >
                {/* Column Header */}
                <CardHeader className={`p-3 pb-2 rounded-t-lg ${colors.bg}`}>
                    <div className="flex items-center justify-between">
                        <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${colors.text}`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                            <span className="text-foreground">{column.title}</span>
                            <span className="text-xs font-normal bg-background/80 text-muted-foreground px-2 py-0.5 rounded-full">
                                {column.cards.length}
                            </span>
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                {/* Cards */}
                <CardContent className="flex-1 overflow-y-auto p-2 pt-2 space-y-2">
                    <SortableContext
                        items={column.cards.map((c) => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {column.cards.length === 0 && !isAdding ? (
                            <div className="flex items-center justify-center h-24 border-2 border-dashed border-border/50 rounded-lg text-muted-foreground text-sm">
                                Drop cards here
                            </div>
                        ) : (
                            column.cards.map((card) => (
                                <KanbanCard
                                    key={card.id}
                                    card={card}
                                    onUpdate={onUpdateCard}
                                    onDelete={onDeleteCard}
                                    onOpenDetail={onOpenDetail}
                                />
                            ))
                        )}
                    </SortableContext>

                    {/* Inline Add Card */}
                    {isAdding ? (
                        <div className="space-y-2">
                            <Card className="shadow-sm">
                                <CardContent className="p-2">
                                    <Input
                                        placeholder="Enter card title..."
                                        value={newCardTitle}
                                        onChange={(e) => setNewCardTitle(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        autoFocus
                                        className="text-sm"
                                    />
                                </CardContent>
                            </Card>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleAddCard} className="btn-glow">
                                    Add Card
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { setIsAdding(false); setNewCardTitle(""); }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-background/50"
                            onClick={() => setIsAdding(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add a card
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
