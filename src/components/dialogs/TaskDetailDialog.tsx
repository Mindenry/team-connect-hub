import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CalendarIcon,
  Clock,
  MessageSquare,
  Paperclip,
  Eye,
  Plus,
  Trash2,
  Send,
  Edit3,
  CheckSquare,
  AlertCircle,
  History,
  User,
  Users,
  Tag,
  Loader2,
  X,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Task, Subtask, TaskComment, TaskActivityLog, TaskAttachment, TaskWatcher } from "@/components/tasks/types";
import { PRIORITY_CONFIG, STATUS_CONFIG, ALL_STATUSES } from "@/components/tasks/types";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: {
    id: string;
    title: string;
    priority: string;
    assignee?: { id: string; name: string; initials?: string; avatar?: string } | null;
    dueDate?: string | null;
    tags?: string[];
    linkedMeeting?: any;
    sprint?: any;
    epic?: { id: string; name: string; color?: string } | null;
  };
  onUpdated?: (task: Task) => void;
  onDeleted?: (taskId: string) => void;
}

type DetailTab = "details" | "subtasks" | "comments" | "activity" | "attachments";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function timeAgo(dateStr: string) {
  const now = new Date().getTime();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function TaskDetailDialog({
  open,
  onOpenChange,
  task: taskProp,
  onUpdated,
  onDeleted,
}: TaskDetailDialogProps) {
  const currentUser = auth.getUser();

  const [fullTask, setFullTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("details");

  // Editable fields
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editStatus, setEditStatus] = useState("todo");
  const [editDueDate, setEditDueDate] = useState("");

  // Subtask
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);

  // Comment
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Users list for assigning
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (open && taskProp?.id) {
      setLoading(true);
      setActiveTab("details");
      Promise.all([
        apiGet<Task>(`/tasks/${taskProp.id}`),
        apiGet<any[]>("/users").catch(() => []),
      ]).then(([t, u]) => {
        setFullTask(t as Task);
        setUsers(Array.isArray(u) ? u : []);
        if (t) {
          setEditTitle(t.title || "");
          setEditDesc(t.description || "");
          setEditPriority(t.priority || "medium");
          setEditStatus(t.status || "todo");
          setEditDueDate(t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 16) : "");
        }
      }).catch(() => {
        toast.error("Failed to load task details");
      }).finally(() => setLoading(false));
    }
  }, [open, taskProp?.id]);

  const subtasks = fullTask?.subtasks || [];
  const comments = fullTask?.comments || [];
  const activities = fullTask?.activityLog || [];
  const attachments = fullTask?.attachments || [];
  const watchers = fullTask?.watchers || [];

  const subtaskProgress = useMemo(() => {
    if (subtasks.length === 0) return 0;
    return Math.round((subtasks.filter((s) => s.isCompleted).length / subtasks.length) * 100);
  }, [subtasks]);

  const handleSave = async () => {
    if (!fullTask) return;
    try {
      const updated = await apiPatch<Task>(`/tasks/${fullTask.id}`, {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        priority: editPriority,
        status: editStatus,
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
        userId: currentUser?.id,
      });
      setFullTask(updated);
      setEditing(false);
      onUpdated?.(updated);
      toast.success("Task updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update task");
    }
  };

  const handleDelete = async () => {
    if (!fullTask) return;
    try {
      await apiDelete(`/tasks/${fullTask.id}`);
      toast.success("Task deleted");
      onDeleted?.(fullTask.id);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete task");
    }
  };

  const handleAssigneeChange = async (userId: string) => {
    if (!fullTask) return;
    try {
      const updated = await apiPatch<Task>(`/tasks/${fullTask.id}`, {
        assigneeId: userId === "none" ? null : userId,
        userId: currentUser?.id,
      });
      setFullTask(updated);
      onUpdated?.(updated);
    } catch (err: any) {
      toast.error("Failed to update assignee");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!fullTask) return;
    try {
      const updated = await apiPatch<Task>(`/tasks/${fullTask.id}`, {
        status: newStatus,
        userId: currentUser?.id,
      });
      setFullTask(updated);
      setEditStatus(newStatus);
      onUpdated?.(updated);
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!fullTask) return;
    try {
      const updated = await apiPatch<Task>(`/tasks/${fullTask.id}`, {
        priority: newPriority,
        userId: currentUser?.id,
      });
      setFullTask(updated);
      setEditPriority(newPriority);
      onUpdated?.(updated);
    } catch (err: any) {
      toast.error("Failed to update priority");
    }
  };

  // Subtask handlers
  const addSubtask = async () => {
    if (!fullTask || !newSubtaskTitle.trim()) return;
    setAddingSubtask(true);
    try {
      const sub = await apiPost<Subtask>(`/tasks/${fullTask.id}/subtasks`, { title: newSubtaskTitle.trim() });
      setFullTask({ ...fullTask, subtasks: [...subtasks, sub] });
      setNewSubtaskTitle("");
    } catch (err: any) {
      toast.error("Failed to add subtask");
    } finally {
      setAddingSubtask(false);
    }
  };

  const toggleSubtask = async (subtask: Subtask) => {
    try {
      const updated = await apiPatch<Subtask>(`/tasks/subtasks/${subtask.id}`, {
        isCompleted: !subtask.isCompleted,
      });
      setFullTask({
        ...fullTask!,
        subtasks: subtasks.map((s) => (s.id === updated.id ? updated : s)),
      });
    } catch (err: any) {
      toast.error("Failed to toggle subtask");
    }
  };

  const deleteSubtask = async (subtaskId: string) => {
    try {
      await apiDelete(`/tasks/subtasks/${subtaskId}`);
      setFullTask({
        ...fullTask!,
        subtasks: subtasks.filter((s) => s.id !== subtaskId),
      });
    } catch (err: any) {
      toast.error("Failed to delete subtask");
    }
  };

  // Comment handlers
  const addComment = async () => {
    if (!fullTask || !commentText.trim()) return;
    setSendingComment(true);
    try {
      const comment = await apiPost<TaskComment>(`/tasks/${fullTask.id}/comments`, {
        userId: currentUser?.id,
        text: commentText.trim(),
      });
      setFullTask({ ...fullTask, comments: [...comments, comment] });
      setCommentText("");
    } catch (err: any) {
      toast.error("Failed to add comment");
    } finally {
      setSendingComment(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!fullTask) return;
    try {
      await apiDelete(`/tasks/${fullTask.id}/comments/${commentId}`, {
        body: { userId: currentUser?.id },
      });
      setFullTask({ ...fullTask, comments: comments.filter((c) => c.id !== commentId) });
    } catch (err: any) {
      toast.error("Failed to delete comment");
    }
  };

  // Watch handler
  const isWatching = watchers.some((w) => w.userId === currentUser?.id);
  const toggleWatch = async () => {
    if (!fullTask) return;
    try {
      if (isWatching) {
        await apiDelete(`/task-watchers?taskId=${fullTask.id}&userId=${currentUser?.id}`);
        setFullTask({
          ...fullTask,
          watchers: watchers.filter((w) => w.userId !== currentUser?.id),
        });
      } else {
        const w = await apiPost<TaskWatcher>("/task-watchers", {
          taskId: fullTask.id,
          userId: currentUser?.id,
        });
        setFullTask({ ...fullTask, watchers: [...watchers, w] });
      }
    } catch (err: any) {
      toast.error("Failed to update watch status");
    }
  };

  const tabs: { key: DetailTab; label: string; icon: any; count?: number }[] = [
    { key: "details", label: "Details", icon: Edit3 },
    { key: "subtasks", label: "Subtasks", icon: CheckSquare, count: subtasks.length },
    { key: "comments", label: "Comments", icon: MessageSquare, count: comments.length },
    { key: "activity", label: "Activity", icon: History, count: activities.length },
    { key: "attachments", label: "Files", icon: Paperclip, count: attachments.length },
  ];

  const priorityKey = (fullTask?.priority || "medium") as keyof typeof PRIORITY_CONFIG;
  const statusKey = fullTask?.status || "todo";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : fullTask ? (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-3 space-y-3">
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {editing ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="text-lg font-semibold h-auto py-1"
                        autoFocus
                      />
                    ) : (
                      <DialogTitle className="text-lg font-semibold leading-tight pr-2">
                        {fullTask.title}
                      </DialogTitle>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={isWatching ? "default" : "ghost"}
                          className="h-8 w-8 p-0"
                          onClick={toggleWatch}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isWatching ? "Unwatch" : "Watch"}</TooltipContent>
                    </Tooltip>
                    {editing ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditing(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" className="h-8" onClick={handleSave}>
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditing(true)}>
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Quick status/priority bar */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={statusKey} onValueChange={handleStatusChange}>
                  <SelectTrigger className={cn("h-7 w-auto text-xs font-medium rounded-full border px-3", STATUS_CONFIG[statusKey]?.bgColor)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityKey} onValueChange={handlePriorityChange}>
                  <SelectTrigger className={cn("h-7 w-auto text-xs font-medium rounded-full border px-3", PRIORITY_CONFIG[priorityKey]?.color)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map((p) => (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", PRIORITY_CONFIG[p].dotColor)} />
                          {PRIORITY_CONFIG[p].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fullTask.dueDate && (
                  <Badge variant="outline" className={cn(
                    "text-xs gap-1",
                    new Date(fullTask.dueDate) < new Date() && fullTask.status !== "done"
                      ? "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10"
                      : ""
                  )}>
                    <CalendarIcon className="w-3 h-3" />
                    {formatDate(fullTask.dueDate)}
                  </Badge>
                )}
                {fullTask.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex gap-0.5 border-b border-border/50 -mx-6 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                      activeTab === tab.key
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {/* Details Tab */}
              {activeTab === "details" && (
                <div className="space-y-4 pt-2">
                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                    {editing ? (
                      <Textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="min-h-[100px] resize-none rounded-lg"
                      />
                    ) : (
                      <div className="text-sm text-foreground/80 whitespace-pre-wrap min-h-[40px] p-3 rounded-lg bg-muted/30 border border-border/40">
                        {fullTask.description || "No description"}
                      </div>
                    )}
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Assignee */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" /> Assignee
                      </Label>
                      <Select value={fullTask.assigneeId || "none"} onValueChange={handleAssigneeChange}>
                        <SelectTrigger className="h-9 rounded-lg text-sm">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" /> Due Date
                      </Label>
                      {editing ? (
                        <Input
                          type="datetime-local"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="h-9 rounded-lg text-sm"
                        />
                      ) : (
                        <div className="h-9 flex items-center text-sm text-foreground/80">
                          {fullTask.dueDate ? formatDateTime(fullTask.dueDate) : "No due date"}
                        </div>
                      )}
                    </div>

                    {/* Team */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> Team
                      </Label>
                      <div className="h-9 flex items-center text-sm text-foreground/80">
                        {fullTask.team?.name || "No team"}
                      </div>
                    </div>

                    {/* Reporter */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Reporter</Label>
                      <div className="h-9 flex items-center gap-2 text-sm text-foreground/80">
                        {fullTask.reporter ? (
                          <>
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={fullTask.reporter.avatar || undefined} />
                              <AvatarFallback className="text-[8px]">{getInitials(fullTask.reporter.name)}</AvatarFallback>
                            </Avatar>
                            {fullTask.reporter.name}
                          </>
                        ) : "Unknown"}
                      </div>
                    </div>
                  </div>

                  {/* Watchers */}
                  {watchers.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Watchers ({watchers.length})
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {watchers.map((w) => (
                          <Tooltip key={w.id}>
                            <TooltipTrigger>
                              <Avatar className="h-7 w-7 border-2 border-background">
                                <AvatarImage src={w.user?.avatar || undefined} />
                                <AvatarFallback className="text-[9px]">{getInitials(w.user?.name || "?")}</AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>{w.user?.name}</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subtask progress preview */}
                  {subtasks.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Subtasks ({subtasks.filter((s) => s.isCompleted).length}/{subtasks.length})
                      </Label>
                      <Progress value={subtaskProgress} className="h-2" />
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Created {formatDateTime(fullTask.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Updated {timeAgo(fullTask.updatedAt)}
                    </span>
                    {fullTask.storyPoints != null && (
                      <span>Story Points: {fullTask.storyPoints}</span>
                    )}
                    {fullTask.estimate != null && (
                      <span>Estimate: {fullTask.estimate}h</span>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="pt-2">
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs" onClick={handleDelete}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Task
                    </Button>
                  </div>
                </div>
              )}

              {/* Subtasks Tab */}
              {activeTab === "subtasks" && (
                <div className="space-y-3 pt-2">
                  {subtasks.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {subtasks.filter((s) => s.isCompleted).length}/{subtasks.length} completed
                        </span>
                        <span className="text-xs font-medium">{subtaskProgress}%</span>
                      </div>
                      <Progress value={subtaskProgress} className="h-2" />
                    </div>
                  )}
                  <div className="space-y-1">
                    {subtasks.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 group py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <Checkbox
                          checked={sub.isCompleted}
                          onCheckedChange={() => toggleSubtask(sub)}
                        />
                        <span className={cn("text-sm flex-1", sub.isCompleted && "line-through text-muted-foreground")}>
                          {sub.title}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => deleteSubtask(sub.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Add a subtask..."
                      className="h-9 rounded-lg text-sm flex-1"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                    />
                    <Button size="sm" variant="outline" className="h-9" onClick={addSubtask} disabled={addingSubtask || !newSubtaskTitle.trim()}>
                      {addingSubtask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Comments Tab */}
              {activeTab === "comments" && (
                <div className="space-y-3 pt-2">
                  {comments.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">No comments yet</div>
                  )}
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="flex gap-2.5 group">
                        <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                          <AvatarImage src={c.user?.avatar || undefined} />
                          <AvatarFallback className="text-[9px]">{getInitials(c.user?.name || "?")}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{c.user?.name}</span>
                            <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                            {c.userId === currentUser?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => deleteComment(c.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-foreground/80 mt-0.5 whitespace-pre-wrap">{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="opacity-50" />
                  <div className="flex gap-2">
                    <Input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="h-9 rounded-lg text-sm flex-1"
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                    />
                    <Button size="sm" className="h-9" onClick={addComment} disabled={sendingComment || !commentText.trim()}>
                      {sendingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === "activity" && (
                <div className="space-y-2 pt-2">
                  {activities.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">No activity yet</div>
                  )}
                  {activities.map((a) => (
                    <div key={a.id} className="flex gap-2.5 py-1.5">
                      <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                        <History className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground/80">
                          <span className="font-medium">{a.user?.name || "System"}</span>{" "}
                          <span className="text-muted-foreground">{formatAction(a.action)}</span>
                          {a.oldValue && a.newValue && (
                            <span className="text-muted-foreground">
                              {" "}from <Badge variant="outline" className="text-[10px] px-1 py-0">{a.oldValue}</Badge>{" "}
                              to <Badge variant="outline" className="text-[10px] px-1 py-0">{a.newValue}</Badge>
                            </span>
                          )}
                        </p>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === "attachments" && (
                <div className="space-y-3 pt-2">
                  {attachments.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">No attachments</div>
                  )}
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:border-border/80 transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary transition-colors truncate block">
                          {att.name}
                        </a>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{att.user?.name}</span>
                          {att.size && <span>{(att.size / 1024).toFixed(1)} KB</span>}
                          <span>{timeAgo(att.createdAt)}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          try {
                            await apiDelete(`/tasks/attachments/${att.id}`);
                            setFullTask({
                              ...fullTask,
                              attachments: attachments.filter((a) => a.id !== att.id),
                            });
                          } catch { toast.error("Failed to delete"); }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            Task not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    created: "created this task",
    status_changed: "changed the status",
    assigned: "changed the assignee",
    due_date_changed: "changed the due date",
    priority_changed: "changed the priority",
    comment_added: "added a comment",
    subtask_created: "added a subtask",
    description_changed: "updated the description",
    sprint_changed: "changed the sprint",
    epic_changed: "changed the epic",
    story_points_changed: "changed story points",
  };
  return map[action] || action.replace(/_/g, " ");
}
