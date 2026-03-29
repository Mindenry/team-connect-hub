import { useState, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import TaskCard, { InlineCreateCard, type TaskCardData } from "./TaskCard";
import EmptyState from "./EmptyState";
import { apiPost, apiPatch, apiGet } from "@/lib/api";
import { Plus, MoreHorizontal, ListTodo, Loader2, CheckCircle2, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Status column shape from API */
export interface WorkflowStatus {
  id: string;
  key: string;
  name: string;
  color: string;
  category: string; // todo | doing | done
  position: number;
}

/** Fallback hardcoded columns — used while API loads or if call fails */
const FALLBACK_COLUMNS: WorkflowStatus[] = [
  { id: "fb-1", key: "todo",        name: "TO DO",        color: "hsl(var(--muted-foreground))", category: "todo",  position: 0 },
  { id: "fb-2", key: "in_progress", name: "IN PROGRESS",  color: "hsl(var(--primary))", category: "doing", position: 1 },
  { id: "fb-3", key: "in_review",   name: "IN REVIEW",    color: "hsl(var(--primary))", category: "doing", position: 2 },
  { id: "fb-4", key: "done",        name: "DONE",         color: "hsl(var(--muted-foreground))", category: "done",  position: 3 },
];

/** Category icons */
const categoryIcons = {
  todo: ListTodo,
  doing: Loader2,
  done: CheckCircle2,
};

/** Get contrasting text color */
function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

interface TaskBoardProps {
  tasks: TaskCardData[];
  onTaskClick: (task: TaskCardData) => void;
  onTaskMoved?: (taskId: string, fromStatus: string, toStatus: string) => void;
  onCreateTask: () => void;
  onTaskCreated?: (task: TaskCardData) => void;
  teamId?: string;
  statuses?: WorkflowStatus[];
}

export default function TaskBoard({
  tasks,
  onTaskClick,
  onTaskMoved,
  onCreateTask,
  onTaskCreated,
  teamId,
  statuses: propStatuses,
}: TaskBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [columns, setColumns] = useState<WorkflowStatus[]>(propStatuses || FALLBACK_COLUMNS);

  // Calculate total tasks for progress
  const totalTasks = tasks.length;

  // Avoid doing `tasks.filter(...)` for every column on every render.
  const tasksByStatus = useMemo(() => {
    const map: Record<string, TaskCardData[]> = {};
    for (const t of tasks) {
      const key = t.status;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [tasks]);

  // Fetch statuses from API
  useEffect(() => {
    if (propStatuses && propStatuses.length > 0) {
      setColumns(propStatuses);
      return;
    }

    let cancelled = false;
    const fetchStatuses = async () => {
      try {
        const url = teamId ? `/task-statuses?teamId=${teamId}` : "/task-statuses";
        const data = await apiGet<WorkflowStatus[]>(url);
        if (!cancelled && data && data.length > 0) {
          setColumns(data.sort((a, b) => a.position - b.position));
        }
      } catch {
        // Keep fallback
      }
    };
    fetchStatuses();
    return () => { cancelled = true; };
  }, [teamId, propStatuses]);

  const handleDragStart = (e: React.DragEvent, task: TaskCardData) => {
    e.dataTransfer.setData("taskId", task.id);
    e.dataTransfer.setData("fromStatus", task.status);
    e.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(task.id);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // Prevent unnecessary state updates during drag (helps on slower machines).
    setDragOverColumn((prev) => (prev === columnKey ? prev : columnKey));
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggingTaskId(null);
    const taskId = e.dataTransfer.getData("taskId");
    const fromStatus = e.dataTransfer.getData("fromStatus");
    if (!taskId || fromStatus === targetStatus) return;

    // Optimistically update UI in parent first so column changes immediately
    onTaskMoved?.(taskId, fromStatus, targetStatus);

    const columnTasks = tasksByStatus[targetStatus] || [];
    try {
      await apiPatch(`/tasks/${taskId}/position`, { status: targetStatus, position: columnTasks.length });
    } catch (err) {
      console.error("Failed to move task:", err);
      // Rollback on failure to keep UI/data consistent
      onTaskMoved?.(taskId, targetStatus, fromStatus);
    }
  };

  const handleInlineCreate = async (title: string, status: string) => {
    try {
      const created = await apiPost<TaskCardData>("/tasks", { title, status });
      if (created) {
        onTaskCreated?.(created);
      } else {
        onTaskMoved?.("", "", status);
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  if (tasks.length === 0 && columns.length === 0) {
    return <EmptyState type="no-tasks" onCreateTask={onCreateTask} />;
  }

  return (
    <div className="flex-1 min-h-0 p-4 lg:p-6 overflow-hidden">
      {/* Board Container with modern styling */}
      <div className="h-full flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {columns.map((column) => {
          const columnTasks = tasksByStatus[column.key] || [];
          const isDragOver = dragOverColumn === column.key;
          const CategoryIcon = categoryIcons[column.category as keyof typeof categoryIcons] || ListTodo;
          const progress = totalTasks > 0 ? Math.round((columnTasks.length / totalTasks) * 100) : 0;

          return (
            <div
              key={column.key}
              className={cn(
                "flex flex-col rounded-xl transition-all duration-200",
                "w-[280px] sm:w-[300px] md:w-[320px] lg:w-[340px] shrink-0",
                "bg-card border border-border/50",
                "shadow-sm",
                "hover:shadow-md hover:border-border",
                isDragOver && "ring-2 ring-primary/30 border-primary/30"
              )}
              onDragOver={(e) => handleDragOver(e, column.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.key)}
            >
              {/* ── Column Header ── */}
              <div className="shrink-0 border-b border-border/30">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Category icon */}
                      <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                        <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                      </div>

                      {/* Column name */}
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {column.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {columnTasks.length} {columnTasks.length === 1 ? 'issue' : 'issues'}
                        </p>
                      </div>
                    </div>

                    {/* Actions menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground/50 hover:text-foreground hover:bg-muted/50"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="text-xs">
                          <Plus className="w-3.5 h-3.5 mr-2" />
                          Add issue
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs">
                          <Eye className="w-3.5 h-3.5 mr-2" />
                          View column settings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* ── Cards Container ── */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="flex flex-col gap-3 px-3 pb-3 pt-1">
                  {columnTasks.map((task, index) => (
                    <div
                      key={task.id}
                      className={cn(
                        "transition-all duration-200",
                        draggingTaskId === task.id && "opacity-30 scale-95"
                      )}
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      <TaskCard
                        task={task}
                        onClick={onTaskClick}
                        variant="board"
                        draggable
                        onDragStart={handleDragStart}
                      />
                    </div>
                  ))}

                  {/* Empty state */}
                  {columnTasks.length === 0 && !isDragOver && (
                    <div className="flex flex-col items-center justify-center min-h-[100px] rounded-lg border border-dashed border-border/40 bg-muted/10 text-center px-4 py-4">
                      <CategoryIcon className="w-5 h-5 text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground/60">
                        No issues
                      </p>
                    </div>
                  )}

                  {/* Drop zone indicator */}
                  {isDragOver && (
                    <div className="flex items-center justify-center min-h-[60px] rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 text-xs text-primary font-medium">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Drop here
                    </div>
                  )}

                  {/* Inline create */}
                  <InlineCreateCard onSubmit={(title) => handleInlineCreate(title, column.key)} />
                </div>
              </ScrollArea>

              {/* Column footer with quick actions */}
              <div className="shrink-0 px-3 pb-3 pt-1">
                <button
                  onClick={() => handleInlineCreate("", column.key)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors group"
                >
                  <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span>Create issue</span>
                  <kbd className="ml-auto text-[10px] text-muted-foreground/40 bg-muted/50 px-1.5 py-0.5 rounded font-mono">
                    C
                  </kbd>
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Column button */}
        <div className="flex flex-col w-[280px] sm:w-[300px] shrink-0">
          <button
            className="flex-1 flex flex-col items-center justify-center min-h-[160px] rounded-xl border border-dashed border-border/40 bg-muted/5 hover:bg-muted/10 hover:border-border/60 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center mb-2 group-hover:bg-muted/50 transition-colors">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Add column
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
