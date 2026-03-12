import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { 
  ArrowUpDown, ArrowUp, ArrowDown, 
  GripVertical, CheckSquare, Square, 
  MessageSquare, Paperclip, CheckCircle2,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarFallbackClass } from "@/lib/avatar-colors";
import { PRIORITY_ICONS, PRIORITY_COLORS } from "./KanbanCard";

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

export interface Card {
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
  columnId: string;
  _count?: {
    comments: number;
    attachments: number;
  };
  attachments?: any[];
}

interface KanbanListViewProps {
  cards: Card[];
  columns: { id: string; title: string; category: string }[];
  members: any[];
  selectedCards: Set<string>;
  onSelectCard: (cardId: string, multi: boolean) => void;
  onCardClick: (cardId: string) => void;
  onUpdateCard: (cardId: string, updates: Partial<Card>) => void;
}

type SortField = "issue" | "title" | "status" | "priority" | "assignee" | "points" | "dueDate";
type SortDirection = "asc" | "desc";

export function KanbanListView({
  cards,
  columns,
  members,
  selectedCards,
  onSelectCard,
  onCardClick,
  onUpdateCard
}: KanbanListViewProps) {
  const [sortField, setSortField] = useState<SortField>("issue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortField) {
        case "issue":
          valA = a.issueNumber || 0;
          valB = b.issueNumber || 0;
          break;
        case "title":
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case "status":
          const colA = columns.find(c => c.id === a.columnId);
          const colB = columns.find(c => c.id === b.columnId);
          valA = colA?.title || "";
          valB = colB?.title || "";
          break;
        case "priority":
          const priorityOrder = { highest: 5, high: 4, medium: 3, low: 2, lowest: 1, none: 0 };
          valA = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          valB = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case "assignee":
          valA = a.assignee?.name || "Unassigned";
          valB = b.assignee?.name || "Unassigned";
          break;
        case "points":
          valA = a.storyPoints || 0;
          valB = b.storyPoints || 0;
          break;
        case "dueDate":
          valA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          valB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [cards, sortField, sortDirection, columns]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-muted-foreground opacity-30 group-hover:opacity-100" />;
    return sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const Th = ({ field, children, className = "" }: { field: SortField, children: React.ReactNode, className?: string }) => (
    <th 
      className={`h-10 px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer group hover:bg-muted/50 transition-colors select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {children}
        <SortIcon field={field} />
      </div>
    </th>
  );

  return (
    <div className="w-full rounded-md border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b">
            <tr>
              <th className="h-10 px-4 w-[40px] text-center align-middle">
                {/* Checkbox column header - leaving empty as bulk select is row-by-row for now */}
              </th>
              <Th field="issue" className="w-[100px]">Key</Th>
              <Th field="title" className="min-w-[300px]">Summary</Th>
              <Th field="status" className="w-[140px]">Status</Th>
              <Th field="priority" className="w-[120px]">Priority</Th>
              <Th field="assignee" className="w-[180px]">Assignee</Th>
              <Th field="points" className="w-[80px]">Pts</Th>
              <Th field="dueDate" className="w-[120px]">Due</Th>
            </tr>
          </thead>
          <tbody>
            {sortedCards.length === 0 ? (
              <tr>
                <td colSpan={8} className="h-32 text-center text-muted-foreground">
                  No cards found matching the current filters.
                </td>
              </tr>
            ) : sortedCards.map((card) => {
              const isSelected = selectedCards.has(card.id);
              const column = columns.find(c => c.id === card.columnId);
              const PriorityIcon = PRIORITY_ICONS[card.priority as keyof typeof PRIORITY_ICONS];
              const priorityClass = PRIORITY_COLORS[card.priority as keyof typeof PRIORITY_COLORS] || "";
              
              const isCompleted = card.status === "completed" || column?.category === "done";

              return (
                <tr 
                  key={card.id}
                  onClick={(e) => {
                    // Prevent row click if clicking interactive elements inside
                    if ((e.target as HTMLElement).closest('select, button, a, [role="checkbox"]')) return;
                    if (e.metaKey || e.ctrlKey) {
                      onSelectCard(card.id, true);
                    } else {
                      onCardClick(card.id);
                    }
                  }}
                  className={`
                    group border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer
                    ${isSelected ? "bg-primary/5 hover:bg-primary/10" : ""}
                    ${isCompleted ? "opacity-70" : ""}
                  `}
                >
                  <td className="p-3 text-center align-middle" onClick={(e) => { e.stopPropagation(); onSelectCard(card.id, true); }}>
                    <div role="checkbox" tabIndex={0} className={`w-4 h-4 rounded border flex items-center justify-center mx-auto transition-colors cursor-pointer ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input hover:border-primary'} `}>
                      {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                    </div>
                  </td>
                  
                  <td className="p-3 align-middle text-muted-foreground font-mono text-xs">
                    {card.issueNumber ? `KAN-${card.issueNumber}` : "-"}
                  </td>
                  
                  <td className="p-3 align-middle">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {card.title}
                      </span>
                      {(card._count?.comments || 0) > 0 && (
                        <div className="flex items-center text-muted-foreground text-[10px] gap-0.5">
                          <MessageSquare className="w-3 h-3" />
                          <span>{card._count!.comments}</span>
                        </div>
                      )}
                      {(card.attachments?.length || 0) > 0 && (
                        <div className="flex items-center text-muted-foreground text-[10px] gap-0.5">
                          <Paperclip className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-3 align-middle" onClick={e => e.stopPropagation()}>
                    <select 
                      className="text-xs h-7 rounded border-border bg-transparent hover:bg-muted focus:ring-1 focus:ring-primary px-2"
                      value={card.columnId}
                      onChange={(e) => onUpdateCard(card.id, { columnId: e.target.value })}
                    >
                      {columns.map(col => (
                        <option key={col.id} value={col.id}>{col.title}</option>
                      ))}
                    </select>
                  </td>
                  
                  <td className="p-3 align-middle" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 min-w-[100px]">
                      <select
                        className={`text-xs h-7 rounded border-0 bg-transparent hover:bg-muted focus:ring-1 focus:ring-primary pl-1 pr-6 flex-1 appearance-none cursor-pointer ${priorityClass}`}
                        value={card.priority || "medium"}
                        onChange={(e) => onUpdateCard(card.id, { priority: e.target.value as any })}
                        style={{
                          backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 0.25rem center",
                          backgroundSize: "0.5rem auto"
                        }}
                      >
                        <option value="highest">Highest</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="lowest">Lowest</option>
                        <option value="none">None</option>
                      </select>
                      {PriorityIcon && <PriorityIcon className={`w-3.5 h-3.5 ${priorityClass}`} />}
                    </div>
                  </td>
                  
                  <td className="p-3 align-middle" onClick={e => e.stopPropagation()}>
                    <select
                      className="text-xs h-7 max-w-[150px] rounded border-border bg-transparent hover:bg-muted focus:ring-1 focus:ring-primary px-1"
                      value={card.assigneeId || ""}
                      onChange={(e) => onUpdateCard(card.id, { assigneeId: e.target.value || null })}
                    >
                      <option value="">Unassigned</option>
                      {members.map(m => (
                        <option key={m.id || m.userId} value={m.id || m.userId}>{m.user?.name || m.name}</option>
                      ))}
                    </select>
                  </td>
                  
                  <td className="p-3 align-middle text-center">
                    {card.storyPoints ? (
                      <Badge variant="secondary" className="font-mono text-[10px] px-1.5">{card.storyPoints}</Badge>
                    ) : (
                      <span className="text-muted-foreground opacity-50">-</span>
                    )}
                  </td>
                  
                  <td className="p-3 align-middle">
                    {card.dueDate ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {format(new Date(card.dueDate), "MMM d")}
                      </div>
                    ) : (
                      <span className="text-muted-foreground opacity-50">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
