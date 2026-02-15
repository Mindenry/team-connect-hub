import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  Plus, Filter, Search, MoreHorizontal, Calendar, CheckSquare,
  ArrowUp, ArrowRight, ArrowDown, LayoutGrid, List, GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";
import TaskDetailDialog from "@/components/dialogs/TaskDetailDialog";
import { getSocket } from "@/lib/websocket";
import { apiGet, apiPatch } from "@/lib/api";
import { auth } from "@/lib/auth";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  status?: string;
  assignee: { name: string; initials: string };
  dueDate: string;
  tags: string[];
  linkedMeeting?: string;
}

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}


const initialColumns: Column[] = [
  {
    id: "todo",
    title: "To Do",
    color: "bg-muted-foreground",
    tasks: [
      { id: "t1", title: "Update API documentation", priority: "medium", assignee: { name: "อริสา P.", initials: "AP" }, dueDate: "Feb 12", tags: ["docs"], linkedMeeting: "Sprint Planning" },
      { id: "t2", title: "Fix Safari upload bug", priority: "high", assignee: { name: "จิรวัฒน์ W.", initials: "JW" }, dueDate: "Feb 10", tags: ["bug", "browser"] },
      { id: "t3", title: "Design new onboarding flow", priority: "medium", assignee: { name: "พิมพ์ L.", initials: "PL" }, dueDate: "Feb 15", tags: ["design", "ux"] },
    ],
  },
  {
    id: "in_progress",
    title: "In Progress",
    color: "bg-primary",
    tasks: [
      { id: "t4", title: "Implement user profile page", priority: "high", assignee: { name: "สมชาย K.", initials: "SK" }, dueDate: "Feb 11", tags: ["frontend"] },
      { id: "t5", title: "Database migration v2.3", priority: "high", assignee: { name: "ธนา S.", initials: "TS" }, dueDate: "Feb 10", tags: ["backend", "db"] },
    ],
  },
  {
    id: "review",
    title: "In Review",
    color: "bg-warning",
    tasks: [
      { id: "t6", title: "PR #142 - Mobile responsive fix", priority: "medium", assignee: { name: "พิมพ์ L.", initials: "PL" }, dueDate: "Feb 9", tags: ["frontend", "mobile"] },
    ],
  },
  {
    id: "done",
    title: "Done",
    color: "bg-success",
    tasks: [
      { id: "t7", title: "Setup CI/CD pipeline", priority: "low", assignee: { name: "ธนา S.", initials: "TS" }, dueDate: "Feb 8", tags: ["devops"] },
      { id: "t8", title: "Write unit tests for auth module", priority: "medium", assignee: { name: "จิรวัฒน์ W.", initials: "JW" }, dueDate: "Feb 7", tags: ["testing"] },
    ],
  },
];

const priorityIcons: Record<string, { icon: React.ElementType; color: string }> = {
  high: { icon: ArrowUp, color: "text-destructive" },
  medium: { icon: ArrowRight, color: "text-warning" },
  low: { icon: ArrowDown, color: "text-muted-foreground" },
};

// --- Sortable Task Card ---
function SortableTaskCard({
  task,
  onSelect,
}: {
  task: Task;
  onSelect: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  const PriorityIcon = priorityIcons[task.priority].icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging && "opacity-40"
      )}
    >
      <Card
        className={cn(
          "cursor-pointer hover:shadow-md transition-shadow group border",
          isDragging && "shadow-lg ring-2 ring-primary/30"
        )}
        onClick={() => onSelect(task)}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <button
                className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </button>
              <h4 className="text-sm font-medium text-foreground leading-tight truncate">{task.title}</h4>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
            ))}
          </div>
          {task.linkedMeeting && (
            <div className="flex items-center gap-1 mb-2 text-xs text-primary">
              <CheckSquare className="w-3 h-3" />
              <span>From: {task.linkedMeeting}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5"><AvatarFallback className="bg-primary/10 text-primary text-[9px]">{task.assignee.initials}</AvatarFallback></Avatar>
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-3 h-3" />{task.dueDate}</div>
            </div>
            <PriorityIcon className={cn("w-4 h-4", priorityIcons[task.priority].color)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Droppable Column ---
function DroppableColumn({
  column,
  onAddTask,
  onSelectTask,
}: {
  column: Column;
  onAddTask: () => void;
  onSelectTask: (task: Task) => void;
}) {
  const taskIds = column.tasks.map((t) => t.id);

  return (
    <div className="w-72 flex flex-col shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full", column.color)} />
          <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{column.tasks.length}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onAddTask}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin min-h-[60px] rounded-lg p-1">
          {column.tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onSelect={onSelectTask} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// --- Drag Overlay Card (the "ghost" card while dragging) ---
function TaskDragOverlay({ task }: { task: Task }) {
  const PriorityIcon = priorityIcons[task.priority].icon;
  return (
    <Card className="w-72 shadow-2xl ring-2 ring-primary/20 rotate-2 cursor-grabbing">
      <CardContent className="p-3">
        <div className="flex items-start gap-1.5 mb-2">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <h4 className="text-sm font-medium text-foreground leading-tight">{task.title}</h4>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5"><AvatarFallback className="bg-primary/10 text-primary text-[9px]">{task.assignee.initials}</AvatarFallback></Avatar>
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-3 h-3" />{task.dueDate}</div>
          </div>
          <PriorityIcon className={cn("w-4 h-4", priorityIcons[task.priority].color)} />
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Component ---
export default function Tasks() {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapTask = (t: any): Task => {
    const mapPrio = (p: string | null | undefined): Task["priority"] => {
      if (p === "high" || p === "medium" || p === "low") return p;
      return "medium";
    };
    return {
      id: t.id,
      title: t.title,
      description: t.description ?? undefined,
      priority: mapPrio(t.priority),
      assignee: {
        name: t.assignee?.name ?? "Unassigned",
        initials: t.assignee?.name?.split(" ").map((p: string) => p[0]).join("").toUpperCase() ?? "NA",
      },
      dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "-",
      tags: t.tags ?? [],
      linkedMeeting: t.meeting?.title,
    };
  };

  const updateColumnsFromTasks = (tasks: Task[]) => {
    const cols: Column[] = [
      { id: "todo", title: "To Do", color: "bg-muted-foreground", tasks: [] },
      { id: "in_progress", title: "In Progress", color: "bg-primary", tasks: [] },
      { id: "review", title: "In Review", color: "bg-warning", tasks: [] },
      { id: "done", title: "Done", color: "bg-success", tasks: [] },
    ];
    tasks.forEach((t) => {
      const status = ["todo", "in_progress", "review", "done"].includes(t.status || "todo") ? (t.status || "todo") : "todo";
      const col = cols.find((c) => c.id === status);
      if (col) col.tasks.push(t);
    });
    return cols;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<any[]>("/tasks").catch(() => []);

        if (!Array.isArray(data)) {
          throw new Error("Invalid response format");
        }

        const mappedTasks: Task[] = data.map((t: any) => ({
          ...mapTask(t),
          status: t.status && ["todo", "in_progress", "review", "done"].includes(t.status) ? t.status : "todo",
        }));

        if (!cancelled) {
          const cols = updateColumnsFromTasks(mappedTasks);
          setColumns(cols);
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError(e.message ?? "Failed to load tasks");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // Setup WebSocket for real-time updates
    const socket = getSocket();
    socket.on('task:created', (task: any) => {
      if (!cancelled) {
        const mapped = { ...mapTask(task), status: task.status || "todo" };
        setColumns((prev) => {
          const cols = prev.map((col) => ({ ...col, tasks: [...col.tasks] }));
          const col = cols.find((c) => c.id === mapped.status);
          if (col && !col.tasks.find((t) => t.id === mapped.id)) {
            col.tasks.push(mapped);
          }
          return cols;
        });
      }
    });
    socket.on('task:updated', (task: any) => {
      if (!cancelled) {
        const mapped = { ...mapTask(task), status: task.status || "todo" };
        setColumns((prev) => {
          const cols = prev.map((col) => ({
            ...col,
            tasks: col.tasks.filter((t) => t.id !== mapped.id),
          }));
          const col = cols.find((c) => c.id === mapped.status);
          if (col) col.tasks.push(mapped);
          return cols;
        });
      }
    });
    socket.on('task:deleted', ({ id }: { id: string }) => {
      if (!cancelled) {
        setColumns((prev) => prev.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== id),
        })));
      }
    });

    return () => {
      cancelled = true;
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const findColumnByTaskId = useCallback(
    (taskId: string) => columns.find((col) => col.tasks.some((t) => t.id === taskId)),
    [columns]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const col = findColumnByTaskId(active.id as string);
    const task = col?.tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCol = findColumnByTaskId(activeId);
    const overCol = findColumnByTaskId(overId) || columns.find((c) => c.id === overId);

    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    setColumns((prev) => {
      const activeTask = activeCol.tasks.find((t) => t.id === activeId)!;
      const overTaskIndex = overCol.tasks.findIndex((t) => t.id === overId);

      return prev.map((col) => {
        if (col.id === activeCol.id) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== activeId) };
        }
        if (col.id === overCol.id) {
          const newTasks = [...col.tasks];
          const insertIndex = overTaskIndex >= 0 ? overTaskIndex : newTasks.length;
          newTasks.splice(insertIndex, 0, activeTask);
          return { ...col, tasks: newTasks };
        }
        return col;
      });
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeCol = findColumnByTaskId(activeId);
    const overCol = findColumnByTaskId(overId) || columns.find((c) => c.id === overId);

    if (!activeCol || !overCol) return;

    // If moved to different column, update status via API
    if (activeCol.id !== overCol.id) {
      const currentUser = auth.getUser();
      try {
        await apiPatch(`/tasks/${activeId}`, { status: overCol.id });
      } catch (err) {
        console.error("Failed to update task status:", err);
        // Revert on error
        setColumns((prev) => {
          const activeTask = overCol.tasks.find((t) => t.id === activeId);
          if (!activeTask) return prev;
          return prev.map((c) => {
            if (c.id === overCol.id) {
              return { ...c, tasks: c.tasks.filter((t) => t.id !== activeId) };
            }
            if (c.id === activeCol.id) {
              return { ...c, tasks: [...c.tasks, activeTask] };
            }
            return c;
          });
        });
      }
    } else {
      // Same column, just reorder
      const oldIndex = activeCol.tasks.findIndex((t) => t.id === activeId);
      const newIndex = activeCol.tasks.findIndex((t) => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;
      setColumns((prev) =>
        prev.map((c) =>
          c.id === activeCol.id ? { ...c, tasks: arrayMove(c.tasks, oldIndex, newIndex) } : c
        )
      );
    }
  };

  const allTasks = columns.flatMap((col) => col.tasks.map((t) => ({ ...t, column: col.title, status: col.id })));

  // Filter tasks
  const filteredTasks = allTasks.filter((task) => {
    const matchesSearch = searchQuery === "" || task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="flex flex-col h-screen">
      <CreateTaskDialog open={showCreateTask} onOpenChange={setShowCreateTask} />
      <TaskDetailDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask || undefined}
      />

      {/* Filter Dialog */}
      <Dialog open={showFilter} onOpenChange={setShowFilter}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Filter Tasks</DialogTitle>
            <DialogDescription>Filter tasks by status and priority</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setFilterStatus("all");
              setFilterPriority("all");
              setShowFilter(false);
            }}>Clear</Button>
            <Button onClick={() => setShowFilter(false)}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
          <Badge variant="secondary" className="text-xs">
            {filteredTasks.length} {filteredTasks.length === allTasks.length ? "total" : `of ${allTasks.length}`}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button variant={viewMode === "kanban" ? "default" : "ghost"} size="icon" className="h-8 w-8 rounded-r-none" onClick={() => setViewMode("kanban")}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-8 w-8 rounded-l-none" onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 w-48 text-sm" />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilter(true)}
          >
            <Filter className="w-4 h-4 mr-2" />Filter
            {(filterStatus !== "all" || filterPriority !== "all") && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateTask(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />Add Task
          </Button>
        </div>
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading tasks...</p>
        </div>
      )}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-destructive">Failed to load tasks: {error}</p>
        </div>
      )}

      {/* Kanban Board / List */}
      {!loading && !error && (viewMode === "kanban" ? (
        <div className="flex-1 overflow-x-auto p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full min-w-max">
              {columns.map((column) => (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  onAddTask={() => setShowCreateTask(true)}
                  onSelectTask={setSelectedTask}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? <TaskDragOverlay task={activeTask} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        /* List View */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Task</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Assignee</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Priority</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Due Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Tags</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const PriorityIcon = priorityIcons[task.priority].icon;
                  return (
                    <tr key={task.id} className="border-t hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedTask(task)}>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{task.title}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{task.column}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5"><AvatarFallback className="bg-primary/10 text-primary text-[9px]">{task.assignee.initials}</AvatarFallback></Avatar>
                          <span className="text-sm text-muted-foreground">{task.assignee.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <PriorityIcon className={cn("w-4 h-4", priorityIcons[task.priority].color)} />
                          <span className="text-sm text-muted-foreground capitalize">{task.priority}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{task.dueDate}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {task.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
