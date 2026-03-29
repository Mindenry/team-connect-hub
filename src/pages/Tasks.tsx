import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  CheckSquare,
  Plus,
  Search,
  X,
  LayoutGrid,
  List,
  RefreshCw,
  Users,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  CircleCheck,
  SlidersHorizontal,
  ChevronDown,
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
  const completionRate = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0;
  const selectedSortLabel =
    {
      updated_desc: "Last updated",
      due_asc: "Due date",
      priority_desc: "Priority",
      status_asc: "Status",
    }[sortMode] || "Sort";
  const selectedTeamName =
    selectedTeamId === "all" ? "All teams" : myTeams.find((t: any) => t.id === selectedTeamId)?.name || "Team";

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-muted/20">
        <div className="shrink-0 border-b border-border/70 bg-background">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40 shadow-sm">
                  <CheckSquare className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-lg font-semibold text-foreground">Task Workspace</h1>
                    <Badge variant="outline" className="h-5 rounded-md px-2 text-[10px] font-medium">
                      {taskStats.total} issues
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Plan, prioritize, and deliver work with a structured professional flow
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => loadData(true)}
                      disabled={refreshing}
                    >
                      <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh tasks</TooltipContent>
                </Tooltip>
                <Button size="sm" className="h-8 gap-2 rounded-md px-3 font-medium" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create task
                </Button>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="mt-1 text-sm font-semibold">{taskStats.total}</p>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Todo</p>
                <p className="mt-1 text-sm font-semibold">{taskStats.todo}</p>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">In Progress</p>
                <p className="mt-1 text-sm font-semibold">{taskStats.inProgress}</p>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">In Review</p>
                <p className="mt-1 text-sm font-semibold">{taskStats.inReview}</p>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Done</p>
                <p className="mt-1 text-sm font-semibold">{taskStats.done}</p>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Completion</p>
                <p className="mt-1 text-sm font-semibold">{completionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-b border-border/70 bg-background/95">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex h-8 items-center rounded-md border border-border bg-muted/30 p-0.5">
              {([
                { key: "board" as ViewMode, label: "Board", icon: LayoutGrid },
                { key: "list" as ViewMode, label: "List", icon: List },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveView(key)}
                  className={cn(
                    "flex h-6 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors",
                    activeView === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {myTeams.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted/40">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="max-w-[140px] truncate">{selectedTeamName}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[170px]">
                  {myTeams.length > 1 && (
                    <DropdownMenuItem
                      onClick={() => setSelectedTeamId("all")}
                      className={cn("text-xs", selectedTeamId === "all" && "bg-accent font-medium")}
                    >
                      All teams
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {myTeams.map((team: any) => (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={cn("text-xs", selectedTeamId === team.id && "bg-accent font-medium")}
                    >
                      {team.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks, assignees, status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 rounded-md border-border bg-background pl-8 pr-8 text-xs"
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted/40">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                  {selectedSortLabel}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {[
                  { value: "updated_desc", label: "Last updated" },
                  { value: "due_asc", label: "Due date" },
                  { value: "priority_desc", label: "Priority" },
                  { value: "status_asc", label: "Status" },
                ].map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setSortMode(opt.value as SortMode)}
                    className={cn("text-xs", sortMode === opt.value && "bg-accent font-medium")}
                  >
                    {opt.label}
                    {sortMode === opt.value && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={() => setFilterDrawerOpen(true)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors",
                hasActiveFilters ? "border-foreground/30 bg-foreground/5 text-foreground" : "border-border bg-background text-foreground hover:bg-muted/40"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              Filters
              {activeFilters.length > 0 && (
                <span className="rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background">{activeFilters.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="shrink-0 border-b border-border/60 bg-background">
            <div className="mx-auto max-w-[1400px] px-4 py-2 sm:px-6 lg:px-8">
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
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="mx-auto max-w-[1400px] p-4 sm:px-6 lg:p-6">
              <div className="flex gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-72 shrink-0 rounded-lg border border-border bg-card p-3">
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
            <div className="flex h-full items-center justify-center p-6">
              <div className="max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 ring-1 ring-red-200 dark:bg-red-950/30 dark:ring-red-800">
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
