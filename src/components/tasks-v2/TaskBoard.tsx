import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import TaskCard, { InlineCreateCard, type TaskCardData } from "./TaskCard";
import EmptyState from "./EmptyState";
import { apiPost, apiPatch, apiGet } from "@/lib/api";
import { Plus, MoreHorizontal, ListTodo, Loader2, CheckCircle2, Eye, X, GripVertical } from "lucide-react";
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

/** Status column shape from API */
export interface WorkflowStatus {
  id: string;
  key: string;
  name: string;
  color: string;
  category: string;
  position: number;
}

/** Fallback columns */
const FALLBACK_COLUMNS: WorkflowStatus[] = [
  { id: "fb-1", key: "todo", name: "Open", color: "#737373", category: "todo", position: 0 },
  { id: "fb-2", key: "in_progress", name: "In Progress", color: "#2563eb", category: "doing", position: 1 },
  { id: "fb-3", key: "in_review", name: "In Review", color: "#2563eb", category: "doing", position: 2 },
  { id: "fb-4", key: "done", name: "Done", color: "#737373", category: "done", position: 3 },
];

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
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [creatingColumn, setCreatingColumn] = useState(false);
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const totalTasks = tasks.length;

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
    const taskId = e.dataTransfer.getData("taskId");
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
      const created = await apiPost<TaskCardData>("/tasks", { 
        title: title.trim(), 
        status,
        teamId 
      });
      if (created) {
        onTaskCreated?.(created);
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim() || creatingColumn) return;
    setCreatingColumn(true);
    try {
      const key = newColumnName.toLowerCase().replace(/\s+/g, "_");
      const created = await apiPost<WorkflowStatus>("/task-statuses", {
        name: newColumnName.trim(),
        key,
        color: "#737373",
        category: "todo",
        position: columns.length,
        teamId,
      });
      if (created) {
        setColumns(prev => [...prev, created].sort((a, b) => a.position - b.position));
      } else {
        // Fallback: add locally
        setColumns(prev => [...prev, {
          id: `col-${Date.now()}`,
          key,
          name: newColumnName.trim(),
          color: "#737373",
          category: "todo",
          position: prev.length,
        }]);
      }
      setNewColumnName("");
      setShowAddColumn(false);
    } catch (err) {
      console.error("Failed to create column:", err);
      // Fallback: add locally anyway
      const key = newColumnName.toLowerCase().replace(/\s+/g, "_");
      setColumns(prev => [...prev, {
        id: `col-${Date.now()}`,
        key,
        name: newColumnName.trim(),
        color: "#737373",
        category: "todo",
        position: prev.length,
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
    <div className="flex-1 min-h-0 overflow-hidden">
      {/* Professional Kanban Board */}
      <div className="h-full flex gap-4 overflow-x-auto p-4">
        {columns.map((column) => {
          const columnTasks = tasksByStatus[column.key] || [];
          const isDragOver = dragOverColumn === column.key;

          return (
            <div
              key={column.key}
              className={cn(
                "flex flex-col h-full min-h-0",
                "w-[260px] sm:w-[280px] shrink-0",
                "bg-muted/20 rounded-xl",
                "transition-all duration-200",
                isDragOver && "ring-2 ring-primary/40 bg-primary/5"
              )}
              onDragOver={(e) => handleDragOver(e, column.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.key)}
            >
              {/* Column Header */}
              <div className="shrink-0 px-3 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: column.color || '#737373' }}
                  />
                  <span className="text-sm font-medium text-foreground truncate">
                    {column.name}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-medium">
                    {columnTasks.length}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={() => onCreateTask()}>
                      <Plus className="w-3.5 h-3.5 mr-2" />
                      Add task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Cards Container */}
              <div
                ref={(el) => { scrollRefs.current[column.key] = el; }}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 pb-2 space-y-2"
              >
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "transition-opacity duration-150",
                      draggingTaskId === task.id && "opacity-30"
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

                {/* Empty state */}
                {columnTasks.length === 0 && !isDragOver && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center mb-1.5">
                      <ListTodo className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">No tasks</p>
                  </div>
                )}

                {/* Drop indicator */}
                {isDragOver && (
                  <div className="flex items-center justify-center py-3 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
                    <span className="text-xs text-primary/70 font-medium">Drop here</span>
                  </div>
                )}
              </div>

              {/* Footer - Add task */}
              <div className="shrink-0 px-2 pb-2">
                <InlineCreateCard onSubmit={(title) => handleInlineCreate(title, column.key)} />
              </div>
            </div>
          );
        })}

        {/* Add Column Button */}
        <div className="flex flex-col w-[260px] sm:w-[280px] shrink-0">
          {showAddColumn ? (
            <div className="bg-muted/20 rounded-xl p-3 space-y-2.5">
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Column name..."
                autoFocus
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") { setShowAddColumn(false); setNewColumnName(""); }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddColumn} disabled={creatingColumn || !newColumnName.trim()} className="h-8">
                  {creatingColumn ? "Creating..." : "Create"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddColumn(false); setNewColumnName(""); }} className="h-8">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddColumn(true)}
              className="flex-1 flex items-center justify-center gap-2 min-h-[60px] rounded-xl border border-dashed border-border/30 hover:border-border/50 hover:bg-muted/10 transition-colors text-muted-foreground"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add column</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
