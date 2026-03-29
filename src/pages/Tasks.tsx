import { useState, useEffect, useMemo, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Plus,
  Search,
  CheckSquare,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  RefreshCw,
  X,
  Sparkles,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Layers,
  Users,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { auth } from "@/lib/auth";
import { toast } from "sonner";

import TaskBoard from "@/components/tasks/TaskBoard";
import TaskList from "@/components/tasks/TaskList";
import TaskCalendarView from "@/components/tasks/TaskCalendarView";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";
import TaskDetailDialog from "@/components/dialogs/TaskDetailDialog";
import TaskFilters from "@/components/tasks/TaskFilters";
import {
  Task,
  User,
  Team,
  Subtask,
  Attachment,
  TaskActivity,
  TaskComment,
  FilterState,
} from "@/components/tasks/types";

type ViewMode = "board" | "list" | "calendar";

export default function Tasks() {
  const isMobile = useIsMobile();
  const currentUser = auth.getUser();
  
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    priority: [],
    assigneeId: null,
    teamId: null,
    search: "",
    dueDateFrom: null,
    dueDateTo: null,
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [tasksRes, teamsRes, usersRes] = await Promise.all([
        apiGet<Task[]>("/tasks").catch(() => []),
        apiGet<Team[]>("/teams").catch(() => []),
        apiGet<User[]>("/users").catch(() => []),
      ]);

      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
      setTeams(Array.isArray(teamsRes) ? teamsRes : []);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      toast.error("ไม่สามารถโหลดข้อมูลงานได้");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Search filter
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      result = result.filter((task) => filters.status.includes(task.status));
    }

    // Priority filter
    if (filters.priority.length > 0) {
      result = result.filter((task) => filters.priority.includes(task.priority));
    }

    // Assignee filter
    if (filters.assigneeId) {
      result = result.filter(
        (task) =>
          task.assignee?.id === filters.assigneeId ||
          task.assignees?.some((a) => a.id === filters.assigneeId)
      );
    }

    // Team filter
    if (filters.teamId) {
      result = result.filter((task) => task.teamId === filters.teamId);
    }

    // Due date filter
    if (filters.dueDateFrom) {
      result = result.filter(
        (task) => task.dueDate && new Date(task.dueDate) >= new Date(filters.dueDateFrom!)
      );
    }
    if (filters.dueDateTo) {
      result = result.filter(
        (task) => task.dueDate && new Date(task.dueDate) <= new Date(filters.dueDateTo!)
      );
    }

    return result;
  }, [tasks, filters]);

  // Group tasks by team
  const tasksByTeam = useMemo(() => {
    const grouped: { [key: string]: { team: Team | null; tasks: Task[] } } = {};

    // Create "No Team" group first
    grouped["no-team"] = {
      team: null,
      tasks: filteredTasks.filter((t) => !t.teamId),
    };

    // Group by team
    teams.forEach((team) => {
      const teamTasks = filteredTasks.filter((t) => t.teamId === team.id);
      if (teamTasks.length > 0) {
        grouped[team.id] = {
          team,
          tasks: teamTasks,
        };
      }
    });

    return grouped;
  }, [filteredTasks, teams]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const review = tasks.filter((t) => t.status === "review").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done"
    ).length;

    return { total, todo, inProgress, review, done, overdue };
  }, [tasks]);

  // Handlers
  const handleCreateTask = async (data: Partial<Task>) => {
    try {
      const newTask = await apiPost<Task>("/tasks", {
        ...data,
        createdBy: currentUser?.id,
      });
      setTasks((prev) => [...prev, newTask]);
      toast.success("สร้างงานสำเร็จ");
      setShowCreateTask(false);
    } catch (err: any) {
      console.error("Failed to create task:", err);
      toast.error(err.message || "ไม่สามารถสร้างงานได้");
    }
  };

  const handleUpdateTask = async (taskId: string, data: Partial<Task>) => {
    try {
      const updatedTask = await apiPatch<Task>(`/tasks/${taskId}`, {
        ...data,
        userId: currentUser?.id,
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t))
      );
      toast.success("อัปเดตงานสำเร็จ");
    } catch (err: any) {
      console.error("Failed to update task:", err);
      toast.error(err.message || "ไม่สามารถอัปเดตงานได้");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบงานนี้?")) return;
    
    try {
      await apiDelete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("ลบงานสำเร็จ");
      setShowDetailDialog(false);
      setSelectedTask(null);
    } catch (err: any) {
      console.error("Failed to delete task:", err);
      toast.error(err.message || "ไม่สามารถลบงานได้");
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowDetailDialog(true);
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      priority: [],
      assigneeId: null,
      teamId: null,
      search: "",
      dueDateFrom: null,
      dueDateTo: null,
    });
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.assigneeId) count++;
    if (filters.teamId) count++;
    if (filters.dueDateFrom || filters.dueDateTo) count++;
    return count;
  }, [filters]);

  const toggleTeamExpanded = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const teamColors: { [key: string]: string } = {
    default: "from-primary/20 via-primary/10 to-primary/5 border-primary/30",
    blue: "from-blue-500/20 via-blue-500/10 to-blue-500/5 border-blue-500/30",
    green: "from-green-500/20 via-green-500/10 to-green-500/5 border-green-500/30",
    purple: "from-purple-500/20 via-purple-500/10 to-purple-500/5 border-purple-500/30",
    amber: "from-amber-500/20 via-amber-500/10 to-amber-500/5 border-amber-500/30",
    red: "from-red-500/20 via-red-500/10 to-red-500/5 border-red-500/30",
  };

  const getTeamColor = (index: number) => {
    const colors = Object.values(teamColors);
    return colors[index % colors.length];
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-16 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 flex items-center justify-center shadow-md shadow-primary/10 ring-1 ring-primary/20">
                    <CheckSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[9px] text-primary-foreground border border-background shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-semibold tracking-tight text-foreground">
                    Task Manager
                  </h1>
                  <p className="text-xs text-muted-foreground truncate">
                    {stats.total} งาน · {stats.done} เสร็จแล้ว · {stats.overdue} เลยกำหนด
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Stats badges */}
                <div className="hidden md:flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                    {stats.todo}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    {stats.inProgress}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    {stats.review}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    {stats.done}
                  </span>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-border/60 bg-background/60 hover:bg-accent"
                      onClick={() => loadData(true)}
                    >
                      <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>รีเฟรช</TooltipContent>
                </Tooltip>

                <Button
                  size="sm"
                  className="h-8 gap-1.5 px-3 font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  onClick={() => setShowCreateTask(true)}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">สร้างงาน</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b border-border/40 bg-background/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหางาน..."
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="pl-9 h-9 text-sm bg-background/60 border-border/60"
                />
                {filters.search && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setFilters((f) => ({ ...f, search: "" }))}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Filter button */}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 gap-1.5",
                  activeFiltersCount > 0 && "border-primary/60 bg-primary/5"
                )}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">ตัวกรอง</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-muted-foreground"
                  onClick={clearFilters}
                >
                  ล้างตัวกรอง
                </Button>
              )}

              {/* View switcher */}
              <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-background/60 p-0.5 ml-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode("board")}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                        viewMode === "board"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span className="hidden sm:inline">Board</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Kanban Board</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                        viewMode === "list"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      )}
                    >
                      <List className="w-4 h-4" />
                      <span className="hidden sm:inline">List</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>รายการ</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode("calendar")}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                        viewMode === "calendar"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      )}
                    >
                      <Calendar className="w-4 h-4" />
                      <span className="hidden sm:inline">Calendar</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>ปฏิทิน</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Filter panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <TaskFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    teams={teams}
                    users={users}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="space-y-4">
                  <Skeleton className="h-12 w-48" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <FolderKanban className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {filters.search || activeFiltersCount > 0
                    ? "ไม่พบงานที่ตรงกับเงื่อนไข"
                    : "ยังไม่มีงาน"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {filters.search || activeFiltersCount > 0
                    ? "ลองเปลี่ยนตัวกรองหรือคำค้นหา"
                    : "เริ่มสร้างงานแรกของคุณ"}
                </p>
                {!filters.search && activeFiltersCount === 0 && (
                  <Button onClick={() => setShowCreateTask(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    สร้างงานใหม่
                  </Button>
                )}
              </div>
            ) : viewMode === "board" || viewMode === "calendar" ? (
              <div className="h-full py-4">
                {viewMode === "board" && (
                  <TaskBoard
                    tasks={filteredTasks}
                    onTaskClick={handleTaskClick}
                    onTaskUpdate={handleUpdateTask}
                    onTaskCreate={() => setShowCreateTask(true)}
                  />
                )}
                {viewMode === "calendar" && (
                  <TaskCalendarView
                    tasks={filteredTasks}
                    onTaskClick={handleTaskClick}
                    onTaskUpdate={handleUpdateTask}
                  />
                )}
              </div>
            ) : (
              <ScrollArea className="h-full py-4">
                <div className="space-y-4 pr-4">
                  {/* Group by team in list view */}
                  {Object.entries(tasksByTeam).map(([key, { team, tasks: teamTasks }], teamIndex) => {
                    if (teamTasks.length === 0) return null;
                    const isExpanded = expandedTeams.has(key);
                    const colorClass = team ? getTeamColor(teamIndex) : teamColors.default;

                    return (
                      <Collapsible
                        key={key}
                        open={isExpanded}
                        onOpenChange={() => toggleTeamExpanded(key)}
                      >
                        <div className={cn(
                          "rounded-xl border bg-gradient-to-br backdrop-blur-sm overflow-hidden",
                          colorClass
                        )}>
                          {/* Team Header */}
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors">
                              <div className="flex items-center gap-3">
                                {team ? (
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                                    <Users className="w-4 h-4 text-primary" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center border border-border/40">
                                    <Inbox className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="text-left">
                                  <h3 className="font-semibold text-sm">
                                    {team?.name || "ไม่มีทีม"}
                                  </h3>
                                  <p className="text-xs text-muted-foreground">
                                    {teamTasks.length} งาน
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Quick stats for team */}
                                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <span className="inline-flex items-center gap-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    {teamTasks.filter((t) => t.status === "todo").length}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    {teamTasks.filter((t) => t.status === "in_progress").length}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    {teamTasks.filter((t) => t.status === "done").length}
                                  </span>
                                </div>
                                <ChevronRight
                                  className={cn(
                                    "w-4 h-4 text-muted-foreground transition-transform",
                                    isExpanded && "rotate-90"
                                  )}
                                />
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          {/* Team Tasks */}
                          <CollapsibleContent>
                            <div className="border-t border-border/40">
                              <TaskList
                                tasks={teamTasks}
                                onTaskClick={handleTaskClick}
                                onTaskUpdate={handleUpdateTask}
                              />
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Dialogs & Drawers */}
        <CreateTaskDialog
          open={showCreateTask}
          onOpenChange={setShowCreateTask}
          teams={teams}
          users={users}
          onCreated={(task) => {
            setTasks((prev) => [...prev, task]);
            setShowCreateTask(false);
          }}
        />

        <TaskDetailDialog
          open={showDetailDialog}
          onOpenChange={(open) => {
            setShowDetailDialog(open);
            if (!open) setSelectedTask(null);
          }}
          task={selectedTask}
          onUpdate={(data) => selectedTask && handleUpdateTask(selectedTask.id, data)}
          onDelete={() => selectedTask && handleDeleteTask(selectedTask.id)}
          users={users}
        />
      </div>
    </TooltipProvider>
  );
}
