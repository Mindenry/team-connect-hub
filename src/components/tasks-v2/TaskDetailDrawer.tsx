import { useEffect, useState, useCallback, useRef } from "react";
import {
  CheckSquare,
  MessageSquare,
  Paperclip,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Calendar,
  Flag,
  Activity,
  Bell,
  Users,
  MoreHorizontal,
  Copy,
  X,
  ChevronUp,
  ChevronDown,
  Minus,
  ArrowUp,
  Pencil,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetHeader,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/auth";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { TaskCardData } from "./TaskCard";

/* ═══════════════════════════════════════════════════════════
   TASK DETAIL DRAWER - Premium Right-Side Panel (Linear-style)
   ═══════════════════════════════════════════════════════════ */

interface TaskDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskCardData | null;
  onTaskDeleted?: (taskId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  todo:        { label: "Open",        color: "text-slate-700 dark:text-slate-300",   dot: "bg-slate-400",   bg: "bg-slate-100 dark:bg-slate-800" },
  in_progress: { label: "In Progress", color: "text-blue-700 dark:text-blue-400",     dot: "bg-blue-500",    bg: "bg-blue-50 dark:bg-blue-950" },
  in_review:   { label: "In Review",   color: "text-amber-700 dark:text-amber-400",   dot: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-950" },
  done:        { label: "Done",        color: "text-emerald-700 dark:text-emerald-400",dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950" },
  canceled:    { label: "Canceled",    color: "text-slate-500",                        dot: "bg-slate-300",   bg: "bg-slate-100 dark:bg-slate-800" },
};

const PRIORITY_CONFIG: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  urgent: { label: "Urgent", Icon: ArrowUp,    color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950" },
  high:   { label: "High",   Icon: ChevronUp,  color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950" },
  medium: { label: "Medium", Icon: Minus,      color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950" },
  low:    { label: "Low",    Icon: ChevronDown,color: "text-slate-400",  bg: "bg-slate-100 dark:bg-slate-800" },
};

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatActivityMessage(a: any): string {
  switch (a.action) {
    case "created":        return "created this task";
    case "status_changed": return `changed status to ${a.newValue || "new"}`;
    case "assigned":       return "assigned this task";
    case "priority_changed": return `changed priority to ${a.newValue || "new"}`;
    case "comment_added":  return "commented";
    default:               return "updated this task";
  }
}

/* ─── Sidebar property row ─── */
function PropRow({ icon: Icon, label, children }: { icon?: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2 w-28 shrink-0 mt-0.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/70" />}
        <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function TaskDetailDrawer({
  open,
  onOpenChange,
  task,
  onTaskDeleted,
}: TaskDetailDrawerProps) {
  const currentUser = auth.getUser();
  const { toast } = useToast();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [watchers, setWatchers] = useState<any[]>([]);
  const [taskData, setTaskData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [togglingWatch, setTogglingWatch] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "activity">("overview");

  const displayTask = taskData || task;

  const loadAll = useCallback(async () => {
    if (!task?.id) return;
    setLoading(true);
    try {
      const [taskRes, usersRes, teamsRes, watchersRes, activityRes] = await Promise.all([
        apiGet<any>(`/tasks/${task.id}`).catch(() => null),
        apiGet<any[]>("/users").catch(() => []),
        apiGet<any[]>("/teams").catch(() => []),
        apiGet<any[]>(`/task-watchers?taskId=${task.id}`).catch(() => []),
        apiGet<any[]>(`/tasks/${task.id}/activity`).catch(() => []),
      ]);

      if (taskRes) {
        setTaskData(taskRes);
        setComments(Array.isArray(taskRes.comments) ? taskRes.comments : []);
        setSubtasks(Array.isArray(taskRes.subtasks) ? taskRes.subtasks : []);
        setAttachments(Array.isArray(taskRes.attachments) ? taskRes.attachments : []);
        if (taskRes.assignees) {
          setAssigneeIds(taskRes.assignees.map((a: any) => a.id || a.userId));
        } else if (taskRes.assigneeId) {
          setAssigneeIds([taskRes.assigneeId]);
        }
      } else {
        setTaskData(task ?? null);
      }

      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setTeams(Array.isArray(teamsRes) ? teamsRes : []);
      setWatchers(Array.isArray(watchersRes) ? watchersRes : []);
      setActivities(Array.isArray(activityRes) ? activityRes : []);
    } catch {
      toast({ title: "Failed to load task", variant: "destructive" });
      setTaskData(task ?? null);
    } finally {
      setLoading(false);
    }
  }, [task, toast]);

  useEffect(() => {
    if (open && task?.id) {
      setActiveTab("overview");
      loadAll();
    }
  }, [open, task?.id, loadAll]);

  const isWatching = watchers.some((w: any) => (w.userId || w.user?.id) === currentUser?.id);
  const isOverdue =
    !!displayTask?.dueDate &&
    new Date(displayTask.dueDate) < new Date() &&
    displayTask?.status !== "done";

  const completedSubtasks = subtasks.filter((s) => s.isCompleted).length;
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  const handleUpdateField = async (field: string, value: any) => {
    if (!task?.id) return;
    setSaving(true);
    try {
      const payload: any = { userId: currentUser?.id };
      payload[field] = value;
      const updated = await apiPatch<any>(`/tasks/${task.id}`, payload);
      setTaskData((prev: any) => ({ ...prev, ...updated, [field]: value }));
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveTitle = async () => {
    if (titleDraft.trim() && titleDraft.trim() !== displayTask?.title) {
      await handleUpdateField("title", titleDraft.trim());
    }
    setEditingTitle(false);
  };

  const addComment = async () => {
    if (!task?.id || !newComment.trim() || !currentUser?.id || addingComment) return;
    setAddingComment(true);
    try {
      const created = await apiPost<any>(`/tasks/${task.id}/comments`, {
        userId: currentUser.id,
        text: newComment.trim(),
      });
      setComments((prev) => [...prev, created]);
      setNewComment("");
    } catch {
      toast({ title: "Comment failed", variant: "destructive" });
    } finally {
      setAddingComment(false);
    }
  };

  const addSubtask = async () => {
    if (!task?.id || !newSubtask.trim() || addingSubtask) return;
    setAddingSubtask(true);
    try {
      const created = await apiPost<any>(`/tasks/${task.id}/subtasks`, {
        title: newSubtask.trim(),
      });
      setSubtasks((prev) => [...prev, created]);
      setNewSubtask("");
    } catch {
      toast({ title: "Subtask failed", variant: "destructive" });
    } finally {
      setAddingSubtask(false);
    }
  };

  const toggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    try {
      const updated = await apiPatch<any>(`/tasks/subtasks/${subtaskId}`, { isCompleted: !isCompleted });
      setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, ...updated } : s)));
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const uploadAttachment = async (file: File) => {
    if (!task?.id || !currentUser?.id || uploadingAttachment) return;
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("collabhub_token");
      const uploadRes = await fetch(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/upload?folder=tasks/${task.id}&filename=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        }
      );
      const uploadData = await uploadRes.json();
      const created = await apiPost<any>(`/tasks/${task.id}/attachments`, {
        userId: currentUser.id,
        name: file.name,
        url: uploadData.url,
        mimeType: file.type,
        size: file.size,
      });
      setAttachments((prev) => [created, ...prev]);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingAttachment(false);
    }
  };

  const toggleWatching = async () => {
    if (!task?.id || !currentUser?.id || togglingWatch) return;
    const exists = watchers.some((w: any) => (w.userId || w.user?.id) === currentUser.id);
    setTogglingWatch(true);
    try {
      if (exists) {
        await apiDelete(`/task-watchers?taskId=${task.id}&userId=${currentUser.id}`);
        setWatchers((prev) => prev.filter((w: any) => (w.userId || w.user?.id) !== currentUser.id));
      } else {
        const created = await apiPost<any>("/task-watchers", { taskId: task.id, userId: currentUser.id });
        setWatchers((prev) => [...prev, created]);
      }
    } catch {
      toast({ title: "Watcher update failed", variant: "destructive" });
    } finally {
      setTogglingWatch(false);
    }
  };

  const deleteTask = async () => {
    if (!task?.id || deletingTask) return;
    if (!confirm("Are you sure you want to delete this task?")) return;
    setDeletingTask(true);
    try {
      await apiDelete(`/tasks/${task.id}`);
      onTaskDeleted?.(task.id);
      onOpenChange(false);
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeletingTask(false);
    }
  };

  const copyTaskId = () => {
    if (task?.id) {
      navigator.clipboard.writeText(task.id);
      toast({ title: "Task ID copied" });
    }
  };

  if (!task?.id) return null;

  const status = STATUS_CONFIG[displayTask?.status] || STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[displayTask?.priority] || PRIORITY_CONFIG.medium;
  const PriorityIcon = priority.Icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:w-[540px] md:w-[600px] max-w-[100vw] h-full p-0 gap-0 flex flex-col overflow-hidden border-l border-border/50 shadow-2xl [&>button.absolute]:hidden">
        <SheetHeader className="sr-only">
          <SheetTitle>{displayTask?.title || "Task Detail"}</SheetTitle>
        </SheetHeader>

        {/* ══════════════════════════════════════════════════════
            TOP BAR — breadcrumb · actions
        ══════════════════════════════════════════════════════ */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <CheckSquare className="w-3.5 h-3.5 shrink-0 text-primary/70" />
            <span className="shrink-0">Tasks</span>
            <span className="text-border">/</span>
            <button
              onClick={copyTaskId}
              className="font-mono hover:text-foreground transition-colors flex items-center gap-1 truncate"
            >
              #{task.id.slice(0, 8)}
              <Copy className="w-3 h-3 shrink-0" />
            </button>
            {saving && (
              <span className="ml-2 text-[10px] text-muted-foreground/60 animate-pulse">
                Saving...
              </span>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              size="sm"
              variant={isWatching ? "secondary" : "ghost"}
              onClick={toggleWatching}
              disabled={togglingWatch}
              className="h-7 text-[11px] gap-1.5 px-2"
            >
              {isWatching ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{isWatching ? "Watching" : "Watch"}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={copyTaskId} className="text-xs">
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Copy task ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs text-destructive focus:text-destructive"
                  onClick={deleteTask}
                  disabled={deletingTask}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            BODY — single column scrollable content
        ══════════════════════════════════════════════════════ */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="px-5 py-4 space-y-5">

            {/* Status + Priority + Overdue badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold",
                status.bg, status.color
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                {status.label}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium",
                priority.bg, priority.color
              )}>
                <PriorityIcon className="w-3 h-3" />
                {priority.label}
              </span>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
                  <AlertTriangle className="w-3 h-3" />
                  Overdue
                </span>
              )}
            </div>

            {/* Title — editable */}
            {editingTitle ? (
              <div className="flex items-start gap-2">
                <Input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  className="text-lg font-semibold h-auto py-1.5 px-2 leading-tight border-primary"
                />
                <Button size="sm" onClick={saveTitle} className="mt-0.5 shrink-0 h-8">
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)} className="mt-0.5 shrink-0 h-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="group flex items-start gap-2">
                <h1 className="text-lg font-semibold leading-tight text-foreground flex-1">
                  {displayTask?.title || "Untitled Task"}
                </h1>
                <button
                  onClick={() => {
                    setTitleDraft(displayTask?.title || "");
                    setEditingTitle(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0 p-1.5 rounded-md hover:bg-muted"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Tags */}
            {displayTask?.tags && displayTask.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {displayTask.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] rounded-full px-2 py-0.5">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <>
                  {/* ── DESCRIPTION ── */}
                  <section className="mb-8">
                    <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center">
                        <Pencil className="w-2.5 h-2.5 text-primary" />
                      </span>
                      Description
                    </h2>
                    <div className="bg-muted/20 rounded-lg border border-border/40 p-4">
                      <Textarea
                        value={displayTask?.description || ""}
                        onChange={(e) =>
                          setTaskData((prev: any) => ({ ...prev, description: e.target.value }))
                        }
                        onBlur={() => handleUpdateField("description", displayTask?.description)}
                        placeholder="Add a description… Use this to describe the task, acceptance criteria, or links to related resources."
                        className="min-h-28 resize-y border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </section>

                  {/* ── SUBTASKS ── */}
                  <section className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center">
                          <CheckSquare className="w-2.5 h-2.5 text-primary" />
                        </span>
                        Tasks
                        {subtasks.length > 0 && (
                          <span className="text-xs font-normal text-muted-foreground">
                            {completedSubtasks} of {subtasks.length} completed
                          </span>
                        )}
                      </h2>
                    </div>

                    {subtasks.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${subtaskProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-mono w-8 text-right">
                            {Math.round(subtaskProgress)}%
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 mb-3">
                      {subtasks.map((s: any) => (
                        <div
                          key={s.id}
                          className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/40 transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={!!s.isCompleted}
                            onChange={() => toggleSubtask(s.id, !!s.isCompleted)}
                            className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                          />
                          <span className={cn(
                            "text-sm flex-1 leading-snug",
                            s.isCompleted && "line-through text-muted-foreground"
                          )}>
                            {s.title}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        placeholder="Add a subtask..."
                        onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                        className="h-9 text-sm bg-muted/30 border-border/40"
                      />
                      <Button
                        size="sm"
                        onClick={addSubtask}
                        disabled={addingSubtask || !newSubtask.trim()}
                        className="h-9 px-3"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </section>

                  {/* ── ATTACHMENTS ── */}
                  {attachments.length > 0 && (
                    <section className="mb-8">
                      <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center">
                          <Paperclip className="w-2.5 h-2.5 text-primary" />
                        </span>
                        Attachments
                        <Badge variant="secondary" className="text-[10px]">{attachments.length}</Badge>
                      </h2>
                      <div className="grid grid-cols-2 gap-2">
                        {attachments.map((a: any) => (
                          <a
                            key={a.id}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/50 hover:bg-muted/50 hover:border-border transition-all text-sm group"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate flex-1">{a.name}</span>
                            <ExternalLink className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* ── TABS: Comments / Activity ── */}
                  <section>
                    <div className="flex items-center gap-0 mb-4 border-b border-border/50">
                      {(["overview", "activity"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={cn(
                            "px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px",
                            activeTab === tab
                              ? "border-primary text-foreground"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {tab === "overview" ? (
                            <span className="flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" />
                              Comments
                              {comments.length > 0 && (
                                <span className="bg-muted text-muted-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                  {comments.length}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5" />
                              Activity
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {activeTab === "overview" ? (
                      <div className="space-y-4">
                        {/* Comments list */}
                        {comments.length === 0 ? (
                          <p className="text-sm text-muted-foreground/60 py-4 text-center">
                            No comments yet. Be the first to comment.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {comments.map((c: any) => (
                              <div key={c.id} className="flex gap-3">
                                <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                                  <AvatarImage src={c.user?.avatar} />
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                                    {c.user?.name?.slice(0, 2).toUpperCase() || "??"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="bg-muted/40 border border-border/40 rounded-lg px-4 py-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-sm font-semibold">{c.user?.name || "User"}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {c.createdAt ? getTimeAgo(new Date(c.createdAt)) : ""}
                                      </span>
                                    </div>
                                    <p className="text-sm leading-relaxed">{c.text || c.content}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add comment */}
                        <div className="flex gap-3 pt-2">
                          <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                            <AvatarImage src={currentUser?.avatar} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                              {currentUser?.name?.slice(0, 2).toUpperCase() || "ME"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="border border-border/50 rounded-lg overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                              <Textarea
                                ref={commentInputRef}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Leave a comment..."
                                rows={3}
                                className="border-0 resize-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 rounded-b-none"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addComment();
                                }}
                              />
                              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t border-border/30">
                                <span className="text-[11px] text-muted-foreground/60">
                                  Ctrl+Enter to submit
                                </span>
                                <Button
                                  size="sm"
                                  onClick={addComment}
                                  disabled={addingComment || !newComment.trim()}
                                  className="h-7 text-xs px-3"
                                >
                                  {addingComment ? "Sending..." : "Comment"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Activity timeline */
                      <div>
                        {activities.length === 0 ? (
                          <p className="text-sm text-muted-foreground/60 py-4 text-center">No activity yet.</p>
                        ) : (
                          <div className="relative pl-5">
                            <div className="absolute left-2 top-3 bottom-3 w-px bg-border/50" />
                            <div className="space-y-4">
                              {activities.map((a: any) => (
                                <div key={a.id} className="flex items-start gap-3 relative">
                                  <div className="w-3.5 h-3.5 rounded-full bg-background border-2 border-border shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm">
                                      <span className="font-semibold">{a.user?.name || "Someone"}</span>
                                      <span className="text-muted-foreground"> {a.message || formatActivityMessage(a)}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                                      {a.createdAt ? getTimeAgo(new Date(a.createdAt)) : ""}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </section>

                {/* ── PROPERTIES ── */}
                <section className="border-t border-border/30 pt-4 mt-4 space-y-3">
                  {/* Status + Priority row */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Status</label>
                      <Select
                        value={displayTask?.status || "todo"}
                        onValueChange={(v) => handleUpdateField("status", v)}
                      >
                        <SelectTrigger className="h-8 bg-background/50 text-xs border-border/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                                <span className="text-xs">{cfg.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Priority</label>
                      <Select
                        value={displayTask?.priority || "medium"}
                        onValueChange={(v) => handleUpdateField("priority", v)}
                      >
                        <SelectTrigger className="h-8 bg-background/50 text-xs border-border/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_CONFIG).map(([value, cfg]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                <cfg.Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                                <span className="text-xs">{cfg.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Due Date + Team row */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Due Date</label>
                      <Input
                        type="date"
                        value={displayTask?.dueDate ? new Date(displayTask.dueDate).toISOString().slice(0, 10) : ""}
                        onChange={(e) => handleUpdateField("dueDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                        className={cn("h-8 bg-background/50 text-xs border-border/40", isOverdue && "border-red-400 text-red-600")}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Team</label>
                      <Select
                        value={displayTask?.teamId || "none"}
                        onValueChange={(v) => handleUpdateField("teamId", v === "none" ? null : v)}
                      >
                        <SelectTrigger className="h-8 bg-background/50 text-xs border-border/40">
                          <SelectValue placeholder="No team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none"><span className="text-xs text-muted-foreground">No team</span></SelectItem>
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={t.id}><span className="text-xs">{t.name}</span></SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Assignees */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Assignees</label>
                    <div className="flex flex-wrap gap-1.5">
                      {assigneeIds.length > 0 ? (
                        assigneeIds.map((id) => {
                          const u = users.find((u) => u.id === id);
                          return (
                            <div key={id} className="flex items-center gap-1.5 bg-muted/50 rounded-full pl-1 pr-2 py-0.5">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={u?.avatar} />
                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{u?.name?.slice(0, 2).toUpperCase() || "??"}</AvatarFallback>
                              </Avatar>
                              <span className="text-[11px]">{u?.name || "Unknown"}</span>
                              <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => { const newIds = assigneeIds.filter((aId) => aId !== id); setAssigneeIds(newIds); handleUpdateField("assigneeIds", newIds.length > 0 ? newIds : null); }}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })
                      ) : null}
                      <Select value="" onValueChange={(v) => { if (v && !assigneeIds.includes(v)) { const newIds = [...assigneeIds, v]; setAssigneeIds(newIds); handleUpdateField("assigneeIds", newIds); } }}>
                        <SelectTrigger className="h-6 bg-transparent text-[11px] border-border/30 border-dashed px-2">
                          <SelectValue placeholder="+ Add" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.filter((u) => !assigneeIds.includes(u.id)).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-4 h-4"><AvatarImage src={u.avatar} /><AvatarFallback className="text-[8px] bg-primary/10 text-primary">{u.name?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                                <span className="text-xs">{u.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Attach file */}
                  <label className="cursor-pointer block">
                    <input type="file" className="hidden" disabled={uploadingAttachment} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); }} />
                    <span className={cn("flex items-center justify-center gap-2 w-full h-8 rounded-lg border border-dashed border-border/40 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-all", uploadingAttachment && "opacity-50 pointer-events-none")}>
                      <Paperclip className="w-3 h-3" />
                      {uploadingAttachment ? "Uploading..." : "Attach file"}
                    </span>
                  </label>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/20">
                    <span>Created {displayTask?.createdAt ? new Date(displayTask.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</span>
                    <span>Updated {displayTask?.updatedAt ? getTimeAgo(new Date(displayTask.updatedAt)) : "—"}</span>
                  </div>
                </section>
                </>
              )}
            </div>
          </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
