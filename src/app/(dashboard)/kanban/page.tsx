// src/app/(dashboard)/kanban/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import KanbanColumn from "@/components/kanban/KanbanColumn";
import KanbanCard from "@/components/kanban/KanbanCard";
import { Plus, Loader2, LayoutGrid } from "lucide-react";

interface Card {
    id: string;
    title: string;
    description?: string;
    order: number;
}

interface Column {
    id: string;
    title: string;
    order: number;
    cards: Card[];
}

interface Board {
    id: string;
    title: string;
    columns: Column[];
}

export default function KanbanPage() {
    const [board, setBoard] = useState<Board | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [activeCard, setActiveCard] = useState<Card | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        fetchBoard();
    }, []);

    const fetchBoard = async () => {
        try {
            const res = await fetch("/api/boards");
            if (res.ok) {
                const boards = await res.json();
                if (boards.length > 0) {
                    setBoard(boards[0]);
                }
            }
        } catch (error) {
            console.error("Error fetching boards:", error);
        } finally {
            setLoading(false);
        }
    };

    const createBoard = async () => {
        setCreating(true);
        try {
            const res = await fetch("/api/boards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "My Kanban Board" }),
            });
            if (res.ok) {
                const newBoard = await res.json();
                setBoard(newBoard);
            }
        } catch (error) {
            console.error("Error creating board:", error);
        } finally {
            setCreating(false);
        }
    };

    const addCard = async (columnId: string) => {
        if (!board) return;

        const title = prompt("Enter task name:");
        if (!title?.trim()) return;

        try {
            const res = await fetch("/api/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: title.trim(), columnId }),
            });

            if (res.ok) {
                const newCard = await res.json();
                setBoard({
                    ...board,
                    columns: board.columns.map((col) =>
                        col.id === columnId
                            ? { ...col, cards: [...col.cards, newCard] }
                            : col
                    ),
                });
            }
        } catch (error) {
            console.error("Error creating card:", error);
        }
    };

    const updateCard = async (cardId: string, title: string) => {
        if (!board) return;

        try {
            const res = await fetch(`/api/cards/${cardId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            });

            if (res.ok) {
                setBoard({
                    ...board,
                    columns: board.columns.map((col) => ({
                        ...col,
                        cards: col.cards.map((c) =>
                            c.id === cardId ? { ...c, title } : c
                        ),
                    })),
                });
            }
        } catch (error) {
            console.error("Error updating card:", error);
        }
    };

    const deleteCard = async (cardId: string) => {
        if (!board) return;
        if (!confirm("Delete this task?")) return;

        try {
            await fetch(`/api/cards/${cardId}`, { method: "DELETE" });

            setBoard({
                ...board,
                columns: board.columns.map((col) => ({
                    ...col,
                    cards: col.cards.filter((c) => c.id !== cardId),
                })),
            });
        } catch (error) {
            console.error("Error deleting card:", error);
        }
    };

    const findColumn = (id: string | undefined) => {
        if (!id || !board) return null;

        const column = board.columns.find((c) => c.id === id);
        if (column) return column;

        for (const col of board.columns) {
            if (col.cards.find((card) => card.id === id)) {
                return col;
            }
        }
        return null;
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const column = findColumn(active.id as string);
        if (column) {
            const card = column.cards.find((c) => c.id === active.id);
            if (card) setActiveCard(card);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        if (!board) return;

        const { active, over } = event;
        if (!over) return;

        const activeColumn = findColumn(active.id as string);
        const overColumn = findColumn(over.id as string);

        if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return;

        setBoard({
            ...board,
            columns: board.columns.map((col) => {
                if (col.id === activeColumn.id) {
                    return {
                        ...col,
                        cards: col.cards.filter((c) => c.id !== active.id),
                    };
                }
                if (col.id === overColumn.id) {
                    const activeCard = activeColumn.cards.find((c) => c.id === active.id);
                    if (!activeCard) return col;

                    const overIndex = col.cards.findIndex((c) => c.id === over.id);
                    const newIndex = overIndex >= 0 ? overIndex : col.cards.length;

                    const newCards = [...col.cards];
                    newCards.splice(newIndex, 0, activeCard);

                    return { ...col, cards: newCards };
                }
                return col;
            }),
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        if (!board) return;

        const { active, over } = event;
        setActiveCard(null);

        if (!over) return;

        const activeColumn = findColumn(active.id as string);
        const overColumn = findColumn(over.id as string);

        if (!activeColumn || !overColumn) return;

        if (activeColumn.id === overColumn.id) {
            const oldIndex = activeColumn.cards.findIndex((c) => c.id === active.id);
            const newIndex = activeColumn.cards.findIndex((c) => c.id === over.id);

            if (oldIndex !== newIndex) {
                const newCards = arrayMove(activeColumn.cards, oldIndex, newIndex);

                setBoard({
                    ...board,
                    columns: board.columns.map((col) =>
                        col.id === activeColumn.id ? { ...col, cards: newCards } : col
                    ),
                });

                try {
                    await fetch("/api/cards", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            cardId: active.id,
                            columnId: activeColumn.id,
                            order: newIndex,
                        }),
                    });
                } catch (error) {
                    console.error("Error updating card position:", error);
                }
            }
        } else {
            try {
                const newColumn = board.columns.find((c) => c.id === overColumn.id);
                const cardIndex = newColumn?.cards.findIndex((c) => c.id === active.id) ?? 0;

                await fetch("/api/cards", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        cardId: active.id,
                        columnId: overColumn.id,
                        order: cardIndex,
                    }),
                });
            } catch (error) {
                console.error("Error updating card position:", error);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-background">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading board...</p>
                </div>
            </div>
        );
    }

    if (!board) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-background">
                <div className="text-center">
                    <LayoutGrid className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-lg font-medium mb-2">No Kanban Board Yet</h2>
                    <p className="text-muted-foreground mb-4">Create your first board to get started</p>
                    <Button onClick={createBoard} disabled={creating} className="btn-primary">
                        {creating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4 mr-2" />
                        )}
                        Create Board
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-background">
            {/* Header */}
            <div className="p-4 border-b">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-2xl font-semibold text-foreground">{board.title}</h1>
                    <p className="text-sm text-muted-foreground">
                        Drag and drop cards to organize your tasks
                    </p>
                </motion.div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto p-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-4 h-full">
                        {board.columns.map((column, index) => (
                            <motion.div
                                key={column.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <KanbanColumn
                                    column={column}
                                    onAddCard={() => addCard(column.id)}
                                    onUpdateCard={updateCard}
                                    onDeleteCard={deleteCard}
                                />
                            </motion.div>
                        ))}
                    </div>

                    <DragOverlay>
                        {activeCard && (
                            <KanbanCard
                                card={activeCard}
                                isDragging
                            />
                        )}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}
