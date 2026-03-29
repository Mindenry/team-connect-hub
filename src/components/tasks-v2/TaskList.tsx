import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, Trash2, UserCheck, Tag, X, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import TaskCard, { type TaskCardData } from "./TaskCard";
import EmptyState from "./EmptyState";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SortKey = "title" | "status" | "priority" | "assignee" | "dueDate";
type SortDir = "asc" | "desc";

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const statusOrder: Record<string, number>   = { todo: 0, in_progress: 1, in_review: 2, done: 3, canceled: 4 };

interface TaskListProps {
  tasks: TaskCardData[];
  onTaskClick: (task: TaskCardData) => void;
  onCreateTask: () => void;
}

/* ═══════════════════════════════════════════════════════════════════
   SORT HEADER CELL
═══════════════════════════════════════════════════════════════════ */
function SortCell({
  label, sortKey, active, dir, onSort, className,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const Icon = dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        "flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-100",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {label}
      {active && <Icon className="w-3 h-3 shrink-0" />}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TASK LIST
═══════════════════════════════════════════════════════════════════ */
export default function TaskList({ tasks, onTaskClick, onCreateTask }: TaskListProps) {
  const [sortKey, setSortKey]       = useState<SortKey>("priority");
  const [sortDir, setSortDir]       = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isAllSelected = selectedIds.size > 0 && selectedIds.size === tasks.length;
  const isPartialSelected = selectedIds.size > 0 && selectedIds.size < tasks.length;

  const toggleSelectAll = () => {
    if (isAllSelected || isPartialSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(tasks.map((t) => t.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const sortedTasks = useMemo(() => {
    const m = sortDir === "asc" ? 1 : -1;
    return [...tasks].sort((a, b) => {
      switch (sortKey) {
        case "title":    return m * a.title.localeCompare(b.title);
        case "status":   return m * ((statusOrder[a.status]   ?? 99) - (statusOrder[b.status]   ?? 99));
        case "priority": return m * ((priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99));
        case "assignee": return m * (a.assignee?.name || "zzz").localeCompare(b.assignee?.name || "zzz");
        case "dueDate": {
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return m * (ad - bd);
        }
        default: return 0;
      }
    });
  }, [tasks, sortKey, sortDir]);

  if (tasks.length === 0) return <EmptyState type="no-tasks" onCreateTask={onCreateTask} />;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">

        {/* ═══ BULK ACTIONS BAR — slides in when items selected ═══ */}
        <div
          className={cn(
            "shrink-0 border-b border-border/60 bg-muted/30 px-4 sm:px-6",
            "flex items-center gap-3 overflow-hidden transition-all duration-200",
            selectedIds.size > 0 ? "h-10 py-0" : "h-0 py-0 border-0"
          )}
        >
          {selectedIds.size > 0 && (
            <>
                <span className="shrink-0 text-xs font-semibold text-foreground">
                {selectedIds.size} selected
              </span>
              <div className="w-px h-4 bg-border/50 shrink-0" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Assign
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Assign selected tasks</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    Label
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add label to selected</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete selected tasks</TooltipContent>
              </Tooltip>

              <div className="flex-1" />

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={clearSelection}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>

        {/* ═══ STICKY TABLE HEADER ═══ */}
        <div className="shrink-0 border-b border-border/40 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3 px-3 h-9">
            {/* Select-all checkbox */}
            <div
              role="checkbox"
              aria-checked={isAllSelected ? true : isPartialSelected ? "mixed" : false}
              className={cn(
                "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all duration-100",
                isAllSelected
                  ? "bg-foreground border-foreground text-background"
                  : isPartialSelected
                  ? "bg-muted border-foreground/40"
                  : "border-border/50 hover:border-border"
              )}
              onClick={toggleSelectAll}
            >
              {isAllSelected && (
                <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {isPartialSelected && (
                <div className="w-2 h-0.5 bg-primary rounded-full" />
              )}
            </div>

            {/* Type + priority (icon columns) */}
            <div className="w-4 h-4 shrink-0" />
            <div className="w-4 h-4 shrink-0" />

            {/* Title (flex-1) */}
            <SortCell
              label="Title"
              sortKey="title"
              active={sortKey === "title"}
              dir={sortDir}
              onSort={handleSort}
              className="flex-1 min-w-0"
            />

            {/* Subtasks — hidden sm- */}
            <div className="hidden md:block w-16 shrink-0">
              <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <CheckSquare className="w-3 h-3" />
                Sub
              </span>
            </div>

            {/* Status */}
            <SortCell
              label="Status"
              sortKey="status"
              active={sortKey === "status"}
              dir={sortDir}
              onSort={handleSort}
              className="hidden sm:flex w-28 shrink-0"
            />

            {/* Due */}
            <SortCell
              label="Due"
              sortKey="dueDate"
              active={sortKey === "dueDate"}
              dir={sortDir}
              onSort={handleSort}
              className="hidden sm:flex w-20 shrink-0"
            />

            {/* Assignee */}
            <SortCell
              label="Assignee"
              sortKey="assignee"
              active={sortKey === "assignee"}
              dir={sortDir}
              onSort={handleSort}
              className="w-20 shrink-0 justify-end"
            />
          </div>
        </div>

        {/* ═══ TASK ROWS ═══ */}
        <div className="flex-1 overflow-auto">
          {/* Count row */}
          <div className="flex items-center gap-2 border-b border-border/40 px-4 py-1.5">
            <span className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{tasks.length}</span> task{tasks.length !== 1 ? "s" : ""}
            </span>
            {selectedIds.size > 0 && (
              <span className="text-[11px] text-primary font-medium">
                · {selectedIds.size} selected
              </span>
            )}
          </div>

          <div className="divide-y divide-border/20">
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={onTaskClick}
                variant="backlog"
                selected={selectedIds.has(task.id)}
                onSelect={toggleSelect}
              />
            ))}
          </div>

          {/* Spacer */}
          <div className="h-6" />
        </div>
      </div>
    </TooltipProvider>
  );
}
