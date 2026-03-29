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
    default:      return "#64748b";
  }
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
    <div className="h-full flex gap-4 overflow-x-auto px-6 py-5 pb-8">
      {columns.map((column) => {
        const columnTasks  = tasksByStatus[column.key] || [];
        const isDragOver   = dragOverColumn === column.key;
        const accentColor  = getColumnAccent(column);
        const ColumnIcon   = getColumnIcon(column.category);
        const isHovered    = hoveredColumn === column.key;

        return (
          <div
            key={column.key}
            className={cn(
              "flex flex-col h-full min-h-0",
              "w-[300px] shrink-0",
              "rounded-2xl",
              "bg-gradient-to-b from-muted/30 via-muted/20 to-muted/10",
              "border border-border/30",
              "transition-all duration-300 ease-out",
              isDragOver && "border-primary/50 bg-primary/[0.03] shadow-xl shadow-primary/10 scale-[1.01]",
              isHovered && "border-border/50"
            )}
            onMouseEnter={() => setHoveredColumn(column.key)}
            onMouseLeave={() => setHoveredColumn(null)}
            onDragOver={(e) => handleDragOver(e, column.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.key)}
          >
            {/* ── Column header ── */}
            <div className="shrink-0 px-4 pt-4 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Icon with accent */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all duration-200"
                    style={{
                      backgroundColor: accentColor + "15",
                      boxShadow: `0 2px 8px ${accentColor}20`
                    }}
                  >
                    <ColumnIcon className="w-4 h-4" style={{ color: accentColor }} />
                  </div>
                  
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate tracking-tight">
                      {column.name}
                    </h3>
                  </div>
                  
                  {/* Task count pill */}
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 leading-tight transition-all duration-200"
                    style={{
                      backgroundColor: accentColor + "18",
                      color: accentColor,
                    }}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column actions */}
                <div className={cn(
                  "flex items-center gap-1 transition-opacity duration-200",
                  isHovered ? "opacity-100" : "opacity-0"
                )}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="text-xs gap-2" onClick={onCreateTask}>
                        <Plus className="w-3.5 h-3.5" />
                        Add task
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs gap-2 text-muted-foreground">
                        <Settings2 className="w-3.5 h-3.5" />
                        Edit column
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2 text-red-600 dark:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete column
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Progress bar for done column */}
              {column.category === "done" && columnTasks.length > 0 && (
                <div className="mt-3 h-1 bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (columnTasks.length / tasks.length) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* ── Cards container ── */}
            <div
              ref={(el) => { scrollRefs.current[column.key] = el; }}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 pb-3 space-y-2.5"
            >
              {columnTasks.map((task, index) => (
                <div
                  key={task.id}
                  className={cn(
                    "transition-all duration-200 ease-out",
                    draggingTaskId === task.id && "opacity-30 scale-95 rotate-1"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
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
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: accentColor + "10" }}
                  >
                    <Kanban className="w-6 h-6" style={{ color: accentColor + "60" }} />
                  </div>
                  <p className="text-xs text-muted-foreground/50 font-medium">No tasks yet</p>
                  <p className="text-[10px] text-muted-foreground/30 mt-1">Drag tasks here</p>
                </div>
              )}

              {/* Drop zone indicator */}
              {isDragOver && (
                <div
                  className="flex items-center justify-center py-6 border-2 border-dashed rounded-xl my-2 transition-all duration-200"
                  style={{
                    borderColor: accentColor + "50",
                    backgroundColor: accentColor + "08",
                    boxShadow: `inset 0 0 20px ${accentColor}10`
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: accentColor + "20" }}
                    >
                      <Plus className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: accentColor }}>
                      Drop here
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Inline create footer ── */}
            <div className="shrink-0 px-3 pb-3 pt-1">
              <InlineCreateCard onSubmit={(title) => handleInlineCreate(title, column.key)} />
            </div>
          </div>
        );
      })}

      {/* ── Add column ── */}
      <div className="flex flex-col w-[300px] shrink-0">
        {showAddColumn ? (
          <div className="bg-gradient-to-b from-muted/40 via-muted/30 to-muted/20 border border-border/40 rounded-2xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-medium">New Column</span>
            </div>
            <Input
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Column name..."
              className="h-9 text-sm rounded-xl bg-background/50 border-border/40"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddColumn();
                if (e.key === "Escape") { setShowAddColumn(false); setNewColumnName(""); }
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-8 text-xs flex-1 rounded-xl font-semibold"
                onClick={handleAddColumn}
                disabled={creatingColumn || !newColumnName.trim()}
              >
                {creatingColumn ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Creating...</>
                ) : "Create column"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs rounded-xl px-3"
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
              "flex-1 flex flex-col items-center justify-center gap-3 min-h-[120px] rounded-2xl",
              "border-2 border-dashed border-border/25",
              "text-muted-foreground/40 hover:text-muted-foreground/70",
              "hover:border-border/40 hover:bg-muted/10",
              "transition-all duration-300 group"
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center group-hover:bg-muted/30 group-hover:scale-110 transition-all duration-200">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">Add column</span>
          </button>
        )}
      </div>
    </div>
  );
}
