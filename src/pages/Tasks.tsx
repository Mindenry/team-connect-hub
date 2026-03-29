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
  Sparkles,
  Clock3,
  CircleCheckBig,
  ListTodo,
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
    return chips;
  }, [filters, users]);

  const taskStats = useMemo(
    () => ({
      total: visibleTasks.length,
      todo: visibleTasks.filter((t) => t.status === "todo").length,
      inProgress: visibleTasks.filter((t) => t.status === "in_progress").length,
      done: visibleTasks.filter((t) => t.status === "done").length,
      overdue: visibleTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length,
    }),
    [visibleTasks],
  );

  const handleFilterChange = (key: keyof FilterValues, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));
  const handleRemoveFilter = (key: string) => setFilters((prev) => ({ ...prev, [key]: "" }));
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
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-16 sm:h-20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight">Task Workspace</h1>
                  <p className="text-xs text-muted-foreground truncate">Plan, prioritize, and deliver work with your team.</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => loadData(true)}>
                      <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setSortMode("updated_desc")}>Last updated</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortMode("due_asc")}>Due date</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortMode("priority_desc")}>Priority</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortMode("status_asc")}>Status</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  New Task
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col">
            <div className="py-4 space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Total Tasks</p>
                    <ListTodo className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold">{taskStats.total}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">In Progress</p>
                    <Clock3 className="w-4 h-4 text-primary" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold">{taskStats.inProgress}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Done</p>
                    <CircleCheckBig className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold">{taskStats.done}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Focus</p>
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <p className="mt-1 text-sm font-medium">{search ? `Searching: "${search}"` : "No search keyword"}</p>
                  {taskStats.overdue > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded bg-destructive/10 text-destructive px-2 py-1 text-[11px] font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      {taskStats.overdue} overdue
                    </div>
                  )}
                </div>
              </div>

              {/* Toolbar */}
              <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg border border-border/30">
                    {viewConfig.map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setActiveView(key)}
                        className={cn(
                          "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                          activeView === key
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5", activeView === key && "text-primary")} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  {myTeams.length > 0 && (
                    <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg border border-border/30">
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground">
                        <Users className="w-3 h-3" /> Team
                      </span>
                      {myTeams.length > 1 && (
                        <button
                          onClick={() => setSelectedTeamId("all")}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-xs font-medium",
                            selectedTeamId === "all" ? "bg-background shadow-sm" : "text-muted-foreground",
                          )}
                        >
                          All
                        </button>
                      )}
                      {myTeams.map((team: any) => (
                        <button
                          key={team.id}
                          onClick={() => setSelectedTeamId(team.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-xs font-medium truncate max-w-[120px]",
                            selectedTeamId === team.id ? "bg-background shadow-sm" : "text-muted-foreground",
                          )}
                        >
                          {team.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title, description, assignee..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-10"
                    />
                    {search && (
                      <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setSearch("")}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("h-10 w-10", hasActiveFilters && "bg-primary/10 border-primary/30 text-primary")}
                    onClick={() => setFilterDrawerOpen(true)}
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  {hasActiveFilters ? "You are viewing filtered tasks." : "Tip: Use filters to focus on urgent work quickly."}
                </div>
              </div>

              {activeFilters.length > 0 && (
                <FilterChips filters={activeFilters} onRemove={handleRemoveFilter} onClearAll={handleClearAllFilters} />
              )}
            </div>

            <div className="flex-1 overflow-auto pb-6">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : errorMessage ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
                  <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Couldn’t load tasks workspace</p>
                  <p className="mt-1 text-xs text-muted-foreground">{errorMessage}</p>
                  <Button className="mt-4" variant="outline" onClick={() => loadData(true)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try again
                  </Button>
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
                    setTasks((prev) => prev.map((t) => (String(t.id) === String(taskId) ? { ...t, status: targetStatus } : t)))
                  }
                  onCreateTask={() => setCreateDialogOpen(true)}
                  onTaskCreated={handleTaskCreated}
                  teamId={selectedTeamId !== "all" ? selectedTeamId : undefined}
                />
              ) : (
                <TaskList tasks={visibleTasks} onTaskClick={handleTaskClick} onCreateTask={() => setCreateDialogOpen(true)} />
              )}
            </div>
          </div>
        </div>

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

        <CreateTaskDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onCreated={handleTaskCreated} />
      </div>
    </TooltipProvider>
  );
}
