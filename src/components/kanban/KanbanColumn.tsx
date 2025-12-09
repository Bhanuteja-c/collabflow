// src/components/kanban/KanbanColumn.tsx
"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal } from "lucide-react";
import KanbanCard from "./KanbanCard";

interface CardType {
    id: string;
    title: string;
    description?: string;
}

interface ColumnProps {
    column: {
        id: string;
        title: string;
        cards: CardType[];
    };
    onAddCard: () => void;
    onUpdateCard?: (cardId: string, title: string) => void;
    onDeleteCard?: (cardId: string) => void;
}

export default function KanbanColumn({ column, onAddCard, onUpdateCard, onDeleteCard }: ColumnProps) {
    return (
        <div className="w-72 flex-shrink-0">
            <Card className="bg-muted border-0 shadow-sm h-[calc(100vh-12rem)] flex flex-col">
                {/* Column Header */}
                <CardHeader className="p-3 pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                            {column.title}
                            <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                                {column.cards.length}
                            </span>
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                {/* Cards */}
                <CardContent className="flex-1 overflow-y-auto p-2 pt-0 space-y-2">
                    <SortableContext
                        items={column.cards.map((c) => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {column.cards.map((card) => (
                            <KanbanCard
                                key={card.id}
                                card={card}
                                onUpdate={onUpdateCard}
                                onDelete={onDeleteCard}
                            />
                        ))}
                    </SortableContext>

                    {/* Add Card Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary"
                        onClick={onAddCard}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add a card
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
