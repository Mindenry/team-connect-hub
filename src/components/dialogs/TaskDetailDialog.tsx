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

function formatFullDateTime(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear() + 543;
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${h}:${m}:${s}`;
}

function formatDateInput(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
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
        const newWatcher = { ...w, user: { id: currentUser!.id, name: currentUser!.name, avatar: currentUser!.avatar } };
        setFullTask({ ...fullTask, watchers: [...watchers, newWatcher] });
      }
    } catch { toast.error("Failed to update watch status"); }
  };

  const priorityKey = (fullTask?.priority || "medium") as keyof typeof PRIORITY_CONFIG;
  const statusKey = fullTask?.status || "todo";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-[95vw] rounded-2xl max-h-[92vh] overflow-hidden p-0 gap-0">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : fullTask ? (
          <div className="flex flex-col max-h-[92vh]">
            {/* ═══ TOP BAR ═══ */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-muted/10 shrink-0 pr-12">
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-muted-foreground">กำลังดู:</span>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={currentUser?.avatar || undefined} />
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">{getInitials(currentUser?.name || "?")}</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{subtasks.filter(s => s.isCompleted).length}/{subtasks.length} subtasks</span>
                </div>
              </div>
            </div>

            {/* ═══ TITLE + STATUS + BREADCRUMB ═══ */}
            <div className="px-5 pt-4 pb-3 border-b border-border/30 shrink-0">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <CheckSquare className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  {editingTitle ? (
                    <div className="space-y-2 flex-1">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-lg font-bold h-auto py-1 border-primary/50" autoFocus onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditTitle(fullTask.title); setEditingTitle(false); } }} />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 text-xs" onClick={saveTitle}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditTitle(fullTask.title); setEditingTitle(false); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <h2 className="text-lg font-bold text-foreground leading-tight cursor-pointer hover:text-primary/80 transition-colors" onClick={() => setEditingTitle(true)}>
                      {fullTask.title}
                    </h2>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn("w-2.5 h-2.5 rounded-full", STATUS_CONFIG[statusKey]?.dotColor || "bg-slate-400")} />
                  <span className="text-sm font-medium">{STATUS_CONFIG[statusKey]?.label || statusKey}</span>
                </div>
              </div>
              <div className="flex items-center justify-end w-full">
                {PRIORITY_CONFIG[priorityKey] && (
                  <Badge className={cn("text-[11px] font-medium", PRIORITY_CONFIG[priorityKey].color)}>
                    ↑ {PRIORITY_CONFIG[priorityKey].label} priority
                  </Badge>
                )}
              </div>
            </div>

            {/* ═══ MAIN: LEFT + RIGHT ═══ */}
            <div className="flex flex-1 min-h-0">
              {/* ──────── LEFT PANEL ──────── */}
              <ScrollArea className="flex-1 min-w-0">
                <div className="p-5 space-y-6">
                  {/* ─── Description ─── */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</span>
                    </div>
                    {editingDesc ? (
                      <div className="space-y-2">
                        <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="min-h-[120px] resize-y rounded-lg border-primary/50" autoFocus placeholder="Add a description..." />
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-7 text-xs" onClick={saveDescription}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditDesc(fullTask.description || ""); setEditingDesc(false); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 group cursor-pointer" onClick={() => setEditingDesc(true)}>
                        <div className={cn(
                          "text-sm whitespace-pre-wrap rounded-lg px-3 py-2.5 flex-1 transition-colors min-h-[48px] border",
                          fullTask.description
                            ? "text-foreground/85 border-border/30 hover:border-border/60"
                            : "text-muted-foreground/60 italic border-dashed border-border/40 hover:border-border/60"
                        )}>
                          {fullTask.description || "Click to add description..."}
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* ─── Subtasks ─── */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Subtasks
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {subtasks.filter((s) => s.isCompleted).length}/{subtasks.length} done
                        </span>
                      </div>
                    </div>

                    {subtasks.length === 0 && (
                      <p className="text-xs text-muted-foreground italic pl-1">ยังไม่มี subtask แยกงานออกเป็น step เล็กๆ เพื่อให้ track progress ได้ชัดเจน</p>
                    )}

                    {subtasks.length > 0 && (
                      <Progress value={subtaskProgress} className="h-1.5" />
                    )}

                    <div className="space-y-0.5">
                      {subtasks.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2.5 group py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                          <Checkbox checked={sub.isCompleted} onCheckedChange={() => toggleSubtask(sub)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                          <span className={cn("text-sm flex-1 leading-snug", sub.isCompleted && "line-through text-muted-foreground")}>{sub.title}</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => deleteSubtask(sub.id)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="เพิ่ม subtask ใหม่..."
                        className="h-9 rounded-lg text-sm flex-1 border-border/50"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                      />
                      <Button size="sm" className="h-9 gap-1 px-4" onClick={addSubtask} disabled={addingSubtask || !newSubtaskTitle.trim()}>
                        {addingSubtask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5" /> เพิ่ม</>}
                      </Button>
                    </div>
                  </div>

                  {/* ─── Attachments ─── */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attachments</span>
                    </div>
                    <p className="text-xs text-muted-foreground">รองรับรูปภาพ, PDF, เอกสารทั่วไป (สูงสุด 50MB) — ชื่อไฟล์ภาษาไทยได้</p>
                    {attachments.length > 0 && (
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
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={async () => { try { await apiDelete(`/tasks/attachments/${att.id}`); setFullTask({ ...fullTask!, attachments: attachments.filter((a) => a.id !== att.id) }); } catch { toast.error("Failed to delete"); } }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-border/50 rounded-lg text-xs text-muted-foreground hover:border-border/80 cursor-pointer transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      Upload file
                    </div>
                  </div>



                  {/* ─── Comments ─── */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comments</span>
                      {comments.length > 0 && <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded-full font-medium">{comments.length}</span>}
                    </div>

                    {comments.length > 0 && (
                      <div className="space-y-4">
                        {[...comments].reverse().map((c) => (
                          <div key={c.id} className="flex gap-2.5 group">
                            <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                              <AvatarImage src={c.user?.avatar || undefined} />
                              <AvatarFallback className="text-[9px] font-semibold">{getInitials(c.user?.name || "?")}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold">{c.user?.name}</span>
                                {c.userId === currentUser?.id && (
                                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => deleteComment(c.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                              <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed pl-0.5">{c.text}</p>
                              <span className="text-[11px] text-muted-foreground mt-1 block">{formatFullDateTime(c.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 items-end">
                      <Input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="เขียน comment เพื่อถาม/อัปเดตทีม..."
                        className="h-9 rounded-lg text-sm flex-1 border-border/50"
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                      />
                      <Button size="sm" className="h-9 w-9 p-0 rounded-full" onClick={addComment} disabled={sendingComment || !commentText.trim()}>
                        {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>


                  {/* ─── Activity ─── */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity</span>
                      {activities.length > 0 && <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded-full font-medium">{activities.length}</span>}
                    </div>
                    {activities.length === 0 && <div className="text-center py-4 text-xs text-muted-foreground">No activity yet</div>}
                    {activities.length > 0 && (
                      <div className="space-y-1 relative">
                        <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border/50" />
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
                                  <> <span className="line-through text-muted-foreground/60 text-[11px]">{a.oldValue}</span>{" → "}<span className="font-medium text-foreground text-[11px]">{a.newValue}</span></>
                                )}
                              </p>
                              <span className="text-[10px] text-muted-foreground">{formatFullDateTime(a.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* ──────── RIGHT PANEL: Sidebar ──────── */}
              <div className="w-[320px] border-l border-border/50 bg-muted/5 shrink-0 hidden md:flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-5">
                    {/* TASK SUMMARY Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Task Summary</span>
                    </div>

                    {/* Assignee */}
                    <SidebarField label="Assignee" icon={User}>
                      <Select value={fullTask.assigneeId || "none"} onValueChange={(v) => patchTask({ assigneeId: v === "none" ? null : v })}>
                        <SelectTrigger className="h-8 w-full text-xs rounded-md">
                          {fullTask.assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5"><AvatarImage src={fullTask.assignee.avatar || undefined} /><AvatarFallback className="text-[8px]">{getInitials(fullTask.assignee.name)}</AvatarFallback></Avatar>
                              <span className="truncate">{fullTask.assignee.name}</span>
                            </div>
                          ) : <span className="text-muted-foreground">Unassigned</span>}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}><span className="flex items-center gap-2"><Avatar className="h-4 w-4"><AvatarImage src={u.avatar} /><AvatarFallback className="text-[7px]">{getInitials(u.name)}</AvatarFallback></Avatar>{u.name}</span></SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </SidebarField>

                    {/* Recurring Task */}
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Recurring Task</span>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={fullTask.isRecurring || false} onCheckedChange={(v) => patchTask({ isRecurring: !!v })} />
                        <span className="text-xs">Enable recurring</span>
                      </div>
                    </div>

                    {/* Status */}
                    <SidebarField label="Status" icon={CircleDot}>
                      <Select value={statusKey} onValueChange={(v) => patchTask({ status: v })}>
                        <SelectTrigger className={cn("h-8 w-full text-xs font-semibold rounded-md border", statusKey === "todo" ? "bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-300" : statusKey === "in_progress" ? "bg-primary/10 border-primary/20 text-primary" : statusKey === "review" ? "bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-300" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_STATUSES.map((s) => (<SelectItem key={s} value={s}><span className="flex items-center gap-2"><StatusIcon status={s} className="w-3.5 h-3.5" />{STATUS_CONFIG[s].label}</span></SelectItem>))}
                        </SelectContent>
                      </Select>
                    </SidebarField>

                    {/* Priority */}
                    <SidebarField label="Priority" icon={Flag}>
                      <Select value={priorityKey} onValueChange={(v) => patchTask({ priority: v })}>
                        <SelectTrigger className={cn("h-8 w-full text-xs font-semibold rounded-md border", PRIORITY_CONFIG[priorityKey]?.color)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map((p) => (<SelectItem key={p} value={p}><span className="flex items-center gap-2"><span className={cn("w-2 h-2 rounded-full", PRIORITY_CONFIG[p].dotColor)} />{PRIORITY_CONFIG[p].label}</span></SelectItem>))}
                        </SelectContent>
                      </Select>
                    </SidebarField>


                    {/* Due Date */}
                    <SidebarField label="Due date" icon={CalendarIcon}>
                      {editingDueDate ? (
                        <div className="space-y-1.5">
                          <Input type="date" value={editDueDate ? editDueDate.slice(0, 10) : ""} onChange={(e) => setEditDueDate(e.target.value)} className="h-8 text-xs rounded-md" autoFocus />
                          <div className="flex gap-1">
                            <Button size="sm" className="h-6 text-[10px]" onClick={saveDueDate}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingDueDate(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <button className={cn("text-xs h-8 flex items-center gap-1.5 hover:text-primary transition-colors w-full text-left", isOverdue ? "text-destructive font-semibold" : fullTask.dueDate ? "text-foreground" : "text-muted-foreground")} onClick={() => setEditingDueDate(true)}>
                          {fullTask.dueDate ? (<>{formatDateInput(fullTask.dueDate)} {isOverdue && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 ml-1">Overdue</Badge>}</>) : "Set due date"}
                          <CalendarIcon className="w-3 h-3 ml-auto text-muted-foreground" />
                        </button>
                      )}
                    </SidebarField>


                    {/* Tags */}
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Tags</span>
                      <div className="flex flex-wrap gap-1">
                        {(fullTask.tags?.length ?? 0) > 0 ? fullTask.tags!.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[11px] h-6 rounded-md">{tag}</Badge>
                        )) : <span className="text-xs text-muted-foreground">None</span>}
                      </div>
                    </div>


                    {/* Watchers */}
                    <div className="rounded-lg border border-border/50 p-3 space-y-2 bg-background">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Watchers</span>
                          <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded-full font-medium">{watchers.length}</span>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={toggleWatch}>
                          <Eye className="w-3 h-3" /> {isWatching ? "Watching" : "Watch"}
                        </Button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {watchers.length > 0 ? watchers.map((w) => (
                          <Tooltip key={w.id}><TooltipTrigger><Avatar className="h-6 w-6 border border-background"><AvatarImage src={w.user?.avatar || undefined} /><AvatarFallback className="text-[8px]">{getInitials(w.user?.name || "?")}</AvatarFallback></Avatar></TooltipTrigger><TooltipContent>{w.user?.name}</TooltipContent></Tooltip>
                        )) : <span className="text-xs text-muted-foreground">No watchers</span>}
                      </div>
                    </div>

                    {/* Activity (right sidebar) */}
                    <div className="rounded-lg border border-border/50 p-3 space-y-2 bg-background">
                      <div className="flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Activity</span>
                      </div>
                      {activities.length > 0 ? (
                        <div className="space-y-2">
                          {[...activities].reverse().slice(0, 5).map((a) => (
                            <div key={a.id} className="flex items-start gap-2">
                              <Avatar className="h-6 w-6 shrink-0 mt-0.5"><AvatarFallback className="text-[8px]">{getInitials(a.user?.name || "?")}</AvatarFallback></Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs"><span className="font-semibold">{a.user?.name || "System"}</span> {formatAction(a.action)}</p>
                                <span className="text-[10px] text-muted-foreground">{formatFullDateTime(a.createdAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">No activity yet</span>}
                    </div>

                    {/* Reporter */}
                    <div className="rounded-lg border border-border/50 p-3 space-y-2 bg-background">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reporter</span>
                      <div className="flex items-center gap-2">
                        {fullTask.reporter ? (
                          <>
                            <Avatar className="h-7 w-7"><AvatarImage src={fullTask.reporter.avatar || undefined} /><AvatarFallback className="text-[8px]">{getInitials(fullTask.reporter.name)}</AvatarFallback></Avatar>
                            <span className="text-sm font-medium">{fullTask.reporter.name}</span>
                          </>
                        ) : <span className="text-xs text-muted-foreground">None</span>}
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-destructive uppercase tracking-wider">Danger Zone</span>
                      {confirmDelete ? (
                        <div className="space-y-2">
                          <p className="text-xs text-destructive font-medium">Delete this task permanently?</p>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleDelete}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 w-full justify-center h-9 gap-1.5" onClick={() => setConfirmDelete(true)}>
                          <Trash2 className="w-3.5 h-3.5" /> Delete task
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
