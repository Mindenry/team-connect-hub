import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Search, Filter, X, CalendarIcon, LayoutGrid, List, Calendar as CalendarViewIcon, CheckSquare, Clock, AlertCircle, ChevronLeft, ChevronRight, GripVertical, ArrowUpDown, BarChart3, Users, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";
import TaskDetailDialog from "@/components/dialogs/TaskDetailDialog";
import TaskTemplateDialog from "@/components/dialogs/TaskTemplateDialog";
import { auth } from "@/lib/auth";
import { apiGet, apiPatch } from "@/lib/api";
import { getSocket } from "@/lib/websocket";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  type Task,
  type ViewMode,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  ALL_STATUSES,
  isOverdue,
  KanbanColumn,
  TaskListView,
  TaskCalendarView,
} from "@/components/tasks";

export default function Tasks() {
  const location = useLocation();
  const currentUser = auth.getUser();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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

  // Real-time WebSocket listeners for tasks
  useEffect(() => {
    const socket = getSocket();

    const handleTaskCreated = (task: Task) => {
      console.log("[Tasks] Real-time: task created", task.id);
      setTasks((prev) => {
        // Avoid duplicates
        if (prev.some((t) => t.id === task.id)) return prev;
        return [task, ...prev];
      });
    };

    const handleTaskUpdated = (task: Task) => {
      console.log("[Tasks] Real-time: task updated", task.id);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      // Update selected task if it's the one being viewed
      setSelectedTask((prev) => (prev && prev.id === task.id ? task : prev));
    };

    const handleTaskDeleted = (taskId: string) => {
      console.log("[Tasks] Real-time: task deleted", taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTask((prev) => (prev && prev.id === taskId ? null : prev));
    };

    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:deleted", handleTaskDeleted);

    return () => {
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:deleted", handleTaskDeleted);
    };
  }, []);

  const uniqueAssignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    tasks.forEach((t) => {
      if (t.assignee) map.set(t.assignee.id, { id: t.assignee.id, name: t.assignee.name });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    if (filterTeam !== "all") result = result.filter((t) => t.teamId === filterTeam);
    if (filterPriority !== "all") result = result.filter((t) => t.priority === filterPriority);
    if (filterStatus !== "all") result = result.filter((t) => t.status === filterStatus);
    if (filterAssignee !== "all") {
      if (filterAssignee === "unassigned") result = result.filter((t) => !t.assigneeId);
      else result = result.filter((t) => t.assigneeId === filterAssignee);
    }

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

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const overdue = tasks.filter((t) => isOverdue(t)).length;
    return { total, done, inProgress, overdue };
  }, [tasks]);

  const hasActiveFilters = filterTeam !== "all" || filterPriority !== "all" || filterStatus !== "all" || filterAssignee !== "all";

  const handleKanbanDrop = async (taskId: string, newStatus: string, newPosition?: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const oldStatus = task.status;
    const oldPosition = task.position ?? 0;

    if (oldStatus === newStatus && (newPosition === undefined || newPosition === oldPosition)) return;

    let targetPosition = newPosition;
    if (targetPosition === undefined) {
      const targetTasks = tasks.filter((t) => t.status === newStatus && (task.teamId ? t.teamId === task.teamId : true));
      targetPosition = targetTasks.length;
    }

    setTasks((prev) => {
      const updated = [...prev];
      const movedTaskIndex = updated.findIndex((t) => t.id === taskId);
      if (movedTaskIndex === -1) return prev;

      const movedTask = updated[movedTaskIndex];
      if (oldStatus !== newStatus) {
        updated[movedTaskIndex] = { ...movedTask, status: newStatus, position: targetPosition };
      } else {
        updated[movedTaskIndex] = { ...movedTask, position: targetPosition };
      }
      return updated;
    });

    try {
      const response = await apiPatch<Task>(`/tasks/${taskId}/position`, {
        status: newStatus,
        position: targetPosition,
        teamId: task.teamId,
      });
      if (response) {
        setTasks((prev) => prev.map((t) => t.id === response.id ? response : t));
      }
    } catch {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: oldStatus, position: oldPosition } : t));
      toast.error("Failed to move task");
    }
  };

  const handleTaskUpdated = (updated: Task) => {
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
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
        <CreateTaskDialog open={showCreateTask} onOpenChange={setShowCreateTask} onCreated={handleTaskCreated} />
        <TaskTemplateDialog open={showTemplateDialog} onOpenChange={(v) => { setShowTemplateDialog(v); if (!v) setEditingTemplate(null); }} template={editingTemplate} onSaved={() => { loadTasks(); toast.success("Template saved"); }} />
        <TaskDetailDialog
          open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
          task={selectedTask ? {
            id: selectedTask.id,
            title: selectedTask.title,
            priority: selectedTask.priority,
            assignee: selectedTask.assignee ? { id: selectedTask.assignee.id, name: selectedTask.assignee.name, avatar: selectedTask.assignee.avatar || undefined } : undefined,
            dueDate: selectedTask.dueDate,
            tags: selectedTask.tags,
            linkedMeeting: undefined,
            sprint: undefined,
            epic: undefined,
          } : undefined}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />

        <Dialog open={showFilter} onOpenChange={setShowFilter}>
          <DialogContent className="max-w-sm rounded-2xl p-6">
            <DialogHeader><DialogTitle className="text-lg font-semibold">Filters</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ALL_STATUSES.map((s) => (<SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map((p) => (<SelectItem key={p} value={p}>{PRIORITY_CONFIG[p].label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Team</Label>
                <Select value={filterTeam} onValueChange={setFilterTeam}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
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
                    {uniqueAssignees.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
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

        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[2000px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 space-y-3 sm:space-y-4">
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
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">จัดการงาน · ติดตามความคืบหน้า · Kanban · List · Calendar</p>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 self-stretch sm:self-auto justify-end flex-wrap">
                <Button size="sm" variant="outline" className="h-8 sm:h-9 gap-1 sm:gap-1.5 px-2 sm:px-2.5 text-[10px] sm:text-[11px] md:text-xs font-medium shrink-0" onClick={() => setShowTemplateDialog(true)}>
                  <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="hidden md:inline">Template</span>
                </Button>
                <Button size="sm" className="h-8 sm:h-9 gap-1 sm:gap-1.5 px-2 sm:px-2.5 text-[10px] sm:text-[11px] md:text-xs font-medium shrink-0" onClick={() => setShowCreateTask(true)}>
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="hidden sm:inline">New Task</span>
                </Button>
              </div>
            </div>

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

        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[2000px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 h-full flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks..." className="h-9 pl-8 rounded-lg text-sm bg-background/50" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant={hasActiveFilters ? "default" : "outline"} className="h-9 gap-1.5 px-2.5 text-xs" onClick={() => setShowFilter(true)}>
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

                <div className="flex items-center rounded-lg border border-border/60 bg-background/50 p-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className={cn("p-1.5 rounded-md transition-all", viewMode === "kanban" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} onClick={() => setViewMode("kanban")}>
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Kanban Board</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className={cn("p-1.5 rounded-md transition-all", viewMode === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} onClick={() => setViewMode("list")}>
                        <List className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>List View</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className={cn("p-1.5 rounded-md transition-all", viewMode === "calendar" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} onClick={() => setViewMode("calendar")}>
                        <CalendarViewIcon className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Calendar View</TooltipContent>
                  </Tooltip>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                      <ArrowUpDown className={cn("w-3.5 h-3.5 transition-transform", sortOrder === "desc" && "rotate-180")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{sortOrder === "asc" ? "Ascending" : "Descending"}</TooltipContent>
                </Tooltip>
              </div>
            </div>

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

            <div className="text-[11px] text-muted-foreground">
              {filteredTasks.length} of {tasks.length} tasks
              {searchQuery && <span> matching "{searchQuery}"</span>}
            </div>

            <div className="flex-1 overflow-auto -mx-1 px-1 pb-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full rounded-lg" />))}
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
                    <KanbanColumn key={status} status={status} tasks={filteredTasks.filter((t) => t.status === status)} onTaskClick={setSelectedTask} onDrop={handleKanbanDrop} />
                  ))}
                </div>
              ) : viewMode === "list" ? (
                <TaskListView tasks={filteredTasks} onTaskClick={setSelectedTask} groupBy={groupBy} />
              ) : (
                <TaskCalendarView tasks={filteredTasks} onTaskClick={setSelectedTask} />
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
