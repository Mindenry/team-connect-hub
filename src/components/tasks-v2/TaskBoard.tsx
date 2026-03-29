import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import TaskCard, { InlineCreateCard, type TaskCardData } from "./TaskCard";
import EmptyState from "./EmptyState";
import { apiPost, apiPatch, apiGet } from "@/lib/api";
import {
  Plus,
  MoreHorizontal,
  Loader2,
  X,
  GripVertical,
  Sparkles,
  Kanban,
  CircleDot,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ─── TYPES ─────────────────────────────────────────────────────── */
export interface WorkflowStatus {
  id: string;
  key: string;
  name: string;
  color: string;
  category: string;
  position: number;
}

/* ─── FALLBACK COLUMNS ──────────────────────────────────────────── */
const FALLBACK_COLUMNS: WorkflowStatus[] = [
  { id: "fb-1", key: "todo",        name: "To Do",       color: "#64748b", category: "todo",  position: 0 },
  { id: "fb-2", key: "in_progress", name: "In Progress", color: "#64748b", category: "doing", position: 1 },
  { id: "fb-3", key: "in_review",   name: "In Review",   color: "#64748b", category: "doing", position: 2 },
  { id: "fb-4", key: "done",        name: "Done",        color: "#64748b", category: "done",  position: 3 },
];

/* ─── STATUS → accent color map (simplified to project tone) ─── */
function getColumnAccent(column: WorkflowStatus): string {
  return "hsl(var(--primary))";
}

/* ─── Column icon based on category ─────────────────────────────── */
function getColumnIcon(category: string) {
  switch (category) {
    case "done": return CheckCircle2;
    case "doing": return Clock;
    default: return CircleDot;
  }
}

/* ─── PROPS ─────────────────────────────────────────────────────── */
interface TaskBoardProps {
  tasks: TaskCardData[];
  onTaskClick: (task: TaskCardData) => void;
  onTaskMoved?: (taskId: string, fromStatus: string, toStatus: string) => void;
  onCreateTask: () => void;
  onTaskCreated?: (task: TaskCardData) => void;
  teamId?: string;
  statuses?: WorkflowStatus[];
}

/* ════════════════════════════════════════════════════════════════════════════
   TASK BOARD - Premium Glass-morphism Kanban (Linear-inspired)
   ════════════════════════════════════════════════════════════════════════════ */
export default function TaskBoard({
  tasks,
  onTaskClick,
  onTaskMoved,
  onCreateTask,
  onTaskCreated,
  teamId,
  statuses: propStatuses,
}: TaskBoardProps) {
  const [dragOverColumn, setDragOverColumn]   = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId]   = useState<string | null>(null);
  const [columns, setColumns]                 = useState<WorkflowStatus[]>(propStatuses || FALLBACK_COLUMNS);
  const [showAddColumn, setShowAddColumn]     = useState(false);
  const [newColumnName, setNewColumnName]     = useState("");
  const [creatingColumn, setCreatingColumn]   = useState(false);
  const [hoveredColumn, setHoveredColumn]     = useState<string | null>(null);
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const tasksByStatus = useMemo(() => {
    const map: Record<string, TaskCardData[]> = {};
    for (const t of tasks) {
      const key = t.status;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [tasks]);

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
    const taskId     = e.dataTransfer.getData("taskId");
    const fromStatus = e.dataTransfer.getData("fromStatus");
    if (!taskId || fromStatus === targetStatus) return;

    onTaskMoved?.(taskId, fromStatus, targetStatus);

    const columnTasks = tasksByStatus[targetStatus] || [];
    try {
      await apiPatch(`/tasks/${taskId}/position`, { status: targetStatus, position: columnTasks.length });
    } catch (err) {
      console.error("Failed to move task:", err);
      onTaskMoved?.(taskId, targetStatus, fromStatus);
    }
  };

  const handleInlineCreate = async (title: string, status: string) => {
    if (!title.trim()) return;
    try {
      const created = await apiPost<TaskCardData>("/tasks", { title: title.trim(), status, teamId });
      if (created) onTaskCreated?.(created);
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim() || creatingColumn) return;
    setCreatingColumn(true);
    try {
      const key     = newColumnName.toLowerCase().replace(/\s+/g, "_");
      const created = await apiPost<WorkflowStatus>("/task-statuses", {
        name: newColumnName.trim(), key, color: "#64748b",
        category: "todo", position: columns.length, teamId,
      });
      if (created) {
        setColumns((prev) => [...prev, created].sort((a, b) => a.position - b.position));
      } else {
        setColumns((prev) => [...prev, {
          id: `col-${Date.now()}`, key, name: newColumnName.trim(),
          color: "#64748b", category: "todo", position: prev.length,
        }]);
      }
      setNewColumnName("");
      setShowAddColumn(false);
    } catch {
      const key = newColumnName.toLowerCase().replace(/\s+/g, "_");
      setColumns((prev) => [...prev, {
        id: `col-${Date.now()}`, key, name: newColumnName.trim(),
        color: "#64748b", category: "todo", position: prev.length,
      }]);
      setNewColumnName("");
      setShowAddColumn(false);
    } finally {
      setCreatingColumn(false);
    }
  };

  if (tasks.length === 0 && columns.length === 0) {
    return <EmptyState type="no-tasks" onCreateTask={onCreateTask} />;
  }

  return (
    <div className="flex h-full flex-col px-4 py-4 lg:px-6">
      {/* Columns container - fills available width */}
      <div className="flex min-h-0 flex-1 gap-3">
        {columns.map((column) => {
          const columnTasks  = tasksByStatus[column.key] || [];
          const isDragOver   = dragOverColumn === column.key;
          const ColumnIcon   = getColumnIcon(column.category);
          const isHovered    = hoveredColumn === column.key;

          return (
            <div
              key={column.key}
              className={cn(
                "flex flex-col h-full min-h-0 flex-1 min-w-[200px] max-w-[320px]",
                "rounded-lg border border-border bg-card",
                "transition-colors duration-200",
                isDragOver && "border-foreground/40 bg-muted/30"
              )}
              onMouseEnter={() => setHoveredColumn(column.key)}
              onMouseLeave={() => setHoveredColumn(null)}
              onDragOver={(e) => handleDragOver(e, column.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.key)}
            >
              {/* ── Column header ── */}
              <div className="shrink-0 border-b border-border/70 px-3 pb-2 pt-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ColumnIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {column.name}
                    </h3>
                    <span className="text-xs text-muted-foreground font-medium shrink-0">
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Column actions */}
                  {isHovered && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem className="text-xs gap-2" onClick={onCreateTask}>
                          <Plus className="w-3.5 h-3.5" />
                          Add task
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs gap-2 text-muted-foreground">
                          <Settings2 className="w-3.5 h-3.5" />
                          Edit column
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2 text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete column
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* ── Cards container ── */}
              <div
                ref={(el) => { scrollRefs.current[column.key] = el; }}
                className="flex-1 min-h-0 space-y-2 overflow-x-hidden overflow-y-auto px-2 py-2"
              >
                {columnTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={cn(
                      "transition-all duration-150",
                      draggingTaskId === task.id && "opacity-30 scale-95"
                    )}
                  >
                    <TaskCard
                      task={task}
                      onClick={onTaskClick}
                      variant="board"
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                    />
                  </div>
                ))}

                {/* Empty column state */}
                {columnTasks.length === 0 && !isDragOver && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Kanban className="w-8 h-8 text-muted-foreground/20 mb-2" />
                    <p className="text-xs text-muted-foreground/40">No tasks</p>
                  </div>
                )}

                {/* Drop zone indicator */}
                {isDragOver && (
                  <div className="my-1 flex items-center justify-center rounded-md border border-dashed border-foreground/40 bg-muted/30 py-4">
                    <span className="text-xs font-medium text-foreground">Drop here</span>
                  </div>
                )}
              </div>

              {/* ── Inline create footer ── */}
              <div className="shrink-0 px-2 pb-2 pt-1">
                <InlineCreateCard onSubmit={(title) => handleInlineCreate(title, column.key)} />
              </div>
            </div>
          );
        })}

        {/* ── Add column button ── */}
        <div className="flex flex-col w-[200px] shrink-0">
          {showAddColumn ? (
            <div className="space-y-2 rounded-lg border border-border bg-card p-3">
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Column name..."
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") { setShowAddColumn(false); setNewColumnName(""); }
                }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={handleAddColumn}
                  disabled={creatingColumn || !newColumnName.trim()}
                >
                  {creatingColumn ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => { setShowAddColumn(false); setNewColumnName(""); }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddColumn(true)}
              className={cn(
                "flex min-h-[80px] flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border",
                "text-muted-foreground/60 hover:bg-muted/30 hover:text-foreground",
                "transition-colors"
              )}
            >
              <Plus className="w-4 h-4" />
              <span className="text-xs font-medium">Add column</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
