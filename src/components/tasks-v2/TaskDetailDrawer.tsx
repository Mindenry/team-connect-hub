import { useEffect, useState, useCallback } from "react";
import {
  CheckSquare,
  MessageSquare,
  Paperclip,
  Plus,
  Trash2,
  Eye,
  AlertTriangle,
  Calendar,
  Flag,
  Clock,
  Activity,
  Bell,
  Users,
  ChevronRight,
  MoreHorizontal,
  Link2,
  Copy,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
import { Separator } from "@/components/ui/separator";
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
   TASK DETAIL DRAWER - Professional Linear/Jira-style Right Panel
   ═══════════════════════════════════════════════════════════ */

interface TaskDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskCardData | null;
  onTaskDeleted?: (taskId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  todo: { label: "Open", color: "text-slate-600", dot: "bg-slate-400" },
  in_progress: { label: "In Progress", color: "text-blue-600", dot: "bg-blue-500" },
  in_review: { label: "In Review", color: "text-amber-600", dot: "bg-amber-500" },
  done: { label: "Done", color: "text-emerald-600", dot: "bg-emerald-500" },
};

const PRIORITY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  urgent: { label: "Urgent", icon: AlertTriangle, color: "text-red-500" },
  high: { label: "High", icon: ChevronRight, color: "text-orange-500" },
  medium: { label: "Medium", icon: ChevronRight, color: "text-yellow-600" },
  low: { label: "Low", icon: ChevronRight, color: "text-slate-400" },
};

export default function TaskDetailDrawer({
  open,
  onOpenChange,
  task,
  onTaskDeleted,
}: TaskDetailDrawerProps) {
  const currentUser = auth.getUser();
  const { toast } = useToast();

  // State
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

  // Input states
  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [togglingWatch, setTogglingWatch] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  const displayTask = taskData || task;

  // Load all data
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
    if (open && task?.id) loadAll();
  }, [open, task?.id, loadAll]);

  // Computed
  const isWatching = watchers.some(
    (w: any) => (w.userId || w.user?.id) === currentUser?.id
  );
  const isOverdue =
    !!displayTask?.dueDate &&
    new Date(displayTask.dueDate) < new Date() &&
    displayTask?.status !== "done";

  const completedSubtasks = subtasks.filter((s) => s.isCompleted).length;
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  // Handlers
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
      const updated = await apiPatch<any>(`/tasks/subtasks/${subtaskId}`, {
        isCompleted: !isCompleted,
      });
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, ...updated } : s))
      );
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
    const exists = watchers.some(
      (w: any) => (w.userId || w.user?.id) === currentUser.id
    );

    setTogglingWatch(true);
    try {
      if (exists) {
        await apiDelete(`/task-watchers?taskId=${task.id}&userId=${currentUser.id}`);
        setWatchers((prev) =>
          prev.filter((w: any) => (w.userId || w.user?.id) !== currentUser.id)
        );
      } else {
        const created = await apiPost<any>("/task-watchers", {
          taskId: task.id,
          userId: currentUser.id,
        });
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
      onDeleted?.(task.id);
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

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const formatActivityMessage = (a: any): string => {
    switch (a.action) {
      case "created":
        return "created this task";
      case "status_changed":
        return `changed status to ${a.newValue || "new"}`;
      case "assigned":
        return "assigned this task";
      case "priority_changed":
        return `changed priority to ${a.newValue || "new"}`;
      case "comment_added":
        return "commented";
      default:
        return "updated this task";
    }
  };

  if (!task?.id) return null;

  const status = STATUS_CONFIG[displayTask?.status] || STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[displayTask?.priority] || PRIORITY_CONFIG.medium;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 gap-0 border-l border-border/50"
      >
        {/* ═══════════════════════════════════════════════════════════
            HEADER - Clean minimal header
            ═══════════════════════════════════════════════════════════ */}
        <SheetHeader className="shrink-0 border-b border-border/50 px-6 py-4 space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CheckSquare className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-left text-base font-semibold truncate">
                  {displayTask?.title || "Untitled Task"}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    onClick={copyTaskId}
                    className="text-xs text-muted-foreground hover:text-foreground font-mono flex items-center gap-1"
                  >
                    #{task.id.slice(0, 8)}
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={copyTaskId}>
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Copy ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={deleteTask}
                  disabled={deletingTask}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>

        {/* ═══════════════════════════════════════════════════════════
            MAIN CONTENT - Two column layout
            ═══════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* LEFT PANEL (70%) - Main content */}
          <ScrollArea className="flex-1 min-w-0 border-r border-border/30">
            <div className="p-6 space-y-8">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* ── DESCRIPTION ── */}
                  <section className="space-y-3">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </h3>
                    <Textarea
                      value={displayTask?.description || ""}
                      onChange={(e) =>
                        setTaskData((prev: any) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      onBlur={() =>
                        handleUpdateField("description", displayTask?.description)
                      }
                      placeholder="Add a description..."
                      className="min-h-24 resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </section>

                  {/* ── SUBTASKS ── */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <CheckSquare className="w-3.5 h-3.5" />
                        Subtasks
                      </h3>
                      {subtasks.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${subtaskProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">
                            {completedSubtasks}/{subtasks.length}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Add subtask input */}
                    <div className="flex gap-2">
                      <Input
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        placeholder="Add subtask..."
                        onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                        className="h-9 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={addSubtask}
                        disabled={addingSubtask || !newSubtask.trim()}
                        className="h-9"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Subtask list */}
                    {subtasks.length > 0 && (
                      <div className="space-y-1">
                        {subtasks.map((s: any) => (
                          <div
                            key={s.id}
                            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={!!s.isCompleted}
                              onChange={() => toggleSubtask(s.id, !!s.isCompleted)}
                              className="w-4 h-4 rounded border-border accent-primary"
                            />
                            <span
                              className={cn(
                                "text-sm flex-1",
                                s.isCompleted && "line-through text-muted-foreground"
                              )}
                            >
                              {s.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* ── COMMENTS (Chat-style) ── */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Comments
                      {comments.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] ml-1">
                          {comments.length}
                        </Badge>
                      )}
                    </h3>

                    {/* Comments list - Chat style */}
                    <div className="space-y-4">
                      {comments.map((c: any) => (
                        <div key={c.id} className="flex gap-3">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarImage src={c.user?.avatar} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {c.user?.name?.slice(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 bg-muted/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {c.user?.name || "User"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {c.createdAt
                                  ? getTimeAgo(new Date(c.createdAt))
                                  : ""}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {c.text || c.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add comment */}
                    <div className="flex gap-2 pt-2">
                      <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        onKeyDown={(e) => e.key === "Enter" && addComment()}
                        className="h-9 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={addComment}
                        disabled={addingComment || !newComment.trim()}
                        className="h-9"
                      >
                        Send
                      </Button>
                    </div>
                  </section>

                  {/* ── ATTACHMENTS ── */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5" />
                      Attachments
                      {attachments.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] ml-1">
                          {attachments.length}
                        </Badge>
                      )}
                    </h3>

                    {/* Upload button */}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploadingAttachment}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadAttachment(f);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        disabled={uploadingAttachment}
                        className="h-9"
                      >
                        <span>
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          {uploadingAttachment ? "Uploading..." : "Upload file"}
                        </span>
                      </Button>
                    </label>

                    {/* Attachment list */}
                    {attachments.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {attachments.map((a: any) => (
                          <a
                            key={a.id}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors text-sm"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{a.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* ── ACTIVITY LOG (Timeline style) ── */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5" />
                      Activity
                    </h3>

                    {activities.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No activity yet</p>
                    ) : (
                      <div className="relative pl-4">
                        <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border" />
                        <div className="space-y-3">
                          {activities.slice(0, 10).map((a: any) => (
                            <div key={a.id} className="flex items-start gap-3 relative">
                              <div className="w-3 h-3 rounded-full bg-muted border-2 border-background shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs">
                                  <span className="font-medium">
                                    {a.user?.name || "Someone"}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {" "}
                                    {a.message || formatActivityMessage(a)}
                                  </span>
                                </p>
                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                  {a.createdAt
                                    ? getTimeAgo(new Date(a.createdAt))
                                    : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </ScrollArea>

          {/* RIGHT PANEL (30%) - Properties sidebar */}
          <div className="w-72 shrink-0 bg-muted/20">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-5">
                {/* ── STATUS ── */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </label>
                  <Select
                    value={displayTask?.status || "todo"}
                    onValueChange={(v) => handleUpdateField("status", v)}
                  >
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", config.dot)} />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ── PRIORITY ── */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Flag className="w-3 h-3" />
                    Priority
                  </label>
                  <Select
                    value={displayTask?.priority || "medium"}
                    onValueChange={(v) => handleUpdateField("priority", v)}
                  >
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <config.icon className={cn("w-3 h-3", config.color)} />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ── ASSIGNEES ── */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    Assignees
                  </label>
                  <div className="space-y-2">
                    {assigneeIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {assigneeIds.map((id) => {
                          const user = users.find((u) => u.id === id);
                          return (
                            <Badge
                              key={id}
                              variant="secondary"
                              className="text-xs flex items-center gap-1 pr-1"
                            >
                              {user?.name || "Unknown"}
                              <button
                                className="ml-1 hover:text-destructive p-0.5"
                                onClick={() => {
                                  const newIds = assigneeIds.filter(
                                    (aId) => aId !== id
                                  );
                                  setAssigneeIds(newIds);
                                  handleUpdateField(
                                    "assigneeIds",
                                    newIds.length > 0 ? newIds : null
                                  );
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Unassigned</p>
                    )}
                    <Select
                      value=""
                      onValueChange={(v) => {
                        if (v && !assigneeIds.includes(v)) {
                          const newIds = [...assigneeIds, v];
                          setAssigneeIds(newIds);
                          handleUpdateField("assigneeIds", newIds);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 bg-background text-xs">
                        <SelectValue placeholder="Add assignee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter((u) => !assigneeIds.includes(u.id))
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ── DUE DATE ── */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={
                      displayTask?.dueDate
                        ? new Date(displayTask.dueDate).toISOString().slice(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      handleUpdateField(
                        "dueDate",
                        e.target.value ? new Date(e.target.value).toISOString() : null
                      )
                    }
                    className={cn("h-9 bg-background", isOverdue && "border-red-500")}
                  />
                  {isOverdue && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertTriangle className="w-3 h-3" />
                      Overdue
                    </div>
                  )}
                  {displayTask?.dueDate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={async () => {
                        if (!task?.id || !currentUser?.id) return;
                        try {
                          const remindAt = new Date(displayTask.dueDate!);
                          remindAt.setHours(9, 0, 0, 0);
                          await apiPost("/reminders", {
                            title: `Task due: ${displayTask.title}`,
                            type: "task_due",
                            relatedId: task.id,
                            relatedType: "task",
                            remindAt: remindAt.toISOString(),
                            recipientIds: [currentUser.id],
                          });
                          toast({ title: "Reminder set for due date" });
                        } catch {
                          toast({
                            title: "Failed to set reminder",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Bell className="w-3 h-3 mr-1" />
                      Set Reminder
                    </Button>
                  )}
                </div>

                <Separator />

                {/* ── TEAM ── */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Team
                  </label>
                  <Select
                    value={displayTask?.teamId || "none"}
                    onValueChange={(v) =>
                      handleUpdateField("teamId", v === "none" ? null : v)
                    }
                  >
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="No team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ── WATCHERS ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Watchers
                    </label>
                    <Button
                      size="sm"
                      variant={isWatching ? "default" : "outline"}
                      onClick={toggleWatching}
                      disabled={togglingWatch}
                      className="h-7 text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {isWatching ? "Watching" : "Watch"}
                    </Button>
                  </div>
                  {watchers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {watchers.map((w: any) => (
                        <Avatar
                          key={w.userId || w.user?.id}
                          className="w-6 h-6"
                        >
                          <AvatarImage src={w.user?.avatar} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {w.user?.name?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* ── METADATA ── */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span>
                      {displayTask?.createdAt
                        ? new Date(displayTask.createdAt).toLocaleDateString()
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Updated</span>
                    <span>
                      {displayTask?.updatedAt
                        ? new Date(displayTask.updatedAt).toLocaleDateString()
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
