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
} from "lucide-react";
import { apiGet, clearApiCache } from "@/lib/api";
import { getSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
      inProgress: visibleTasks.filter((t) => t.status === "in_progress").length,
      done: visibleTasks.filter((t) => t.status === "done").length,
      overdue: visibleTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length,
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
      <div className="flex flex-col h-screen bg-background">

        {/* ═══════════════════════════════════════════════════
            PAGE HEADER — consistent with Teams.tsx style
        ═══════════════════════════════════════════════════ */}
        <div className="shrink-0 border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="h-20 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 flex items-center justify-center shadow-md shadow-primary/10 ring-1 ring-primary/20">
                    <CheckSquare className="w-6 h-6 text-primary" />
                  </div>
                  {taskStats.overdue > 0 && (
                    <div className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-[9px] text-white border border-background shadow-sm animate-pulse">
                      {taskStats.overdue}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    Tasks
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Track, manage and collaborate on your team's work
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] text-muted-foreground/90">
                  <span className="inline-flex items-center gap-1">
                    <CheckSquare className="w-3 h-3" />
                    <span>{taskStats.total} tasks</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CircleDot className="w-3 h-3 text-blue-500" />
                    <span className="text-blue-600 dark:text-blue-400">{taskStats.inProgress} active</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CircleCheck className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">{taskStats.done} done</span>
                  </span>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 border-border/60 bg-background/60 hover:bg-accent hover:text-accent-foreground"
                      onClick={() => loadData(true)}
                    >
                      <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh</TooltipContent>
                </Tooltip>

                <Button
                  size="sm"
                  className="h-9 gap-2 px-3 font-medium"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Task</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            TOOLBAR — view · team · search · sort · filter
        ═══════════════════════════════════════════════════ */}
        <div className="shrink-0 border-b border-border/40 bg-muted/20 backdrop-blur-sm">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-2.5">

            {/* View switcher — pill style */}
            <div className="flex items-center bg-background rounded-lg p-0.5 gap-0.5 border border-border/40 shadow-sm">
              {([
                { key: "board" as ViewMode, label: "Board", icon: LayoutGrid },
                { key: "list" as ViewMode, label: "List", icon: List },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveView(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                    activeView === key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-border/50 hidden sm:block" />

            {/* Team filter tabs */}
            {myTeams.length > 0 && (
              <div className="hidden sm:flex items-center gap-0.5">
                {myTeams.length > 1 && (
                  <button
                    onClick={() => setSelectedTeamId("all")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                      selectedTeamId === "all"
                        ? "bg-background text-foreground shadow-sm border border-border/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                    )}
                  >
                    <Users className="w-3 h-3" />
                    All
                  </button>
                )}
                {myTeams.map((team: any) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium truncate max-w-[120px] transition-all duration-150",
                      selectedTeamId === team.id
                        ? "bg-background text-foreground shadow-sm border border-border/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                    )}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1" />

            {/* Search */}
            <div className="relative w-44 lg:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-background border-border/40 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg transition-all"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearch("")}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground px-3 border-border/40"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {[
                  { value: "updated_desc", label: "Last updated" },
                  { value: "due_asc", label: "Due date (earliest first)" },
                  { value: "priority_desc", label: "Priority (high → low)" },
                  { value: "status_asc", label: "Status" },
                ].map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setSortMode(opt.value as SortMode)}
                    className={cn(
                      "text-xs",
                      sortMode === opt.value && "text-primary font-medium bg-primary/5"
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
            <Button
              variant={hasActiveFilters ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 text-xs gap-1.5 px-3",
                hasActiveFilters
                  ? "shadow-sm"
                  : "text-muted-foreground hover:text-foreground border-border/40"
              )}
              onClick={() => setFilterDrawerOpen(true)}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters.length > 0 && (
                <span className={cn(
                  "text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none",
                  hasActiveFilters
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary text-primary-foreground"
                )}>
                  {activeFilters.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            ACTIVE FILTER CHIPS
        ═══════════════════════════════════════════════════ */}
        {activeFilters.length > 0 && (
          <div className="shrink-0 border-b border-border/30 bg-muted/10">
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
              <FilterChips
                filters={activeFilters}
                onRemove={handleRemoveFilter}
                onClearAll={handleClearAllFilters}
              />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            MAIN CONTENT
        ═══════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-hidden bg-muted/10">
          {loading ? (
            <div className="max-w-[1920px] mx-auto p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : errorMessage ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center max-w-xs space-y-4">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Couldn't load tasks</p>
                  <p className="mt-1 text-xs text-muted-foreground">{errorMessage}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadData(true)} className="gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
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

        {/* ═══════════════════════════════════════════════════
            OVERLAYS
        ═══════════════════════════════════════════════════ */}
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
