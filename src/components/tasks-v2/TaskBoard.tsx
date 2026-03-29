import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import TaskCard, { InlineCreateCard, type TaskCardData } from "./TaskCard";
import EmptyState from "./EmptyState";
import { apiPost, apiPatch, apiGet } from "@/lib/api";
import { Plus, MoreHorizontal, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
  { id: "fb-1", key: "todo",        name: "To Do",       color: "#94a3b8", category: "todo",  position: 0 },
  { id: "fb-2", key: "in_progress", name: "In Progress", color: "#3b82f6", category: "doing", position: 1 },
  { id: "fb-3", key: "in_review",   name: "In Review",   color: "#f59e0b", category: "doing", position: 2 },
  { id: "fb-4", key: "done",        name: "Done",        color: "#10b981", category: "done",  position: 3 },
];

/* ─── STATUS → accent color map ─────────────────────────────────── */
function getColumnAccent(column: WorkflowStatus): string {
  if (column.color && column.color !== "#737373") return column.color;
  switch (column.category) {
    case "done":  return "#10b981";
    case "doing":
      return column.key.includes("review") ? "#f59e0b" : "#3b82f6";
    default:      return "#94a3b8";
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

/* ═══════════════════════════════════════════════════════════════════
   TASK BOARD
═══════════════════════════════════════════════════════════════════ */
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
        name: newColumnName.trim(), key, color: "#94a3b8",
        category: "todo", position: columns.length, teamId,
      });
      if (created) {
        setColumns((prev) => [...prev, created].sort((a, b) => a.position - b.position));
      } else {
        setColumns((prev) => [...prev, {
          id: `col-${Date.now()}`, key, name: newColumnName.trim(),
          color: "#94a3b8", category: "todo", position: prev.length,
        }]);
      }
      setNewColumnName("");
      setShowAddColumn(false);
    } catch {
      const key = newColumnName.toLowerCase().replace(/\s+/g, "_");
      setColumns((prev) => [...prev, {
        id: `col-${Date.now()}`, key, name: newColumnName.trim(),
        color: "#94a3b8", category: "todo", position: prev.length,
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
    <div className="h-full flex gap-3 overflow-x-auto p-4 pb-6">
      {columns.map((column) => {
        const columnTasks  = tasksByStatus[column.key] || [];
        const isDragOver   = dragOverColumn === column.key;
        const accentColor  = getColumnAccent(column);

        return (
          <div
            key={column.key}
            className={cn(
              "flex flex-col h-full min-h-0",
              "w-[280px] sm:w-[300px] md:w-[316px] shrink-0",
              "rounded-xl",
              // Column panel: subtle bg, stronger border on drag-over
              "bg-muted/20 border border-border/40",
              "transition-all duration-150",
              isDragOver && "border-primary/40 bg-primary/5 shadow-md"
            )}
            onDragOver={(e) => handleDragOver(e, column.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.key)}
          >
            {/* ── Column header ── */}
            <div
              className="shrink-0 rounded-t-xl border-t-[3px] px-3 pt-3 pb-2.5 flex items-center justify-between gap-2"
              style={{ borderTopColor: accentColor }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Status dot */}
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: accentColor }}
                />
                <span className="text-sm font-semibold text-foreground truncate">
                  {column.name}
                </span>
                {/* Count badge */}
                <span
                  className="text-[11px] font-semibold px-1.5 py-px rounded-md shrink-0 leading-tight"
                  style={{
                    backgroundColor: accentColor + "1a",
                    color: accentColor,
                  }}
                >
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                {/* Quick add */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={onCreateTask}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                {/* Column menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 text-xs">
                    <DropdownMenuItem className="text-xs" onClick={onCreateTask}>
                      <Plus className="w-3 h-3 mr-2" />
                      New task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* ── Cards container ── */}
            <div
              ref={(el) => { scrollRefs.current[column.key] = el; }}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 space-y-2"
              style={{ contain: "strict" }}
            >
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "transition-opacity duration-150",
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
                <div className="flex flex-col items-center justify-center py-10 px-3 text-center">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 opacity-40"
                    style={{ backgroundColor: accentColor + "20" }}
                  >
                    <span
                      className="text-base font-bold"
                      style={{ color: accentColor }}
                    >
                      0
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/60">No tasks here</p>
                  <button
                    onClick={onCreateTask}
                    className="mt-2 text-[11px] text-muted-foreground/50 hover:text-primary transition-colors"
                  >
                    + Add one
                  </button>
                </div>
              )}

              {/* Drop zone indicator */}
              {isDragOver && (
                <div
                  className="flex items-center justify-center py-5 border-2 border-dashed rounded-lg"
                  style={{ borderColor: accentColor + "60", backgroundColor: accentColor + "08" }}
                >
                  <span className="text-xs font-medium" style={{ color: accentColor }}>
                    Drop here
                  </span>
                </div>
              )}
            </div>

            {/* ── Inline create footer ── */}
            <div className="shrink-0 p-2 border-t border-border/20">
              <InlineCreateCard onSubmit={(title) => handleInlineCreate(title, column.key)} />
            </div>
          </div>
        );
      })}

      {/* ── Add column ── */}
      <div className="flex flex-col w-[260px] shrink-0">
        {showAddColumn ? (
          <div className="bg-muted/20 border border-border/40 rounded-xl p-3 space-y-2">
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
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={handleAddColumn}
                disabled={creatingColumn || !newColumnName.trim()}
              >
                {creatingColumn ? (
                  <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Creating...</>
                ) : "Create"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => { setShowAddColumn(false); setNewColumnName(""); }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddColumn(true)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 min-h-[80px] rounded-xl",
              "border border-dashed border-border/40",
              "text-muted-foreground/50 hover:text-muted-foreground",
              "hover:border-border/60 hover:bg-muted/20",
              "transition-all duration-150 text-xs font-medium"
            )}
          >
            <Plus className="w-4 h-4" />
            Add column
          </button>
        )}
      </div>
    </div>
  );
}
