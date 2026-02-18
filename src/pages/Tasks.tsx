import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Plus, Filter, Search, MoreHorizontal, Calendar, CheckSquare,
  ArrowUp, ArrowRight, ArrowDown, LayoutGrid, List, GripVertical,
  BarChart3, Clock, Users, Target, Zap, TrendingUp, FileText,
  ChevronDown, ChevronUp, X, Tag, Flag, Rocket, FolderKanban,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "urgent" | "high" | "medium" | "low";
  status?: string;
  assignee?: { id: string; name: string; initials: string; avatar?: string };
  dueDate?: string;
  tags: string[];
  linkedMeeting?: string;
  sprint?: { id: string; name: string };
  epic?: { id: string; name: string; color?: string };
  storyPoints?: number;
  estimate?: number;
  subtasks?: Array<{ id: string; title: string; isCompleted: boolean }>;
  _count?: {
    subtasks: number;
    timeEntries: number;
    attachments: number;
  };
}

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  _count?: { tasks: number };
}

interface Epic {
  id: string;
  name: string;
  color?: string;
  status: string;
  _count?: { tasks: number };
}

const priorityIcons: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  urgent: { icon: Rocket, color: "text-red-600", label: "Urgent" },
  high: { icon: ArrowUp, color: "text-orange-600", label: "High" },
  medium: { icon: ArrowRight, color: "text-yellow-600", label: "Medium" },
  low: { icon: ArrowDown, color: "text-green-600", label: "Low" },
};

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

  const PriorityIcon = priorityIcons[task.priority]?.icon || ArrowRight;
  const priorityColor = priorityIcons[task.priority]?.color || "text-muted-foreground";
  const completedSubtasks = task.subtasks?.filter(s => s.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || task._count?.subtasks || 0;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging && "opacity-40 z-50"
      )}
    >
      <Card
        {...attributes}
        {...listeners}
        className={cn(
          "cursor-grab active:cursor-grabbing hover:shadow-lg transition-all group border-l-4",
          isDragging && "shadow-xl ring-2 ring-primary/30",
          task.priority === "urgent" && "border-l-red-500",
          task.priority === "high" && "border-l-orange-500",
          task.priority === "medium" && "border-l-yellow-500",
          task.priority === "low" && "border-l-green-500",
          isOverdue && "border-l-red-600 bg-red-50/50 dark:bg-red-950/20"
        )}
        onClick={(e) => {
          if (!isDragging) {
            onSelect(task);
          }
        }}
      >
        <CardContent className="p-3.5">
          <div className="flex items-start justify-between mb-2 gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <GripVertical className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
              <h4 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{task.title}</h4>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {task.epic && (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: task.epic.color || "#6366f1" }}
                  title={task.epic.name}
                />
              )}
              <PriorityIcon className={cn("w-4 h-4 shrink-0", priorityColor)} />
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
          )}

          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">{tag}</Badge>
            ))}
            {task.tags.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{task.tags.length - 3}</Badge>
            )}
          </div>

          {totalSubtasks > 0 && (
            <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
              <CheckSquare className="w-3 h-3" />
              <span>{completedSubtasks}/{totalSubtasks}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {task.assignee ? (
                <Avatar className="h-6 w-6 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">
                    {task.assignee.initials || task.assignee.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/30" />
              )}
              {task.storyPoints && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                  {task.storyPoints}SP
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {task.dueDate && (
                <div className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-red-600 font-semibold"
                )}>
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
  const totalStoryPoints = column.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="w-80 flex flex-col shrink-0">
      <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 flex-1">
          <div className={cn("w-3 h-3 rounded-full", column.color)} />
          <h3 className="text-sm font-bold text-foreground">{column.title}</h3>
          <Badge variant="secondary" className="text-xs font-semibold px-1.5 py-0">
            {column.tasks.length}
          </Badge>
        </div>
        {totalStoryPoints > 0 && (
          <Badge variant="outline" className="text-[10px] font-mono">
            {totalStoryPoints}SP
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onAddTask}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-lg p-2 bg-muted/10 transition-colors",
          isOver && "bg-primary/5 ring-2 ring-primary/20"
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 min-h-[200px]">
            {column.tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                <FolderKanban className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Drop tasks here</p>
              </div>
            ) : (
              column.tasks.map((task, index) => (
                <SortableTaskCard key={task.id} task={task} onSelect={onSelectTask} />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function TaskDragOverlay({ task }: { task: Task }) {
  const PriorityIcon = priorityIcons[task.priority]?.icon || ArrowRight;
  const priorityColor = priorityIcons[task.priority]?.color || "text-muted-foreground";

  return (
    <Card className="w-80 shadow-2xl ring-2 ring-primary/20 rotate-2 cursor-grabbing border-l-4 border-l-primary">
      <CardContent className="p-3.5">
        <div className="flex items-start gap-1.5 mb-2">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <h4 className="text-sm font-semibold text-foreground leading-tight">{task.title}</h4>
          <PriorityIcon className={cn("w-4 h-4 shrink-0 ml-auto", priorityColor)} />
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
          ))}
        </div>
        <div className="flex items-center justify-between">
          {task.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                {task.assignee.initials || task.assignee.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Tasks() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterSprint, setFilterSprint] = useState<string>("all");
  const [filterEpic, setFilterEpic] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "analytics">("kanban");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedSprint, setSelectedSprint] = useState<string | null>(null);

  const mapTask = (t: any): Task => {
    const mapPrio = (p: string | null | undefined): Task["priority"] => {
      if (p === "urgent" || p === "high" || p === "medium" || p === "low") return p;
      return "medium";
    };
    return {
      id: t.id,
      title: t.title,
      description: t.description ?? undefined,
      priority: mapPrio(t.priority),
      status: t.status || "todo",
      assignee: t.assignee ? {
        id: t.assignee.id,
        name: t.assignee.name,
        initials: t.assignee.name?.split(" ").map((p: string) => p[0]).join("").toUpperCase() ?? "NA",
        avatar: t.assignee.avatar,
      } : undefined,
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : undefined,
      tags: t.tags ?? [],
      linkedMeeting: t.meeting?.title,
      sprint: t.sprint ? { id: t.sprint.id, name: t.sprint.name } : undefined,
      epic: t.epic ? { id: t.epic.id, name: t.epic.name, color: t.epic.color } : undefined,
      storyPoints: t.storyPoints ?? undefined,
      estimate: t.estimate ?? undefined,
      subtasks: t.subtasks ?? undefined,
      _count: t._count,
    };
  };

  const updateColumnsFromTasks = (tasks: Task[]) => {
    const cols: Column[] = [
      { id: "todo", title: "To Do", color: "bg-gray-400", tasks: [] },
      { id: "in_progress", title: "In Progress", color: "bg-blue-500", tasks: [] },
      { id: "review", title: "In Review", color: "bg-yellow-500", tasks: [] },
      { id: "done", title: "Done", color: "bg-green-500", tasks: [] },
    ];
    tasks.forEach((t) => {
      const status = ["todo", "in_progress", "review", "done"].includes(t.status || "todo") ? (t.status || "todo") : "todo";
      const col = cols.find((c) => c.id === status);
      if (col) col.tasks.push(t);
    });
    // Sort tasks by position within each column
    cols.forEach(col => {
      col.tasks.sort((a, b) => {
        // You might want to add position field to tasks
        return 0;
      });
    });
    return cols;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tasksData, teamsData, sprintsData, epicsData] = await Promise.all([
          apiGet<any[]>(`/tasks?${new URLSearchParams({
            ...(filterStatus !== "all" && { status: filterStatus }),
            ...(filterPriority !== "all" && { priority: filterPriority }),
            ...(filterTeam !== "all" && { teamId: filterTeam }),
            ...(filterSprint !== "all" && { sprintId: filterSprint }),
            ...(filterEpic !== "all" && { epicId: filterEpic }),
            ...(searchQuery && { search: searchQuery }),
          })}`),
          apiGet<any[]>("/teams"),
          apiGet<any[]>(`/sprints${filterTeam !== "all" ? `?teamId=${filterTeam}` : ""}`),
          apiGet<any[]>(`/epics${filterTeam !== "all" ? `?teamId=${filterTeam}` : ""}`),
        ]);

        if (!cancelled) {
          const mappedTasks: Task[] = tasksData.map(mapTask);
          const cols = updateColumnsFromTasks(mappedTasks);
          setColumns(cols);
          setTeams(teamsData);
          setSprints(sprintsData);
          setEpics(epicsData);
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

    const socket = getSocket();
    const handleTaskCreated = (task: any) => {
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
    };
    const handleTaskUpdated = (task: any) => {
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
    };
    const handleTaskDeleted = ({ id }: { id: string }) => {
      if (!cancelled) {
        setColumns((prev) => prev.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== id),
        })));
      }
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);

    return () => {
      cancelled = true;
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, [filterStatus, filterPriority, filterTeam, filterSprint, filterEpic, searchQuery]);

  useEffect(() => {
    if (viewMode === "analytics") {
      fetch(`${API_BASE}/tasks/analytics${filterTeam !== "all" ? `?teamId=${filterTeam}` : ""}`)
        .then(r => r.json())
        .then(data => setAnalytics(data))
        .catch(err => console.error("Failed to load analytics:", err));
    }
  }, [viewMode, filterTeam]);

  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { 
        distance: 3,
      } 
    })
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

    if (activeCol.id !== overCol.id) {
      const currentUser = auth.getUser();
      try {
        await apiPatch(`/tasks/${activeId}/position`, { 
            status: overCol.id,
            position: overCol.tasks.length,
            teamId: filterTeam !== "all" ? filterTeam : undefined,
        });
      } catch (err) {
        console.error("Failed to update task status:", err);
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
    const matchesSearch = searchQuery === "" || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const hasActiveFilters = filterStatus !== "all" || filterPriority !== "all" || filterTeam !== "all" || filterSprint !== "all" || filterEpic !== "all";

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <CreateTaskDialog open={showCreateTask} onOpenChange={setShowCreateTask} />
      <TaskDetailDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask || undefined}
      />

      {/* Filter Dialog */}
      <Dialog open={showFilter} onOpenChange={setShowFilter}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Tasks</DialogTitle>
            <DialogDescription>Filter tasks by multiple criteria</DialogDescription>
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
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Team</Label>
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sprint</Label>
              <Select value={filterSprint} onValueChange={setFilterSprint}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sprints</SelectItem>
                  {sprints.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Epic</Label>
              <Select value={filterEpic} onValueChange={setFilterEpic}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Epics</SelectItem>
                  {epics.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <div className="flex items-center gap-2">
                        {e.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color }} />}
                        {e.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setFilterStatus("all");
              setFilterPriority("all");
              setFilterTeam("all");
              setFilterSprint("all");
              setFilterEpic("all");
              setShowFilter(false);
            }}>Clear All</Button>
            <Button onClick={() => setShowFilter(false)}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b shrink-0 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <CheckSquare className="w-6 h-6 text-primary" />
                Tasks
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
                {hasActiveFilters && " (filtered)"}
              </p>
            </div>
            {selectedSprint && (
              <Badge variant="secondary" className="text-xs font-semibold">
                {sprints.find(s => s.id === selectedSprint)?.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg bg-background">
              <Button 
                variant={viewMode === "kanban" ? "default" : "ghost"} 
                size="sm" 
                className="h-9 rounded-r-none" 
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Kanban
              </Button>
              <Button 
                variant={viewMode === "list" ? "default" : "ghost"} 
                size="sm" 
                className="h-9 rounded-none border-x" 
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </Button>
              <Button 
                variant={viewMode === "analytics" ? "default" : "ghost"} 
                size="sm" 
                className="h-9 rounded-l-none" 
                onClick={() => setViewMode("analytics")}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search tasks..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-9 h-9 w-64 text-sm" 
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button 
              size="sm" 
              onClick={() => setShowCreateTask(true)}
              className="bg-primary hover:bg-primary/90 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
        </div>
        </div>
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          </div>
        </div>
      )}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-sm text-destructive font-semibold">Failed to load tasks</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <div className="flex-1 overflow-hidden">
          {viewMode === "kanban" ? (
            <div className="h-full overflow-x-auto p-6">
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
                <DragOverlay dropAnimation={null}>
                  {activeTask ? <TaskDragOverlay task={activeTask} /> : null}
                </DragOverlay>
              </DndContext>
            </div>
          ) : viewMode === "list" ? (
            <div className="h-full overflow-y-auto p-6">
              <div className="border rounded-lg overflow-hidden bg-card">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Task</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Status</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Assignee</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Priority</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Due Date</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <CheckSquare className="w-12 h-12 text-muted-foreground/30" />
                            <p className="text-sm font-medium text-muted-foreground">No tasks found</p>
                            <Button size="sm" variant="outline" onClick={() => setShowCreateTask(true)} className="mt-2">
                              <Plus className="w-4 h-4 mr-2" />
                              Create Task
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => {
                        const PriorityIcon = priorityIcons[task.priority]?.icon || ArrowRight;
                        const priorityColor = priorityIcons[task.priority]?.color || "text-muted-foreground";
                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
                        return (
                          <tr 
                            key={task.id} 
                            className="border-t hover:bg-muted/30 transition-colors cursor-pointer group" 
                            onClick={() => setSelectedTask(task)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                  {task.epic && (
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: task.epic.color || "#6366f1" }}
                                      title={task.epic.name}
                                    />
                                  )}
                                  <span className="text-sm font-medium text-foreground">{task.title}</span>
                                </div>
                                {task.storyPoints && (
                                  <Badge variant="outline" className="text-[9px] font-mono">
                                    {task.storyPoints}SP
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="text-xs">{task.column}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              {task.assignee ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                                      {task.assignee.initials || task.assignee.name?.charAt(0) || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-muted-foreground">{task.assignee.name}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">Unassigned</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <PriorityIcon className={cn("w-4 h-4", priorityColor)} />
                                <span className="text-sm text-muted-foreground capitalize">{task.priority}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {task.dueDate ? (
                                <div className={cn(
                                  "text-sm flex items-center gap-1",
                                  isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"
                                )}>
                                  <Calendar className="w-3 h-3" />
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">No due date</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 flex-wrap">
                                {task.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                                ))}
                                {task.tags.length > 3 && (
                                  <Badge variant="outline" className="text-[10px]">+{task.tags.length - 3}</Badge>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              {analytics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Tasks</p>
                          <p className="text-2xl font-bold">{analytics.total}</p>
                        </div>
                        <CheckSquare className="w-8 h-8 text-primary/30" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Time Spent</p>
                          <p className="text-2xl font-bold">{analytics.totalTimeSpent.toFixed(1)}h</p>
                        </div>
                        <Clock className="w-8 h-8 text-blue-500/30" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">By Status</p>
                          <p className="text-2xl font-bold">{analytics.byStatus.length}</p>
                        </div>
                        <BarChart3 className="w-8 h-8 text-green-500/30" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">By Priority</p>
                          <p className="text-2xl font-bold">{analytics.byPriority.length}</p>
                        </div>
                        <Flag className="w-8 h-8 text-orange-500/30" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
