// src/components/kanban/KanbanColumn.tsx
// Jira-style Kanban column with uppercase headers, card counts, WIP warnings, and inline card creation
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
import {
    Plus,
    MoreHorizontal,
    X,
    Pencil,
    Trash2,
    Inbox,
    Check,
    SquareCheck,
    BookOpen,
    Bug,
    Settings,
} from "lucide-react";
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
    issueType?: "task" | "story" | "bug" | "feature";
    issueNumber?: number;
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

type IssueType = "task" | "story" | "bug" | "feature";

interface ColumnProps {
    column: {
        id: string;
        title: string;
        cards: CardType[];
    };
    onAddCard: (columnId: string, title: string, extra?: { issueType?: IssueType }) => void;
    onUpdateCard?: (cardId: string, title: string) => void;
    onDeleteCard?: (cardId: string) => void;
    onOpenDetail?: (card: CardType) => void;
    onRenameColumn?: (columnId: string, title: string) => void;
    onDeleteColumn?: (columnId: string) => void;
    onOpenCreateDialog?: (columnId: string) => void;
    canDelete?: boolean;
}

// Column accent color config — Jira-style
const columnAccents: Record<string, { gradient: string; dot: string; glow: string; isDone?: boolean }> = {
    "To Do": { gradient: "from-slate-400 to-slate-500", dot: "bg-slate-500", glow: "ring-slate-500/20 bg-slate-500/5" },
    "In Progress": { gradient: "from-blue-400 to-blue-600", dot: "bg-blue-500", glow: "ring-blue-500/20 bg-blue-500/5" },
    "Review": { gradient: "from-amber-400 to-amber-500", dot: "bg-amber-500", glow: "ring-amber-500/20 bg-amber-500/5" },
    "Testing": { gradient: "from-purple-400 to-purple-500", dot: "bg-purple-500", glow: "ring-purple-500/20 bg-purple-500/5" },
    "Done": { gradient: "from-emerald-400 to-emerald-600", dot: "bg-emerald-500", glow: "ring-emerald-500/20 bg-emerald-500/5", isDone: true },
};

const defaultAccent = { gradient: "from-violet-400 to-violet-600", dot: "bg-violet-500", glow: "ring-violet-500/20 bg-violet-500/5" };

// Issue type icons for inline creation
const issueTypes: { value: IssueType; label: string; icon: typeof SquareCheck; color: string }[] = [
    { value: "task", label: "Task", icon: SquareCheck, color: "text-blue-500" },
    { value: "story", label: "Story", icon: BookOpen, color: "text-emerald-500" },
    { value: "bug", label: "Bug", icon: Bug, color: "text-red-500" },
    { value: "feature", label: "Feature", icon: Settings, color: "text-amber-500" },
];

const WIP_LIMIT = 5;

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
    const [newCardType, setNewCardType] = useState<IssueType>("task");
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameDraft, setRenameDraft] = useState("");
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);

    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
    });

    const accent = columnAccents[column.title] || defaultAccent;
    const isDone = "isDone" in accent && accent.isDone;
    const isOverWip = column.cards.length > WIP_LIMIT;

    const handleAddCard = () => {
        if (newCardTitle.trim()) {
            onAddCard(column.id, newCardTitle.trim(), { issueType: newCardType });
            setNewCardTitle("");
            setNewCardType("task");
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

    const SelectedTypeIcon = issueTypes.find((t) => t.value === newCardType)!;

    return (
        <div className="w-[85vw] sm:w-[21rem] flex-shrink-0 snap-center">
            <div
                ref={setNodeRef}
                className={`
                    relative overflow-hidden rounded-xl
                    bg-muted/20 border border-border/50
                    h-[calc(100vh-13rem)] sm:h-[calc(100vh-14rem)]
                    flex flex-col
                    transition-all duration-300
                    ${isOver ? `ring-2 ${accent.glow}` : ""}
                `}
            >
                {/* Top accent gradient strip */}
                <div className={`h-[3px] w-full bg-gradient-to-r ${accent.gradient}`} />

                {/* Column Header — Jira style */}
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
                                className="text-sm font-semibold h-7 w-full uppercase"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                {/* Column title — uppercase like Jira */}
                                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                    {column.title}
                                </h3>
                                {/* Card count */}
                                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-semibold rounded-full ${
                                    isOverWip
                                        ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                        : "bg-muted/80 text-muted-foreground"
                                }`}>
                                    {column.cards.length}
                                </span>
                                {/* Done checkmark */}
                                {isDone && (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                )}
                                {/* WIP warning */}
                                {isOverWip && (
                                    <span className="text-[9px] font-medium text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                                        WIP
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-0.5">
                            {/* Quick add button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
                                onClick={() => setIsAdding(true)}
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground">
                                        <MoreHorizontal className="w-3.5 h-3.5" />
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
                </div>

                {/* Cards — scrollable */}
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

                    {/* Inline Add Card — Jira-style with type selector */}
                    {isAdding ? (
                        <div className="space-y-2 pt-1">
                            <div className="rounded-lg border border-border/60 bg-card/80 backdrop-blur-sm p-2.5 shadow-sm">
                                <Input
                                    placeholder="What needs to be done?"
                                    value={newCardTitle}
                                    onChange={(e) => setNewCardTitle(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                    className="text-sm border-0 bg-transparent p-0 h-7 focus-visible:ring-0 shadow-none"
                                />
                                {/* Type selector row */}
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                            className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground px-1.5 py-1 rounded-md hover:bg-muted/50 transition-colors"
                                        >
                                            <SelectedTypeIcon.icon className={`w-3.5 h-3.5 ${SelectedTypeIcon.color}`} />
                                            {SelectedTypeIcon.label}
                                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        </button>
                                        {showTypeDropdown && (
                                            <div className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                                                {issueTypes.map((type) => (
                                                    <button
                                                        key={type.value}
                                                        onClick={() => {
                                                            setNewCardType(type.value);
                                                            setShowTypeDropdown(false);
                                                        }}
                                                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                                                    >
                                                        <type.icon className={`w-3.5 h-3.5 ${type.color}`} />
                                                        {type.label}
                                                        {newCardType === type.value && <Check className="w-3 h-3 ml-auto text-primary" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleAddCard} className="rounded-lg text-xs h-7 px-3">
                                    Add Card
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { setIsAdding(false); setNewCardTitle(""); setShowTypeDropdown(false); }}
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
