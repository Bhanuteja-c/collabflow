// src/components/kanban/SubtaskList.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Loader2,
  CheckCircle2,
  Circle,
  ChevronRight,
  ListTree,
  User,
  Flag,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isBefore } from "date-fns";
import { toast } from "sonner";

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

const priorityConfig = {
  high: { textColor: "text-red-600 dark:text-red-400", label: "High", icon: "🔴" },
  medium: { textColor: "text-amber-600 dark:text-amber-400", label: "Medium", icon: "🟡" },
  low: { textColor: "text-emerald-600 dark:text-emerald-400", label: "Low", icon: "🟢" },
};

interface Subtask {
  id: string;
  title: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assigneeId?: string;
  assignee?: User;
  issueNumber?: number;
  commentsCount?: number;
  checklistTotal?: number;
}

interface SubtaskListProps {
  parentCardId: string;
  workspaceMembers?: User[];
  onOpenSubtask?: (subtask: Subtask) => void;
}

export default function SubtaskList({
  parentCardId,
  workspaceMembers = [],
  onOpenSubtask,
}: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTitle, setAddingTitle] = useState("");
  const [addingPriority, setAddingPriority] = useState<"low" | "medium" | "high">("medium");
  const [addingAssigneeId, setAddingAssigneeId] = useState<string>("");
  const [addingDueDate, setAddingDueDate] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);

  // Helper
  const selectedAssignee = workspaceMembers.find((m) => m.id === addingAssigneeId);

  const fetchSubtasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/cards/${parentCardId}/subtasks`);
      if (res.ok) {
        const data = await res.json();
        setSubtasks(data);
      }
    } catch (err) {
      console.error("Failed to fetch subtasks:", err);
    } finally {
      setLoading(false);
    }
  }, [parentCardId]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  const handleAddSubtask = useCallback(async () => {
    if (!addingTitle.trim() || isAdding) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/cards/${parentCardId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: addingTitle.trim(),
          priority: addingPriority,
          assigneeId: addingAssigneeId || undefined,
          dueDate: addingDueDate ? new Date(addingDueDate).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        const newSubtask = await res.json();
        setSubtasks((prev) => [...prev, newSubtask]);
        setAddingTitle("");
        setAddingPriority("medium");
        setAddingAssigneeId("");
        setAddingDueDate("");
        setShowAddInput(false);
        toast.success("Subtask created");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create subtask");
      }
    } catch {
      toast.error("Failed to create subtask");
    } finally {
      setIsAdding(false);
    }
  }, [addingTitle, isAdding, parentCardId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleAddSubtask();
      } else if (e.key === "Escape") {
        setShowAddInput(false);
        setAddingTitle("");
      }
    },
    [handleAddSubtask]
  );

  const toggleSubtaskStatus = useCallback(
    async (subtask: Subtask) => {
      const newStatus =
        subtask.status === "completed" ? "active" : "completed";
      try {
        const res = await fetch(`/api/cards/${subtask.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          setSubtasks((prev) =>
            prev.map((st) =>
              st.id === subtask.id ? { ...st, status: newStatus } : st
            )
          );
        }
      } catch {
        toast.error("Failed to update subtask");
      }
    },
    []
  );

  const completed = subtasks.filter((s) => s.status === "completed").length;
  const total = subtasks.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-sm">Loading subtasks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTree className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Subtasks</span>
          {total > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 font-mono"
            >
              {completed}/{total}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => setShowAddInput(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <Progress value={progress} className="h-1.5" />
      )}

      {/* Subtask list */}
      <div className="space-y-0.5">
        <AnimatePresence>
          {subtasks.map((subtask) => (
            <motion.div
              key={subtask.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors"
            >
              {/* Status toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSubtaskStatus(subtask);
                }}
                className="shrink-0"
              >
                {subtask.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                )}
              </button>

              {/* Title */}
              <button
                className={`text-sm truncate flex-1 text-left ${
                  subtask.status === "completed"
                    ? "line-through text-muted-foreground"
                    : ""
                }`}
                onClick={() => onOpenSubtask?.(subtask)}
              >
                {subtask.title}
              </button>

              {/* Priority badge */}
              {subtask.priority && subtask.priority !== "medium" && (
                <div title={`${subtask.priority} priority`} className="shrink-0 flex items-center">
                  {priorityConfig[subtask.priority as keyof typeof priorityConfig]?.icon}
                </div>
              )}

              {/* Due Date */}
              {subtask.dueDate && (
                <div 
                  className={`shrink-0 flex items-center gap-1 text-[10px] ${
                    subtask.status === "completed" 
                      ? "text-muted-foreground" 
                      : isBefore(new Date(subtask.dueDate), new Date()) 
                        ? "text-red-500 font-medium" 
                        : "text-muted-foreground"
                  }`}
                  title="Due Date"
                >
                  <Calendar className="w-3 h-3" />
                  {format(new Date(subtask.dueDate), "MMM d")}
                </div>
              )}

              {/* Assignee avatar */}
              {subtask.assignee && (
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage src={subtask.assignee.image || undefined} />
                  <AvatarFallback className="text-[9px]">
                    {subtask.assignee.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Open detail */}
              <ChevronRight
                className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors shrink-0 cursor-pointer"
                onClick={() => onOpenSubtask?.(subtask)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add subtask input */}
      <AnimatePresence>
        {showAddInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2"
          >
            <div className="flex flex-col gap-2 w-full p-3 border border-border/50 bg-background rounded-lg shadow-sm">
              <Input
                autoFocus
                value={addingTitle}
                onChange={(e) => setAddingTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What needs to be done?"
                className="h-8 text-sm border-0 focus-visible:ring-0 px-1 placeholder:text-muted-foreground/50 shadow-none font-medium"
                disabled={isAdding}
              />
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  {/* Priority Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1.5 focus-visible:ring-0">
                        <Flag className={`w-3 h-3 ${priorityConfig[addingPriority].textColor}`} />
                        <span className="hidden sm:inline">{priorityConfig[addingPriority].label}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {(["high", "medium", "low"] as const).map((p) => (
                        <DropdownMenuItem key={p} onClick={() => setAddingPriority(p)} className="text-xs">
                          {priorityConfig[p].icon} {priorityConfig[p].label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Assignee Dropdown */}
                  {workspaceMembers.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1.5 focus-visible:ring-0">
                          {selectedAssignee ? (
                            <>
                              <Avatar className="w-4 h-4">
                                <AvatarImage src={selectedAssignee.image || undefined} />
                                <AvatarFallback className="text-[8px]">{selectedAssignee.name?.[0] || "?"}</AvatarFallback>
                              </Avatar>
                              <span className="hidden sm:inline w-16 truncate text-left">{selectedAssignee.name?.split(" ")[0]}</span>
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="hidden sm:inline text-muted-foreground">Assign</span>
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48 max-h-[200px] overflow-y-auto">
                        <DropdownMenuItem onClick={() => setAddingAssigneeId("")} className="text-xs">
                          <User className="w-3 h-3 mr-2" /> Unassigned
                        </DropdownMenuItem>
                        {workspaceMembers.map(member => (
                          <DropdownMenuItem key={member.id} onClick={() => setAddingAssigneeId(member.id)} className="text-xs gap-2">
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={member.image || undefined} />
                              <AvatarFallback className="text-[8px]">{member.name?.[0] || "?"}</AvatarFallback>
                            </Avatar>
                            {member.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Due Date */}
                  <div className="inline-flex items-center rounded-md border border-border h-7 px-2 text-xs">
                    <Calendar className="w-3 h-3 mr-1.5 text-muted-foreground" />
                    <Input
                      type="date"
                      value={addingDueDate ? format(new Date(addingDueDate), "yyyy-MM-dd") : ""}
                      onChange={(e) => setAddingDueDate(e.target.value)}
                      className="border-0 bg-transparent p-0 h-auto text-xs focus-visible:ring-0 shadow-none w-auto max-w-[100px]"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => {
                      setShowAddInput(false);
                      setAddingTitle("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={handleAddSubtask}
                    disabled={!addingTitle.trim() || isAdding}
                  >
                    {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {total === 0 && !showAddInput && (
        <p className="text-xs text-muted-foreground/60 px-2 py-1">
          No subtasks yet. Click &quot;Add&quot; to create one.
        </p>
      )}
    </div>
  );
}
