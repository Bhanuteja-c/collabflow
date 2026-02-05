// src/app/workspace/[slug]/kanban/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import KanbanColumn from "@/components/kanban/KanbanColumn";
import KanbanCard from "@/components/kanban/KanbanCard";
import CardDetailModal from "@/components/kanban/CardDetailModal";
import { Plus, Loader2, LayoutGrid, Wifi, WifiOff, Filter, Users, X } from "lucide-react";
import { TouchSensor } from "@dnd-kit/core";
import { useKanbanSync } from "@/hooks/useKanbanSync";

interface User {
    id: string;
    name: string | null;
    image: string | null;
}

interface Card {
    id: string;
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
    assigneeId?: string;
    assignee?: User;
    commentsCount?: number;
    checklistCompleted?: number;
    checklistTotal?: number;
    order?: number;
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

export default function WorkspaceKanbanPage() {
    const { data: session } = useSession();
    const params = useParams();
    const [board, setBoard] = useState<Board | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [activeCard, setActiveCard] = useState<Card | null>(null);
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);

    // Filters
    const [filterPriority, setFilterPriority] = useState<string | null>(null);
    const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
    const [filterOverdue, setFilterOverdue] = useState(false);

    // Current user for presence
    const currentUser = useMemo(() => {
        if (!session?.user?.id) return undefined;
        return {
            id: session.user.id,
            name: session.user.name || "Anonymous",
            image: session.user.image || undefined,
        };
    }, [session?.user]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Real-time sync callbacks
    const handleRemoteCardMoved = useCallback((data: { cardId: string; fromColumnId: string; toColumnId: string; newOrder: number }) => {
        setBoard((prev) => {
            if (!prev) return prev;
            let movedCard: Card | undefined;

            // Find and remove card from source column
            const columnsWithoutCard = prev.columns.map((col) => {
                if (col.id === data.fromColumnId) {
                    movedCard = col.cards.find((c) => c.id === data.cardId);
                    return { ...col, cards: col.cards.filter((c) => c.id !== data.cardId) };
                }
                return col;
            });

            if (!movedCard) return prev;

            // Add card to target column
            return {
                ...prev,
                columns: columnsWithoutCard.map((col) => {
                    if (col.id === data.toColumnId) {
                        const newCards = [...col.cards];
                        newCards.splice(data.newOrder, 0, { ...movedCard!, order: data.newOrder });
                        return { ...col, cards: newCards };
                    }
                    return col;
                }),
            };
        });
    }, []);

    const handleRemoteCardCreated = useCallback((data: { columnId: string; card: Card }) => {
        setBoard((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                columns: prev.columns.map((col) =>
                    col.id === data.columnId
                        ? { ...col, cards: [...col.cards.filter(c => c.id !== data.card.id), data.card] }
                        : col
                ),
            };
        });
    }, []);

    const handleRemoteCardUpdated = useCallback((data: { cardId: string; updates: Partial<Card> }) => {
        setBoard((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                columns: prev.columns.map((col) => ({
                    ...col,
                    cards: col.cards.map((c) =>
                        c.id === data.cardId ? { ...c, ...data.updates } : c
                    ),
                })),
            };
        });
    }, []);

    const handleRemoteCardDeleted = useCallback((data: { cardId: string }) => {
        setBoard((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                columns: prev.columns.map((col) => ({
                    ...col,
                    cards: col.cards.filter((c) => c.id !== data.cardId),
                })),
            };
        });
    }, []);

    // Real-time sync hook
    const { connected: syncConnected, viewers, emitCardMoved, emitCardCreated, emitCardDeleted } = useKanbanSync({
        boardId: board?.id || null,
        currentUser,
        onCardMoved: handleRemoteCardMoved,
        onCardCreated: handleRemoteCardCreated,
        onCardUpdated: handleRemoteCardUpdated,
        onCardDeleted: handleRemoteCardDeleted,
    });

    // Check if a card is overdue
    const isCardOverdue = (card: Card) => {
        if (!card.dueDate) return false;
        return new Date(card.dueDate) < new Date();
    };

    // Filter cards in columns
    const filteredBoard = useMemo(() => {
        if (!board) return null;
        if (!filterPriority && !filterAssignee && !filterOverdue) return board;

        return {
            ...board,
            columns: board.columns.map(col => ({
                ...col,
                cards: col.cards.filter(card => {
                    if (filterPriority && card.priority !== filterPriority) return false;
                    if (filterAssignee && card.assigneeId !== filterAssignee) return false;
                    if (filterOverdue && !isCardOverdue(card)) return false;
                    return true;
                }),
            })),
        };
    }, [board, filterPriority, filterAssignee, filterOverdue]);

    const hasActiveFilters = filterPriority || filterAssignee || filterOverdue;

    const clearFilters = () => {
        setFilterPriority(null);
        setFilterAssignee(null);
        setFilterOverdue(false);
    };

    useEffect(() => {
        fetchBoard();
        fetchWorkspaceMembers();
    }, []);

    const fetchWorkspaceMembers = async () => {
        if (!params?.slug) return;
        try {
            const res = await fetch(`/api/workspaces/${params.slug}/members`);
            if (res.ok) {
                const members = await res.json();
                setWorkspaceMembers(members.map((m: any) => m.user || m));
            }
        } catch (error) {
            console.error("Error fetching members:", error);
        }
    };

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

    const addCard = async (columnId: string, title: string) => {
        if (!board || !title.trim()) return;

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
                // Emit to other users
                emitCardCreated(columnId, newCard);
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
            // Emit to other users
            emitCardDeleted(cardId);
        } catch (error) {
            console.error("Error deleting card:", error);
        }
    };

    const handleOpenDetail = (card: Card) => {
        setSelectedCard(card);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedCard(null);
    };

    const handleUpdateCardFromModal = (cardId: string, updates: Partial<Card>) => {
        if (!board) return;

        setBoard({
            ...board,
            columns: board.columns.map((col) => ({
                ...col,
                cards: col.cards.map((c) =>
                    c.id === cardId ? { ...c, ...updates } : c
                ),
            })),
        });

        // Update selected card if it's the one being edited
        if (selectedCard?.id === cardId) {
            setSelectedCard({ ...selectedCard, ...updates });
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

                // Emit to other users
                emitCardMoved(active.id as string, activeColumn.id, activeColumn.id, newIndex);

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
            // Card moved to different column
            const newColumn = board.columns.find((c) => c.id === overColumn.id);
            const cardIndex = newColumn?.cards.findIndex((c) => c.id === active.id) ?? 0;

            // Emit to other users
            emitCardMoved(active.id as string, activeColumn.id, overColumn.id, cardIndex);

            try {
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
            <div className="p-3 sm:p-4 lg:p-6 border-b">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between gap-3"
                >
                    {/* Left side - Title and status */}
                    <div className="min-w-0 flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{board.title}</h1>
                        {syncConnected ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-500" title="Real-time sync active">
                                <Wifi className="w-3 h-3" />
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-500" title="Connecting...">
                                <WifiOff className="w-3 h-3" />
                            </span>
                        )}
                    </div>

                    {/* Center - Viewers (presence) */}
                    {viewers.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1">
                            <Users className="w-4 h-4 text-muted-foreground mr-1" />
                            <div className="flex -space-x-2">
                                {viewers.slice(0, 5).map((viewer) => (
                                    <Avatar
                                        key={viewer.socketId}
                                        className="w-7 h-7 border-2 border-background"
                                        title={viewer.user.name}
                                    >
                                        <AvatarImage src={viewer.user.image} />
                                        <AvatarFallback className="text-[10px]">
                                            {viewer.user.name?.[0] || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                                {viewers.length > 5 && (
                                    <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
                                        +{viewers.length - 5}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Right side - Filters and actions */}
                    <div className="flex items-center gap-2">
                        {/* Filter dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant={hasActiveFilters ? "secondary" : "outline"} size="sm" className="gap-2">
                                    <Filter className="w-4 h-4" />
                                    <span className="hidden sm:inline">Filter</span>
                                    {hasActiveFilters && (
                                        <span className="w-2 h-2 rounded-full bg-primary" />
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                    onClick={() => setFilterPriority(filterPriority === "high" ? null : "high")}
                                    className="gap-2"
                                >
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    High Priority
                                    {filterPriority === "high" && <span className="ml-auto">✓</span>}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setFilterPriority(filterPriority === "medium" ? null : "medium")}
                                    className="gap-2"
                                >
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    Medium Priority
                                    {filterPriority === "medium" && <span className="ml-auto">✓</span>}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setFilterPriority(filterPriority === "low" ? null : "low")}
                                    className="gap-2"
                                >
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Low Priority
                                    {filterPriority === "low" && <span className="ml-auto">✓</span>}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setFilterOverdue(!filterOverdue)}
                                    className="gap-2"
                                >
                                    ⚠️ Overdue Only
                                    {filterOverdue && <span className="ml-auto">✓</span>}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setFilterAssignee(filterAssignee === session?.user?.id ? null : session?.user?.id || null)}
                                    className="gap-2"
                                >
                                    👤 Assigned to Me
                                    {filterAssignee === session?.user?.id && <span className="ml-auto">✓</span>}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Clear filters button */}
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                                <X className="w-4 h-4" />
                                <span className="hidden sm:inline">Clear</span>
                            </Button>
                        )}

                        <Button onClick={createBoard} className="btn-glow flex-shrink-0" disabled={creating} size="sm">
                            <Plus className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Add Column</span>
                        </Button>
                    </div>
                </motion.div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto p-3 sm:p-4 pb-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-3 sm:gap-4 h-full min-w-max">
                        {(filteredBoard || board).columns.map((column, index) => (
                            <motion.div
                                key={column.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <KanbanColumn
                                    column={column}
                                    onAddCard={addCard}
                                    onUpdateCard={updateCard}
                                    onDeleteCard={deleteCard}
                                    onOpenDetail={handleOpenDetail}
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

            {/* Card Detail Modal */}
            <CardDetailModal
                card={selectedCard}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onUpdate={handleUpdateCardFromModal}
                workspaceMembers={workspaceMembers}
                currentUserId={session?.user?.id || ""}
            />
        </div>
    );
}
