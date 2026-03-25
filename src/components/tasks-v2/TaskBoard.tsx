import { useState, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import TaskCard, { InlineCreateCard, type TaskCardData } from "./TaskCard";
import EmptyState from "./EmptyState";
import { apiPost, apiPatch, apiGet } from "@/lib/api";

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
  { id: "fb-1", key: "todo",        name: "TO DO",        color: "#94a3b8", category: "todo",  position: 0 },
  { id: "fb-2", key: "in_progress", name: "IN PROGRESS",  color: "#3b82f6", category: "doing", position: 1 },
  { id: "fb-3", key: "in_review",   name: "IN REVIEW",    color: "#f59e0b", category: "doing", position: 2 },
  { id: "fb-4", key: "done",        name: "DONE",         color: "#10b981", category: "done",  position: 3 },
];

/** Map hex color to Tailwind-style classes for dot and ring */
function colorToDotClasses(hex: string) {
  return {
    dot: `bg-[${hex}]`,
    dotRing: `ring-[${hex}]/20`,
    // Use inline style for reliable rendering
    dotStyle: { backgroundColor: hex },
    ringStyle: { boxShadow: `0 0 0 4px ${hex}33` },
  };
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

  if (tasks.length === 0 && columns.length > 0) {
    // Show empty columns with inline create
  }

  if (tasks.length === 0 && columns.length === 0) {
    return <EmptyState type="no-tasks" onCreateTask={onCreateTask} />;
  }

  return (
    <div
      className={cn(
        "flex-1 min-h-0 py-4",
        "px-2 sm:px-4 lg:px-6",
        "flex gap-3 sm:gap-4 overflow-x-auto pb-1",
        "scrollbar-thin scrollbar-thumb-muted-foreground/15 scrollbar-track-transparent"
      )}
    >
      {columns.map((column) => {
        const columnTasks = tasksByStatus[column.key] || [];
        const isDragOver = dragOverColumn === column.key;

        return (
          <div
            key={column.key}
            className={cn(
              "flex flex-col rounded-2xl transition-all duration-200",
              "w-[260px] sm:w-[280px] md:w-[320px] lg:w-[340px] xl:flex-1 xl:min-w-0",
              "shrink-0",
              "border bg-card/95 shadow-sm",
              isDragOver && "border-primary/60 ring-2 ring-primary/25 ring-inset bg-primary/[0.02]"
            )}
            onDragOver={(e) => handleDragOver(e, column.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.key)}
          >
            {/* ── Column header ── */}
            <div className="flex items-center gap-2 px-3 py-3 shrink-0 select-none border-b border-border/30">
              <div
                className="w-2.5 h-2.5 rounded-full ring-2 shrink-0"
                style={{
                  backgroundColor: column.color,
                  boxShadow: `0 0 0 4px ${column.color}33`,
                }}
              />
              <span className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                {column.name}
              </span>
              <span className="ml-auto text-[11px] font-semibold text-muted-foreground/50 tabular-nums px-1.5 py-0.5 rounded-full bg-muted/50">
                {columnTasks.length}
              </span>
            </div>

            {/* ── Cards ── */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="flex flex-col gap-2.5 px-2.5 pb-3 pt-2">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "transition-opacity duration-150",
                      draggingTaskId === task.id && "opacity-20"
                    )}
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

                {columnTasks.length === 0 && !isDragOver && (
                  <div className="flex items-center justify-center min-h-[60px] rounded-lg border border-dashed border-border/25 text-[11px] text-muted-foreground/25 select-none">
                    No issues
                  </div>
                )}

                {isDragOver && (
                  <div className="flex items-center justify-center min-h-[60px] rounded-lg border-2 border-dashed border-primary/30 bg-primary/[0.02] text-[11px] text-primary/50 font-medium">
                    Drop here
                  </div>
                )}

                <InlineCreateCard onSubmit={(title) => handleInlineCreate(title, column.key)} />
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
