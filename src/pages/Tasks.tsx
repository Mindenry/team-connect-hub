import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckSquare, Plus, Search, Filter, X, Rocket, LayoutGrid, Rows3, List,
  Target, Package, Tag, MoreHorizontal, RefreshCw, FileText, Users,
} from "lucide-react";
import { apiGet, clearApiCache } from "@/lib/api";
import { getSocket } from "@/lib/websocket";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

import FilterChips, { type ActiveFilter } from "@/components/tasks-v2/FilterChips";
import FilterDrawer, { type FilterValues } from "@/components/tasks-v2/FilterDrawer";
import TaskBoard from "@/components/tasks-v2/TaskBoard";
import TaskBacklog from "@/components/tasks-v2/TaskBacklog";
import TaskList from "@/components/tasks-v2/TaskList";
import TaskDetailDrawer from "@/components/tasks-v2/TaskDetailDrawer";
import EmptyState from "@/components/tasks-v2/EmptyState";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";
import SprintManagementDialog from "@/components/dialogs/SprintManagementDialog";
import CreateEpicDialog from "@/components/dialogs/CreateEpicDialog";
import CreateComponentDialog from "@/components/dialogs/CreateComponentDialog";
import CreateVersionDialog from "@/components/dialogs/CreateVersionDialog";
import CreateTaskTemplateDialog from "@/components/dialogs/CreateTaskTemplateDialog";
import type { TaskCardData } from "@/components/tasks-v2/TaskCard";

type ViewMode = "board" | "backlog" | "list";

const EMPTY_FILTERS: FilterValues = {
  projectId: "",
  issueType: "",
  priority: "",
  assigneeId: "",
  sprintId: "",
  epicId: "",
  componentId: "",
  versionId: "",
  status: "",
};

const viewConfig: { key: ViewMode; label: string; icon: any }[] = [
  { key: "board", label: "Board", icon: LayoutGrid },
  { key: "backlog", label: "Backlog", icon: Rows3 },
  { key: "list", label: "List", icon: List },
];

export default function Tasks() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  // UI state
  const [activeView, setActiveView] = useState<ViewMode>("board");
  const [filters, setFilters] = useState<FilterValues>({ ...EMPTY_FILTERS });
  const [search, setSearch] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);
  const [epicDialogOpen, setEpicDialogOpen] = useState(false);
  const [componentDialogOpen, setComponentDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskCardData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  // Data state
  const [tasks, setTasks] = useState<TaskCardData[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [epics, setEpics] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamsInitialized, setTeamsInitialized] = useState(false);

  // Helper: normalize task shape from backend into TaskCardData
  const normalizeTask = useCallback((task: any): TaskCardData => {
    if (!task) return task;
    return {
      ...(task as TaskCardData),
      id: String(task.id),
      project: task.project
        ? { ...task.project, id: String(task.project.id) }
        : task.projectId
        ? { id: String(task.projectId), key: task.projectKey ?? "", name: task.projectName ?? "" }
        : undefined,
      sprint: task.sprint
        ? { ...task.sprint, id: String(task.sprint.id) }
        : task.sprintId
        ? { id: String(task.sprintId), name: task.sprintName ?? "" }
        : task.sprint,
      epic: task.epic
        ? { ...task.epic, id: String(task.epic.id) }
        : task.epicId
        ? { id: String(task.epicId), name: task.epicName ?? "", color: task.epicColor }
        : task.epic,
      assignee: task.assignee
        ? {
            ...task.assignee,
            id: task.assignee.id ? String(task.assignee.id) : task.assignee.id,
          }
        : task.assignee,
    };
  }, []);

  // Sync filters with query params (e.g. ?assigneeId=xxx from People page)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const assigneeId = params.get("assigneeId") || "";
    if (assigneeId && assigneeId !== filters.assigneeId) {
      setFilters((prev) => ({ ...prev, assigneeId }));
    }
  }, [location.search, filters.assigneeId]);

  // Load data
  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
      clearApiCache();
      setLoading(true); // Provide full visual feedback of reload
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
      if (filters.sprintId) params.set("sprintId", filters.sprintId);
      if (filters.epicId) params.set("epicId", filters.epicId);
      if (filters.priority) params.set("priority", filters.priority);
      if (search) params.set("search", search);
      if (selectedTeamId && selectedTeamId !== "all") params.set("teamId", selectedTeamId);
      const qs = params.toString() ? `?${params.toString()}` : "";

      const [tasksData, projectsData, sprintsData, epicsData, componentsData, versionsData, usersData, teamsData] =
        await Promise.all([
          apiGet<any[]>(`/tasks${qs}`).catch(() => []),
          apiGet<any[]>("/projects").catch(() => []),
          apiGet<any[]>("/sprints").catch(() => []),
          apiGet<any[]>("/epics").catch(() => []),
          apiGet<any[]>("/components").catch(() => []),
          apiGet<any[]>("/versions").catch(() => []),
          apiGet<any[]>("/users").catch(() => []),
          apiGet<any[]>("/teams").catch(() => []),
        ]);

      const loadedTeams = Array.isArray(teamsData) ? teamsData : [];
      setTeams(loadedTeams);

      // Auto-select first team on initial load
      if (!teamsInitialized && loadedTeams.length > 0) {
        // Find teams user belongs to (non-admin users only see their teams via GET /teams)
        const myTeams = loadedTeams.filter((t: any) =>
          t.members?.some((m: any) => m.userId === user?.id || m.user?.id === user?.id)
        );
        if (myTeams.length > 0) {
          setSelectedTeamId(myTeams[0].id);
        } else if (loadedTeams.length > 0) {
          // Fallback: select first available team
          setSelectedTeamId(loadedTeams[0].id);
        }
        setTeamsInitialized(true);
        // Re-fetch tasks with the selected team — will trigger on next render via dependency
      }

      // For "all" mode, filter client-side to only user's teams' tasks
      let filteredTasksData = Array.isArray(tasksData) ? tasksData : [];
      if (selectedTeamId === "all" && loadedTeams.length > 0) {
        const myTeamIds = new Set(
          loadedTeams
            .filter((t: any) =>
              t.members?.some((m: any) => m.userId === user?.id || m.user?.id === user?.id)
            )
            .map((t: any) => t.id)
        );
        // If user has teams, filter. If admin with no team membership, show all.
        if (myTeamIds.size > 0) {
          filteredTasksData = filteredTasksData.filter((t: any) => myTeamIds.has(t.teamId));
        }
      }

      setTasks(filteredTasksData.map((t) => normalizeTask(t)));
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setSprints(Array.isArray(sprintsData) ? sprintsData : []);
      setEpics(Array.isArray(epicsData) ? epicsData : []);
      setComponents(Array.isArray(componentsData) ? componentsData : []);
      setVersions(Array.isArray(versionsData) ? versionsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error("Failed to load task data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters.status, filters.assigneeId, filters.sprintId, filters.epicId, filters.priority, search, selectedTeamId, normalizeTask, user?.id, teamsInitialized]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Real-time socket listeners ──
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTaskCreated = (task: any) => {
      if (!task?.id) return;
      setTasks((prev) => {
        if (prev.some((t) => String(t.id) === String(task.id))) return prev;
        return [...prev, normalizeTask(task)];
      });
    };

    const handleTaskUpdated = (task: any) => {
      if (!task?.id) return;
      setTasks((prev) =>
        prev.map((t) => {
          if (String(t.id) !== String(task.id)) return t;
          // Staleness guard: discard if incoming update is older than local
          if (t.updatedAt && task.updatedAt && new Date(task.updatedAt) < new Date(t.updatedAt)) return t;
          return { ...t, ...normalizeTask(task) };
        })
      );
    };

    const handleTaskDeleted = (id: string) => {
      if (!id) return;
      setTasks((prev) => prev.filter((t) => String(t.id) !== String(id)));
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, [normalizeTask]);

  // Handle navigation state (e.g. created from Chat or Meetings → open task + sync into list)
  useEffect(() => {
    const state = location.state as any;
    if (state?.openTask) {
      const task = normalizeTask(state.openTask);

      if (task?.id) {
        // Ensure the new/updated task is present in the local list immediately
        setTasks((prev) => {
          const exists = prev.some((t) => String(t.id) === String(task.id));
          if (exists) {
            return prev.map((t) => (String(t.id) === String(task.id) ? { ...t, ...task } : t));
          }
          return [...prev, task];
        });
      }

      setSelectedTask(task);
      setDetailOpen(true);

      // Clear the navigation state so it won't re‑open on next visit
      window.history.replaceState({}, document.title);

      // Fetch fresh data from backend in the background to keep everything in sync
      if (task?.id) {
        loadData(true);
      } else {
        loadData();
      }
    }
  }, [location.state, loadData, normalizeTask]);

  // User's teams (for selector)
  const myTeams = useMemo(() => {
    if (!user?.id) return teams;
    const filtered = teams.filter((t: any) =>
      t.members?.some((m: any) => m.userId === user.id || m.user?.id === user.id)
    );
    // If user has no explicit membership (e.g. admin), show all teams
    return filtered.length > 0 ? filtered : teams;
  }, [teams, user?.id]);

  // Client-side filtration
  const filteredTasks = useMemo(() => {
    let result = tasks;
    // ซ่อนงานที่ถูกยกเลิก (canceled) โดยค่าเริ่มต้น เว้นแต่จะกรองสถานะเป็น canceled โดยตรง
    if (!filters.status) {
      result = result.filter((t) => t.status !== "canceled");
    }
    if (filters.projectId) result = result.filter((t) => t.project?.id === filters.projectId);
    if (filters.issueType) result = result.filter((t) => t.issueType === filters.issueType);
    if (filters.componentId) result = result.filter((t: any) => t.componentId === filters.componentId || t.component?.id === filters.componentId);
    if (filters.versionId) result = result.filter((t: any) => t.versionId === filters.versionId || t.version?.id === filters.versionId);
    return result;
  }, [tasks, filters.projectId, filters.issueType, filters.componentId, filters.versionId]);

  // Active filters as chips
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const chips: ActiveFilter[] = [];
    if (filters.status) {
      const labels: Record<string, string> = {
        todo: "To Do",
        in_progress: "In Progress",
        in_review: "In Review",
        done: "Done",
        canceled: "Canceled",
      };
      chips.push({ key: "status", label: "Status", value: filters.status, displayValue: labels[filters.status] || filters.status });
    }
    if (filters.projectId) {
      const proj = projects.find((p) => p.id === filters.projectId);
      chips.push({ key: "projectId", label: "Project", value: filters.projectId, displayValue: proj?.name || "Project" });
    }
    if (filters.issueType) chips.push({ key: "issueType", label: "Type", value: filters.issueType, displayValue: filters.issueType.charAt(0).toUpperCase() + filters.issueType.slice(1) });
    if (filters.priority) chips.push({ key: "priority", label: "Priority", value: filters.priority, displayValue: filters.priority.charAt(0).toUpperCase() + filters.priority.slice(1) });
    if (filters.assigneeId) {
      const user = users.find((u) => u.id === filters.assigneeId);
      chips.push({ key: "assigneeId", label: "Assignee", value: filters.assigneeId, displayValue: user?.name || "User" });
    }
    if (filters.sprintId) {
      const spr = sprints.find((s) => s.id === filters.sprintId);
      chips.push({ key: "sprintId", label: "Sprint", value: filters.sprintId, displayValue: spr?.name || "Sprint" });
    }
    if (filters.epicId) {
      const e = epics.find((e) => e.id === filters.epicId);
      chips.push({ key: "epicId", label: "Epic", value: filters.epicId, displayValue: e?.name || "Epic" });
    }
    if (filters.componentId) {
      const c = components.find((c) => c.id === filters.componentId);
      chips.push({ key: "componentId", label: "Component", value: filters.componentId, displayValue: c?.name || "Component" });
    }
    if (filters.versionId) {
      const v = versions.find((v) => v.id === filters.versionId);
      chips.push({ key: "versionId", label: "Version", value: filters.versionId, displayValue: v?.name || "Version" });
    }
    return chips;
  }, [filters, projects, users, sprints, epics, components, versions]);

  // Stats
  const taskStats = useMemo(() => ({
    total: filteredTasks.length,
    todo: filteredTasks.filter((t) => t.status === "todo").length,
    inProgress: filteredTasks.filter((t) => t.status === "in_progress").length,
    done: filteredTasks.filter((t) => t.status === "done").length,
  }), [filteredTasks]);

  // Handlers
  const handleFilterChange = (key: keyof FilterValues, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));
  const handleRemoveFilter = (key: string) => setFilters((prev) => ({ ...prev, [key]: "" }));
  const handleClearAllFilters = () => { setFilters({ ...EMPTY_FILTERS }); setSearch(""); };
  const handleTaskClick = (task: TaskCardData) => { setSelectedTask(task); setDetailOpen(true); };
  const handleDetailClose = (open: boolean) => { setDetailOpen(open); if (!open) loadData(); };

  const handleTaskCreated = (task: any) => {
    // Optimistic update: แทรกหรืออัปเดต task ใน state ทันที ให้บอร์ด/รายการรีเฟรชโดยไม่ต้องกด refresh
    if (task?.id) {
      const normalized = normalizeTask(task);
      setTasks((prev) => {
        const exists = prev.some((t) => String(t.id) === String(normalized.id));
        if (exists) {
          return prev.map((t) => (String(t.id) === String(normalized.id) ? { ...t, ...normalized } : t));
        }
        return [...prev, normalized];
      });
      setSelectedTask(normalized);
      setDetailOpen(true);
      // ดึงข้อมูลล่าสุดจาก backend ตามหลังเพื่อให้ข้อมูลครบ เช่น activityLog, relations ต่าง ๆ
      loadData(true);
    } else {
      // fallback ถ้า API ไม่คืน task กลับมา ให้ดึงข้อมูลใหม่ตามปกติ
      loadData(true);
    }
  };

  const handleTaskMoved = (taskId: string, _fromStatus: string, targetStatus: string) => {
    // Optimistic update: move task to new status locally so UI updates immediately.
    // We intentionally do NOT call loadData() here to avoid racing with the PATCH request
    // from TaskBoard, which could briefly overwrite the optimistic state with stale data.
    setTasks((prev) =>
      prev.map((t) => (String(t.id) === String(taskId) ? { ...t, status: targetStatus } : t))
    );
  };

  const hasActiveFilters = activeFilters.length > 0 || search;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* ══════ Header ══════ — Matches Meetings.tsx / Teams.tsx */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-6">
              {/* Left: Icon + Title */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                    <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  {taskStats.inProgress > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-background animate-pulse" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Tasks</h1>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                    Manage tasks · Track progress · Organize sprints · Ship faster
                  </p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 sm:h-10 sm:w-10 border-border/60 bg-background/50 hover:bg-accent hover:text-accent-foreground text-foreground"
                      onClick={() => loadData(true)}
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", refreshing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 px-2.5 text-xs border-border/60 bg-background/50 hover:bg-accent hover:text-accent-foreground text-foreground"
                      onClick={() => setSprintDialogOpen(true)}
                    >
                      <Rocket className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="hidden lg:inline">Sprints</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Manage sprints</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs border-border/60 bg-background/50 hover:bg-accent hover:text-accent-foreground text-foreground hidden sm:flex">
                      <MoreHorizontal className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden lg:inline">More</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setSprintDialogOpen(true)} className="sm:hidden">
                      <Rocket className="w-4 h-4 mr-2" />
                      Manage Sprints
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEpicDialogOpen(true)}>
                      <Target className="w-4 h-4 mr-2" />
                      Create Epic
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setComponentDialogOpen(true)}>
                      <Package className="w-4 h-4 mr-2" />
                      Create Component
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setVersionDialogOpen(true)}>
                      <Tag className="w-4 h-4 mr-2" />
                      Create Version
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTemplateDialogOpen(true)}>
                      <FileText className="w-4 h-4 mr-2" />
                      Create Template
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setFilterDrawerOpen(true)}>
                      <Filter className="w-4 h-4 mr-2" />
                      Advanced Filters
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="sm"
                  className="h-8 gap-1 px-2.5 text-xs font-medium shrink-0"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="w-3 h-3 shrink-0" />
                  <span className="hidden lg:inline">New Task</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ══════ Main Content ══════ */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col">
            {/* Toolbar */}
            <div className="py-4 sm:py-6 space-y-4">
              {/* View Tab Pills + Team Selector */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/50 backdrop-blur-sm w-fit">
                  {viewConfig.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveView(key)}
                      className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                        activeView === key
                          ? "bg-background shadow-md ring-1 ring-border/50 text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", activeView === key && "text-primary")} />
                      <span>{label}</span>
                      {key === "board" && taskStats.total > 0 && (
                        <span className={cn(
                          "ml-0.5 text-xs font-semibold px-1.5 py-0.5 rounded",
                          activeView === key ? "bg-primary/15 text-primary" : "bg-muted/80 text-muted-foreground"
                        )}>
                          {taskStats.total}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Team Selector Pills */}
                {myTeams.length > 0 && (
                  <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/50 backdrop-blur-sm">
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground">
                      <Users className="w-3 h-3" />
                      Team
                    </span>
                    {myTeams.length > 1 && (
                      <button
                        onClick={() => setSelectedTeamId("all")}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                          selectedTeamId === "all"
                            ? "bg-background shadow-md ring-1 ring-border/50 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
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
                          "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 truncate max-w-[120px]",
                          selectedTeamId === team.id
                            ? "bg-background shadow-md ring-1 ring-border/50 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search + Filter */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] sm:min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-10 bg-background/50 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  {search && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setSearch("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-10 w-10 border-border/60 bg-background/50 hover:bg-accent hover:text-accent-foreground text-foreground",
                        hasActiveFilters && "bg-primary/10 border-primary/30 text-primary"
                      )}
                      onClick={() => setFilterDrawerOpen(true)}
                    >
                      <Filter className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Filters</TooltipContent>
                </Tooltip>
              </div>

              {/* Active filter chips */}
              {activeFilters.length > 0 && (
                <FilterChips filters={activeFilters} onRemove={handleRemoveFilter} onClearAll={handleClearAllFilters} />
              )}
            </div>

            {/* ══════ Content Area ══════ */}
            <div className="flex-1 overflow-auto pb-6">
              {loading ? (
                <div className="space-y-4">
                  {activeView === "board" ? (
                    <div className="flex gap-5">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex-1 min-w-[260px] space-y-3">
                          <Skeleton className="h-10 w-32 mb-4" />
                          <Skeleton className="h-48 w-full rounded-xl" />
                          <Skeleton className="h-48 w-full rounded-xl" />
                          <Skeleton className="h-32 w-full rounded-xl" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="rounded-xl bg-muted/20 animate-pulse border border-border/20 h-20" />
                      ))}
                    </div>
                  )}
                </div>
              ) : filteredTasks.length === 0 && !loading ? (
                hasActiveFilters ? (
                  <EmptyState type="no-results" onClearFilters={handleClearAllFilters} />
                ) : (
                  <EmptyState type="no-tasks" onCreateTask={() => setCreateDialogOpen(true)} />
                )
              ) : (
                <>
                  {activeView === "board" && (
                    <TaskBoard
                      tasks={filteredTasks}
                      onTaskClick={handleTaskClick}
                      onTaskMoved={handleTaskMoved}
                      onCreateTask={() => setCreateDialogOpen(true)}
                      onTaskCreated={handleTaskCreated}
                    />
                  )}
                  {activeView === "backlog" && (
                    <TaskBacklog tasks={filteredTasks} sprints={sprints} onTaskClick={handleTaskClick} onCreateTask={() => setCreateDialogOpen(true)} />
                  )}
                  {activeView === "list" && (
                    <TaskList tasks={filteredTasks} onTaskClick={handleTaskClick} onCreateTask={() => setCreateDialogOpen(true)} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ══════ Drawers & Dialogs ══════ */}
        <FilterDrawer
          open={filterDrawerOpen}
          onOpenChange={setFilterDrawerOpen}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearAllFilters}
          projects={projects}
          users={users}
          sprints={sprints}
          epics={epics}
          components={components}
          versions={versions}
        />
        <TaskDetailDrawer
          open={detailOpen}
          onOpenChange={handleDetailClose}
          task={selectedTask}
          onTaskDeleted={(taskId) => {
            setTasks((prev) => prev.filter((t) => String(t.id) !== String(taskId)));
            setSelectedTask(null);
            setDetailOpen(false);
            // Sync กับ backend หลังลบเสร็จเพื่อให้ทุกมุมมองอัปเดตแน่นอน
            loadData(true);
          }}
        />
        <CreateTaskDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onCreated={handleTaskCreated} />
        <SprintManagementDialog open={sprintDialogOpen} onOpenChange={setSprintDialogOpen} onSprintUpdated={() => loadData(true)} />
        <CreateEpicDialog open={epicDialogOpen} onOpenChange={setEpicDialogOpen} onEpicCreated={() => loadData(true)} />
        <CreateComponentDialog open={componentDialogOpen} onOpenChange={setComponentDialogOpen} onComponentCreated={() => loadData(true)} />
        <CreateVersionDialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen} onVersionCreated={() => loadData(true)} />
        <CreateTaskTemplateDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen} />
      </div>
    </TooltipProvider>
  );
}
