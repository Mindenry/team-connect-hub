import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  X,
  CalendarIcon,
  LayoutGrid,
  List,
  Calendar as CalendarViewIcon,
  CheckSquare,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ArrowUpDown,
  BarChart3,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";
import TaskDetailDialog from "@/components/dialogs/TaskDetailDialog";
import { auth } from "@/lib/auth";
import { apiGet, apiPatch } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Task, ViewMode } from "@/components/tasks/types";
import { PRIORITY_CONFIG, STATUS_CONFIG, ALL_STATUSES } from "@/components/tasks/types";

/* ─── helpers ─── */
function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function isOverdue(task: Task) {
  return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ─── animation variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 120, damping: 16 } },
};

/* ═══════════════════════════════════════════════════
   KANBAN COLUMN COMPONENT
   ═══════════════════════════════════════════════════ */
function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  onDrop,
}: {
  status: string;
  tasks: Task[];
  onTaskClick: (t: Task) => void;
  onDrop: (taskId: string, newStatus: string) => void;
}) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col min-w-[280px] max-w-[340px] w-full rounded-xl border bg-card/40 transition-all",
        dragOver ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10" : "border-border/50"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const id = e.dataTransfer.getData("taskId"); if (id) onDrop(id, status); }}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full", cfg.dotColor)} />
          <span className="text-xs font-semibold">{cfg.label}</span>
          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-340px)]">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const overdue = isOverdue(task);
  const subtasks = task.subtasks || [];
  const completedSubs = subtasks.filter((s) => s.isCompleted).length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={(e: any) => { e.dataTransfer?.setData("taskId", task.id); }}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card
        className={cn(
          "group border-border/50 bg-card/80 hover:bg-card hover:border-border/80 transition-all duration-200 cursor-pointer",
          "hover:shadow-md hover:shadow-black/5 hover:-translate-y-0.5",
          overdue && "border-red-500/30 bg-red-500/5"
        )}
        onClick={onClick}
      >
        <CardContent className="p-3 space-y-2">
          {/* Priority + tags row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={cn("text-[10px] px-1.5 py-0 h-5 font-medium border", pCfg.color)}>
              {pCfg.label}
            </Badge>
            {task.tags?.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-5">{tag}</Badge>
            ))}
            {(task.tags?.length || 0) > 2 && (
              <span className="text-[10px] text-muted-foreground">+{task.tags!.length - 2}</span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {task.title}
          </h4>

          {/* Subtask progress */}
          {subtasks.length > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={(completedSubs / subtasks.length) * 100} className="h-1.5 flex-1" />
              <span className="text-[10px] text-muted-foreground shrink-0">{completedSubs}/{subtasks.length}</span>
            </div>
          )}

          {/* Footer: assignee + due date */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              {task.assignee ? (
                <Tooltip>
                  <TooltipTrigger>
                    <Avatar className="h-5 w-5 border border-border/50">
                      <AvatarImage src={task.assignee.avatar || undefined} />
                      <AvatarFallback className="text-[8px]">{getInitials(task.assignee.name)}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{task.assignee.name}</TooltipContent>
                </Tooltip>
              ) : (
                <div className="w-5 h-5 rounded-full border border-dashed border-border/60 flex items-center justify-center">
                  <span className="text-[8px] text-muted-foreground">?</span>
                </div>
              )}
            </div>
            {task.dueDate && (
              <span className={cn("text-[10px] flex items-center gap-1", overdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                <CalendarIcon className="w-3 h-3" />
                {formatShortDate(task.dueDate)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   LIST VIEW COMPONENT
   ═══════════════════════════════════════════════════ */
function TaskListView({
  tasks,
  onTaskClick,
  groupBy,
}: {
  tasks: Task[];
  onTaskClick: (t: Task) => void;
  groupBy: string;
}) {
  const grouped = useMemo(() => {
    if (groupBy === "status") {
      const groups: Record<string, Task[]> = {};
      ALL_STATUSES.forEach((s) => (groups[s] = []));
      tasks.forEach((t) => {
        const key = ALL_STATUSES.includes(t.status as any) ? t.status : "todo";
        groups[key].push(t);
      });
      return Object.entries(groups).filter(([, v]) => v.length > 0);
    }
    if (groupBy === "priority") {
      const order = ["urgent", "high", "medium", "low"];
      const groups: Record<string, Task[]> = {};
      order.forEach((p) => (groups[p] = []));
      tasks.forEach((t) => {
        const key = order.includes(t.priority) ? t.priority : "medium";
        groups[key].push(t);
      });
      return Object.entries(groups).filter(([, v]) => v.length > 0);
    }
    if (groupBy === "team") {
      const groups: Record<string, Task[]> = {};
      tasks.forEach((t) => {
        const key = t.team?.name || "No Team";
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }
    if (groupBy === "assignee") {
      const groups: Record<string, Task[]> = {};
      tasks.forEach((t) => {
        const key = t.assignee?.name || "Unassigned";
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }
    return [["All Tasks", tasks]];
  }, [tasks, groupBy]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      {grouped.map(([groupName, groupTasks]) => (
        <motion.div key={groupName} variants={itemVariants}>
          <div className="flex items-center gap-2 mb-2">
            {groupBy === "status" && (
              <div className={cn("w-2.5 h-2.5 rounded-full", STATUS_CONFIG[groupName]?.dotColor || "bg-slate-400")} />
            )}
            {groupBy === "priority" && (
              <div className={cn("w-2.5 h-2.5 rounded-full", PRIORITY_CONFIG[groupName as keyof typeof PRIORITY_CONFIG]?.dotColor || "bg-gray-400")} />
            )}
            <h3 className="text-sm font-semibold">
              {groupBy === "status" ? STATUS_CONFIG[groupName]?.label || groupName :
               groupBy === "priority" ? PRIORITY_CONFIG[groupName as keyof typeof PRIORITY_CONFIG]?.label || groupName :
               groupName}
            </h3>
            <Badge variant="secondary" className="text-[10px] px-1.5 h-5">{(groupTasks as Task[]).length}</Badge>
          </div>
          <div className="space-y-1.5">
            {(groupTasks as Task[]).map((task, i) => (
              <TaskListRow key={task.id} task={task} index={i} onClick={() => onTaskClick(task)} />
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function TaskListRow({ task, index, onClick }: { task: Task; index: number; onClick: () => void }) {
  const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const sCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const overdue = isOverdue(task);
  const subtasks = task.subtasks || [];
  const completedSubs = subtasks.filter((s) => s.isCompleted).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
    >
      <Card
        className={cn(
          "group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-200 cursor-pointer",
          "hover:shadow-md hover:shadow-black/5 ring-0 hover:ring-1 hover:ring-primary/10",
          overdue && "border-red-500/20"
        )}
        onClick={onClick}
      >
        <CardContent className="p-3 sm:p-3.5">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Priority dot */}
            <div className={cn("w-2 h-2 rounded-full shrink-0", pCfg.dotColor)} />

            {/* Title + tags */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {task.title}
                </h4>
                {overdue && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-red-500/40 text-red-500 shrink-0">
                    Overdue
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Badge className={cn("text-[9px] px-1.5 py-0 h-4 font-medium border", sCfg.bgColor, sCfg.color)}>
                  {sCfg.label}
                </Badge>
                {task.team && <span>{task.team.name}</span>}
                {task.tags?.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 h-4">{tag}</Badge>
                ))}
              </div>
            </div>

            {/* Subtask progress */}
            {subtasks.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <CheckSquare className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{completedSubs}/{subtasks.length}</span>
              </div>
            )}

            {/* Due date */}
            {task.dueDate && (
              <span className={cn("text-[10px] flex items-center gap-1 shrink-0", overdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                <CalendarIcon className="w-3 h-3" />
                {formatShortDate(task.dueDate)}
              </span>
            )}

            {/* Priority badge */}
            <Badge className={cn("text-[9px] px-1.5 py-0 h-5 font-medium border shrink-0 hidden sm:flex", pCfg.color)}>
              {pCfg.label}
            </Badge>

            {/* Assignee */}
            {task.assignee ? (
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-6 w-6 border border-border/50 shrink-0">
                    <AvatarImage src={task.assignee.avatar || undefined} />
                    <AvatarFallback className="text-[8px]">{getInitials(task.assignee.name)}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">{task.assignee.name}</TooltipContent>
              </Tooltip>
            ) : (
              <div className="w-6 h-6 rounded-full border border-dashed border-border/60 flex items-center justify-center shrink-0">
                <span className="text-[8px] text-muted-foreground">?</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   CALENDAR VIEW COMPONENT
   ═══════════════════════════════════════════════════ */
function TaskCalendarView({
  tasks,
  onTaskClick,
}: {
  tasks: Task[];
  onTaskClick: (t: Task) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={prev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-sm font-semibold min-w-[160px] text-center">{monthName}</h3>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={next}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={goToday}>
          Today
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1.5">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden border border-border/50">
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="bg-card/30 min-h-[90px] sm:min-h-[110px]" />;
          }
          const dateObj = new Date(year, month, day);
          const key = `${year}-${month}-${day}`;
          const dayTasks = tasksByDate[key] || [];
          const isToday = isSameDay(dateObj, today);
          const isPast = dateObj < today && !isToday;

          return (
            <div
              key={key}
              className={cn(
                "bg-card/60 min-h-[90px] sm:min-h-[110px] p-1 sm:p-1.5 transition-colors hover:bg-card/80",
                isToday && "bg-primary/5 ring-1 ring-inset ring-primary/20"
              )}
            >
              <div className={cn(
                "text-[11px] font-medium mb-1",
                isToday ? "text-primary font-bold" : isPast ? "text-muted-foreground/50" : "text-foreground"
              )}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((t) => {
                  const pCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <button
                      key={t.id}
                      onClick={() => onTaskClick(t)}
                      className={cn(
                        "w-full text-left text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded truncate leading-tight transition-colors",
                        "hover:bg-primary/10",
                        t.status === "done" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 line-through" :
                        isOverdue(t) ? "bg-red-500/15 text-red-700 dark:text-red-400" :
                        "bg-muted/40 text-foreground/80"
                      )}
                    >
                      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle", pCfg.dotColor)} />
                      {t.title}
                    </button>
                  );
                })}
                {dayTasks.length > 3 && (
                  <span className="text-[9px] text-muted-foreground px-1">+{dayTasks.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN TASKS PAGE
   ═══════════════════════════════════════════════════ */
export default function Tasks() {
  const location = useLocation();
  const currentUser = auth.getUser();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View & Filters
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [sortBy, setSortBy] = useState("position");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy] = useState("status");
  const [showFilter, setShowFilter] = useState(false);

  // Dialogs
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Check for state-passed task (from dashboard)
  useEffect(() => {
    const state = location.state as any;
    if (state?.openTask) {
      setSelectedTask(state.openTask);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const loadTasks = useCallback(async () => {
    try {
      setError(null);
      const [tasksRes, teamsRes] = await Promise.all([
        apiGet<Task[]>("/tasks?limit=500").catch(() => []),
        apiGet<any[]>("/teams").catch(() => []),
      ]);
      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
      setTeams(Array.isArray(teamsRes) ? teamsRes : []);
    } catch (err: any) {
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Extract unique assignees
  const uniqueAssignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    tasks.forEach((t) => {
      if (t.assignee) map.set(t.assignee.id, { id: t.assignee.id, name: t.assignee.name });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  // Filtered & sorted tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    // Filters
    if (filterTeam !== "all") result = result.filter((t) => t.teamId === filterTeam);
    if (filterPriority !== "all") result = result.filter((t) => t.priority === filterPriority);
    if (filterStatus !== "all") result = result.filter((t) => t.status === filterStatus);
    if (filterAssignee !== "all") {
      if (filterAssignee === "unassigned") result = result.filter((t) => !t.assigneeId);
      else result = result.filter((t) => t.assigneeId === filterAssignee);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "dueDate") {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        cmp = da - db;
      } else if (sortBy === "priority") {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        cmp = (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
      } else if (sortBy === "title") {
        cmp = a.title.localeCompare(b.title);
      } else if (sortBy === "createdAt") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        cmp = (a.position ?? 0) - (b.position ?? 0);
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });

    return result;
  }, [tasks, searchQuery, filterTeam, filterPriority, filterStatus, filterAssignee, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const overdue = tasks.filter((t) => isOverdue(t)).length;
    return { total, done, inProgress, overdue };
  }, [tasks]);

  const hasActiveFilters = filterTeam !== "all" || filterPriority !== "all" || filterStatus !== "all" || filterAssignee !== "all";

  // Kanban drop handler
  const handleKanbanDrop = async (taskId: string, newStatus: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await apiPatch(`/tasks/${taskId}/position`, {
        status: newStatus,
        position: 0,
        teamId: task.teamId,
      });
    } catch {
      // Revert
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: task.status } : t));
      toast.error("Failed to move task");
    }
  };

  const handleTaskUpdated = (updated: Task) => {
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    setSelectedTask(null);
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  };

  const handleTaskCreated = (task: Task) => {
    setTasks((prev) => [task, ...prev]);
  };

  const clearFilters = () => {
    setFilterTeam("all");
    setFilterPriority("all");
    setFilterStatus("all");
    setFilterAssignee("all");
    setSearchQuery("");
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <CreateTaskDialog
          open={showCreateTask}
          onOpenChange={setShowCreateTask}
          onCreated={handleTaskCreated}
        />
        <TaskDetailDialog
          open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
          task={selectedTask ? {
            id: selectedTask.id,
            title: selectedTask.title,
            priority: selectedTask.priority,
            assignee: selectedTask.assignee ? {
              id: selectedTask.assignee.id,
              name: selectedTask.assignee.name,
              avatar: selectedTask.assignee.avatar || undefined,
            } : undefined,
            dueDate: selectedTask.dueDate,
            tags: selectedTask.tags,
            linkedMeeting: undefined,
            sprint: undefined,
            epic: undefined,
          } : undefined}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />

        {/* Filter Dialog */}
        <Dialog open={showFilter} onOpenChange={setShowFilter}>
          <DialogContent className="max-w-sm rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Filters</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map((p) => (
                      <SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Team</Label>
                <Select value={filterTeam} onValueChange={setFilterTeam}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Assignee</Label>
                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All People</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {uniqueAssignees.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="position">Position</SelectItem>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {viewMode === "list" && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Group By</Label>
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="assignee">Assignee</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { clearFilters(); setShowFilter(false); }}>Reset</Button>
              <Button onClick={() => setShowFilter(false)}>Apply</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══ HEADER ═══ */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4">
            {/* Title row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10 ring-1 ring-primary/20">
                    <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  {stats.overdue > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-red-500 rounded-full border-2 border-background flex items-center justify-center">
                      <span className="text-[7px] text-white font-bold">{stats.overdue}</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-semibold sm:font-bold text-foreground tracking-tight">Tasks</h1>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                    จัดการงาน · ติดตามความคืบหน้า · Kanban · List · Calendar
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 self-stretch sm:self-auto justify-end flex-wrap">
                <Button
                  size="sm"
                  className="h-8 sm:h-9 gap-1 sm:gap-1.5 px-2 sm:px-2.5 text-[10px] sm:text-[11px] md:text-xs font-medium shrink-0"
                  onClick={() => setShowCreateTask(true)}
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="hidden sm:inline">New Task</span>
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-xl border border-border/60 bg-card/60 px-2.5 sm:px-3 py-2 sm:py-2.5 flex flex-col justify-between">
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide">ทั้งหมด</span>
                <div className="flex items-baseline gap-0.5 sm:gap-1 mt-1">
                  <span className="text-base sm:text-lg md:text-xl font-semibold tabular-nums">{stats.total}</span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">tasks</span>
                </div>
              </div>
              <div className={cn("rounded-xl border px-2.5 sm:px-3 py-2 sm:py-2.5 flex flex-col justify-between", stats.inProgress > 0 ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card/60")}>
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide">กำลังทำ</span>
                <div className="flex items-baseline gap-0.5 sm:gap-1 mt-1">
                  <span className="text-base sm:text-lg md:text-xl font-semibold tabular-nums">{stats.inProgress}</span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">in progress</span>
                </div>
              </div>
              <div className={cn("rounded-xl border px-2.5 sm:px-3 py-2 sm:py-2.5 flex flex-col justify-between", stats.done > 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/60 bg-card/60")}>
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide">เสร็จแล้ว</span>
                <div className="flex items-baseline gap-0.5 sm:gap-1 mt-1">
                  <span className="text-base sm:text-lg md:text-xl font-semibold tabular-nums">{stats.done}</span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">done</span>
                </div>
              </div>
              <div className={cn("rounded-xl border px-2.5 sm:px-3 py-2 sm:py-2.5 flex flex-col justify-between", stats.overdue > 0 ? "border-red-500/30 bg-red-500/5" : "border-border/60 bg-card/60")}>
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide">เลยกำหนด</span>
                <div className="flex items-baseline gap-0.5 sm:gap-1 mt-1">
                  <span className={cn("text-base sm:text-lg md:text-xl font-semibold tabular-nums", stats.overdue > 0 && "text-red-500")}>{stats.overdue}</span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">overdue</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-full flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="h-9 pl-8 rounded-lg text-sm bg-background/50"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Filter button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={hasActiveFilters ? "default" : "outline"}
                      className="h-9 gap-1.5 px-2.5 text-xs"
                      onClick={() => setShowFilter(true)}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Filter</span>
                      {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Filters & Sort</TooltipContent>
                </Tooltip>

                {hasActiveFilters && (
                  <Button size="sm" variant="ghost" className="h-9 text-xs text-muted-foreground" onClick={clearFilters}>
                    <X className="w-3 h-3 mr-1" /> Clear
                  </Button>
                )}

                {/* View mode */}
                <div className="flex items-center rounded-lg border border-border/60 bg-background/50 p-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn("p-1.5 rounded-md transition-all", viewMode === "kanban" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        onClick={() => setViewMode("kanban")}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Kanban Board</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn("p-1.5 rounded-md transition-all", viewMode === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        onClick={() => setViewMode("list")}
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>List View</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn("p-1.5 rounded-md transition-all", viewMode === "calendar" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        onClick={() => setViewMode("calendar")}
                      >
                        <CalendarViewIcon className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Calendar View</TooltipContent>
                  </Tooltip>
                </div>

                {/* Sort direction */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    >
                      <ArrowUpDown className={cn("w-3.5 h-3.5 transition-transform", sortOrder === "desc" && "rotate-180")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{sortOrder === "asc" ? "Ascending" : "Descending"}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-1.5">
                {filterStatus !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1 pr-1">
                    Status: {STATUS_CONFIG[filterStatus]?.label}
                    <button onClick={() => setFilterStatus("all")}><X className="w-3 h-3" /></button>
                  </Badge>
                )}
                {filterPriority !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1 pr-1">
                    Priority: {PRIORITY_CONFIG[filterPriority as keyof typeof PRIORITY_CONFIG]?.label}
                    <button onClick={() => setFilterPriority("all")}><X className="w-3 h-3" /></button>
                  </Badge>
                )}
                {filterTeam !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1 pr-1">
                    Team: {teams.find((t) => t.id === filterTeam)?.name}
                    <button onClick={() => setFilterTeam("all")}><X className="w-3 h-3" /></button>
                  </Badge>
                )}
                {filterAssignee !== "all" && (
                  <Badge variant="secondary" className="text-xs gap-1 pr-1">
                    Assignee: {filterAssignee === "unassigned" ? "Unassigned" : uniqueAssignees.find((u) => u.id === filterAssignee)?.name}
                    <button onClick={() => setFilterAssignee("all")}><X className="w-3 h-3" /></button>
                  </Badge>
                )}
              </div>
            )}

            {/* Results count */}
            <div className="text-[11px] text-muted-foreground">
              {filteredTasks.length} of {tasks.length} tasks
              {searchQuery && <span> matching "{searchQuery}"</span>}
            </div>

            {/* ═══ VIEW CONTENT ═══ */}
            <div className="flex-1 overflow-auto -mx-1 px-1 pb-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button size="sm" variant="outline" onClick={loadTasks}>Retry</Button>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center">
                    <CheckSquare className="w-7 h-7 text-muted-foreground/50" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">No tasks found</p>
                    <p className="text-xs text-muted-foreground/60">
                      {hasActiveFilters || searchQuery ? "Try adjusting your filters or search" : "Create your first task to get started"}
                    </p>
                  </div>
                  {!hasActiveFilters && !searchQuery && (
                    <Button size="sm" onClick={() => setShowCreateTask(true)}>
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Task
                    </Button>
                  )}
                </div>
              ) : viewMode === "kanban" ? (
                <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
                  {ALL_STATUSES.map((status) => (
                    <KanbanColumn
                      key={status}
                      status={status}
                      tasks={filteredTasks.filter((t) => t.status === status)}
                      onTaskClick={setSelectedTask}
                      onDrop={handleKanbanDrop}
                    />
                  ))}
                </div>
              ) : viewMode === "list" ? (
                <TaskListView
                  tasks={filteredTasks}
                  onTaskClick={setSelectedTask}
                  groupBy={groupBy}
                />
              ) : (
                <TaskCalendarView
                  tasks={filteredTasks}
                  onTaskClick={setSelectedTask}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
