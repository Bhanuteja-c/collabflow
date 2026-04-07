// src/components/kanban/KanbanCard.tsx
// Jira-style Kanban card with issue type icons, issue IDs, priority strip, and hover actions
"use client";

import { useState, useRef, useEffect, memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
    Pencil,
    Trash2,
    GripVertical,
    Calendar,
    MessageSquare,
    CheckSquare,
    AlertCircle,
    SquareCheck,
    BookOpen,
    Bug,
    Settings,
    ListTree,
    Hexagon,
    Link2,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
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
    issueType?: "task" | "story" | "bug" | "feature";
    issueNumber?: number;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
    startDate?: string;
    labels?: string[];
    status?: string;
    assignee?: User | null;
    assigneeId?: string | null;
    commentsCount?: number;
    checklistCompleted?: number;
    checklistTotal?: number;
    subtaskCount?: number;
    subtaskCompleted?: number;
    storyPoints?: number | null;
    isBacklog?: boolean;
    parentId?: string | null;
    epic?: { id: string; title: string; color: string } | null;
    dependencyCount?: number;
    isBlocked?: boolean;
    order?: number;
}

interface CardProps {
    card: CardData;
    isDragging?: boolean;
    isSelected?: boolean;
    onUpdate?: (id: string, title: string) => void;
    onDelete?: (id: string) => void;
    onOpenDetail?: (card: CardData) => void;
    onSelect?: (id: string, e: React.MouseEvent) => void;
}

// Issue type config — SVG icons + colors (Jira-style)
export const issueTypeConfig = {
    task: { icon: SquareCheck, color: "text-blue-500", bg: "bg-blue-500", label: "Task", border: "border-l-blue-500" },
    story: { icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500", label: "Story", border: "border-l-emerald-500" },
    bug: { icon: Bug, color: "text-red-500", bg: "bg-red-500", label: "Bug", border: "border-l-red-500" },
    feature: { icon: Settings, color: "text-amber-500", bg: "bg-amber-500", label: "Feature", border: "border-l-amber-500" },
};

export const priorityConfig = {
    low: { color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", label: "Low" },
    medium: { color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400", label: "Medium" },
    high: { color: "bg-red-500", textColor: "text-red-600 dark:text-red-400", label: "High" },
};

const labelColors = [
    { dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-300" },
    { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
    { dot: "bg-violet-500", text: "text-violet-700 dark:text-violet-300" },
    { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" },
    { dot: "bg-pink-500", text: "text-pink-700 dark:text-pink-300" },
    { dot: "bg-cyan-500", text: "text-cyan-700 dark:text-cyan-300" },
];
export const PRIORITY_ICONS = {
    highest: ArrowUp,
    high: ArrowUp,
    medium: ArrowUpDown,
    low: ArrowDown,
    lowest: ArrowDown,
    none: CheckSquare
};

export const PRIORITY_COLORS = {
    highest: "text-red-600 dark:text-red-400",
    high: "text-red-500",
    medium: "text-amber-500",
    low: "text-emerald-500",
    lowest: "text-blue-500",
    none: "text-muted-foreground"
};

function KanbanCardInner({
    card,
    isDragging,
    isSelected,
    onUpdate,
    onDelete,
    onOpenDetail,
    onSelect,
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

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
        // Ctrl/Cmd+Click toggles selection
        if ((e.ctrlKey || e.metaKey) && onSelect) {
            e.preventDefault();
            e.stopPropagation();
            onSelect(card.id, e);
            return;
        }
        onOpenDetail?.(card);
    };

    const formatDueDate = (dateStr: string) => {
        if (!mounted) return "";
        const date = new Date(dateStr);
        return format(date, "MMM d");
    };

    const isOverdue = card.dueDate && isBefore(new Date(card.dueDate), new Date());
    const isDueSoon = card.dueDate && !isOverdue && isBefore(new Date(card.dueDate), addDays(new Date(), 2));
    const priority = card.priority && priorityConfig[card.priority];
    const issueType = issueTypeConfig[card.issueType || "task"];
    const IssueIcon = issueType.icon;
    const checklistProgress = card.checklistTotal && card.checklistTotal > 0
        ? Math.round((card.checklistCompleted || 0) / card.checklistTotal * 100)
        : null;

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                zIndex: isDragging ? 999 : "auto",
            }}
            className={`group outline-none ${isSortableDragging && !isDragging ? "opacity-30 mix-blend-luminosity" : ""}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div
                className={`
                    relative overflow-hidden rounded-lg
                    bg-card/90 backdrop-blur-sm
                    border border-border/50 border-l-[3px] ${issueType.border}
                    shadow-sm
                    transition-all duration-200 ease-out
                    hover:-translate-y-0.5 hover:shadow-md hover:border-border
                    cursor-pointer
                    ${isOverdue && !isSelected ? "ring-1 ring-red-500/30" : ""}
                    ${isSelected ? "ring-2 ring-blue-500 border-blue-500/50 bg-blue-500/5" : ""}
                    ${isDragging ? "shadow-[0_20px_60px_-15px_rgba(37,99,235,0.2)] rotate-2 scale-105 border-primary/40 ring-2 ring-primary/20" : ""}
                    ${card.status === "completed" && !isDragging ? "opacity-60" : ""}
                `}
                onClick={handleCardClick}
            >
                {/* Selection checkbox overlay */}
                {isSelected && (
                    <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                )}
                <div className="p-3 space-y-2">
                    {/* Labels & Epic */}
                    {(card.epic || (card.labels && card.labels.length > 0)) && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                            {card.epic && (
                                <span
                                    className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-sm"
                                    style={{
                                        backgroundColor: `${card.epic.color}15`,
                                        color: card.epic.color,
                                    }}
                                >
                                    <span
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: card.epic.color }}
                                    />
                                    {card.epic.title}
                                </span>
                            )}
                            {card.labels?.map((label, i) => {
                                const lc = labelColors[i % labelColors.length];
                                return (
                                    <span
                                        key={i}
                                        className={`inline-flex items-center gap-1 text-[10px] font-medium ${lc.text}`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${lc.dot}`} />
                                        {label}
                                    </span>
                                );
                            })}
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
                                    className="mt-0.5 cursor-grab active:cursor-grabbing flex-shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
                                    {...attributes}
                                    {...listeners}
                                >
                                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <span className={`text-[13px] font-medium leading-snug ${card.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
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
                                    className="h-6 w-6 rounded-lg opacity-60 hover:opacity-100"
                                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                                >
                                    <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-lg text-red-500 hover:text-red-600 opacity-60 hover:opacity-100"
                                    onClick={(e) => { e.stopPropagation(); onDelete?.(card.id); }}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Issue type + ID row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <IssueIcon className={`w-3.5 h-3.5 ${issueType.color}`} />
                            {card.issueNumber ? (
                                <span className="text-[11px] font-semibold text-blue-500/80">
                                    KAN-{card.issueNumber}
                                </span>
                            ) : null}
                        </div>

                        {/* Priority badge */}
                        {priority && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priority.textColor} bg-current/5`}>
                                {priority.label}
                            </span>
                        )}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Due date */}
                        {card.dueDate && (
                            <div className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-md px-1.5 py-0.5 ${
                                isOverdue
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : isDueSoon
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                        : "bg-muted/80 text-muted-foreground"
                            }`}>
                                {isOverdue && <AlertCircle className="w-3 h-3" />}
                                <Calendar className="w-3 h-3" />
                                {formatDueDate(card.dueDate)}
                            </div>
                        )}

                        {/* Checklist count */}
                        {card.checklistTotal != null && card.checklistTotal > 0 && (
                            <div className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                card.checklistCompleted === card.checklistTotal
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground"
                            }`}>
                                <CheckSquare className="w-3 h-3" />
                                {card.checklistCompleted}/{card.checklistTotal}
                            </div>
                        )}

                        {/* Comments */}
                        {card.commentsCount != null && card.commentsCount > 0 && (
                            <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <MessageSquare className="w-3 h-3" />
                                {card.commentsCount}
                            </div>
                        )}

                        {/* Subtask progress */}
                        {card.subtaskCount != null && card.subtaskCount > 0 && (
                            <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <ListTree className="w-3 h-3" />
                                {card.subtaskCompleted ?? 0}/{card.subtaskCount}
                            </div>
                        )}

                        {/* Story Points */}
                        {card.storyPoints != null && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
                                <Hexagon className="w-2.5 h-2.5" />
                                {card.storyPoints}
                            </div>
                        )}

                        {/* Dependency count */}
                        {card.dependencyCount != null && card.dependencyCount > 0 && (
                            <div className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded px-1.5 py-0.5 ${
                                card.isBlocked
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : "bg-muted/60 text-muted-foreground"
                            }`}>
                                {card.isBlocked ? <AlertCircle className="w-2.5 h-2.5" /> : <Link2 className="w-2.5 h-2.5" />}
                                {card.dependencyCount}
                            </div>
                        )}

                        {/* Spacer + Assignee */}
                        <div className="flex-1" />
                        {card.assignee ? (
                            <HoverCard openDelay={200} closeDelay={100}>
                                <HoverCardTrigger asChild>
                                    <Avatar className="w-6 h-6 ring-2 ring-background cursor-pointer hover:ring-primary/50 transition-all">
                                        <UserAvatar user={card.assignee} className="w-6 h-6" showStatus={false} />
                                    </Avatar>
                                </HoverCardTrigger>
                                <HoverCardContent side="bottom" align="end" className="w-auto p-3">
                                    <div className="flex items-center gap-3">
                                        <UserAvatar user={card.assignee} className="w-9 h-9" showStatus={false} />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold leading-none">{card.assignee.name}</span>
                                            <span className="text-[11px] text-muted-foreground mt-1">Assignee</span>
                                        </div>
                                    </div>
                                </HoverCardContent>
                            </HoverCard>
                        ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-dashed border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-60 transition-opacity">
                                <span className="text-[9px] text-muted-foreground">+</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Checklist progress bar — bottom edge */}
                {checklistProgress !== null && (
                    <div className="h-[2px] bg-muted/50">
                        <div
                            className={`h-full transition-all duration-500 ${
                                checklistProgress === 100
                                    ? "bg-emerald-500"
                                    : "bg-primary/60"
                            }`}
                            style={{ width: `${checklistProgress}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

const KanbanCard = memo(KanbanCardInner, (prev, next) =>
  prev.card.id === next.card.id &&
  prev.card.title === next.card.title &&
  prev.card.order === next.card.order &&
  prev.card.priority === next.card.priority &&
  prev.card.assigneeId === next.card.assigneeId &&
  prev.isDragging === next.isDragging &&
  prev.isSelected === next.isSelected
);

export default KanbanCard;
