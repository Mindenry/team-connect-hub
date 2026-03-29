import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  EyeOff,
  Plus,
  Trash2,
  Send,
  CheckSquare,
  History,
  User,
  Users,
  Tag,
  Loader2,
  X,
  ChevronDown,
  MoreHorizontal,
  Flag,
  Circle,
  CircleDot,
  CircleCheck,
  Search as SearchIcon,
  Zap,
  Link2,
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

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
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

/* ─── Status icon helper ─── */
function StatusIcon({ status, className }: { status: string; className?: string }) {
  if (status === "done") return <CircleCheck className={cn("w-4 h-4 text-emerald-500", className)} />;
  if (status === "in_progress") return <CircleDot className={cn("w-4 h-4 text-primary", className)} />;
  if (status === "review") return <SearchIcon className={cn("w-4 h-4 text-violet-500", className)} />;
  return <Circle className={cn("w-4 h-4 text-muted-foreground", className)} />;
}

/* ─── Sidebar field row ─── */
function SidebarField({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex items-center gap-2 w-[110px] shrink-0 pt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
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

  // Inline editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [editDueDate, setEditDueDate] = useState("");

  // Subtask
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);

  // Comment
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Bottom panel tabs
  const [bottomTab, setBottomTab] = useState<"comments" | "activity">("comments");

  // Users
  const [users, setUsers] = useState<any[]>([]);

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open && taskProp?.id) {
      setLoading(true);
      setEditingTitle(false);
      setEditingDesc(false);
      setEditingDueDate(false);
      setConfirmDelete(false);
      setBottomTab("comments");
      setShowSubtaskInput(false);
      Promise.all([
        apiGet<Task>(`/tasks/${taskProp.id}`),
        apiGet<any[]>("/users").catch(() => []),
      ]).then(([t, u]) => {
        setFullTask(t as Task);
        setUsers(Array.isArray(u) ? u : []);
        if (t) {
          setEditTitle(t.title || "");
          setEditDesc(t.description || "");
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

  const isOverdue = fullTask?.dueDate && new Date(fullTask.dueDate) < new Date() && fullTask.status !== "done";

  /* ─── Handlers ─── */
  const patchTask = async (data: Record<string, any>) => {
    if (!fullTask) return;
    try {
      const updated = await apiPatch<Task>(`/tasks/${fullTask.id}`, { ...data, userId: currentUser?.id });
      setFullTask(updated);
      onUpdated?.(updated);
      return updated;
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const saveTitle = async () => {
    if (!editTitle.trim() || editTitle.trim() === fullTask?.title) {
      setEditingTitle(false);
      return;
    }
    await patchTask({ title: editTitle.trim() });
    setEditingTitle(false);
  };

  const saveDescription = async () => {
    await patchTask({ description: editDesc.trim() || null });
    setEditingDesc(false);
  };

  const saveDueDate = async () => {
    await patchTask({ dueDate: editDueDate ? new Date(editDueDate).toISOString() : null });
    setEditingDueDate(false);
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

  // Subtask handlers
  const addSubtask = async () => {
    if (!fullTask || !newSubtaskTitle.trim()) return;
    setAddingSubtask(true);
    try {
      const sub = await apiPost<Subtask>(`/tasks/${fullTask.id}/subtasks`, { title: newSubtaskTitle.trim() });
      setFullTask({ ...fullTask, subtasks: [...subtasks, sub] });
      setNewSubtaskTitle("");
    } catch { toast.error("Failed to add subtask"); }
    finally { setAddingSubtask(false); }
  };

  const toggleSubtask = async (subtask: Subtask) => {
    try {
      const updated = await apiPatch<Subtask>(`/tasks/subtasks/${subtask.id}`, { isCompleted: !subtask.isCompleted });
      setFullTask({ ...fullTask!, subtasks: subtasks.map((s) => (s.id === updated.id ? updated : s)) });
    } catch { toast.error("Failed to toggle subtask"); }
  };

  const deleteSubtask = async (subtaskId: string) => {
    try {
      await apiDelete(`/tasks/subtasks/${subtaskId}`);
      setFullTask({ ...fullTask!, subtasks: subtasks.filter((s) => s.id !== subtaskId) });
    } catch { toast.error("Failed to delete subtask"); }
  };

  // Comment handlers
  const addComment = async () => {
    if (!fullTask || !commentText.trim()) return;
    setSendingComment(true);
    try {
      const comment = await apiPost<TaskComment>(`/tasks/${fullTask.id}/comments`, { userId: currentUser?.id, text: commentText.trim() });
      setFullTask({ ...fullTask, comments: [...comments, comment] });
      setCommentText("");
    } catch { toast.error("Failed to add comment"); }
    finally { setSendingComment(false); }
  };

  const deleteComment = async (commentId: string) => {
    if (!fullTask) return;
    try {
      await apiDelete(`/tasks/${fullTask.id}/comments/${commentId}`, { body: { userId: currentUser?.id } });
      setFullTask({ ...fullTask, comments: comments.filter((c) => c.id !== commentId) });
    } catch { toast.error("Failed to delete comment"); }
  };

  // Watch handler
  const isWatching = watchers.some((w) => w.userId === currentUser?.id);
  const toggleWatch = async () => {
    if (!fullTask) return;
    try {
      if (isWatching) {
        await apiDelete(`/task-watchers?taskId=${fullTask.id}&userId=${currentUser?.id}`);
        setFullTask({ ...fullTask, watchers: watchers.filter((w) => w.userId !== currentUser?.id) });
      } else {
        const w = await apiPost<TaskWatcher>("/task-watchers", { taskId: fullTask.id, userId: currentUser?.id });
        setFullTask({ ...fullTask, watchers: [...watchers, w] });
      }
    } catch { toast.error("Failed to update watch status"); }
  };

  const priorityKey = (fullTask?.priority || "medium") as keyof typeof PRIORITY_CONFIG;
  const statusKey = fullTask?.status || "todo";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] w-[95vw] rounded-2xl max-h-[92vh] overflow-hidden p-0 gap-0">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : fullTask ? (
          <div className="flex flex-col max-h-[92vh]">
            {/* ═══ TOP BAR ═══ */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-muted/20 shrink-0">
              <div className="flex items-center gap-2.5">
                <StatusIcon status={statusKey} />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                  {fullTask.id.slice(0, 8)}
                </span>
                {fullTask.issueType && fullTask.issueType !== "task" && (
                  <Badge variant="outline" className="text-[10px] capitalize">{fullTask.issueType}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={toggleWatch}>
                      {isWatching ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isWatching ? "Watching" : "Watch"}</TooltipContent>
                </Tooltip>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onOpenChange(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* ═══ MAIN: LEFT + RIGHT ═══ */}
            <div className="flex flex-1 min-h-0">
              {/* ──────── LEFT PANEL: Main Content ──────── */}
              <ScrollArea className="flex-1 min-w-0">
                <div className="p-5 space-y-5">
                  {/* Title (click to edit) */}
                  {editingTitle ? (
                    <div className="space-y-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="text-lg font-bold h-auto py-1.5 border-primary/50"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditTitle(fullTask.title); setEditingTitle(false); } }}
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 text-xs" onClick={saveTitle}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditTitle(fullTask.title); setEditingTitle(false); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <h2
                      className="text-lg font-bold text-foreground leading-tight cursor-pointer hover:text-primary/80 transition-colors rounded-md px-1 -mx-1 py-0.5 hover:bg-primary/5"
                      onClick={() => setEditingTitle(true)}
                    >
                      {fullTask.title}
                    </h2>
                  )}

                  {/* Description (click to edit) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</span>
                    </div>
                    {editingDesc ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="min-h-[120px] resize-y rounded-lg border-primary/50"
                          autoFocus
                          placeholder="Add a description..."
                        />
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-7 text-xs" onClick={saveDescription}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditDesc(fullTask.description || ""); setEditingDesc(false); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "text-sm whitespace-pre-wrap rounded-lg px-3 py-2.5 cursor-pointer transition-colors min-h-[48px]",
                          fullTask.description
                            ? "text-foreground/85 hover:bg-muted/40 border border-transparent hover:border-border/50"
                            : "text-muted-foreground/60 italic hover:bg-muted/30 border border-dashed border-border/40 hover:border-border/60"
                        )}
                        onClick={() => setEditingDesc(true)}
                      >
                        {fullTask.description || "Click to add description..."}
                      </div>
                    )}
                  </div>

                  {/* ─── Subtasks ─── */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Child Issues
                        </span>
                        {subtasks.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {subtasks.filter((s) => s.isCompleted).length} of {subtasks.length} done
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1 text-primary hover:text-primary"
                        onClick={() => setShowSubtaskInput(!showSubtaskInput)}
                      >
                        <Plus className="w-3 h-3" /> Add
                      </Button>
                    </div>

                    {subtasks.length > 0 && (
                      <Progress value={subtaskProgress} className="h-1.5" />
                    )}

                    <div className="space-y-0.5">
                      {subtasks.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2.5 group py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                          <Checkbox
                            checked={sub.isCompleted}
                            onCheckedChange={() => toggleSubtask(sub)}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <span className={cn("text-sm flex-1 leading-snug", sub.isCompleted && "line-through text-muted-foreground")}>
                            {sub.title}
                          </span>
                          <Button
                            size="sm" variant="ghost"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={() => deleteSubtask(sub.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {showSubtaskInput && (
                      <div className="flex gap-2 pl-2">
                        <Input
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          placeholder="What needs to be done?"
                          className="h-8 rounded-lg text-sm flex-1"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } if (e.key === "Escape") setShowSubtaskInput(false); }}
                        />
                        <Button size="sm" className="h-8" onClick={addSubtask} disabled={addingSubtask || !newSubtaskTitle.trim()}>
                          {addingSubtask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* ─── Attachments ─── */}
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Attachments ({attachments.length})
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-2.5 p-2 rounded-lg border border-border/50 hover:border-border/80 transition-colors group text-sm">
                            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                              <Paperclip className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:text-primary transition-colors truncate block">{att.name}</a>
                              <span className="text-[10px] text-muted-foreground">{att.size ? `${(att.size / 1024).toFixed(0)} KB` : ""}</span>
                            </div>
                            <Button
                              size="sm" variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                              onClick={async () => {
                                try {
                                  await apiDelete(`/tasks/attachments/${att.id}`);
                                  setFullTask({ ...fullTask, attachments: attachments.filter((a) => a.id !== att.id) });
                                } catch { toast.error("Failed to delete"); }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ─── Comments / Activity Tabs ─── */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-4 border-b border-border/50">
                      <button
                        onClick={() => setBottomTab("comments")}
                        className={cn(
                          "flex items-center gap-1.5 pb-2.5 text-xs font-semibold border-b-2 transition-colors",
                          bottomTab === "comments" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Comments
                        {comments.length > 0 && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{comments.length}</span>}
                      </button>
                      <button
                        onClick={() => setBottomTab("activity")}
                        className={cn(
                          "flex items-center gap-1.5 pb-2.5 text-xs font-semibold border-b-2 transition-colors",
                          bottomTab === "activity" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <History className="w-3.5 h-3.5" />
                        Activity
                        {activities.length > 0 && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{activities.length}</span>}
                      </button>
                    </div>

                    {bottomTab === "comments" && (
                      <div className="space-y-3">
                        {/* Comment input at top (like Jira) */}
                        <div className="flex gap-2.5">
                          <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                            <AvatarImage src={currentUser?.avatar || undefined} />
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">
                              {getInitials(currentUser?.name || "?")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <Textarea
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="Add a comment..."
                              className="min-h-[60px] resize-none rounded-lg text-sm border-border/60 focus:border-primary/50"
                              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addComment(); } }}
                            />
                            {commentText.trim() && (
                              <div className="flex items-center gap-2">
                                <Button size="sm" className="h-7 text-xs gap-1" onClick={addComment} disabled={sendingComment}>
                                  {sendingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                  Save
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCommentText("")}>Cancel</Button>
                                <span className="text-[10px] text-muted-foreground ml-auto">Ctrl+Enter to save</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Comment list */}
                        {comments.length > 0 && (
                          <div className="space-y-3 pt-1">
                            {[...comments].reverse().map((c) => (
                              <div key={c.id} className="flex gap-2.5 group">
                                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                                  <AvatarImage src={c.user?.avatar || undefined} />
                                  <AvatarFallback className="text-[9px] bg-muted">{getInitials(c.user?.name || "?")}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-semibold">{c.user?.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                                    {c.userId === currentUser?.id && (
                                      <Button
                                        size="sm" variant="ghost"
                                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                        onClick={() => deleteComment(c.id)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed bg-muted/20 rounded-lg px-3 py-2 border border-border/30">
                                    {c.text}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {bottomTab === "activity" && (
                      <div className="space-y-1 relative">
                        {activities.length === 0 && (
                          <div className="text-center py-6 text-xs text-muted-foreground">No activity yet</div>
                        )}
                        {/* Timeline line */}
                        {activities.length > 0 && (
                          <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border/50" />
                        )}
                        {[...activities].reverse().map((a) => (
                          <div key={a.id} className="flex gap-3 py-1.5 relative">
                            <div className="w-[26px] h-[26px] rounded-full bg-muted/60 border border-border/50 flex items-center justify-center shrink-0 z-10">
                              <History className="w-3 h-3 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p className="text-xs text-foreground/80 leading-relaxed">
                                <span className="font-semibold">{a.user?.name || "System"}</span>{" "}
                                <span className="text-muted-foreground">{formatAction(a.action)}</span>
                                {a.oldValue && a.newValue && (
                                  <>
                                    {" "}<span className="line-through text-muted-foreground/60 text-[11px]">{a.oldValue}</span>
                                    {" → "}<span className="font-medium text-foreground text-[11px]">{a.newValue}</span>
                                  </>
                                )}
                              </p>
                              <span className="text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* ──────── RIGHT PANEL: Sidebar ──────── */}
              <div className="w-[260px] border-l border-border/50 bg-muted/10 shrink-0 hidden md:flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-0.5">
                    {/* Status */}
                    <SidebarField label="Status" icon={CircleDot}>
                      <Select value={statusKey} onValueChange={(v) => patchTask({ status: v })}>
                        <SelectTrigger className={cn(
                          "h-8 w-full text-xs font-semibold rounded-md border",
                          statusKey === "todo" ? "bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-300" :
                          statusKey === "in_progress" ? "bg-primary/10 border-primary/20 text-primary" :
                          statusKey === "review" ? "bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-300" :
                          "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              <span className="flex items-center gap-2">
                                <StatusIcon status={s} className="w-3.5 h-3.5" />
                                {STATUS_CONFIG[s].label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </SidebarField>

                    {/* Priority */}
                    <SidebarField label="Priority" icon={Flag}>
                      <Select value={priorityKey} onValueChange={(v) => patchTask({ priority: v })}>
                        <SelectTrigger className={cn(
                          "h-8 w-full text-xs font-semibold rounded-md border",
                          PRIORITY_CONFIG[priorityKey]?.color
                        )}>
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
                    </SidebarField>

                    {/* Assignee */}
                    <SidebarField label="Assignee" icon={User}>
                      <Select value={fullTask.assigneeId || "none"} onValueChange={(v) => patchTask({ assigneeId: v === "none" ? null : v })}>
                        <SelectTrigger className="h-8 w-full text-xs rounded-md">
                          {fullTask.assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={fullTask.assignee.avatar || undefined} />
                                <AvatarFallback className="text-[8px]">{getInitials(fullTask.assignee.name)}</AvatarFallback>
                              </Avatar>
                              <span className="truncate">{fullTask.assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              <span className="flex items-center gap-2">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={u.avatar} />
                                  <AvatarFallback className="text-[7px]">{getInitials(u.name)}</AvatarFallback>
                                </Avatar>
                                {u.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </SidebarField>

                    {/* Reporter */}
                    <SidebarField label="Reporter" icon={User}>
                      <div className="flex items-center gap-2 h-8 text-xs">
                        {fullTask.reporter ? (
                          <>
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={fullTask.reporter.avatar || undefined} />
                              <AvatarFallback className="text-[8px]">{getInitials(fullTask.reporter.name)}</AvatarFallback>
                            </Avatar>
                            <span>{fullTask.reporter.name}</span>
                          </>
                        ) : <span className="text-muted-foreground">None</span>}
                      </div>
                    </SidebarField>

                    {/* Due Date */}
                    <SidebarField label="Due Date" icon={CalendarIcon}>
                      {editingDueDate ? (
                        <div className="space-y-1.5">
                          <Input
                            type="datetime-local"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="h-8 text-xs rounded-md"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <Button size="sm" className="h-6 text-[10px]" onClick={saveDueDate}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingDueDate(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className={cn(
                            "text-xs h-8 flex items-center gap-1.5 hover:text-primary transition-colors w-full text-left",
                            isOverdue ? "text-destructive font-semibold" : fullTask.dueDate ? "text-foreground" : "text-muted-foreground"
                          )}
                          onClick={() => setEditingDueDate(true)}
                        >
                          {fullTask.dueDate ? (
                            <>
                              {formatDate(fullTask.dueDate)}
                              {isOverdue && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 ml-1">Overdue</Badge>}
                            </>
                          ) : "Set due date"}
                        </button>
                      )}
                    </SidebarField>

                    {/* Team */}
                    <SidebarField label="Team" icon={Users}>
                      <div className="flex items-center gap-2 h-8 text-xs">
                        {fullTask.team ? (
                          <span className="font-medium">{fullTask.team.name}</span>
                        ) : <span className="text-muted-foreground">No team</span>}
                      </div>
                    </SidebarField>

                    {/* Tags */}
                    <SidebarField label="Labels" icon={Tag}>
                      <div className="flex flex-wrap gap-1 min-h-[32px] items-center">
                        {(fullTask.tags?.length ?? 0) > 0 ? fullTask.tags!.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] h-5">{tag}</Badge>
                        )) : <span className="text-xs text-muted-foreground">None</span>}
                      </div>
                    </SidebarField>

                    {/* Story Points / Estimate */}
                    {(fullTask.storyPoints != null || fullTask.estimate != null) && (
                      <>
                        {fullTask.storyPoints != null && (
                          <SidebarField label="Story Points" icon={Zap}>
                            <span className="text-xs font-semibold h-8 flex items-center">{fullTask.storyPoints}</span>
                          </SidebarField>
                        )}
                        {fullTask.estimate != null && (
                          <SidebarField label="Estimate" icon={Clock}>
                            <span className="text-xs h-8 flex items-center">{fullTask.estimate}h</span>
                          </SidebarField>
                        )}
                      </>
                    )}

                    {/* Watchers */}
                    <SidebarField label="Watchers" icon={Eye}>
                      <div className="flex items-center gap-1.5 min-h-[32px] flex-wrap">
                        {watchers.length > 0 ? watchers.map((w) => (
                          <Tooltip key={w.id}>
                            <TooltipTrigger>
                              <Avatar className="h-6 w-6 border border-background">
                                <AvatarImage src={w.user?.avatar || undefined} />
                                <AvatarFallback className="text-[8px]">{getInitials(w.user?.name || "?")}</AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>{w.user?.name}</TooltipContent>
                          </Tooltip>
                        )) : <span className="text-xs text-muted-foreground">No watchers</span>}
                      </div>
                    </SidebarField>

                    {/* Timestamps */}
                    <div className="pt-3 mt-3 border-t border-border/40 space-y-1.5">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Created {formatDateTime(fullTask.createdAt)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Updated {timeAgo(fullTask.updatedAt)}
                      </div>
                    </div>

                    {/* Delete */}
                    <div className="pt-3 mt-3 border-t border-border/40">
                      {confirmDelete ? (
                        <div className="space-y-2">
                          <p className="text-xs text-destructive font-medium">Delete this task permanently?</p>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleDelete}>
                              <Trash2 className="w-3 h-3 mr-1" /> Delete
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full justify-start h-8"
                          onClick={() => setConfirmDelete(true)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete task
                        </Button>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            Task not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
