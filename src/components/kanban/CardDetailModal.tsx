// src/components/kanban/CardDetailModal.tsx
// Polished card detail view with progress ring, section dividers, and consistent design
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Calendar,
    Flag,
    User as UserIcon,
    MessageSquare,
    CheckSquare,
    Plus,
    Send,
    Trash2,
    X,
    Loader2,
    AlertCircle,
    Tag,
    Clock,
    CircleCheck,
    Link2,
    Search,
    Hexagon,
    Timer,
    Play,
    GitBranch,
} from "lucide-react";
import { format, isBefore, addDays, formatDistanceToNow } from "date-fns";
import SubtaskList from "@/components/kanban/SubtaskList";
import { ChevronRight, ArrowLeft } from "lucide-react";

interface User {
    id: string;
    name: string | null;
    image: string | null;
}

interface Epic {
    id: string;
    title: string;
    color: string;
}

interface Comment {
    id: string;
    content: string;
    authorId: string;
    author: User;
    createdAt: string;
}

interface ChecklistItem {
    id: string;
    content: string;
    completed: boolean;
    order: number;
}

interface DependencyCard {
    id: string;
    title: string;
    status?: string;
    priority?: string;
    issueType?: string;
    issueNumber?: number;
}

interface Dependency {
    id: string;
    type: string;
    card: DependencyCard;
}

interface Card {
    id: string;
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
    startDate?: string;
    labels?: string[];
    status?: string;
    assignee?: User | null;
    assigneeId?: string | null;
    comments?: Comment[];
    checklist?: ChecklistItem[];
    epic?: Epic | null;
    epicId?: string | null;
    columnId?: string;
    storyPoints?: number | null;
    timeEstimated?: number | null;
    createdAt?: string;
    updatedAt?: string;
}

interface ColumnInfo {
    id: string;
    title: string;
    category?: string;
}

interface CardDetailModalProps {
    card: Card | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (cardId: string, updates: Partial<Card>) => void;
    onMoveCard?: (cardId: string, targetColumnId: string, updates: Partial<Card>) => void;
    columns?: ColumnInfo[];
    workspaceMembers: User[];
    allCards?: DependencyCard[];
    epics: Epic[];
    currentUserId: string;
}

const priorityConfig = {
    high: { color: "bg-red-500", textColor: "text-red-600 dark:text-red-400", label: "High", icon: "🔴" },
    medium: { color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400", label: "Medium", icon: "🟡" },
    low: { color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", label: "Low", icon: "🟢" },
};

const PRESET_LABELS = ["Bug", "Feature", "Enhancement", "Documentation", "Design", "Urgent", "Backend", "Frontend"];

const labelColorMap: Record<string, string> = {
    Bug: "bg-red-500/15 text-red-700 dark:text-red-300",
    Feature: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    Enhancement: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    Documentation: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    Design: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
    Urgent: "bg-red-600/15 text-red-800 dark:text-red-200",
    Backend: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    Frontend: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
};

// SVG Progress Ring component
function ProgressRing({ progress, size = 28, strokeWidth = 3 }: { progress: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    const isComplete = progress === 100;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/40"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={`transition-all duration-500 ${isComplete ? "text-emerald-500" : "text-primary"}`}
            />
        </svg>
    );
}

// Time tracking helpers
function formatMinutesToDisplay(mins: number): string {
    if (mins <= 0) return "0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function formatMinutesToInput(mins: number): string {
    if (mins <= 0) return "";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

// ── GitHub Activity Sub-component ─────────────────────────────────────
interface GitHubActivity {
    id: string;
    type: string;
    action: string;
    metadata: {
        source: string;
        event: string;
        commitSha?: string;
        prNumber?: number;
        prTitle?: string;
        prUrl?: string;
        fromColumn?: string;
        toColumn?: string;
    };
    createdAt: string;
}

function GitHubActivitySection({ cardId }: { cardId: string }) {
    const [activities, setActivities] = useState<GitHubActivity[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!cardId) return;
        let cancelled = false;
        setLoading(true);
        fetch(`/api/cards/${cardId}/github-activity`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                if (!cancelled) setActivities(data || []);
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [cardId]);

    if (loading) return null; // Don't show skeleton for this secondary info
    if (activities.length === 0) return null; // Hide section entirely if no activity

    return (
        <div className="px-6 py-3 border-t border-border/40">
            <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2.5">
                <GitBranch className="w-3.5 h-3.5" />
                GitHub Activity
                <span className="normal-case tracking-normal text-[11px]">({activities.length})</span>
            </h4>
            <div className="space-y-2">
                {activities.map((activity) => {
                    const meta = activity.metadata;
                    return (
                        <div key={activity.id} className="flex items-start gap-2.5 text-sm py-1">
                            <GitBranch className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <span className="text-foreground">
                                    Moved to <strong>{meta.toColumn}</strong>
                                    {meta.prNumber
                                        ? <> via <a href={meta.prUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">PR #{meta.prNumber}</a></>
                                        : meta.commitSha
                                            ? <> via commit <code className="text-xs bg-muted px-1 py-0.5 rounded">{meta.commitSha.slice(0, 7)}</code></>
                                            : null
                                    }
                                </span>
                                {meta.fromColumn && (
                                    <span className="text-muted-foreground text-xs ml-1">
                                        (from {meta.fromColumn})
                                    </span>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function parseTimeInput(input: string): number | null {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return null;
    let totalMinutes = 0;
    const hourMatch = trimmed.match(/(\d+)\s*h/);
    const minMatch = trimmed.match(/(\d+)\s*m/);
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minMatch) totalMinutes += parseInt(minMatch[1]);
    // If just a number, treat as hours
    if (!hourMatch && !minMatch && /^\d+$/.test(trimmed)) {
        totalMinutes = parseInt(trimmed) * 60;
    }
    return totalMinutes > 0 ? totalMinutes : null;
}

const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return "";
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch {
    return "";
  }
};

export default function CardDetailModal({
    card,
    isOpen,
    onClose,
    onUpdate,
    onMoveCard,
    columns,
    workspaceMembers,
    allCards = [],
    epics,
    currentUserId,
}: CardDetailModalProps) {
    const [cardStack, setCardStack] = useState<Card[]>([]);
    const currentCard = cardStack.length > 0 ? cardStack[cardStack.length - 1] : card;
    const isSubtaskLevel = cardStack.length > 1;

    // Derived standard fields based on currentCard instead of prop card
    const [title, setTitle] = useState(currentCard?.title || "");
    const [description, setDescription] = useState(card?.description || "");
    const [priority, setPriority] = useState<"low" | "medium" | "high">(card?.priority || "medium");
    const [dueDate, setDueDate] = useState(card?.dueDate || "");
    const [startDate, setStartDate] = useState(card?.startDate || "");
    const [labels, setLabels] = useState<string[]>(card?.labels || []);
    const [status, setStatus] = useState(card?.status || "active");
    const [assigneeId, setAssigneeId] = useState(card?.assigneeId || "");
    const [comments, setComments] = useState<Comment[]>(card?.comments || []);
    const [checklist, setChecklist] = useState<ChecklistItem[]>(card?.checklist || []);
    const [newComment, setNewComment] = useState("");
    const [newChecklistItem, setNewChecklistItem] = useState("");
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedEpicId, setSelectedEpicId] = useState<string | null>(card?.epic?.id || card?.epicId || null);

    // Dependencies
    const [blocking, setBlocking] = useState<Dependency[]>([]);
    const [blockedBy, setBlockedBy] = useState<Dependency[]>([]);
    const [depSearchQuery, setDepSearchQuery] = useState("");
    const [depSearchResults, setDepSearchResults] = useState<DependencyCard[]>([]);
    const [depSearching, setDepSearching] = useState(false);
    const [depAddOpen, setDepAddOpen] = useState(false);
    const [depDirection, setDepDirection] = useState<"blocking" | "blocked_by">("blocked_by");

    const commentsEndRef = useRef<HTMLDivElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Time tracking state
    const [localStoryPoints, setLocalStoryPoints] = useState<number | "">(currentCard?.storyPoints ?? "");
    const [timeEstimated, setTimeEstimated] = useState<number | null>(currentCard?.timeEstimated ?? null);
    const [timeLogs, setTimeLogs] = useState<any[]>([]);
    const [isTimeLogOpen, setIsTimeLogOpen] = useState(false);
    const [logHours, setLogHours] = useState("");
    const [logMinutes, setLogMinutes] = useState("");
    const [logDescription, setLogDescription] = useState("");
    const [estimateInput, setEstimateInput] = useState("");

    // Initialize stack when the modal opens with a new root card prop
    useEffect(() => {
        if (isOpen && card) {
            setCardStack([card]);
            // Verification logs removed for production
        } else if (!isOpen) {
            setCardStack([]);
        }
    }, [isOpen, card?.id]);

    // Reset local field states when the currentCard (top of stack) changes
    useEffect(() => {
        if (currentCard) {
            setTitle(currentCard.title);
            setDescription(currentCard.description || "");
            setPriority(currentCard.priority || "medium");
            setDueDate(currentCard.dueDate ? currentCard.dueDate.split("T")[0] : "");
            setStartDate(currentCard.startDate ? currentCard.startDate.split("T")[0] : "");
            setLabels(currentCard.labels || []);
            setStatus(currentCard.status || "active");
            setAssigneeId(currentCard.assigneeId || "");
            setSelectedEpicId(currentCard.epic?.id || currentCard.epicId || null);
            setLocalStoryPoints(currentCard.storyPoints ?? "");
            setTimeEstimated(currentCard.timeEstimated ?? null);
            setEstimateInput(currentCard.timeEstimated ? formatMinutesToInput(currentCard.timeEstimated) : "");
            fetchCardDetails();
            fetchDependencies();
            fetchTimeLogs();
        }
    }, [currentCard?.id]);

    const pushCardToStack = async (subtaskInfo: any) => {
        // Fetch the full card details of the subtask
        try {
            const res = await fetch(`/api/cards/${subtaskInfo.id}`);
            if (res.ok) {
                const fullSubtask = await res.json();
                setCardStack(prev => [...prev, fullSubtask]);
            }
        } catch (error) {
            console.error("Failed to fetch full subtask details:", error);
        }
    };

    const popCardFromStack = () => {
        setCardStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    };

    const fetchDependencies = async () => {
        if (!currentCard) return;
        try {
            const res = await fetch(`/api/cards/${currentCard.id}/dependencies`);
            if (res.ok) {
                const data = await res.json();
                setBlocking(data.blocking || []);
                setBlockedBy(data.blockedBy || []);
            }
        } catch (error) {
            console.error("Failed to fetch dependencies:", error);
        }
    };

    const fetchTimeLogs = async () => {
        if (!currentCard) return;
        try {
            const res = await fetch(`/api/cards/${currentCard.id}/time-logs`);
            if (res.ok) {
                const data = await res.json();
                setTimeLogs(data);
            }
        } catch (error) {
            console.error("Failed to fetch time logs:", error);
        }
    };

    const totalLoggedMinutes = timeLogs.reduce((sum: number, log: any) => sum + (log.duration || 0), 0);
    const timeProgress = timeEstimated && timeEstimated > 0 ? (totalLoggedMinutes / timeEstimated) * 100 : 0;

    const handleStoryPointsChange = async (pts: number | null) => {
        setLocalStoryPoints(pts ?? "");
        saveField("storyPoints", pts);
    };

    const handleEstimateBlur = () => {
        const parsed = parseTimeInput(estimateInput);
        setTimeEstimated(parsed);
        setEstimateInput(parsed ? formatMinutesToInput(parsed) : "");
        saveField("timeEstimated", parsed);
    };

    const handleLogTime = async () => {
        const hours = parseInt(logHours) || 0;
        const minutes = parseInt(logMinutes) || 0;
        const totalMinutes = hours * 60 + minutes;
        if (totalMinutes <= 0) return;
        if (!currentCard) return;

        try {
            const res = await fetch(`/api/cards/${currentCard.id}/time-logs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ duration: totalMinutes, description: logDescription.trim() || null }),
            });
            if (res.ok) {
                const newLog = await res.json();
                setTimeLogs(prev => [newLog, ...prev]);
                setLogHours("");
                setLogMinutes("");
                setLogDescription("");
                setIsTimeLogOpen(false);
            }
        } catch (error) {
            console.error("Failed to log time:", error);
        }
    };

    const handleDeleteTimeLog = async (logId: string) => {
        if (!currentCard) return;
        try {
            const res = await fetch(`/api/cards/${currentCard.id}/time-logs/${logId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setTimeLogs(prev => prev.filter((l: any) => l.id !== logId));
            }
        } catch (error) {
            console.error("Failed to delete time log:", error);
        }
    };

    const searchCards = (query: string) => {
        if (!query.trim() || query.length < 2) {
            setDepSearchResults([]);
            return;
        }
        const linkedIds = new Set([...blocking.map(d => d.card.id), ...blockedBy.map(d => d.card.id), currentCard!.id]);
        const filtered = allCards
            .filter(c => !linkedIds.has(c.id) && c.title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 8);
        setDepSearchResults(filtered);
    };

    const addDependency = async (targetCardId: string) => {
        if (!currentCard) return;
        try {
            const res = await fetch(`/api/cards/${currentCard.id}/dependencies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetCardId, type: "blocks", direction: depDirection }),
            });
            if (res.ok) {
                await fetchDependencies();
                setDepSearchQuery("");
                setDepSearchResults([]);
                setDepAddOpen(false);
            } else {
                const err = await res.json();
                alert(err.error || "Failed to create dependency");
            }
        } catch {
            alert("Failed to create dependency");
        }
    };

    const removeDependency = async (depId: string) => {
        if (!currentCard) return;
        try {
            await fetch(`/api/cards/${currentCard.id}/dependencies/${depId}`, { method: "DELETE" });
            setBlocking(prev => prev.filter(d => d.id !== depId));
            setBlockedBy(prev => prev.filter(d => d.id !== depId));
        } catch {
            alert("Failed to remove dependency");
        }
    };

    const fetchCardDetails = async () => {
        if (!currentCard) return;
        setIsLoadingComments(true);
        try {
            const res = await fetch(`/api/cards/${currentCard.id}/details`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments || []);
                setChecklist(data.checklist || []);
            }
        } catch (error) {
            console.error("Failed to fetch card details:", error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    // Auto-save on field changes (debounced)
    const saveField = (field: string, value: any) => {
        if (!currentCard) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            try {
                await fetch(`/api/cards/${currentCard.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ [field]: value }),
                });
                
                // Only broadcast to root kanban page if we are modifying the root card
                if (!isSubtaskLevel) {
                    onUpdate(currentCard.id, { [field]: value });
                } else {
                    // Update internal stack for subtasks so UI is consistent if popped
                    setCardStack(prev => {
                        const next = [...prev];
                        next[next.length - 1] = { ...next[next.length - 1], [field]: value };
                        return next;
                    });
                }
            } catch (error) {
                console.error("Failed to save:", error);
            } finally {
                setIsSaving(false);
            }
        }, 500);
    };

    const handleTitleChange = (value: string) => {
        setTitle(value);
        saveField("title", value);
    };

    const handleDescriptionChange = (value: string) => {
        setDescription(value);
        saveField("description", value);
    };

    const handlePriorityChange = (value: "low" | "medium" | "high") => {
        setPriority(value);
        saveField("priority", value);
    };

    const handleDueDateChange = (value: string) => {
        setDueDate(value);
        saveField("dueDate", value ? new Date(value).toISOString() : null);
    };

    const handleAssigneeChange = (userId: string) => {
        setAssigneeId(userId);
        // Pass both assigneeId and the full assignee object so the board state
        // has the name/image needed for KanbanCard to render the avatar
        const assigneeUser = userId ? workspaceMembers.find(m => m.id === userId) : null;
        saveField("assigneeId", userId || null);
        if (!isSubtaskLevel) {
            onUpdate(currentCard!.id, {
                assigneeId: userId || null,
                assignee: assigneeUser ? { id: assigneeUser.id, name: assigneeUser.name, image: assigneeUser.image } : null,
            });
        }
    };

    const handleStartDateChange = (value: string) => {
        setStartDate(value);
        saveField("startDate", value ? new Date(value).toISOString() : null);
    };

    const handleLabelToggle = (label: string) => {
        const newLabels = labels.includes(label)
            ? labels.filter(l => l !== label)
            : [...labels, label];
        setLabels(newLabels);
        saveField("labels", newLabels);
    };

    const handleEpicChange = (epicId: string | null) => {
        setSelectedEpicId(epicId);
        saveField("epicId", epicId);
        if (!isSubtaskLevel) {
            const selectedEpic = epicId ? epics.find(e => e.id === epicId) : null;
            onUpdate(currentCard!.id, { 
                epicId: epicId, 
                epic: selectedEpic ? { id: selectedEpic.id, title: selectedEpic.title, color: selectedEpic.color } : null 
            });
        }
    };

    const handleStatusToggle = async () => {
        if (!currentCard) return;

        if (status === "active") {
            // Mark as done: set status, add "Done" label, move to Done column
            const newStatus = "completed";
            const newLabels = labels.includes("Done") ? labels : [...labels, "Done"];
            setStatus(newStatus);
            setLabels(newLabels);

            // Find the Done column
            const doneColumn = columns?.find(col => col.category === "done");

            try {
                // Save status + labels + move in one API call
                const updatePayload: Record<string, any> = {
                    status: newStatus,
                    labels: newLabels,
                };
                if (doneColumn) {
                    updatePayload.columnId = doneColumn.id;
                }

                await fetch(`/api/cards/${currentCard.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatePayload),
                });

                if (!isSubtaskLevel) {
                    if (doneColumn && onMoveCard) {
                        // Move card to Done column + apply updates
                        onMoveCard(currentCard.id, doneColumn.id, { status: newStatus, labels: newLabels });
                    } else {
                        onUpdate(currentCard.id, { status: newStatus, labels: newLabels });
                    }
                } else {
                    setCardStack(prev => {
                        const next = [...prev];
                        next[next.length - 1] = { ...next[next.length - 1], status: newStatus, labels: newLabels };
                        return next;
                    });
                }
            } catch (error) {
                console.error("Failed to mark as done:", error);
            }
        } else {
            // Revert to active: remove "Done" label, but don't auto-move back
            const newStatus = "active";
            const newLabels = labels.filter(l => l !== "Done");
            setStatus(newStatus);
            setLabels(newLabels);

            try {
                await fetch(`/api/cards/${currentCard.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: newStatus, labels: newLabels }),
                });
                if (!isSubtaskLevel) {
                    onUpdate(currentCard.id, { status: newStatus, labels: newLabels });
                } else {
                    setCardStack(prev => {
                        const next = [...prev];
                        next[next.length - 1] = { ...next[next.length - 1], status: newStatus, labels: newLabels };
                        return next;
                    });
                }
            } catch (error) {
                console.error("Failed to revert status:", error);
            }
        }
    };

    // Comments
    const addComment = async () => {
        if (!currentCard || !newComment.trim()) return;

        try {
            const res = await fetch(`/api/cards/${currentCard.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newComment }),
            });

            if (res.ok) {
                const comment = await res.json();
                setComments(prev => [...prev, comment]);
                setNewComment("");
                commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        } catch (error) {
            console.error("Failed to add comment:", error);
        }
    };

    const deleteComment = async (commentId: string) => {
        try {
            await fetch(`/api/cards/${currentCard?.id}/comments/${commentId}`, {
                method: "DELETE",
            });
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (error) {
            console.error("Failed to delete comment:", error);
        }
    };

    // Checklist
    const addChecklistItem = async () => {
        if (!currentCard || !newChecklistItem.trim()) return;

        try {
            const res = await fetch(`/api/cards/${currentCard.id}/checklist`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newChecklistItem }),
            });

            if (res.ok) {
                const item = await res.json();
                setChecklist(prev => [...prev, item]);
                setNewChecklistItem("");
            }
        } catch (error) {
            console.error("Failed to add checklist item:", error);
        }
    };

    const toggleChecklistItem = async (itemId: string, completed: boolean) => {
        try {
            await fetch(`/api/cards/${currentCard?.id}/checklist/${itemId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed }),
            });
            setChecklist(prev =>
                prev.map(item =>
                    item.id === itemId ? { ...item, completed } : item
                )
            );
        } catch (error) {
            console.error("Failed to toggle checklist item:", error);
        }
    };

    const deleteChecklistItem = async (itemId: string) => {
        try {
            await fetch(`/api/cards/${currentCard?.id}/checklist/${itemId}`, {
                method: "DELETE",
            });
            setChecklist(prev => prev.filter(item => item.id !== itemId));
        } catch (error) {
            console.error("Failed to delete checklist item:", error);
        }
    };

    // Computed values
    const completedItems = checklist.filter(item => item.completed).length;
    const totalItems = checklist.length;
    const checklistProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    const isOverdue = dueDate != null && dueDate !== "" && isBefore(new Date(dueDate), new Date()) && status !== "completed";
    const isDueSoon = dueDate != null && dueDate !== "" && !isOverdue && isBefore(new Date(dueDate), addDays(new Date(), 1)) && status !== "completed";

    const selectedAssignee = workspaceMembers.find(m => m.id === assigneeId);

    if (!currentCard) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-full h-full lg:max-w-2xl lg:max-h-[90vh] max-h-full rounded-none lg:rounded-lg overflow-hidden flex flex-col p-0 gap-0">
                {/* Hidden title for screen readers — the visible title is the editable Input below */}
                <DialogTitle className="sr-only">{title || currentCard?.title || "Card Details"}</DialogTitle>
                
                {/* Header structure: Breadcrumbs (if nested) + Top Row */}
                <div className="flex-shrink-0 px-4 lg:px-6 pt-4 lg:pt-5 pb-3 lg:pb-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-10 relative">
                    {/* Navigation Stack Breadcrumbs */}
                    <AnimatePresence>
                        {isSubtaskLevel && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 font-medium"
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 -ml-1.5 hover:bg-muted text-muted-foreground"
                                    onClick={popCardFromStack}
                                >
                                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                                    Back
                                </Button>
                                <span className="text-muted-foreground/30">|</span>
                                {cardStack.slice(0, -1).map((crumb, idx) => (
                                    <div key={crumb.id} className="flex items-center gap-1.5">
                                        <span className="truncate max-w-[150px]">{crumb.title}</span>
                                        {idx < cardStack.length - 2 && (
                                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                                        )}
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <Input
                                value={title}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                className="text-xl font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0"
                                placeholder="Task title..."
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {isSaving && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Saving
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Metadata pills row */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        {/* Priority */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 rounded-lg text-xs">
                                    <Flag className={`w-3.5 h-3.5 ${priorityConfig[priority].textColor}`} />
                                    {priorityConfig[priority].label}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {(["high", "medium", "low"] as const).map((p) => (
                                    <DropdownMenuItem
                                        key={p}
                                        onClick={() => handlePriorityChange(p)}
                                        className="gap-2"
                                    >
                                        <span>{priorityConfig[p].icon}</span>
                                        {priorityConfig[p].label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Due Date */}
                        <div className="flex items-center gap-1.5">
                            <div className={`inline-flex items-center rounded-lg border h-8 px-2 text-xs font-medium ${isOverdue
                                    ? "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/5 text-red-500"
                                    : isDueSoon
                                        ? "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/5"
                                        : "border-border"
                                }`}>
                                <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={formatDateForInput(dueDate ?? null)}
                                    onChange={(e) => handleDueDateChange(e.target.value)}
                                    className="border-0 bg-transparent p-0 h-auto text-xs w-[110px] focus-visible:ring-0 shadow-none"
                                />
                            </div>
                            {isOverdue && (
                                <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                                    Overdue
                                </span>
                            )}
                        </div>

                        {/* Start Date */}
                        <div className="inline-flex items-center rounded-lg border border-border h-8 px-2 text-xs">
                            <Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                            <Input
                                type="date"
                                value={formatDateForInput(startDate ?? null)}
                                onChange={(e) => handleStartDateChange(e.target.value)}
                                className="border-0 bg-transparent p-0 h-auto text-xs w-[110px] focus-visible:ring-0 shadow-none"
                                title="Start date"
                            />
                        </div>

                        {/* Assignee */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 h-8 rounded-lg text-xs">
                                    {selectedAssignee ? (
                                        <>
                                            <UserAvatar user={selectedAssignee} className="w-4 h-4" showStatus={false} />
                                            <span className="max-w-24 truncate">{selectedAssignee.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserIcon className="w-3.5 h-3.5" />
                                            Assign
                                        </>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleAssigneeChange("")}>
                                    <UserIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                                    Unassigned
                                </DropdownMenuItem>
                                {workspaceMembers.map((member) => (
                                    <DropdownMenuItem
                                        key={member.id}
                                        onClick={() => handleAssigneeChange(member.id)}
                                        className="gap-2"
                                    >
                                        <UserAvatar user={member} className="w-5 h-5" showStatus={false} />
                                        {member.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Status toggle */}
                        <Button
                            variant={status === "completed" ? "default" : "outline"}
                            size="sm"
                            onClick={handleStatusToggle}
                            className={`gap-1.5 h-8 rounded-lg text-xs ${status === "completed" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                        >
                            <CircleCheck className="w-3.5 h-3.5" />
                            {status === "completed" ? "Completed" : "Mark Done"}
                        </Button>

                        <div className="w-[1px] h-4 bg-border/50 mx-1" />

                        {/* Epic */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-1.5 h-8 rounded-lg text-xs font-medium hover:bg-muted/50 border border-transparent hover:border-border/50">
                                    {(() => {
                                        const currentEpic = selectedEpicId ? epics.find(e => e.id === selectedEpicId) || currentCard.epic : null;
                                        return currentEpic ? (
                                            <>
                                                <span 
                                                    className="w-2.5 h-2.5 rounded-full shadow-sm"
                                                    style={{ backgroundColor: currentEpic.color }} 
                                                />
                                                {currentEpic.title}
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-2.5 h-2.5 rounded-full border border-dashed border-muted-foreground/50" />
                                                <span className="text-muted-foreground">Add Epic</span>
                                            </>
                                        );
                                    })()}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleEpicChange(null)}>
                                    <div className="w-3 h-3 rounded-full border border-dashed border-muted-foreground/50 mr-2" />
                                    None
                                </DropdownMenuItem>
                                {epics.map((ep) => (
                                    <DropdownMenuItem
                                        key={ep.id}
                                        onClick={() => handleEpicChange(ep.id)}
                                        className="gap-2"
                                    >
                                        <span 
                                            className="w-3 h-3 rounded-full" 
                                            style={{ backgroundColor: ep.color }} 
                                        />
                                        {ep.title}
                                        {selectedEpicId === ep.id && <span className="ml-auto">✓</span>}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Labels */}
                    <div className="px-6 py-4 border-b border-border/30">
                        <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2.5">
                            <Tag className="w-3.5 h-3.5" />
                            Labels
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_LABELS.map((label) => (
                                <button
                                    key={label}
                                    onClick={() => handleLabelToggle(label)}
                                    className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${labels.includes(label)
                                            ? `${labelColorMap[label] || "bg-violet-500/15 text-violet-700"} border-current/20 ring-1 ring-current/20`
                                            : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60"
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="px-6 py-4 border-b border-border/30">
                        <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-2.5">Description</h4>
                        <Textarea
                            value={description}
                            onChange={(e) => handleDescriptionChange(e.target.value)}
                            placeholder="Add a more detailed description..."
                            className="min-h-[80px] resize-none text-sm bg-muted/20 border-border/50 rounded-xl"
                        />
                    </div>

                    {/* Time Tracking */}
                    <div className="px-6 py-4 border-b border-border/30">
                        <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                            <Timer className="w-3.5 h-3.5" />
                            Time Tracking
                        </h4>

                        <div className="space-y-3">
                            {/* Story Points + Estimate row */}
                            <div className="flex items-center gap-3 flex-wrap">
                                {/* Story Points */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Points</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      placeholder="—"
                                      value={localStoryPoints}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        setLocalStoryPoints(val === "" ? "" : parseInt(val, 10))
                                      }}
                                      onBlur={() => {
                                        saveField("storyPoints",
                                          localStoryPoints === "" ? null 
                                          : Number(localStoryPoints))
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") e.currentTarget.blur()
                                      }}
                                      className="w-16 text-center border rounded-md px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                    <span className="text-xs text-muted-foreground">pts</span>
                                </div>

                                <div className="w-[1px] h-4 bg-border/50" />

                                {/* Original Estimate */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Estimate</span>
                                    <Input
                                        value={estimateInput}
                                        onChange={(e) => setEstimateInput(e.target.value)}
                                        onBlur={handleEstimateBlur}
                                        onKeyDown={(e) => e.key === "Enter" && handleEstimateBlur()}
                                        placeholder="e.g. 4h 30m"
                                        className="h-7 w-[100px] text-xs rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Progress bar */}
                            {timeEstimated != null && timeEstimated > 0 && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-muted-foreground">
                                            {formatMinutesToDisplay(totalLoggedMinutes)} / {formatMinutesToDisplay(timeEstimated)} logged
                                        </span>
                                        <span className={`font-semibold ${timeProgress > 100 ? "text-red-500" : timeProgress >= 80 ? "text-amber-500" : "text-emerald-500"}`}>
                                            {Math.round(timeProgress)}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${timeProgress > 100 ? "bg-red-500" : timeProgress >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                                            style={{ width: `${Math.min(timeProgress, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Log Time Button + Form */}
                            {!isTimeLogOpen ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs rounded-lg gap-1.5"
                                    onClick={() => setIsTimeLogOpen(true)}
                                >
                                    <Play className="w-3 h-3" />
                                    Log Time
                                </Button>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2 bg-muted/20 rounded-xl p-3 border border-border/50"
                                >
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Hours</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={logHours}
                                                onChange={(e) => setLogHours(e.target.value)}
                                                placeholder="0"
                                                className="h-7 text-xs rounded-lg mt-0.5"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Minutes</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={logMinutes}
                                                onChange={(e) => setLogMinutes(e.target.value)}
                                                placeholder="0"
                                                className="h-7 text-xs rounded-lg mt-0.5"
                                            />
                                        </div>
                                    </div>
                                    <Input
                                        value={logDescription}
                                        onChange={(e) => setLogDescription(e.target.value)}
                                        placeholder="What did you work on?"
                                        className="h-7 text-xs rounded-lg"
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs rounded-lg"
                                            onClick={() => { setIsTimeLogOpen(false); setLogHours(""); setLogMinutes(""); setLogDescription(""); }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs rounded-lg gap-1"
                                            onClick={handleLogTime}
                                            disabled={!logHours && !logMinutes}
                                        >
                                            <Plus className="w-3 h-3" />
                                            Log
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Time Log History */}
                            {timeLogs.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">History</span>
                                    {timeLogs.map((log: any) => (
                                        <div key={log.id} className="flex items-center gap-2 group py-1 px-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors">
                                            <UserAvatar user={{ name: log.user?.name, image: log.user?.image }} className="w-5 h-5" showStatus={false} />
                                            <span className="text-xs font-medium">{formatMinutesToDisplay(log.duration)}</span>
                                            {log.description && (
                                                <span className="text-xs text-muted-foreground truncate flex-1">\u2014 {log.description}</span>
                                            )}
                                            <span className="text-[10px] text-muted-foreground ml-auto">
                                                {format(new Date(log.createdAt), "MMM d")}
                                            </span>
                                            {log.userId === currentUserId && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleDeleteTimeLog(log.id)}
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Checklist */}
                    <div className="px-6 py-4 border-b border-border/30">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <CheckSquare className="w-3.5 h-3.5" />
                                Checklist
                                {totalItems > 0 && (
                                    <span className="normal-case tracking-normal text-[11px]">
                                        {completedItems}/{totalItems}
                                    </span>
                                )}
                            </h4>
                            {totalItems > 0 && (
                                <ProgressRing progress={checklistProgress} />
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <AnimatePresence>
                                {checklist.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center gap-2.5 group py-1 px-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors"
                                    >
                                        <Checkbox
                                            checked={item.completed}
                                            onCheckedChange={(checked) =>
                                                toggleChecklistItem(item.id, checked as boolean)
                                            }
                                        />
                                        <span className={`flex-1 text-sm ${item.completed ? "line-through text-muted-foreground" : ""
                                            }`}>
                                            {item.content}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => deleteChecklistItem(item.id)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            <div className="flex gap-2 pt-1">
                                <Input
                                    value={newChecklistItem}
                                    onChange={(e) => setNewChecklistItem(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                                    placeholder="Add an item..."
                                    className="h-8 text-sm rounded-lg"
                                />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={addChecklistItem}
                                    disabled={!newChecklistItem.trim()}
                                    className="rounded-lg h-8 w-8 p-0"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Subtasks */}
                    <div className="px-6 py-4 border-b border-border/30">
                        <SubtaskList
                            parentCardId={currentCard.id}
                            workspaceMembers={workspaceMembers}
                            onOpenSubtask={pushCardToStack}
                        />
                    </div>

                    {/* Dependencies */}
                    <div className="px-6 py-4 border-b border-border/30">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Link2 className="w-3.5 h-3.5" />
                                Dependencies
                                {(blocking.length + blockedBy.length) > 0 && (
                                    <span className="normal-case tracking-normal text-[11px]">({blocking.length + blockedBy.length})</span>
                                )}
                            </h4>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs rounded-lg gap-1"
                                onClick={() => setDepAddOpen(!depAddOpen)}
                            >
                                <Plus className="w-3 h-3" />
                                Add
                            </Button>
                        </div>

                        {/* Add dependency widget */}
                        <AnimatePresence>
                            {depAddOpen && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-3"
                                >
                                    <div className="border border-border/50 rounded-xl p-3 bg-muted/10 space-y-2">
                                        {/* Direction selector */}
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setDepDirection("blocked_by")}
                                                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors ${
                                                    depDirection === "blocked_by"
                                                        ? "bg-red-500/15 text-red-700 dark:text-red-300"
                                                        : "text-muted-foreground hover:bg-muted/50"
                                                }`}
                                            >
                                                Blocked by
                                            </button>
                                            <button
                                                onClick={() => setDepDirection("blocking")}
                                                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors ${
                                                    depDirection === "blocking"
                                                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                                        : "text-muted-foreground hover:bg-muted/50"
                                                }`}
                                            >
                                                Blocks
                                            </button>
                                        </div>
                                        {/* Search input */}
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                            <Input
                                                value={depSearchQuery}
                                                onChange={(e) => {
                                                    setDepSearchQuery(e.target.value);
                                                    searchCards(e.target.value);
                                                }}
                                                placeholder="Search tasks by title..."
                                                className="pl-8 h-8 text-xs rounded-lg"
                                                autoFocus
                                            />
                                        </div>
                                        {/* Search results */}
                                        {depSearching && (
                                            <div className="flex items-center justify-center py-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                            </div>
                                        )}
                                        {depSearchResults.length > 0 && (
                                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                                {depSearchResults.map((result) => (
                                                    <button
                                                        key={result.id}
                                                        onClick={() => addDependency(result.id)}
                                                        className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm hover:bg-muted/50 transition-colors"
                                                    >
                                                        <span className="truncate flex-1">{result.title}</span>
                                                        {result.issueNumber ? (
                                                            <span className="text-[10px] text-muted-foreground">#{result.issueNumber}</span>
                                                        ) : null}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {depSearchQuery.length >= 2 && !depSearching && depSearchResults.length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-2">No matching tasks found</p>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Blocked by list */}
                        {blockedBy.length > 0 && (
                            <div className="mb-2">
                                <p className="text-[11px] font-medium text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Blocked by
                                </p>
                                <div className="space-y-1">
                                    {blockedBy.map((dep) => (
                                        <div key={dep.id} className="flex items-center gap-2 group px-2.5 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                            <span className="text-sm truncate flex-1">{dep.card.title}</span>
                                            {dep.card.status === "completed" && (
                                                <span className="text-[10px] bg-emerald-500/15 text-emerald-600 px-1.5 py-0.5 rounded">Done</span>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => removeDependency(dep.id)}
                                            >
                                                <X className="w-3 h-3 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Blocking list */}
                        {blocking.length > 0 && (
                            <div>
                                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                                    <Link2 className="w-3 h-3" />
                                    Blocking
                                </p>
                                <div className="space-y-1">
                                    {blocking.map((dep) => (
                                        <div key={dep.id} className="flex items-center gap-2 group px-2.5 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                            <span className="text-sm truncate flex-1">{dep.card.title}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => removeDependency(dep.id)}
                                            >
                                                <X className="w-3 h-3 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {blocking.length === 0 && blockedBy.length === 0 && !depAddOpen && (
                            <p className="text-xs text-muted-foreground">No dependencies yet</p>
                        )}
                    </div>

                    {/* GitHub Activity */}
                    {card && <GitHubActivitySection cardId={card.id} />}

                    {/* Comments */}
                    <div className="px-6 py-4">
                        <h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Comments
                            {comments.length > 0 && (
                                <span className="normal-case tracking-normal text-[11px]">({comments.length})</span>
                            )}
                        </h4>

                        {isLoadingComments ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-48 overflow-y-auto kanban-scroll mb-3">
                                <AnimatePresence>
                                    {comments.map((comment) => (
                                        <motion.div
                                            key={comment.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex gap-3 group p-2.5 -mx-2 rounded-xl hover:bg-muted/20 transition-colors"
                                        >
                                            <UserAvatar user={comment.author} className="w-7 h-7" showStatus={false} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">
                                                        {comment.author.name}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                                                    </span>
                                                    {comment.authorId === currentUserId && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                                            onClick={() => deleteComment(comment.id)}
                                                        >
                                                            <Trash2 className="w-3 h-3 text-destructive" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                                                    {comment.content}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                <div ref={commentsEndRef} />
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Input
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addComment()}
                                placeholder="Write a comment..."
                                className="flex-1 rounded-lg text-sm"
                            />
                            <Button
                                onClick={addComment}
                                disabled={!newComment.trim()}
                                size="sm"
                                className="rounded-lg h-9 px-3"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
