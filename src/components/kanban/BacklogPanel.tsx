// src/components/kanban/BacklogPanel.tsx
"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  GripVertical,
  ArrowRight,
  Inbox,
  Loader2,
  AlertCircle,
  Clock,
  Hash,
} from "lucide-react";

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface BacklogCard {
  id: string;
  title: string;
  description?: string;
  issueType?: string;
  issueNumber?: number;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  labels?: string[];
  status?: string;
  storyPoints?: number | null;
  assigneeId?: string;
  assignee?: User;
  subtaskCount?: number;
  commentsCount?: number;
}

interface BacklogPanelProps {
  boardId: string;
  backlogItems: BacklogCard[];
  totalCount: number;
  loading: boolean;
  columns: { id: string; title: string }[];
  onMoveToBoard: (cardId: string, columnId: string) => void;
  onAddItem: (title: string) => void;
  onOpenDetail: (card: BacklogCard) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const priorityColors: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-blue-400",
};

const priorityIcons: Record<string, string> = {
  high: "↑",
  medium: "→",
  low: "↓",
};

export default function BacklogPanel({
  boardId,
  backlogItems,
  totalCount,
  loading,
  columns,
  onMoveToBoard,
  onAddItem,
  onOpenDetail,
  onLoadMore,
  hasMore,
}: BacklogPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);

  const handleQuickAdd = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && quickAddValue.trim()) {
        onAddItem(quickAddValue.trim());
        setQuickAddValue("");
      }
    },
    [quickAddValue, onAddItem]
  );

  const handleAddClick = useCallback(() => {
    if (quickAddValue.trim()) {
      onAddItem(quickAddValue.trim());
      setQuickAddValue("");
    }
  }, [quickAddValue, onAddItem]);

  return (
    <div className="bg-card/50 border border-border/50 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Backlog</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
            {totalCount}
          </Badge>
        </div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Quick Add */}
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2">
                <Input
                  value={quickAddValue}
                  onChange={(e) => setQuickAddValue(e.target.value)}
                  onKeyDown={handleQuickAdd}
                  placeholder="Quick add to backlog..."
                  className="h-8 text-sm bg-muted/30 border-border/30"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 shrink-0"
                  onClick={handleAddClick}
                  disabled={!quickAddValue.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Items */}
            <div className="px-2 pb-2 space-y-0.5 max-h-[400px] overflow-y-auto scrollbar-thin">
              {loading && backlogItems.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Loading backlog...</span>
                </div>
              ) : backlogItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Inbox className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-sm">No backlog items</span>
                  <span className="text-xs mt-1 opacity-70">
                    Add tasks above or drag cards here
                  </span>
                </div>
              ) : (
                backlogItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => onOpenDetail(item)}
                  >
                    {/* Grip */}
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 shrink-0" />

                    {/* Issue Number */}
                    {item.issueNumber ? (
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        <Hash className="h-3 w-3 inline -mt-0.5" />
                        {item.issueNumber}
                      </span>
                    ) : null}

                    {/* Title */}
                    <span className="text-sm truncate flex-1">{item.title}</span>

                    {/* Priority */}
                    {item.priority && (
                      <span
                        className={`text-xs font-medium shrink-0 ${
                          priorityColors[item.priority] || ""
                        }`}
                      >
                        {priorityIcons[item.priority]}
                      </span>
                    )}

                    {/* Story Points */}
                    {item.storyPoints != null && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 h-4 shrink-0 font-mono"
                      >
                        {item.storyPoints}
                      </Badge>
                    )}

                    {/* Subtask count */}
                    {item.subtaskCount != null && item.subtaskCount > 0 && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        ⊞ {item.subtaskCount}
                      </span>
                    )}

                    {/* Assignee */}
                    {item.assignee && (
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={item.assignee.image || undefined} />
                        <AvatarFallback className="text-[9px]">
                          {item.assignee.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* Move to board button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Move to first column by default
                        if (columns.length > 0) {
                          onMoveToBoard(item.id, columns[0].id);
                        }
                      }}
                      title="Move to board"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}

              {/* Load more */}
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={onLoadMore}
                >
                  Load more...
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
