// src/components/kanban/KanbanColumn.tsx
// Premium Kanban column with top accent strip, custom scrollbar, and polished interactions
"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, X, Pencil, Trash2, Inbox } from "lucide-react";
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
    onRenameColumn?: (columnId: string, title: string) => void;
    onDeleteColumn?: (columnId: string) => void;
    onOpenCreateDialog?: (columnId: string) => void;
    canDelete?: boolean;
}

// Column accent color config — gradient strip + dot
const columnAccents: Record<string, { gradient: string; dot: string; glow: string }> = {
    "To Do": { gradient: "from-slate-400 to-slate-500", dot: "bg-slate-500", glow: "ring-slate-500/20 bg-slate-500/5" },
    "In Progress": { gradient: "from-blue-400 to-blue-600", dot: "bg-blue-500", glow: "ring-blue-500/20 bg-blue-500/5" },
    "Review": { gradient: "from-amber-400 to-amber-500", dot: "bg-amber-500", glow: "ring-amber-500/20 bg-amber-500/5" },
    "Done": { gradient: "from-emerald-400 to-emerald-600", dot: "bg-emerald-500", glow: "ring-emerald-500/20 bg-emerald-500/5" },
};

const defaultAccent = { gradient: "from-violet-400 to-violet-600", dot: "bg-violet-500", glow: "ring-violet-500/20 bg-violet-500/5" };

export default function KanbanColumn({
    column,
    onAddCard,
    onUpdateCard,
    onDeleteCard,
    onOpenDetail,
    onRenameColumn,
    onDeleteColumn,
    onOpenCreateDialog,
    canDelete = true,
}: ColumnProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newCardTitle, setNewCardTitle] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameDraft, setRenameDraft] = useState("");

    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
    });

    const accent = columnAccents[column.title] || defaultAccent;

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

    const handleStartRename = () => {
        setRenameDraft(column.title);
        setIsRenaming(true);
    };

    const handleSaveRename = () => {
        if (renameDraft.trim() && renameDraft.trim() !== column.title) {
            onRenameColumn?.(column.id, renameDraft.trim());
        }
        setIsRenaming(false);
    };

    return (
        <div className="w-[85vw] sm:w-[21rem] flex-shrink-0 snap-center">
            <div
                ref={setNodeRef}
                className={`
                    relative overflow-hidden rounded-xl
                    bg-muted/20 border border-border/50
                    h-[calc(100vh-11rem)] sm:h-[calc(100vh-12rem)]
                    flex flex-col
                    transition-all duration-300
                    ${isOver ? `ring-2 ${accent.glow}` : ""}
                `}
            >
                {/* Top accent gradient strip */}
                <div className={`h-[3px] w-full bg-gradient-to-r ${accent.gradient}`} />

                {/* Column Header */}
                <div className="px-3.5 pt-3 pb-2">
                    <div className="flex items-center justify-between">
                        {isRenaming ? (
                            <Input
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onBlur={handleSaveRename}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveRename();
                                    if (e.key === "Escape") setIsRenaming(false);
                                }}
                                autoFocus
                                className="text-sm font-semibold h-7 w-full"
                            />
                        ) : (
                            <div className="flex items-center gap-2.5">
                                <div className={`w-2 h-2 rounded-full ${accent.dot} shadow-sm`} />
                                <h3 className="text-sm font-semibold text-foreground tracking-tight">
                                    {column.title}
                                </h3>
                                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-medium rounded-full bg-muted/80 text-muted-foreground">
                                    {column.cards.length}
                                </span>
                            </div>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => setIsAdding(true)} className="gap-2">
                                    <Plus className="w-3.5 h-3.5" />
                                    Quick Add
                                </DropdownMenuItem>
                                {onOpenCreateDialog && (
                                    <DropdownMenuItem onClick={() => onOpenCreateDialog(column.id)} className="gap-2">
                                        <Plus className="w-3.5 h-3.5" />
                                        Create Card
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={handleStartRename} className="gap-2">
                                    <Pencil className="w-3.5 h-3.5" />
                                    Rename
                                </DropdownMenuItem>
                                {canDelete && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onDeleteColumn?.(column.id)}
                                            className="gap-2 text-red-600 focus:text-red-600"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete Column
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Cards — scrollable with custom scrollbar */}
                <div className="flex-1 overflow-y-auto px-2.5 pb-2 space-y-2 kanban-scroll">
                    <SortableContext
                        items={column.cards.map((c) => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {column.cards.length === 0 && !isAdding ? (
                            <div className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border/30 rounded-xl text-muted-foreground/60 gap-2">
                                <Inbox className="w-5 h-5" />
                                <span className="text-xs font-medium">Drop cards here</span>
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
                        <div className="space-y-2 pt-1">
                            <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-2.5 shadow-sm">
                                <Input
                                    placeholder="Enter card title..."
                                    value={newCardTitle}
                                    onChange={(e) => setNewCardTitle(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                    className="text-sm border-0 bg-transparent p-0 h-7 focus-visible:ring-0 shadow-none"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleAddCard} className="rounded-lg text-xs h-7 px-3">
                                    Add Card
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { setIsAdding(false); setNewCardTitle(""); }}
                                    className="rounded-lg h-7 w-7 p-0"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 rounded-lg text-xs h-8 mt-1"
                            onClick={() => setIsAdding(true)}
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Add a card
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
