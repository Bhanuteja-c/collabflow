// src/app/workspace/[slug]/kanban/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Loader2,
  LayoutGrid,
  Wifi,
  WifiOff,
  Filter,
  Users,
  X,
  Columns,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
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
  startDate?: string;
  labels?: string[];
  status?: string;
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
  const [workspaceId, setWorkspaceId] = useState<string>("");

  // Board title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  // Add column
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // Filters
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);

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
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Real-time sync callbacks
  const handleRemoteCardMoved = useCallback(
    (data: {
      cardId: string;
      fromColumnId: string;
      toColumnId: string;
      newOrder: number;
    }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        let movedCard: Card | undefined;
        const columnsWithoutCard = prev.columns.map((col) => {
          if (col.id === data.fromColumnId) {
            movedCard = col.cards.find((c) => c.id === data.cardId);
            return {
              ...col,
              cards: col.cards.filter((c) => c.id !== data.cardId),
            };
          }
          return col;
        });
        if (!movedCard) return prev;
        return {
          ...prev,
          columns: columnsWithoutCard.map((col) => {
            if (col.id === data.toColumnId) {
              const newCards = [...col.cards];
              newCards.splice(data.newOrder, 0, {
                ...movedCard!,
                order: data.newOrder,
              });
              return { ...col, cards: newCards };
            }
            return col;
          }),
        };
      });
    },
    [],
  );

  const handleRemoteCardCreated = useCallback(
    (data: { columnId: string; card: Card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === data.columnId
              ? {
                  ...col,
                  cards: [
                    ...col.cards.filter((c) => c.id !== data.card.id),
                    data.card,
                  ],
                }
              : col,
          ),
        };
      });
    },
    [],
  );

  const handleRemoteCardUpdated = useCallback(
    (data: { cardId: string; updates: Partial<Card> }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) =>
              c.id === data.cardId ? { ...c, ...data.updates } : c,
            ),
          })),
        };
      });
    },
    [],
  );

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
  const {
    connected: syncConnected,
    viewers,
    emitCardMoved,
    emitCardCreated,
    emitCardDeleted,
  } = useKanbanSync({
    boardId: board?.id || null,
    currentUser,
    onCardMoved: handleRemoteCardMoved,
    onCardCreated: handleRemoteCardCreated,
    onCardUpdated: handleRemoteCardUpdated,
    onCardDeleted: handleRemoteCardDeleted,
  });

  // Board stats
  const boardStats = useMemo(() => {
    if (!board) return { total: 0, completed: 0, overdue: 0, inProgress: 0 };
    const allCards = board.columns.flatMap((col) => col.cards);
    const now = new Date();
    const doneColumnNames = [
      "done",
      "complete",
      "completed",
      "finished",
      "closed",
    ];
    const doneCards = board.columns
      .filter((col) => doneColumnNames.includes(col.title.toLowerCase()))
      .flatMap((col) => col.cards);
    const overdueCards = allCards.filter(
      (c) =>
        c.dueDate &&
        new Date(c.dueDate) < now &&
        !doneColumnNames.includes(
          board.columns
            .find((col) => col.cards.some((card) => card.id === c.id))
            ?.title.toLowerCase() || "",
        ),
    );
    return {
      total: allCards.length,
      completed: doneCards.length,
      overdue: overdueCards.length,
      inProgress: allCards.length - doneCards.length,
    };
  }, [board]);

  // All unique labels across cards
  const allLabels = useMemo(() => {
    if (!board) return [];
    const labels = new Set<string>();
    board.columns.forEach((col) =>
      col.cards.forEach((card) => card.labels?.forEach((l) => labels.add(l))),
    );
    return Array.from(labels);
  }, [board]);

  // Check if a card is overdue
  const isCardOverdue = (card: Card) => {
    if (!card.dueDate) return false;
    return new Date(card.dueDate) < new Date();
  };

  // Filter cards in columns
  const filteredBoard = useMemo(() => {
    if (!board) return null;
    if (!filterPriority && !filterAssignee && !filterOverdue && !filterLabel)
      return board;

    return {
      ...board,
      columns: board.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((card) => {
          if (filterPriority && card.priority !== filterPriority) return false;
          if (filterAssignee && card.assigneeId !== filterAssignee)
            return false;
          if (filterOverdue && !isCardOverdue(card)) return false;
          if (filterLabel && !(card.labels || []).includes(filterLabel))
            return false;
          return true;
        }),
      })),
    };
  }, [board, filterPriority, filterAssignee, filterOverdue, filterLabel]);

  const hasActiveFilters =
    filterPriority || filterAssignee || filterOverdue || filterLabel;

  const clearFilters = () => {
    setFilterPriority(null);
    setFilterAssignee(null);
    setFilterOverdue(false);
    setFilterLabel(null);
  };

  // Fetch workspace ID first
  useEffect(() => {
    const fetchWorkspace = async () => {
      if (!params?.slug) return;
      try {
        const res = await fetch(`/api/workspaces/${params.slug}`);
        if (res.ok) {
          const ws = await res.json();
          setWorkspaceId(ws.id);
        }
      } catch (error) {
        console.error("Error fetching workspace:", error);
      }
    };
    fetchWorkspace();
  }, [params?.slug]);

  // Fetch board when workspaceId is available
  useEffect(() => {
    if (!workspaceId) return;
    fetchBoard();
    fetchWorkspaceMembers();
  }, [workspaceId]);

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
      const res = await fetch(`/api/boards?workspaceId=${workspaceId}`);
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
        body: JSON.stringify({ title: "Project Board", workspaceId }),
      });
      if (res.ok) {
        const newBoard = await res.json();
        setBoard(newBoard);
        toast.success("Board created");
      }
    } catch (error) {
      toast.error("Failed to create board");
    } finally {
      setCreating(false);
    }
  };

  // Board title edit
  const saveBoardTitle = async () => {
    if (!board || !titleDraft.trim()) {
      setEditingTitle(false);
      return;
    }
    try {
      await fetch(`/api/boards/${board.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleDraft.trim() }),
      });
      setBoard({ ...board, title: titleDraft.trim() });
      toast.success("Board title updated");
    } catch {
      toast.error("Failed to update title");
    } finally {
      setEditingTitle(false);
    }
  };

  // Column management
  const addColumn = async () => {
    if (!board || !newColumnTitle.trim()) {
      setAddingColumn(false);
      return;
    }
    try {
      const res = await fetch(`/api/boards/${board.id}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newColumnTitle.trim() }),
      });
      if (res.ok) {
        const newCol = await res.json();
        setBoard({
          ...board,
          columns: [...board.columns, { ...newCol, cards: [] }],
        });
        toast.success("Column added");
      }
    } catch {
      toast.error("Failed to add column");
    } finally {
      setNewColumnTitle("");
      setAddingColumn(false);
    }
  };

  const renameColumn = async (columnId: string, title: string) => {
    if (!board) return;
    try {
      await fetch(`/api/boards/${board.id}/columns`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId, title }),
      });
      setBoard({
        ...board,
        columns: board.columns.map((col) =>
          col.id === columnId ? { ...col, title } : col,
        ),
      });
    } catch {
      toast.error("Failed to rename column");
    }
  };

  const deleteColumn = async (columnId: string) => {
    if (!board) return;
    if (board.columns.length <= 1) {
      toast.error("Cannot delete the last column");
      return;
    }
    try {
      await fetch(`/api/boards/${board.id}/columns?columnId=${columnId}`, {
        method: "DELETE",
      });
      // Remove column and refetch to get updated card positions
      setBoard({
        ...board,
        columns: board.columns.filter((col) => col.id !== columnId),
      });
      toast.success("Column deleted");
      // Refetch to get accurate data after card migration
      setTimeout(() => fetchBoard(), 500);
    } catch {
      toast.error("Failed to delete column");
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
              : col,
          ),
        });
        emitCardCreated(columnId, newCard);
      }
    } catch (error) {
      toast.error("Failed to create card");
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
              c.id === cardId ? { ...c, title } : c,
            ),
          })),
        });
      }
    } catch (error) {
      toast.error("Failed to update card");
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
      emitCardDeleted(cardId);
      toast.success("Task deleted");
    } catch (error) {
      toast.error("Failed to delete task");
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

  const handleUpdateCardFromModal = (
    cardId: string,
    updates: Partial<Card>,
  ) => {
    if (!board) return;

    setBoard({
      ...board,
      columns: board.columns.map((col) => ({
        ...col,
        cards: col.cards.map((c) =>
          c.id === cardId ? { ...c, ...updates } : c,
        ),
      })),
    });

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

    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id)
      return;

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
            col.id === activeColumn.id ? { ...col, cards: newCards } : col,
          ),
        });

        emitCardMoved(
          active.id as string,
          activeColumn.id,
          activeColumn.id,
          newIndex,
        );

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
          toast.error("Failed to move card");
        }
      }
    } else {
      const newColumn = board.columns.find((c) => c.id === overColumn.id);
      const cardIndex =
        newColumn?.cards.findIndex((c) => c.id === active.id) ?? 0;

      emitCardMoved(
        active.id as string,
        activeColumn.id,
        overColumn.id,
        cardIndex,
      );

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
        toast.error("Failed to move card");
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
          <p className="text-muted-foreground mb-4">
            Create your first board to start tracking tasks
          </p>
          <Button
            onClick={createBoard}
            disabled={creating}
            className="btn-primary"
          >
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
            {editingTitle ? (
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveBoardTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveBoardTitle();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                autoFocus
                className="text-xl font-bold w-64 h-9"
              />
            ) : (
              <h1
                className="text-xl sm:text-2xl font-bold tracking-tight truncate cursor-pointer hover:text-primary/80 transition-colors"
                onClick={() => {
                  setTitleDraft(board.title);
                  setEditingTitle(true);
                }}
                title="Click to rename"
              >
                {board.title}
              </h1>
            )}
            {syncConnected ? (
              <span
                className="flex items-center gap-1 text-xs text-emerald-500"
                title="Real-time sync active"
              >
                <Wifi className="w-3 h-3" />
              </span>
            ) : (
              <span
                className="flex items-center gap-1 text-xs text-amber-500"
                title="Connecting..."
              >
                <WifiOff className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Center - Stats + Viewers */}
          <div className="hidden md:flex items-center gap-3">
            {/* Board stats */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 text-xs">
                <Columns className="w-3 h-3" />
                {boardStats.total} tasks
              </Badge>
              {boardStats.completed > 0 && (
                <Badge
                  variant="secondary"
                  className="gap-1 text-xs bg-emerald-500/10 text-emerald-600"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {boardStats.completed} done
                </Badge>
              )}
              {boardStats.overdue > 0 && (
                <Badge
                  variant="secondary"
                  className="gap-1 text-xs bg-red-500/10 text-red-600"
                >
                  <AlertTriangle className="w-3 h-3" />
                  {boardStats.overdue} overdue
                </Badge>
              )}
            </div>

            {/* Viewers (presence) */}
            {viewers.length > 0 && (
              <div className="flex items-center gap-1 ml-2">
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
          </div>

          {/* Right side - Filters and actions */}
          <div className="flex items-center gap-2">
            {/* Filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={hasActiveFilters ? "secondary" : "outline"}
                  size="sm"
                  className="gap-2"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filter</span>
                  {hasActiveFilters && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() =>
                    setFilterPriority(filterPriority === "high" ? null : "high")
                  }
                  className="gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  High Priority
                  {filterPriority === "high" && (
                    <span className="ml-auto">✓</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setFilterPriority(
                      filterPriority === "medium" ? null : "medium",
                    )
                  }
                  className="gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Medium Priority
                  {filterPriority === "medium" && (
                    <span className="ml-auto">✓</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setFilterPriority(filterPriority === "low" ? null : "low")
                  }
                  className="gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Low Priority
                  {filterPriority === "low" && (
                    <span className="ml-auto">✓</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setFilterOverdue(!filterOverdue)}
                  className="gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  Overdue Only
                  {filterOverdue && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setFilterAssignee(
                      filterAssignee === session?.user?.id
                        ? null
                        : session?.user?.id || null,
                    )
                  }
                  className="gap-2"
                >
                  <Users className="w-3.5 h-3.5" />
                  Assigned to Me
                  {filterAssignee === session?.user?.id && (
                    <span className="ml-auto">✓</span>
                  )}
                </DropdownMenuItem>
                {allLabels.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {allLabels.map((label) => (
                      <DropdownMenuItem
                        key={label}
                        onClick={() =>
                          setFilterLabel(filterLabel === label ? null : label)
                        }
                        className="gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                        {label}
                        {filterLabel === label && (
                          <span className="ml-auto">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-1 text-muted-foreground"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}

            {/* Add Column */}
            {addingColumn ? (
              <div className="flex items-center gap-1">
                <Input
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addColumn();
                    if (e.key === "Escape") setAddingColumn(false);
                  }}
                  placeholder="Column name..."
                  autoFocus
                  className="h-8 w-36 text-sm"
                />
                <Button size="sm" onClick={addColumn} className="h-8">
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddingColumn(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setAddingColumn(true)}
                className="btn-glow flex-shrink-0"
                size="sm"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Column</span>
              </Button>
            )}
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
                  onRenameColumn={renameColumn}
                  onDeleteColumn={deleteColumn}
                  canDelete={board.columns.length > 1}
                />
              </motion.div>
            ))}
          </div>

          <DragOverlay>
            {activeCard && <KanbanCard card={activeCard} isDragging />}
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
