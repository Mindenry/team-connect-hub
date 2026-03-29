import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  X,
  LayoutGrid,
  List,
  RefreshCw,
  Users,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  CircleDot,
  CircleCheck,
  Sparkles,
  Kanban,
  SlidersHorizontal,
  CalendarDays,
  TrendingUp,
  Target,
  Zap,
  ChevronDown,
  Layers,
  BarChart3,
} from "lucide-react";
import { apiGet, clearApiCache } from "@/lib/api";
import { getSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

import FilterChips, { type ActiveFilter } from "@/components/tasks-v2/FilterChips";
import FilterDrawer, { type FilterValues } from "@/components/tasks-v2/FilterDrawer";
import TaskBoard from "@/components/tasks-v2/TaskBoard";
import TaskList from "@/components/tasks-v2/TaskList";
import TaskDetailDrawer from "@/components/tasks-v2/TaskDetailDrawer";
import EmptyState from "@/components/tasks-v2/EmptyState";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";
import type { TaskCardData } from "@/components/tasks-v2/TaskCard";

type ViewMode = "board" | "list";
type SortMode = "updated_desc" | "due_asc" | "priority_desc" | "status_asc";

const EMPTY_FILTERS: FilterValues = {
  priority: "",
  assigneeId: "",
  status: "",
  dueDateFrom: "",
  dueDateTo: "",
};

const priorityRank: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const statusRank: Record<string, number> = {
  todo: 1,
  in_progress: 2,
  in_review: 3,
  done: 4,
  canceled: 5,
};

/* ════════════════════════════════════════════════════════════════════════════
   TASKS PAGE - Premium Professional Design (Linear/Notion-inspired)
   ════════════════════════════════════════════════════════════════════════════ */
export default function Tasks() {
  const location = useLocation();
  const { user } = useAuth();

  const [activeView, setActiveView] = useState<ViewMode>("board");
  const [sortMode, setSortMode] = useState<SortMode>("updated_desc");
  const [filters, setFilters] = useState<FilterValues>({ ...EMPTY_FILTERS });
  const [search, setSearch] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskCardData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  const [tasks, setTasks] = useState<TaskCardData[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [teamsInitialized, setTeamsInitialized] = useState(false);

  const normalizeTask = useCallback((task: any): TaskCardData => {
    if (!task) return task;
    return {
      ...(task as TaskCardData),
      id: String(task.id),
      assignee: task.assignee
        ? {
            ...task.assignee,
            id: task.assignee.id ? String(task.assignee.id) : task.assignee.id,
          }
        : task.assignee,
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const assigneeId = params.get("assigneeId") || "";
    if (assigneeId && assigneeId !== filters.assigneeId) {
      setFilters((prev) => ({ ...prev, assigneeId }));
    }
  }, [location.search, filters.assigneeId]);

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
        clearApiCache();
      }
      setLoading(true);
      setErrorMessage(null);

      try {
        const params = new URLSearchParams();
        if (filters.status) params.set("status", filters.status);
        if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
        if (filters.priority) params.set("priority", filters.priority);
        if (filters.dueDateFrom) params.set("dueDateFrom", filters.dueDateFrom);
        if (filters.dueDateTo) params.set("dueDateTo", filters.dueDateTo);
        if (search) params.set("search", search);
        if (selectedTeamId !== "all") params.set("teamId", selectedTeamId);
        const qs = params.toString() ? `?${params.toString()}` : "";

        const [tasksData, usersData, teamsData] = await Promise.all([
          apiGet<any[]>(`/tasks${qs}`).catch(() => []),
          apiGet<any[]>("/users").catch(() => []),
          apiGet<any[]>("/teams").catch(() => []),
        ]);

        const loadedTeams = Array.isArray(teamsData) ? teamsData : [];
        setTeams(loadedTeams);

        if (!teamsInitialized && loadedTeams.length > 0) {
          const myTeams = loadedTeams.filter((t: any) =>
            t.members?.some((m: any) => m.userId === user?.id || m.user?.id === user?.id),
          );
          setSelectedTeamId(myTeams[0]?.id || loadedTeams[0].id);
          setTeamsInitialized(true);
        }

        let filteredTasksData = Array.isArray(tasksData) ? tasksData : [];
        if (selectedTeamId === "all" && loadedTeams.length > 0) {
          const myTeamIds = new Set(
            loadedTeams
              .filter((t: any) =>
                t.members?.some((m: any) => m.userId === user?.id || m.user?.id === user?.id),
              )
              .map((t: any) => t.id),
          );
          if (myTeamIds.size > 0) {
            filteredTasksData = filteredTasksData.filter((t: any) => myTeamIds.has(t.teamId));
          }
        }

        setTasks(filteredTasksData.map((t) => normalizeTask(t)));
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.error("Failed to load tasks workspace data:", error);
        setErrorMessage("Unable to load tasks right now. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters.status, filters.assigneeId, filters.priority, search, selectedTeamId, normalizeTask, user?.id, teamsInitialized],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTaskCreated = (task: any) => {
      if (!task?.id) return;
      setTasks((prev) => (prev.some((t) => String(t.id) === String(task.id)) ? prev : [...prev, normalizeTask(task)]));
    };

    const handleTaskUpdated = (task: any) => {
      if (!task?.id) return;
      setTasks((prev) => prev.map((t) => (String(t.id) === String(task.id) ? { ...t, ...normalizeTask(task) } : t)));
    };

    const handleTaskDeleted = (id: string) => {
      if (!id) return;
      setTasks((prev) => prev.filter((t) => String(t.id) !== String(id)));
    };

    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:deleted", handleTaskDeleted);

    return () => {
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:deleted", handleTaskDeleted);
    };
  }, [normalizeTask]);

  const myTeams = useMemo(() => {
    if (!user?.id) return teams;
    const filtered = teams.filter((t: any) => t.members?.some((m: any) => m.userId === user.id || m.user?.id === user.id));
    return filtered.length > 0 ? filtered : teams;
  }, [teams, user?.id]);

  const visibleTasks = useMemo(() => {
    let result = [...tasks];

    if (!filters.status) {
      result = result.filter((t) => t.status !== "canceled");
    }

    switch (sortMode) {
      case "due_asc":
        result.sort((a, b) => {
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          return ad - bd;
        });
        break;
      case "priority_desc":
        result.sort((a, b) => (priorityRank[b.priority || "low"] || 0) - (priorityRank[a.priority || "low"] || 0));
        break;
      case "status_asc":
        result.sort((a, b) => (statusRank[a.status || "todo"] || 999) - (statusRank[b.status || "todo"] || 999));
        break;
      default:
        result.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        break;
    }

    return result;
  }, [tasks, filters.status, sortMode]);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const chips: ActiveFilter[] = [];
    if (filters.status) chips.push({ key: "status", label: "Status", value: filters.status, displayValue: filters.status });
    if (filters.priority) chips.push({ key: "priority", label: "Priority", value: filters.priority, displayValue: filters.priority });
    if (filters.assigneeId) {
      const found = users.find((u) => u.id === filters.assigneeId);
      chips.push({ key: "assigneeId", label: "Assignee", value: filters.assigneeId, displayValue: found?.name || "User" });
    }
    if (filters.dueDateFrom || filters.dueDateTo) {
      const from = filters.dueDateFrom ? new Date(filters.dueDateFrom).toLocaleDateString() : "";
      const to = filters.dueDateTo ? new Date(filters.dueDateTo).toLocaleDateString() : "";
      const display = from && to ? `${from} – ${to}` : from || to;
      chips.push({ key: "dueDateFrom", label: "Due Date", value: `${filters.dueDateFrom}|${filters.dueDateTo}`, displayValue: display });
    }
    return chips;
  }, [filters, users]);

  const taskStats = useMemo(
    () => ({
      total: visibleTasks.length,
      todo: visibleTasks.filter((t) => t.status === "todo").length,
      inProgress: visibleTasks.filter((t) => t.status === "in_progress").length,
      inReview: visibleTasks.filter((t) => t.status === "in_review").length,
      done: visibleTasks.filter((t) => t.status === "done").length,
      overdue: visibleTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length,
      highPriority: visibleTasks.filter((t) => t.priority === "urgent" || t.priority === "high").length,
    }),
    [visibleTasks],
  );

  const handleFilterChange = (key: keyof FilterValues, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));
  const handleRemoveFilter = (key: string) => {
    if (key === "dueDateFrom") {
      setFilters((prev) => ({ ...prev, dueDateFrom: "", dueDateTo: "" }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: "" }));
    }
  };
  const handleClearAllFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
    setSearch("");
  };
  const handleTaskClick = (task: TaskCardData) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleTaskCreated = (task: any) => {
    if (!task?.id) return loadData(true);
    const normalized = normalizeTask(task);
    setTasks((prev) => {
      const exists = prev.some((t) => String(t.id) === String(normalized.id));
      if (exists) return prev.map((t) => (String(t.id) === String(normalized.id) ? { ...t, ...normalized } : t));
      return [...prev, normalized];
    });
    setSelectedTask(normalized);
    setDetailOpen(true);
  };

  const hasActiveFilters = activeFilters.length > 0 || search;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/30">
        
        {/* ══════════════════════════════════════════════════════════════════
            PREMIUM HEADER - Glass morphism with stats dashboard
        ══════════════════════════════════════════════════════════════════ */}
        <div className="shrink-0 relative">
          {/* Gradient accent */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/5 via-primary/2 to-transparent pointer-events-none" />
          
          <div className="relative border-b border-border/30 bg-background/80 backdrop-blur-xl">
            <div className="max-w-[1800px] mx-auto px-6 lg:px-8">
              {/* Main header row */}
              <div className="h-16 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Logo with animated ring */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-primary/30">
                      <Kanban className="w-5 h-5 text-primary-foreground" />
                    </div>
                    {taskStats.overdue > 0 && (
                      <div className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-background shadow-lg animate-pulse">
                        {taskStats.overdue}
                      </div>
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-bold tracking-tight text-foreground">
                        Task Management
                      </h1>
                      <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {taskStats.total} total
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Organize, track, and deliver your team's work
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Quick stats */}
                  <div className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-muted/30 border border-border/30">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-background/50 transition-colors cursor-default">
                      <CircleDot className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{taskStats.inProgress}</span>
                    </div>
                    <div className="w-px h-4 bg-border/40" />
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-background/50 transition-colors cursor-default">
                      <CircleCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{taskStats.done}</span>
                    </div>
                    {taskStats.overdue > 0 && (
                      <>
                        <div className="w-px h-4 bg-border/40" />
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/30">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400">{taskStats.overdue}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="w-px h-6 bg-border/40 hidden lg:block" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-muted/50"
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                      >
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh</TooltipContent>
                  </Tooltip>

                  <Button
                    size="sm"
                    className="h-8 gap-2 px-4 font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New Task</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              STATS CARDS - Premium dashboard metrics
          ══════════════════════════════════════════════════════════════════ */}
          <div className="relative bg-muted/10 border-b border-border/20">
            <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-3">
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {/* Total */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/40 min-w-[100px]">
                  <CheckSquare className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">Total</p>
                    <p className="text-sm font-bold">{taskStats.total}</p>
                  </div>
                </div>

                {/* In Progress */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 min-w-[100px]">
                  <Clock className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">In Progress</p>
                    <p className="text-sm font-bold">{taskStats.inProgress}</p>
                  </div>
                </div>

                {/* Done */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 min-w-[100px]">
                  <CircleCheck className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">Completed</p>
                    <p className="text-sm font-bold">{taskStats.done}</p>
                  </div>
                </div>

                {/* High Priority */}
                {taskStats.highPriority > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/5 border border-destructive/20 min-w-[100px]">
                    <TrendingUp className="w-4 h-4 text-destructive" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">High Priority</p>
                      <p className="text-sm font-bold text-destructive">{taskStats.highPriority}</p>
                    </div>
                  </div>
                )}

                {/* Completion Rate */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/40 min-w-[100px]">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">Completion</p>
                    <p className="text-sm font-bold">
                      {taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            COMMAND BAR - View, Team, Search, Sort, Filter
        ══════════════════════════════════════════════════════════════════ */}
        <div className="shrink-0 bg-background/95 backdrop-blur-sm border-b border-border/30">
          <div className="max-w-[1800px] mx-auto px-6 lg:px-8 h-11 flex items-center gap-3">
            
            {/* View switcher */}
            <div className="flex items-center bg-muted/40 rounded-lg p-0.5 gap-0.5">
              {([
                { key: "board" as ViewMode, label: "Board", icon: LayoutGrid },
                { key: "list" as ViewMode, label: "List", icon: List },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveView(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200",
                    activeView === key
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-border/40" />

            {/* Team selector */}
            {myTeams.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                    <Users className="w-3.5 h-3.5" />
                    <span className="max-w-[100px] truncate">
                      {selectedTeamId === "all" ? "All Teams" : myTeams.find((t: any) => t.id === selectedTeamId)?.name || "Team"}
                    </span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px]">
                  {myTeams.length > 1 && (
                    <DropdownMenuItem
                      onClick={() => setSelectedTeamId("all")}
                      className={cn("text-xs", selectedTeamId === "all" && "bg-primary/5 text-primary font-medium")}
                    >
                      All Teams
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {myTeams.map((team: any) => (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={cn("text-xs", selectedTeamId === team.id && "bg-primary/5 text-primary font-medium")}
                    >
                      {team.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="flex-1" />

            {/* Search */}
            <div className="relative w-48 lg:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-xs bg-muted/30 border-border/30 focus:border-primary/40 focus:bg-background rounded-lg transition-all"
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted/50 transition-colors"
                  onClick={() => setSearch("")}
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sort</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {[
                  { value: "updated_desc", label: "Last updated" },
                  { value: "due_asc", label: "Due date" },
                  { value: "priority_desc", label: "Priority" },
                  { value: "status_asc", label: "Status" },
                ].map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setSortMode(opt.value as SortMode)}
                    className={cn(
                      "text-xs",
                      sortMode === opt.value && "bg-primary/5 text-primary font-medium"
                    )}
                  >
                    {opt.label}
                    {sortMode === opt.value && (
                      <span className="ml-auto text-primary">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filter */}
            <button
              onClick={() => setFilterDrawerOpen(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                hasActiveFilters
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters.length > 0 && (
                <span className={cn(
                  "text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1",
                  hasActiveFilters ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
                )}>
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="shrink-0 bg-muted/5 border-b border-border/20">
            <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-2">
              <FilterChips
                filters={activeFilters}
                onRemove={handleRemoveFilter}
                onClearAll={handleClearAllFilters}
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MAIN CONTENT AREA
        ══════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-hidden bg-muted/5">
          {loading ? (
            <div className="max-w-[1800px] mx-auto p-6 space-y-4">
              <div className="flex gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-72 shrink-0">
                    <Skeleton className="h-8 w-24 mb-3 rounded-lg" />
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <Skeleton key={j} className="h-28 rounded-xl" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : errorMessage ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center max-w-sm space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center ring-1 ring-red-200 dark:ring-red-800">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <div>
                  <p className="text-base font-semibold">Couldn't load tasks</p>
                  <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadData(true)} className="gap-2 rounded-lg">
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </Button>
              </div>
            </div>
          ) : visibleTasks.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState type="no-results" onClearFilters={handleClearAllFilters} />
            ) : (
              <EmptyState type="no-tasks" onCreateTask={() => setCreateDialogOpen(true)} />
            )
          ) : activeView === "board" ? (
            <TaskBoard
              tasks={visibleTasks}
              onTaskClick={handleTaskClick}
              onTaskMoved={(taskId, _from, targetStatus) =>
                setTasks((prev) =>
                  prev.map((t) => (String(t.id) === String(taskId) ? { ...t, status: targetStatus } : t))
                )
              }
              onCreateTask={() => setCreateDialogOpen(true)}
              onTaskCreated={handleTaskCreated}
              teamId={selectedTeamId !== "all" ? selectedTeamId : undefined}
            />
          ) : (
            <TaskList
              tasks={visibleTasks}
              onTaskClick={handleTaskClick}
              onCreateTask={() => setCreateDialogOpen(true)}
            />
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            OVERLAYS
        ══════════════════════════════════════════════════════════════════ */}
        <FilterDrawer
          open={filterDrawerOpen}
          onOpenChange={setFilterDrawerOpen}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearAllFilters}
          users={users}
        />

        <TaskDetailDrawer
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) loadData(true);
          }}
          task={selectedTask}
          onTaskDeleted={(taskId) => {
            setTasks((prev) => prev.filter((t) => String(t.id) !== String(taskId)));
            setSelectedTask(null);
            setDetailOpen(false);
            loadData(true);
          }}
        />

        <CreateTaskDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onCreated={handleTaskCreated}
        />
      </div>
    </TooltipProvider>
  );
}
