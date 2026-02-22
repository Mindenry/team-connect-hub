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
} from "@dnd-kit/sortable";
import {
  Plus, Filter, Search, Calendar, CheckSquare,
  ArrowUp, ArrowRight, ArrowDown, LayoutGrid, List, GripVertical,
  BarChart3, Clock, Users, Target, Zap, FileText,
  X, Tag, Flag, Rocket, FolderKanban, Activity, SidebarOpen, SidebarClose,
  ChevronRight, Sparkles, Layers,
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
import { PresenceIndicator } from "@/components/tasks/PresenceIndicator";
import { TeamActivityFeed } from "@/components/tasks/TeamActivityFeed";
import { TeamWorkloadView } from "@/components/tasks/TeamWorkloadView";
import { getSocket } from "@/lib/websocket";
import { apiGet, apiPatch } from "@/lib/api";
import { auth } from "@/lib/auth";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

const columnConfig = [
  { id: "todo", title: "To Do", color: "from-slate-500/10 to-slate-500/5", accent: "border-slate-500/20" },
  { id: "in_progress", title: "In Progress", color: "from-blue-500/10 to-blue-500/5", accent: "border-blue-500/20" },
  { id: "review", title: "In Review", color: "from-amber-500/10 to-amber-500/5", accent: "border-amber-500/20" },
  { id: "done", title: "Done", color: "from-emerald-500/10 to-emerald-500/5", accent: "border-emerald-500/20" },
];

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
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className={cn("touch-none", isDragging && "z-50")}
    >
      <Card
        {...attributes}
        {...listeners}
        className={cn(
          "group cursor-grab active:cursor-grabbing transition-all duration-200",
          "bg-card/80 backdrop-blur-sm border border-border/50",
          "hover:border-border hover:shadow-lg hover:shadow-black/5",
          "hover:-translate-y-0.5",
          isDragging && "shadow-2xl shadow-black/10 ring-2 ring-primary/20 rotate-1",
          task.priority === "urgent" && "border-l-2 border-l-red-500/50",
          task.priority === "high" && "border-l-2 border-l-orange-500/50",
          task.priority === "medium" && "border-l-2 border-l-yellow-500/50",
          task.priority === "low" && "border-l-2 border-l-green-500/50",
          isOverdue && "bg-red-50/30 dark:bg-red-950/10 border-red-500/30"
        )}
        onClick={(e) => {
          if (!isDragging) {
            onSelect(task);
          }
        }}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <GripVertical className="w-4 h-4 shrink-0 text-muted-foreground/40 mt-0.5 group-hover:text-muted-foreground transition-colors" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {task.title}
                </h4>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {task.epic && (
                <div
                  className="w-2 h-2 rounded-full ring-2 ring-background"
                  style={{ backgroundColor: task.epic.color || "#6366f1" }}
                  title={task.epic.name}
                />
              )}
              <PriorityIcon className={cn("w-4 h-4 shrink-0", priorityColor)} />
            </div>
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.tags.slice(0, 3).map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="text-[10px] px-2 py-0.5 font-normal bg-muted/50 text-muted-foreground border-0"
                >
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-muted-foreground/20">
                  +{task.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Subtasks Progress */}
          {totalSubtasks > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                {completedSubtasks}/{totalSubtasks}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <div className="flex items-center gap-2">
              {task.assignee ? (
                <Avatar className="h-6 w-6 border border-border/50 ring-2 ring-background">
                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-semibold">
                    {task.assignee.initials || task.assignee.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                  <Users className="w-3 h-3 text-muted-foreground/30" />
                </div>
              )}
              {task.storyPoints && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono border-muted-foreground/20">
                  {task.storyPoints}SP
                </Badge>
              )}
            </div>
            {task.dueDate && (
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-medium",
                isOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
              )}>
                <Calendar className="w-3 h-3" />
                <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
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
  const colConfig = columnConfig.find(c => c.id === column.id) || columnConfig[0];
  
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="w-full sm:w-80 flex flex-col shrink-0">
      {/* Column Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "mb-4 p-4 rounded-xl border bg-gradient-to-br",
          colConfig.color,
          colConfig.accent,
          "backdrop-blur-sm shadow-sm",
          isOver && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              column.id === "todo" && "bg-slate-500",
              column.id === "in_progress" && "bg-blue-500",
              column.id === "review" && "bg-amber-500",
              column.id === "done" && "bg-emerald-500",
            )} />
            <h3 className="text-sm font-bold text-foreground tracking-tight">{column.title}</h3>
            <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0 bg-background/50 border-0">
              {column.tasks.length}
            </Badge>
          </div>
          {totalStoryPoints > 0 && (
            <Badge variant="outline" className="text-[9px] font-mono border-muted-foreground/20">
              {totalStoryPoints}SP
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full text-xs text-muted-foreground hover:text-foreground hover:bg-background/50"
          onClick={onAddTask}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add task
        </Button>
      </motion.div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-xl p-3 bg-muted/20 backdrop-blur-sm border border-border/30 transition-all duration-200",
          isOver && "bg-primary/5 border-primary/30 ring-2 ring-primary/20"
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 min-h-[400px]">
            <AnimatePresence>
              {column.tasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-64 text-center p-6 border-2 border-dashed border-border/30 rounded-xl bg-background/30"
                >
                  <FolderKanban className="w-10 h-10 text-muted-foreground/20 mb-3" />
                  <p className="text-xs text-muted-foreground font-medium">Drop tasks here</p>
                </motion.div>
              ) : (
                column.tasks.map((task) => (
                  <SortableTaskCard key={task.id} task={task} onSelect={onSelectTask} />
                ))
              )}
            </AnimatePresence>
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
    <Card className="w-80 shadow-2xl ring-2 ring-primary/30 rotate-2 cursor-grabbing border-l-4 border-l-primary bg-card/95 backdrop-blur-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <h4 className="text-sm font-semibold text-foreground leading-tight flex-1">{task.title}</h4>
          <PriorityIcon className={cn("w-4 h-4 shrink-0", priorityColor)} />
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
  const [showSidebar, setShowSidebar] = useState(true);
  const [presenceUsers, setPresenceUsers] = useState<Array<{ userId: string; name: string; initials?: string; isViewing?: boolean; isEditing?: boolean }>>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

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
    cols.forEach(col => {
      col.tasks.sort((a, b) => {
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
        const [tasksData, teamsData, sprintsData, epicsData, usersData] = await Promise.all([
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
          apiGet<any[]>("/users").catch(() => []),
        ]);

        if (!cancelled) {
          // Ensure all responses are arrays
          const safeTasksData = Array.isArray(tasksData) ? tasksData : [];
          const safeTeamsData = Array.isArray(teamsData) ? teamsData : [];
          const safeSprintsData = Array.isArray(sprintsData) ? sprintsData : [];
          const safeEpicsData = Array.isArray(epicsData) ? epicsData : [];
          const safeUsersData = Array.isArray(usersData) ? usersData : [];
          
          const mappedTasks: Task[] = safeTasksData.map(mapTask);
          const cols = updateColumnsFromTasks(mappedTasks);
          setColumns(cols);
          setTeams(safeTeamsData);
          setSprints(safeSprintsData);
          setEpics(safeEpicsData);
          setTeamMembers(safeUsersData);
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

    // Presence tracking
    const currentUser = auth.getUser();
    if (currentUser) {
      socket.emit('presence:online', {
        userId: currentUser.id,
        name: currentUser.name || 'Unknown',
      });
    }

    const handlePresenceUpdate = (users: Array<{ userId: string; name: string }>) => {
      if (!cancelled) {
        const mapped = users.map(u => ({
          userId: u.userId,
          name: u.name,
          initials: u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          isViewing: true,
          isEditing: false,
        }));
        setPresenceUsers(mapped);
      }
    };

    socket.on('presence:update', handlePresenceUpdate);
    socket.emit('presence:get');

    return () => {
      cancelled = true;
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('presence:update', handlePresenceUpdate);
    };
  }, [filterStatus, filterPriority, filterTeam, filterSprint, filterEpic, searchQuery]);

  useEffect(() => {
    if (viewMode === "analytics") {
      apiGet<any>(`/tasks/analytics${filterTeam !== "all" ? `?teamId=${filterTeam}` : ""}`)
        .then(data => {
          // Handle response format: {success: true, data: {...}} or direct object
          const analyticsData = (data && typeof data === 'object' && 'data' in data) ? data.data : data;
          setAnalytics(analyticsData || {});
        })
        .catch(err => {
          console.error("Failed to load analytics:", err);
          setAnalytics({});
        });
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
  
  const filteredTasks = allTasks.filter((task) => {
    const matchesSearch = searchQuery === "" || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const hasActiveFilters = filterStatus !== "all" || filterPriority !== "all" || filterTeam !== "all" || filterSprint !== "all" || filterEpic !== "all";

  return (
    <div className="flex flex-col h-screen bg-background">
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

      {/* Modern Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
      >
        <div className="px-3 xs:px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* Left Section */}
            <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                  <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                    <span className="truncate">Tasks</span>
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                        Filtered
                      </Badge>
                    )}
                  </h1>
                  <div className="flex items-center gap-2 sm:gap-3 mt-0.5 flex-wrap">
                    <p className="text-xs text-muted-foreground font-medium">
                      {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
                    </p>
                    {presenceUsers.length > 0 && (
                      <>
                        <span className="text-muted-foreground/30 hidden sm:inline">•</span>
                        <div className="flex items-center gap-2">
                          <PresenceIndicator users={presenceUsers} maxVisible={4} />
                          <span className="text-xs text-muted-foreground hidden xs:inline">
                            {presenceUsers.length} online
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sidebar Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 shrink-0"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                {showSidebar ? <SidebarClose className="w-4 h-4" /> : <SidebarOpen className="w-4 h-4" />}
              </Button>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/50">
                <Button
                  variant={viewMode === "kanban" ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 px-2 sm:px-3 text-xs font-medium",
                    viewMode === "kanban" && "shadow-sm"
                  )}
                  onClick={() => setViewMode("kanban")}
                >
                  <LayoutGrid className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Kanban</span>
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 px-2 sm:px-3 text-xs font-medium",
                    viewMode === "list" && "shadow-sm"
                  )}
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">List</span>
                </Button>
                <Button
                  variant={viewMode === "analytics" ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 px-2 sm:px-3 text-xs font-medium",
                    viewMode === "analytics" && "shadow-sm"
                  )}
                  onClick={() => setViewMode("analytics")}
                >
                  <BarChart3 className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden md:inline">Analytics</span>
                </Button>
              </div>

              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 w-64 text-sm bg-background border-border/50 focus:border-border"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Button */}
              <Button
                variant={hasActiveFilters ? "default" : "outline"}
                size="sm"
                className="h-9 shrink-0"
                onClick={() => setShowFilter(true)}
              >
                <Filter className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Filter</span>
              </Button>

              {/* Create Task Button */}
              <Button
                size="sm"
                className="h-9 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0"
                onClick={() => setShowCreateTask(true)}
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">New Task</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>
          
          {/* Mobile Search */}
          <div className="relative md:hidden mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full text-sm bg-background border-border/50 focus:border-border"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Loading / Error */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground font-medium">Loading tasks...</p>
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
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar */}
          <AnimatePresence>
            {showSidebar && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 border-r border-border/50 bg-muted/20 overflow-hidden flex flex-col"
              >
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    <TeamWorkloadView
                      tasks={allTasks}
                      teamMembers={teamMembers}
                      className="w-full"
                    />
                    <TeamActivityFeed
                      teamId={filterTeam !== "all" ? filterTeam : undefined}
                      maxItems={10}
                      className="w-full"
                    />
                  </div>
                  <ScrollBar orientation="vertical" />
                </ScrollArea>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden bg-muted/10">
            {viewMode === "kanban" ? (
              <div className="h-full overflow-x-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex gap-3 sm:gap-4 h-full p-3 sm:p-4 md:p-6 min-w-max">
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
              <div className="h-full overflow-y-auto p-3 sm:p-4 md:p-6">
                <div className="max-w-7xl mx-auto">
                  <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead className="bg-muted/30 border-b border-border/50 sticky top-0 z-10">
                          <tr>
                            <th className="text-left text-xs font-semibold text-muted-foreground px-3 sm:px-4 py-2 sm:py-3 uppercase tracking-wider">Task</th>
                            <th className="text-left text-xs font-semibold text-muted-foreground px-3 sm:px-4 py-2 sm:py-3 uppercase tracking-wider hidden sm:table-cell">Status</th>
                            <th className="text-left text-xs font-semibold text-muted-foreground px-3 sm:px-4 py-2 sm:py-3 uppercase tracking-wider hidden md:table-cell">Assignee</th>
                            <th className="text-left text-xs font-semibold text-muted-foreground px-3 sm:px-4 py-2 sm:py-3 uppercase tracking-wider">Priority</th>
                            <th className="text-left text-xs font-semibold text-muted-foreground px-3 sm:px-4 py-2 sm:py-3 uppercase tracking-wider hidden lg:table-cell">Due Date</th>
                            <th className="text-left text-xs font-semibold text-muted-foreground px-3 sm:px-4 py-2 sm:py-3 uppercase tracking-wider hidden lg:table-cell">Tags</th>
                          </tr>
                        </thead>
                      <tbody>
                        {filteredTasks.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 sm:px-4 py-8 sm:py-12 text-center">
                              <div className="flex flex-col items-center gap-3">
                                <CheckSquare className="w-12 h-12 text-muted-foreground/20" />
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
                                className="border-t border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group"
                                onClick={() => setSelectedTask(task)}
                              >
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {task.epic && (
                                        <div
                                          className="w-2 h-2 rounded-full shrink-0"
                                          style={{ backgroundColor: task.epic.color || "#6366f1" }}
                                          title={task.epic.name}
                                        />
                                      )}
                                      <span className="text-xs sm:text-sm font-medium text-foreground truncate">{task.title}</span>
                                    </div>
                                    {task.storyPoints && (
                                      <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                                        {task.storyPoints}SP
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 sm:hidden">
                                    <Badge variant="secondary" className="text-[10px]">{task.column}</Badge>
                                    {task.assignee && (
                                      <div className="flex items-center gap-1">
                                        <Avatar className="h-4 w-4">
                                          <AvatarFallback className="bg-primary/10 text-primary text-[8px]">
                                            {task.assignee.initials || task.assignee.name?.charAt(0) || "?"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[10px] text-muted-foreground truncate">{task.assignee.name}</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">
                                  <Badge variant="secondary" className="text-xs">{task.column}</Badge>
                                </td>
                                <td className="px-3 sm:px-4 py-2 sm:py-3 hidden md:table-cell">
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
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div className="flex items-center gap-1">
                                    <PriorityIcon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", priorityColor)} />
                                    <span className="text-xs sm:text-sm text-muted-foreground capitalize">{task.priority}</span>
                                  </div>
                                </td>
                                <td className="px-3 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">
                                  {task.dueDate ? (
                                    <div className={cn(
                                      "text-xs sm:text-sm flex items-center gap-1",
                                      isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"
                                    )}>
                                      <Calendar className="w-3 h-3" />
                                      {new Date(task.dueDate).toLocaleDateString()}
                                    </div>
                                  ) : (
                                    <span className="text-xs sm:text-sm text-muted-foreground italic">No due date</span>
                                  )}
                                </td>
                                <td className="px-3 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">
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
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-3 sm:p-4 md:p-6">
                <div className="max-w-7xl mx-auto">
                  {analytics ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
