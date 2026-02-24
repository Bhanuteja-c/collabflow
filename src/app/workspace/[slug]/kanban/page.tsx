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
import CreateCardDialog from "@/components/kanban/CreateCardDialog";
import {
  Plus,
  Loader2,
  LayoutGrid,
  WifiOff,
  Filter,
  Users,
  X,
  Columns,
  CheckCircle2,
  AlertTriangle,
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

  // Create card dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogColumnId, setCreateDialogColumnId] = useState("");

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

  const addCard = async (columnId: string, title: string, extra?: Partial<Card>) => {
    if (!board || !title.trim()) return;

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          columnId,
          ...(extra?.priority && { priority: extra.priority }),
          ...(extra?.assigneeId && { assigneeId: extra.assigneeId }),
          ...(extra?.dueDate && { dueDate: extra.dueDate }),
          ...(extra?.startDate && { startDate: extra.startDate }),
          ...(extra?.labels && extra.labels.length > 0 && { labels: extra.labels }),
          ...(extra?.description && { description: extra.description }),
        }),
      });

      if (res.ok) {
        const newCard = await res.json();
        // Normalize card to ensure all fields exist for consistent rendering
        const normalizedCard: Card = {
          id: newCard.id,
          title: newCard.title,
          description: newCard.description || undefined,
          order: newCard.order ?? 0,
          priority: newCard.priority || "medium",
          dueDate: newCard.dueDate || undefined,
          startDate: newCard.startDate || undefined,
          labels: newCard.labels || [],
          status: newCard.status || "active",
          assigneeId: newCard.assigneeId || undefined,
          assignee: newCard.assignee || undefined,
          commentsCount: newCard.commentsCount ?? 0,
          checklistCompleted: newCard.checklistCompleted ?? 0,
          checklistTotal: newCard.checklistTotal ?? 0,
        };
        setBoard({
          ...board,
          columns: board.columns.map((col) =>
            col.id === columnId
              ? { ...col, cards: [...col.cards, normalizedCard] }
              : col,
          ),
        });
        emitCardCreated(columnId, normalizedCard);
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

  const handleMoveCardFromModal = (
    cardId: string,
    targetColumnId: string,
    updates: Partial<Card>,
  ) => {
    if (!board) return;

    // Find current column and the card
    let movedCard: Card | undefined;
    let fromColumnId: string | undefined;

    for (const col of board.columns) {
      const found = col.cards.find((c) => c.id === cardId);
      if (found) {
        movedCard = { ...found, ...updates };
        fromColumnId = col.id;
        break;
      }
    }

    if (!movedCard || !fromColumnId || fromColumnId === targetColumnId) {
      // Already in target column or not found, just apply updates
      handleUpdateCardFromModal(cardId, updates);
      return;
    }

    // Move card between columns
    setBoard({
      ...board,
      columns: board.columns.map((col) => {
        if (col.id === fromColumnId) {
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        }
        if (col.id === targetColumnId) {
          return { ...col, cards: [...col.cards, movedCard!] };
        }
        return col;
      }),
    });

    // Broadcast move via socket
    const targetCol = board.columns.find((c) => c.id === targetColumnId);
    const newOrder = targetCol ? targetCol.cards.length : 0;
    emitCardMoved(cardId, fromColumnId, targetColumnId, newOrder);

    // Update selected card if it's the one being moved
    if (selectedCard?.id === cardId) {
      setSelectedCard({ ...selectedCard, ...updates });
    }

    toast.success("Card moved to Done");
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
      <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-background overflow-hidden relative">
        {/* Skeleton header */}
        <div className="p-4 sm:p-5 border-b border-border/50 bg-background/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <div className="h-7 w-48 bg-muted/60 rounded-lg animate-pulse" />
            <div className="h-5 w-20 bg-muted/40 rounded-full animate-pulse" />
            <div className="flex-1" />
            <div className="hidden md:flex gap-2">
              <div className="h-8 w-20 bg-muted/40 rounded-lg animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-muted/40 animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-muted/40 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Skeleton columns */}
        <div className="flex-1 p-4 flex gap-4 overflow-hidden relative">
          {/* Ambient background glow to match the premium theme */}
          <div className="absolute top-0 right-[20%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-[21rem] flex-shrink-0 flex flex-col gap-3">
              {/* Column Header */}
              <div className="h-10 px-3 bg-muted/20 border border-border/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-muted/50 rounded-sm animate-pulse" />
                  <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
                </div>
                <div className="h-5 w-8 bg-muted/40 rounded-md animate-pulse" />
              </div>

              {/* Cards in Column */}
              <div className="flex flex-col gap-3 rounded-xl border border-border/30 bg-muted/10 p-2 flex-1 relative overflow-hidden">
                {/* Subtle shimmer sweeping across the column */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-10 pointer-events-none" />

                {Array.from({ length: [3, 2, 4, 2][i - 1] ?? 3 }).map((_, j) => (
                  <div key={j} className="h-[104px] bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                    <div className="space-y-2">
                      <div className="h-4 w-[80%] bg-muted/60 rounded animate-pulse" />
                      <div className="h-3 w-[40%] bg-muted/40 rounded animate-pulse" />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="h-5 w-16 bg-muted/40 rounded-full animate-pulse" />
                      <div className="flex -space-x-1">
                        <div className="h-6 w-6 rounded-full bg-muted/60 border-2 border-background animate-pulse" />
                        {j % 2 === 0 && <div className="h-6 w-6 rounded-full bg-muted/50 border-2 border-background animate-pulse" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-background bg-dots">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/50 flex items-center justify-center">
            <LayoutGrid className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2 tracking-tight">No Kanban Board Yet</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Create your first board to start tracking tasks and managing your team&apos;s workflow.
          </p>
          <Button
            onClick={createBoard}
            disabled={creating}
            className="btn-glow h-10 px-6"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Create Board
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-background">
      {/* Header — glass effect */}
      <div className="px-4 sm:px-5 lg:px-6 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3"
        >
          {/* Left side - Title and status */}
          <div className="min-w-0 flex items-center gap-2.5">
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
                className="flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full"
                title="Real-time sync active"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-online-pulse" />
                <span className="hidden sm:inline font-medium">Live</span>
              </span>
            ) : (
              <span
                className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full"
                title="Connecting..."
              >
                <WifiOff className="w-3 h-3" />
                <span className="hidden sm:inline font-medium">Offline</span>
              </span>
            )}
          </div>

          {/* Center - Stats + Viewers */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Board stats — glass pills */}
            <div className="flex items-center gap-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-border/30">
                <Columns className="w-3 h-3" />
                {boardStats.total}
              </div>
              {boardStats.completed > 0 && (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  {boardStats.completed}
                </div>
              )}
              {boardStats.overdue > 0 && (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
                  <AlertTriangle className="w-3 h-3" />
                  {boardStats.overdue}
                </div>
              )}
            </div>

            {/* Viewers (presence) */}
            {viewers.length > 0 && (
              <div className="flex items-center gap-1.5 ml-1">
                <div className="w-px h-4 bg-border/50" />
                <div className="flex -space-x-2">
                  {viewers.slice(0, 5).map((viewer) => (
                    <div key={viewer.socketId} className="relative">
                      <Avatar
                        className="w-7 h-7 border-2 border-background ring-1 ring-border/30"
                        title={viewer.user.name}
                      >
                        <AvatarImage src={viewer.user.image} />
                        <AvatarFallback className="text-[10px] font-semibold">
                          {viewer.user.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-background" />
                    </div>
                  ))}
                  {viewers.length > 5 && (
                    <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                      +{viewers.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right side - Filters and actions */}
          <div className="flex items-center gap-1.5">
            {/* Filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={hasActiveFilters ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-1.5 rounded-lg h-8 text-xs"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Filter</span>
                  {hasActiveFilters && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
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
                className="gap-1 text-muted-foreground rounded-lg h-8 text-xs"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-border/50 mx-0.5" />

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
                  className="h-8 w-36 text-sm rounded-lg"
                />
                <Button size="sm" onClick={addColumn} className="h-8 rounded-lg text-xs">
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddingColumn(false)}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setAddingColumn(true)}
                className="btn-glow flex-shrink-0 rounded-lg h-8 text-xs"
                size="sm"
              >
                <Plus className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Add Column</span>
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Kanban Board — dot grid background */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-5 pb-5 bg-dots snap-x snap-mandatory sm:snap-none overscroll-x-contain">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {(filteredBoard || board).columns.map((column, index) => (
              <motion.div
                key={column.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08, duration: 0.3 }}
              >
                <KanbanColumn
                  column={column}
                  onAddCard={addCard}
                  onUpdateCard={updateCard}
                  onDeleteCard={deleteCard}
                  onOpenDetail={handleOpenDetail}
                  onRenameColumn={renameColumn}
                  onDeleteColumn={deleteColumn}
                  onOpenCreateDialog={(colId) => {
                    setCreateDialogColumnId(colId);
                    setCreateDialogOpen(true);
                  }}
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
        onMoveCard={handleMoveCardFromModal}
        columns={board.columns.map((col) => ({ id: col.id, title: col.title }))}
        workspaceMembers={workspaceMembers}
        currentUserId={session?.user?.id || ""}
      />

      {/* Create Card Dialog */}
      <CreateCardDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreateCard={addCard}
        columnId={createDialogColumnId}
        columnTitle={board.columns.find((c) => c.id === createDialogColumnId)?.title || ""}
        workspaceMembers={workspaceMembers}
      />
    </div>
  );
}
