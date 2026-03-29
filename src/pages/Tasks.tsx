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

const viewConfig: { key: ViewMode; label: string; icon: any }[] = [
  { key: "board", label: "Board", icon: LayoutGrid },
  { key: "list", label: "List", icon: List },
];

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
            TOP HEADER — title · stats strip · actions
        ═══════════════════════════════════════════════════ */}
        <header className="shrink-0 h-12 border-b border-border/60 bg-background/98 backdrop-blur-sm flex items-center px-4 sm:px-6 gap-3 z-10">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Tasks</span>
          </div>

          {/* Stats strip — hidden on mobile */}
          {!loading && (
            <div className="hidden sm:flex items-center gap-2.5 text-xs ml-2 pl-3 border-l border-border/50">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{taskStats.total}</span> total
              </span>
              <span className="text-border/60 select-none">·</span>
              <span className="font-medium text-primary">{taskStats.inProgress} in progress</span>
              <span className="text-border/60 select-none">·</span>
              <span className="text-muted-foreground">{taskStats.done} done</span>
              {taskStats.overdue > 0 && (
                <>
                  <span className="text-border/60 select-none">·</span>
                  <span className="font-medium text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {taskStats.overdue} overdue
                  </span>
                </>
              )}
            </div>
          )}

          <div className="flex-1" />

          {/* Refresh + New Task */}
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => loadData(true)}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>

            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 px-3 font-medium"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              New Task
            </Button>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════
            TOOLBAR — view · team · search · sort · filter
        ═══════════════════════════════════════════════════ */}
        <div className="shrink-0 border-b border-border/40 bg-background px-4 sm:px-6 h-11 flex items-center gap-2">

          {/* View switcher */}
          <div className="flex items-center bg-muted/50 rounded-md p-0.5 gap-px border border-border/30">
            {viewConfig.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all duration-150",
                  activeView === key
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Team filter */}
          {myTeams.length > 0 && (
            <div className="flex items-center bg-muted/50 rounded-md p-0.5 gap-px border border-border/30">
              {myTeams.length > 1 && (
                <button
                  onClick={() => setSelectedTeamId("all")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-all duration-150",
                    selectedTeamId === "all"
                      ? "bg-background shadow-sm text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
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
                    "px-2.5 py-1 rounded text-xs truncate max-w-[110px] transition-all duration-150",
                    selectedTeamId === team.id
                      ? "bg-background shadow-sm text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  {team.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1" />

          {/* Search */}
          <div className="relative w-44 lg:w-60 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/30 border-border/40 focus:bg-background focus:border-border transition-colors rounded-md"
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
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground px-2.5"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
                    <span className="ml-auto text-primary text-[10px]">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filter */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 text-xs gap-1.5 px-2.5 relative",
              hasActiveFilters
                ? "text-primary bg-primary/8 hover:bg-primary/12"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setFilterDrawerOpen(true)}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters.length > 0 && (
              <span className="bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                {activeFilters.length}
              </span>
            )}
          </Button>
        </div>

        {/* ═══════════════════════════════════════════════════
            ACTIVE FILTER CHIPS
        ═══════════════════════════════════════════════════ */}
        {activeFilters.length > 0 && (
          <div className="shrink-0 border-b border-border/30 px-4 sm:px-6 py-1.5 bg-muted/15">
            <FilterChips
              filters={activeFilters}
              onRemove={handleRemoveFilter}
              onClearAll={handleClearAllFilters}
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            MAIN CONTENT
        ═══════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : errorMessage ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center max-w-xs space-y-3">
                <div className="mx-auto w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Couldn't load tasks</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{errorMessage}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
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
            OVERLAYS — filter drawer · detail panel · create
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
