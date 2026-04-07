// src/app/workspace/[slug]/kanban/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import KanbanColumn from "@/components/kanban/KanbanColumn";
import KanbanCard from "@/components/kanban/KanbanCard";
import { KanbanListView } from "@/components/kanban/KanbanListView";
import CardDetailModal from "@/components/kanban/CardDetailModal";
import CreateCardDialog from "@/components/kanban/CreateCardDialog";
import BacklogPanel from "@/components/kanban/BacklogPanel";
import ColumnSettingsDialog, { ColumnData } from "@/components/kanban/ColumnSettingsDialog";
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
  Search,
  List,
  SquareCheck,
  BookOpen,
  Bug,
  Settings,
  Inbox,
  ArrowRight,
  User as UserIcon,
  Flag,
  Trash2,
  Target,
} from "lucide-react";
import { TouchSensor } from "@dnd-kit/core";
import { useKanbanSync } from "@/hooks/useKanbanSync";
import { format } from "date-fns";
import { useSharedSocket } from "@/components/providers/SocketProvider";

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

interface Card {
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
  assigneeId?: string | null;
  assignee?: User | null;
  commentsCount?: number;
  checklistCompleted?: number;
  checklistTotal?: number;
  subtaskCount?: number;
  subtaskCompleted?: number;
  storyPoints?: number | null;
  isBacklog?: boolean;
  parentId?: string | null;
  epic?: Epic | null;
  order?: number;
  dependencyCount?: number;
  isBlocked?: boolean;
  columnId?: string;
}

interface Column {
  id: string;
  title: string;
  order: number;
  category?: string;  // "todo" | "in_progress" | "done"
  color?: string;     // Hex accent color
  wipLimit?: number | null;
  cards: Card[];
}

interface Board {
  id: string;
  title: string;
  columns: Column[];
  backlogCount?: number;
}

export default function WorkspaceKanbanPage() {
  const { data: session } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [allBoards, setAllBoards] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [boardSnapshot, setBoardSnapshot] = useState<Board | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("");

  // Board title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  // Add column
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnData | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // Filters
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);

  // Create card dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogColumnId, setCreateDialogColumnId] = useState("");

  // Search & view mode
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  // Backlog
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [backlogCount, setBacklogCount] = useState(0);
  const [backlogItems, setBacklogItems] = useState<Card[]>([]);
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [backlogHasMore, setBacklogHasMore] = useState(false);
  const [backlogPage, setBacklogPage] = useState(1);

  // Bulk actions
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [bulkActioning, setBulkActioning] = useState(false);

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
    emitSubtaskUpdated,
    emitCommentAdded,
    emitCommentDeleted,
    emitChecklistToggled,
    emitColumnCreated,
    emitColumnUpdated,
    emitColumnDeleted,
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
      (c) => {
        if (!c.dueDate || new Date(c.dueDate) >= now) return false;
        const parentCol = board.columns.find((col) => col.cards.some((card) => card.id === c.id));
        if (!parentCol) return true; // Count as overdue if orphaned but has a date
        const colTitle = parentCol.title ? parentCol.title.toLowerCase() : "";
        return !doneColumnNames.includes(colTitle);
      }
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

  // Filter cards in columns (with search)
  const filteredBoard = useMemo(() => {
    if (!board) return null;
    const q = searchQuery.toLowerCase().trim();
    if (!filterPriority && !filterAssignee && !filterOverdue && !filterLabel && !q)
      return board;

    return {
      ...board,
      columns: board.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((card) => {
          if (q) {
            const matchTitle = card.title.toLowerCase().includes(q);
            const matchDesc = (card.description || "").toLowerCase().includes(q);
            const matchId = card.issueNumber ? `kan-${card.issueNumber}`.includes(q) : false;
            if (!matchTitle && !matchDesc && !matchId) return false;
          }
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
  }, [board, filterPriority, filterAssignee, filterOverdue, filterLabel, searchQuery]);

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
    fetchEpics();
  }, [workspaceId]);

  // Fetch backlog when panel opens
  useEffect(() => {
    if (backlogOpen && board) {
      fetchBacklog(1);
    }
  }, [backlogOpen, board?.id]);

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

  const fetchEpics = async () => {
    if (!params?.slug) return;
    try {
      const res = await fetch(`/api/workspaces/${params.slug}/epics`);
      if (res.ok) {
        const data = await res.json();
        setEpics(data);
      }
    } catch (error) {
      console.error("Error fetching epics:", error);
    }
  };

  const fetchBoard = async () => {
    try {
      const res = await fetch(`/api/boards?workspaceId=${workspaceId}`);
      if (res.ok) {
        const boards = await res.json();
        setAllBoards(boards.map((b: Board) => ({ id: b.id, title: b.title })));
        if (boards.length > 0) {
          // Read boardId from URL if available, otherwise use first board
          const urlBoardId = searchParams?.get("boardId");
          const targetBoard = urlBoardId
            ? boards.find((b: Board) => b.id === urlBoardId) || boards[0]
            : boards[0];
          setBoard(targetBoard);
        }
      }
    } catch (error) {
      console.error("Error fetching boards:", error);
    } finally {
      setLoading(false);
    }
  };

  const switchBoard = async (boardId: string) => {
    if (boardId === board?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/boards?workspaceId=${workspaceId}`);
      if (res.ok) {
        const boards = await res.json();
        const target = boards.find((b: Board) => b.id === boardId);
        if (target) {
          setBoard(target);
          // Update URL without full navigation
          const url = new URL(window.location.href);
          url.searchParams.set("boardId", boardId);
          router.replace(url.pathname + url.search, { scroll: false });
        }
      }
    } catch (error) {
      console.error("Error switching board:", error);
      toast.error("Failed to switch board");
    } finally {
      setLoading(false);
    }
  };

  // Socket for workspace-level Epic sync
  const { socket, connected } = useSharedSocket();

  useEffect(() => {
    if (!socket || !connected || !workspaceId || !session?.user) return;

    const user = {
      id: (session.user as any).id,
      name: session.user.name || "Anonymous",
      image: session.user.image || undefined,
    };

    socket.emit("join-workspace", { workspaceId, user });

    const handleEpicCreated = (data: { workspaceId: string; epic: Epic }) => {
      setEpics((prev) => {
        if (prev.find((e) => e.id === data.epic.id)) return prev;
        return [data.epic, ...prev];
      });
    };

    const handleEpicUpdated = (data: { workspaceId: string; epic: Epic }) => {
      setEpics((prev) =>
        prev.map((e) => (e.id === data.epic.id ? data.epic : e)),
      );
      // Update epic data in cards that are already loaded in the board
      setBoard((prevBoard) => {
        if (!prevBoard) return prevBoard;
        return {
          ...prevBoard,
          columns: prevBoard.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.epic?.id === data.epic.id
                ? { ...card, epic: data.epic }
                : card,
            ),
          })),
        };
      });
    };

    const handleEpicDeleted = (data: { workspaceId: string; epicId: string }) => {
      setEpics((prev) => prev.filter((e) => e.id !== data.epicId));
      // Remove epic data from cards that are already loaded in the board
      setBoard((prevBoard) => {
        if (!prevBoard) return prevBoard;
        return {
          ...prevBoard,
          columns: prevBoard.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.epic?.id === data.epicId
                ? { ...card, epic: null, epicId: null }
                : card,
            ),
          })),
        };
      });
    };

    const handleDependencyUpdated = (data: {
      cardId: string;
      dependencyCount: number;
      isBlocked: boolean;
      targetCardId?: string;
      targetDependencyCount?: number;
      targetIsBlocked?: boolean;
    }) => {
      setBoard((prevBoard) => {
        if (!prevBoard) return prevBoard;
        return {
          ...prevBoard,
          columns: prevBoard.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) => {
              if (card.id === data.cardId) {
                return { ...card, dependencyCount: data.dependencyCount, isBlocked: data.isBlocked };
              }
              if (data.targetCardId && card.id === data.targetCardId) {
                return { ...card, dependencyCount: data.targetDependencyCount, isBlocked: data.targetIsBlocked };
              }
              return card;
            }),
          })),
        };
      });
    };

    socket.on("epic-created", handleEpicCreated);
    socket.on("epic-updated", handleEpicUpdated);
    socket.on("epic-deleted", handleEpicDeleted);
    socket.on("card-dependency-updated", handleDependencyUpdated);

    return () => {
      socket.off("epic-created", handleEpicCreated);
      socket.off("epic-updated", handleEpicUpdated);
      socket.off("epic-deleted", handleEpicDeleted);
      socket.off("card-dependency-updated", handleDependencyUpdated);
      socket.emit("leave-workspace", workspaceId);
    };
  }, [socket, connected, workspaceId, session]);

  // Fetch backlog items
  const fetchBacklog = async (page = 1) => {
    if (!board) return;
    setBacklogLoading(true);
    try {
      const res = await fetch(`/api/boards/${board.id}/backlog?page=${page}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setBacklogItems(data.items || []);
        } else {
          setBacklogItems((prev) => [...prev, ...(data.items || [])]);
        }
        setBacklogCount(data.total || 0);
        setBacklogHasMore((data.items?.length || 0) >= 50);
        setBacklogPage(page);
      }
    } catch (error) {
      console.error("Error fetching backlog:", error);
    } finally {
      setBacklogLoading(false);
    }
  };

  // Add item to backlog
  const addBacklogItem = async (title: string) => {
    if (!board || !title.trim()) return;
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          boardId: board.id,
          isBacklog: true,
        }),
      });
      if (res.ok) {
        const newCard = await res.json();
        setBacklogItems((prev) => [newCard, ...prev]);
        setBacklogCount((prev) => prev + 1);
        toast.success("Added to backlog");
      }
    } catch {
      toast.error("Failed to add backlog item");
    }
  };

  // Move card from backlog to board
  const moveBacklogToBoard = async (cardId: string, columnId: string) => {
    if (!board) return;
    try {
      const res = await fetch(`/api/cards/${cardId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: "board",
          columnId,
        }),
      });
      if (res.ok) {
        const movedCard = await res.json();
        setBacklogItems((prev) => prev.filter((c) => c.id !== cardId));
        setBacklogCount((prev) => Math.max(0, prev - 1));
        const targetColumn = board.columns.find((c) => c.id === columnId);
        setBoard({
          ...board,
          columns: board.columns.map((col) =>
            col.id === columnId
              ? { ...col, cards: [...col.cards, movedCard] }
              : col
          ),
        });
        toast.success(`Moved to ${targetColumn?.title || "board"}`);
      }
    } catch {
      toast.error("Failed to move card to board");
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
        setAllBoards((prev) => [...prev, { id: newBoard.id, title: newBoard.title }]);
        toast.success("Board created");
      }
    } catch (error) {
      toast.error("Failed to create board");
    } finally {
      setCreating(false);
    }
  };

  // --- Bulk Actions ---
  const toggleCardSelection = useCallback((cardId: string, e: React.MouseEvent) => {
    setSelectedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCards(new Set());
  }, []);

  // Escape key clears selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedCards.size > 0) {
        clearSelection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCards.size, clearSelection]);

  const executeBulkAction = async (action: string, payload: Record<string, any> = {}) => {
    if (selectedCards.size === 0 || !board) return;
    setBulkActioning(true);
    try {
      const res = await fetch("/api/cards/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: Array.from(selectedCards), action, payload }),
      });
      if (res.ok) {
        const result = await res.json();
        // Refresh the board
        const boardRes = await fetch(`/api/boards?workspaceId=${workspaceId}`);
        if (boardRes.ok) {
          const boards = await boardRes.json();
          if (boards.length > 0) setBoard(boards[0]);
        }
        clearSelection();
        toast.success(`Bulk ${action}: ${result.count} card${result.count > 1 ? "s" : ""} updated`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Bulk action failed");
      }
    } catch {
      toast.error("Bulk action failed");
    } finally {
      setBulkActioning(false);
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
  const handleSaveColumn = async (data: { title: string; category: string; color: string; wipLimit: number | null }) => {
    if (!board) return;

    if (editingColumn) {
      // Update existing column
      try {
        await fetch(`/api/boards/${board.id}/columns`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ columnId: editingColumn.id, ...data }),
        });
        
        // Optimistic UI update
        setBoard((prevBoard) => {
          if (!prevBoard) return prevBoard;
          return {
            ...prevBoard,
            columns: prevBoard.columns.map((col) =>
              col.id === editingColumn.id ? { ...col, ...data } : col,
            ),
          };
        });
        emitColumnUpdated(editingColumn.id, data);
        toast.success("Column settings updated");
      } catch {
        toast.error("Failed to update column settings");
      }
    } else {
      // Create new column
      try {
        const res = await fetch(`/api/boards/${board.id}/columns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const newCol = await res.json();
          setBoard({
            ...board,
            columns: [...board.columns, { ...newCol, cards: [] }],
          });
          emitColumnCreated({ ...newCol, cards: [] });
          toast.success("Column added");
        }
      } catch {
        toast.error("Failed to add column");
      }
    }
    setColumnSettingsOpen(false);
    setEditingColumn(null);
  };

  const openAddColumnDialog = () => {
    setEditingColumn(null);
    setColumnSettingsOpen(true);
  };

  const openEditColumnDialog = (columnId: string) => {
    if (!board) return;
    const colToEdit = board.columns.find(c => c.id === columnId);
    if (!colToEdit) return;
    
    setEditingColumn({
      id: colToEdit.id,
      title: colToEdit.title,
      category: colToEdit.category,
      color: colToEdit.color,
      wipLimit: colToEdit.wipLimit,
    });
    setColumnSettingsOpen(true);
  };

  const updateColumnSettings = async (columnId: string, updates: Partial<Column>) => {
    if (!board) return;

    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedColumn = await response.json();
        
        setBoard((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.map(c => c.id === columnId ? { ...c, ...updatedColumn } : c)
          };
        });
        
        emitColumnUpdated(columnId, updatedColumn);
        toast.success("Column updated");
      } else {
        toast.error("Failed to update column");
      }
    } catch (error) {
      toast.error("Error updating column");
    }
    
    setColumnSettingsOpen(false);
    setEditingColumn(null);
  };

  const deleteColumn = async (columnId: string) => {
    if (!board) return;
    if (board.columns.length <= 1) {
      toast.error("Cannot delete the last column");
      return;
    }
    try {
      const res = await fetch(`/api/columns/${columnId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        let errorMessage = "Failed to delete column";
        try {
          const errData = await res.json();
          if (errData.error) errorMessage = errData.error;
        } catch (e) {}
        throw new Error(errorMessage);
      }

      setBoard((prevBoard) => {
        if (!prevBoard) return prevBoard;
        return {
          ...prevBoard,
          columns: prevBoard.columns.filter((col) => col.id !== columnId),
        };
      });
      emitColumnDeleted(columnId);
      toast.success("Column deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete column");
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
          ...(extra?.issueType && { issueType: extra.issueType }),
          ...(extra?.priority && { priority: extra.priority }),
          ...(extra?.assigneeId && { assigneeId: extra.assigneeId }),
          ...(extra?.dueDate && { dueDate: extra.dueDate }),
          ...(extra?.startDate && { startDate: extra.startDate }),
          ...(extra?.labels && extra.labels.length > 0 && { labels: extra.labels }),
          ...(extra?.description && { description: extra.description }),
          ...((extra as any)?.epicId && { epicId: (extra as any).epicId }),
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
          issueType: newCard.issueType || "task",
          issueNumber: newCard.issueNumber || 0,
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
          epic: newCard.epic || undefined,
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

  const updateCardFields = async (cardId: string, updates: Partial<Card>) => {
    if (!board) return;

    // Optimistic UI update
    setBoard((prevBoard) => {
      if (!prevBoard) return prevBoard;
      
      // If moving columns
      if (updates.columnId) {
        let movedCard: Card | undefined;
        const columnsWithoutCard = prevBoard.columns.map((col) => {
          const found = col.cards.find((c) => c.id === cardId);
          if (found) {
            movedCard = { ...found, ...updates };
            return {
              ...col,
              cards: col.cards.filter((c) => c.id !== cardId),
            };
          }
          return col;
        });

        if (movedCard) {
          return {
            ...prevBoard,
            columns: columnsWithoutCard.map((col) => {
              if (col.id === updates.columnId) {
                return { ...col, cards: [...col.cards, movedCard!] };
              }
              return col;
            }),
          };
        }
      }

      // If just updating fields in place
      return {
        ...prevBoard,
        columns: prevBoard.columns.map((col) => ({
          ...col,
          cards: col.cards.map((c) =>
            c.id === cardId ? { ...c, ...updates } : c,
          ),
        })),
      };
    });

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Update failed");
      
      // Emit socket event if we moved columns or reassigned, 
      // but standard refresh will catch it mostly.
      if (updates.columnId) {
         // Assuming it appends to the end
         const targetCol = board.columns.find(c => c.id === updates.columnId);
         const newIndex = targetCol ? targetCol.cards.length : 0;
         const sourceCol = board.columns.find(c => c.cards.some(card => card.id === cardId));
         if (sourceCol) {
            emitCardMoved(cardId, sourceCol.id, updates.columnId, newIndex);
         }
      }
    } catch (error) {
      toast.error("Failed to update card fields");
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
    setBoardSnapshot(board);
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

    // Prevent moving blocked tasks rightward
    const activeCard = activeColumn.cards.find((c) => c.id === active.id);
    if (activeCard?.isBlocked) {
      const activeIdx = board.columns.findIndex(c => c.id === activeColumn.id);
      const overIdx = board.columns.findIndex(c => c.id === overColumn.id);
      if (overIdx > activeIdx) {
        return; // Reject preview
      }
    }

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

    // Prevent moving blocked tasks rightward
    const activeCard = activeColumn.cards.find((c) => c.id === active.id);
    if (activeCard?.isBlocked && activeColumn.id !== overColumn.id) {
      const activeIdx = board.columns.findIndex(c => c.id === activeColumn.id);
      const overIdx = board.columns.findIndex(c => c.id === overColumn.id);
      if (overIdx > activeIdx) {
        toast.error("Cannot progress a blocked task. Resolve dependencies first.");
        return;
      }
    }

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

        try {
          const res = await fetch("/api/cards", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cardId: active.id,
              columnId: activeColumn.id,
              order: newIndex,
            }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            if (res.status === 422 && errorData.error === "WIP_LIMIT_REACHED") {
              toast.error("Cannot move card: Column WIP limit reached.");
            } else {
              toast.error(errorData.error || "Failed to move card");
            }
            if (boardSnapshot) setBoard(boardSnapshot);
            return;
          }

          emitCardMoved(
            active.id as string,
            activeColumn.id,
            activeColumn.id,
            newIndex,
          );
        } catch (error) {
          toast.error("Failed to move card");
          if (boardSnapshot) setBoard(boardSnapshot);
        }
      }
    } else {
      const newColumn = board.columns.find((c) => c.id === overColumn.id);
      const cardIndex =
        newColumn?.cards.findIndex((c) => c.id === active.id) ?? 0;

      try {
        const res = await fetch("/api/cards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: active.id,
            columnId: overColumn.id,
            order: cardIndex,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          if (res.status === 422 && errorData.error === "WIP_LIMIT_REACHED") {
            toast.error("Cannot move card: Column WIP limit reached.");
          } else {
            toast.error(errorData.error || "Failed to move card");
          }
          if (boardSnapshot) setBoard(boardSnapshot);
          return;
        }

        emitCardMoved(
          active.id as string,
          activeColumn.id,
          overColumn.id,
          cardIndex,
        );
      } catch (error) {
        toast.error("Failed to move card");
        if (boardSnapshot) setBoard(boardSnapshot);
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
      {/* ═══ Jira-Style Header ═══ */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        {/* Row 1: Title + Status + Stats + Add Column */}
        <div className="px-4 sm:px-5 lg:px-6 pt-3 pb-2">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3"
          >
            {/* Left: Board switcher + Title + Live badge */}
            <div className="min-w-0 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <LayoutGrid className="w-4 h-4 text-white" />
              </div>

              {/* Board Selector */}
              {allBoards.length > 1 && (
                <Select value={board.id} onValueChange={switchBoard}>
                  <SelectTrigger className="w-[200px] h-9 text-sm font-semibold border-border/50 bg-muted/30">
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {allBoards.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {allBoards.length <= 1 && (
                editingTitle ? (
                  <Input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={saveBoardTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveBoardTitle();
                      if (e.key === "Escape") setEditingTitle(false);
                    }}
                    autoFocus
                    className="text-lg font-bold w-64 h-9"
                  />
                ) : (
                  <h1
                    className="text-lg font-bold tracking-tight truncate cursor-pointer hover:text-primary/80 transition-colors"
                    onClick={() => {
                      setTitleDraft(board.title);
                      setEditingTitle(true);
                    }}
                    title="Click to rename"
                  >
                    {board.title}
                  </h1>
                )
              )}

              {syncConnected ? (
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-online-pulse" />
                  Live
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </span>
              )}
            </div>

            {/* Center: Stats + Viewers */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/30">
                  <Columns className="w-3 h-3" />
                  {boardStats.total}
                </div>
                {boardStats.completed > 0 && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3" />
                    {boardStats.completed}
                  </div>
                )}
                {boardStats.overdue > 0 && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">
                    <AlertTriangle className="w-3 h-3" />
                    {boardStats.overdue}
                  </div>
                )}
              </div>
              {viewers.length > 0 && (
                <div className="flex items-center gap-1.5 ml-1">
                  <div className="w-px h-4 bg-border/50" />
                  <div className="flex -space-x-2">
                    {viewers.slice(0, 5).map((viewer) => (
                      <div key={viewer.socketId} className="relative">
                        <UserAvatar user={viewer.user} className="w-6 h-6 border-2 border-background ring-1 ring-border/30" showStatus={false} />
                        <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-background" />
                      </div>
                    ))}
                    {viewers.length > 5 && (
                      <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-semibold text-muted-foreground">
                        +{viewers.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Add Column */}
            <div className="flex items-center gap-1.5">
              <Button onClick={openAddColumnDialog} className="btn-glow flex-shrink-0 rounded-lg h-8 text-xs" size="sm">
                <Plus className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Add Column</span>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Row 2: Tabs + Search + Quick Filters */}
        <div className="px-4 sm:px-5 lg:px-6 pb-2 flex items-center gap-3 flex-wrap">
          {/* View Tabs */}
          <div className="flex items-center bg-muted/40 rounded-lg p-0.5 border border-border/30">
            <button
              onClick={() => { setBacklogOpen(!backlogOpen); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                backlogOpen
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Backlog
              {backlogCount > 0 && (
                <span className="ml-0.5 text-[10px] bg-muted px-1.5 py-0 rounded-full">
                  {backlogCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "board"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <Link
              href={`/workspace/${params.slug}/epics`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all text-muted-foreground hover:text-foreground"
            >
              <Target className="w-3.5 h-3.5" />
              Epics
            </Link>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search board"
              className="h-8 pl-8 text-xs rounded-lg bg-muted/30 border-border/30 focus:bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5">
            {/* Member avatar quick filter */}
            {workspaceMembers.slice(0, 4).map((member) => (
              <button
                key={member.id}
                onClick={() => setFilterAssignee(filterAssignee === member.id ? null : member.id)}
                className={`relative transition-all ${
                  filterAssignee === member.id ? "ring-2 ring-blue-500 rounded-full" : "opacity-70 hover:opacity-100"
                }`}
                title={member.name || "Member"}
              >
                <UserAvatar user={member} className="w-7 h-7 border-2 border-background" showStatus={false} />
              </button>
            ))}

            <div className="w-px h-5 bg-border/40 mx-1" />

            {/* Only My Issues */}
            <Button
              variant={filterAssignee === session?.user?.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterAssignee(filterAssignee === session?.user?.id ? null : session?.user?.id || null)}
              className="gap-1.5 rounded-lg h-7 text-[11px] px-2.5"
            >
              <Users className="w-3 h-3" />
              Only My Issues
            </Button>

            {/* Filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={hasActiveFilters ? "secondary" : "ghost"} size="sm" className="gap-1 rounded-lg h-7 text-[11px] px-2.5">
                  <Filter className="w-3 h-3" />
                  Filter
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setFilterPriority(filterPriority === "high" ? null : "high")} className="gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  High Priority
                  {filterPriority === "high" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterPriority(filterPriority === "medium" ? null : "medium")} className="gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Medium Priority
                  {filterPriority === "medium" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterPriority(filterPriority === "low" ? null : "low")} className="gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Low Priority
                  {filterPriority === "low" && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterOverdue(!filterOverdue)} className="gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  Overdue Only
                  {filterOverdue && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
                {allLabels.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {allLabels.map((label) => (
                      <DropdownMenuItem key={label} onClick={() => setFilterLabel(filterLabel === label ? null : label)} className="gap-2">
                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                        {label}
                        {filterLabel === label && <span className="ml-auto">✓</span>}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground rounded-lg h-7 text-[11px] px-2">
                <X className="w-3 h-3" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Board or List view */}
      {viewMode === "board" ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Backlog Panel */}
          {backlogOpen && board && (
            <div className="flex-shrink-0 w-[340px] border-r border-border/40 overflow-y-auto bg-background/60 p-3">
              <BacklogPanel
                boardId={board.id}
                backlogItems={backlogItems as any}
                totalCount={backlogCount}
                loading={backlogLoading}
                columns={board.columns.map((c) => ({ id: c.id, title: c.title }))}
                onMoveToBoard={moveBacklogToBoard}
                onAddItem={addBacklogItem}
                onOpenDetail={handleOpenDetail as any}
                onLoadMore={() => fetchBacklog(backlogPage + 1)}
                hasMore={backlogHasMore}
              />
            </div>
          )}

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
                    onDeleteColumn={deleteColumn}
                    onOpenCreateDialog={(colId) => {
                      setCreateDialogColumnId(colId);
                      setCreateDialogOpen(true);
                    }}
                    onOpenSettingsDialog={openEditColumnDialog}
                    canDelete={board.columns.length > 1}
                    selectedCards={selectedCards}
                    onSelectCard={toggleCardSelection}
                  />
                </motion.div>
              ))}
            </div>

            <DragOverlay>
              {activeCard && <KanbanCard card={activeCard} isDragging />}
            </DragOverlay>
          </DndContext>
          </div>
        </div>
      ) : (
        /* ═══ List View ═══ */
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          <KanbanListView 
            cards={(filteredBoard || board).columns.flatMap(col => col.cards.map(card => ({ ...card, columnId: col.id }))) as any[]}
            columns={board.columns.map(c => ({ id: c.id, title: c.title, category: c.category || "todo" }))}
            members={workspaceMembers}
            selectedCards={selectedCards}
            onSelectCard={(id, multi) => toggleCardSelection(id, { ctrlKey: multi } as any)}
            onCardClick={(cardId: string) => {
              const card = (filteredBoard || board).columns.flatMap(c => c.cards).find(c => c.id === cardId);
              if (card) handleOpenDetail(card);
            }}
            onUpdateCard={updateCardFields}
          />
        </div>
      )}

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleUpdateCardFromModal}
        onMoveCard={handleMoveCardFromModal}
        columns={board.columns.map((col) => ({ id: col.id, title: col.title, category: col.category }))}
        workspaceMembers={workspaceMembers}
        allCards={board.columns.flatMap((col) => col.cards.map((c) => ({ id: c.id, title: c.title, status: c.status, priority: c.priority, issueType: c.issueType, issueNumber: c.issueNumber })))}
        epics={epics}
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
        epics={epics}
      />

      {/* Bulk Action Floating Bar */}
      <AnimatePresence>
        {selectedCards.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/20">
              {/* Selection count */}
              <div className="flex items-center gap-2 pr-3 border-r border-border/40">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  {selectedCards.size}
                </div>
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  card{selectedCards.size > 1 ? "s" : ""} selected
                </span>
              </div>

              {/* Move to column */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs rounded-lg" disabled={bulkActioning}>
                    <ArrowRight className="w-3.5 h-3.5" />
                    Move
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="mb-2">
                  {board.columns.map((col) => (
                    <DropdownMenuItem
                      key={col.id}
                      onClick={() => executeBulkAction("move", { columnId: col.id })}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color || "#6366f1" }} />
                      {col.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Assign */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs rounded-lg" disabled={bulkActioning}>
                    <UserIcon className="w-3.5 h-3.5" />
                    Assign
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="mb-2">
                  <DropdownMenuItem onClick={() => executeBulkAction("assign", { assigneeId: null })}>
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                    Unassign
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {workspaceMembers.map((member) => (
                    <DropdownMenuItem
                      key={member.id}
                      onClick={() => executeBulkAction("assign", { assigneeId: member.id })}
                    >
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary flex-shrink-0">
                        {member.name?.[0]?.toUpperCase() || "?"}
                      </span>
                      {member.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Priority */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs rounded-lg" disabled={bulkActioning}>
                    <Flag className="w-3.5 h-3.5" />
                    Priority
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="mb-2">
                  <DropdownMenuItem onClick={() => executeBulkAction("priority", { priority: "high" })}>
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    High
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => executeBulkAction("priority", { priority: "medium" })}>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Medium
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => executeBulkAction("priority", { priority: "low" })}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Low
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-5 bg-border/40" />

              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 text-xs rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10"
                disabled={bulkActioning}
                onClick={() => {
                  if (confirm(`Delete ${selectedCards.size} card${selectedCards.size > 1 ? "s" : ""}? This cannot be undone.`)) {
                    executeBulkAction("delete");
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>

              <div className="w-px h-5 bg-border/40" />

              {/* Clear selection */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={clearSelection}
                title="Clear selection (Esc)"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ColumnSettingsDialog
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
        onSave={handleSaveColumn}
        column={editingColumn || undefined}
      />
    </div>
  );
}
