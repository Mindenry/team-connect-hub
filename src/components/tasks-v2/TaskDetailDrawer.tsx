import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
  ChevronRight,
  Clock,
  FileText,
  Sparkles,
  GripVertical,
  Archive,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
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

/* ════════════════════════════════════════════════════════════════════════════
   TASK DETAIL DRAWER - Premium Professional Design (Linear/Notion-inspired)
   ════════════════════════════════════════════════════════════════════════════ */

interface TaskDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskCardData | null;
  onTaskDeleted?: (taskId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; bg: string; icon: any }> = {
  todo:        { label: "Open",        color: "text-muted-foreground",   dot: "bg-muted-foreground",   bg: "bg-muted/50",    icon: CheckSquare },
  in_progress: { label: "In Progress", color: "text-primary",             dot: "bg-primary",           bg: "bg-primary/10", icon: Clock },
  in_review:   { label: "In Review",   color: "text-primary",             dot: "bg-primary",           bg: "bg-primary/10", icon: Eye },
  done:        { label: "Done",        color: "text-primary",             dot: "bg-primary",            bg: "bg-primary/10", icon: Check },
  canceled:    { label: "Canceled",    color: "text-muted-foreground",   dot: "bg-muted-foreground/50",   bg: "bg-muted/30",    icon: Archive },
};

const PRIORITY_CONFIG: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  urgent: { label: "Urgent", Icon: ArrowUp,    color: "text-destructive",    bg: "bg-destructive/10" },
  high:   { label: "High",   Icon: ChevronUp,  color: "text-primary", bg: "bg-primary/10" },
  medium: { label: "Medium", Icon: Minus,      color: "text-muted-foreground", bg: "bg-muted/50" },
  low:    { label: "Low",    Icon: ChevronDown,color: "text-muted-foreground",  bg: "bg-muted/30" },
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

/* ─── Collapsible Section Component ─── */
function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  rightElement,
}: { 
  title: string; 
  icon?: any; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  rightElement?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-1 hover:bg-muted/20 transition-colors rounded-lg group"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground/70" />}
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {rightElement}
          <ChevronRight className={cn(
            "w-4 h-4 text-muted-foreground/50 transition-transform duration-200",
            isOpen && "rotate-90"
          )} />
        </div>
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-out",
        isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="pb-4 px-1">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── Property Field Component ─── */
function PropertyField({ 
  label, 
  icon: Icon, 
  children,
  highlight,
}: { 
  label: string; 
  icon?: any; 
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "group flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors",
      "hover:bg-muted/30",
      highlight && "bg-red-50/50 dark:bg-red-950/20"
    )}>
      <div className="flex items-center gap-2 w-24 shrink-0 pt-0.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />}
        <span className="text-xs font-medium text-muted-foreground/80">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

/* ─── Visual Status Selector ─── */
function StatusSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const current = STATUS_CONFIG[value] || STATUS_CONFIG.todo;
  const StatusIcon = current.icon;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
          "hover:shadow-md active:scale-[0.98]",
          current.bg, current.color
        )}
      >
        <StatusIcon className="w-4 h-4" />
        <span>{current.label}</span>
        <ChevronRight className={cn("w-3.5 h-3.5 ml-1 transition-transform", isOpen && "rotate-90")} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border/50 rounded-xl shadow-xl p-1 min-w-[160px] animate-in fade-in-0 zoom-in-95">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  onClick={() => { onChange(key); setIsOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    "hover:bg-muted/50",
                    value === key && "bg-muted/30"
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className={cfg.color}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Visual Priority Selector ─── */
function PrioritySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const current = PRIORITY_CONFIG[value] || PRIORITY_CONFIG.medium;
  const PriorityIcon = current.Icon;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
          "hover:shadow-md active:scale-[0.98]",
          current.bg, current.color
        )}
      >
        <PriorityIcon className="w-4 h-4" />
        <span>{current.label}</span>
        <ChevronRight className={cn("w-3.5 h-3.5 ml-1 transition-transform", isOpen && "rotate-90")} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border/50 rounded-xl shadow-xl p-1 min-w-[160px] animate-in fade-in-0 zoom-in-95">
            {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.Icon;
              return (
                <button
                  key={key}
                  onClick={() => { onChange(key); setIsOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    "hover:bg-muted/50",
                    value === key && "bg-muted/30"
                  )}
                >
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                  <span className={cfg.color}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
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
  const StatusIcon = status.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "sm:max-w-3xl md:max-w-4xl lg:max-w-5xl",
          "max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden",
          "border-border/60 bg-background",
          "shadow-xl"
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{displayTask?.title || "Task Detail"}</DialogTitle>
        </DialogHeader>

        {/* ═══════════════════════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════════════════════ */}
        <div className="relative shrink-0 border-b border-border/60">
          
          {/* Header content */}
          <div className="px-5 pt-4 pb-3">
            {/* Top row: ID + Actions */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {/* Task ID Badge */}
                <button
                  onClick={copyTaskId}
                  className="group flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 transition-colors hover:bg-muted"
                >
                  <span className="font-mono text-xs font-semibold text-muted-foreground group-hover:text-foreground">
                    {task.id.slice(0, 8).toUpperCase()}
                  </span>
                  <Copy className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </button>
                
                {saving && (
                  <span className="flex items-center gap-1.5 text-[11px] text-primary animate-pulse">
                    <Sparkles className="w-3 h-3" />
                    Saving...
                  </span>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleWatching}
                  disabled={togglingWatch}
                    className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    isWatching 
                      ? "border-foreground/30 bg-foreground/5 text-foreground" 
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {isWatching ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isWatching ? "Watching" : "Watch"}</span>
                </button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-md p-2 transition-colors hover:bg-muted/50">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl">
                    <DropdownMenuItem onClick={copyTaskId} className="gap-2">
                      <Copy className="w-4 h-4" />
                      Copy task ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={deleteTask} 
                      disabled={deletingTask}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <button 
                  onClick={() => onOpenChange(false)}
                  className="ml-1 rounded-md p-2 transition-colors hover:bg-muted/50"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            
            {/* Status + Priority Row */}
            <div className="flex items-center gap-2 mb-3">
              <StatusSelector 
                value={displayTask?.status || "todo"} 
                onChange={(v) => handleUpdateField("status", v)} 
              />
              <PrioritySelector 
                value={displayTask?.priority || "medium"} 
                onChange={(v) => handleUpdateField("priority", v)} 
              />
              {isOverdue && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Overdue
                </span>
              )}
            </div>
            
            {/* Title - Editable */}
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
                  className="text-xl font-bold h-auto py-2 px-3 leading-tight border-primary/50 bg-muted/30"
                />
                <Button size="sm" onClick={saveTitle} className="mt-1 shrink-0 h-9 px-3">
                  <Check className="w-4 h-4 mr-1" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)} className="mt-1 shrink-0 h-9">
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="group cursor-text" onClick={() => { setTitleDraft(displayTask?.title || ""); setEditingTitle(true); }}>
                <h1 className="text-xl font-bold leading-tight text-foreground group-hover:text-primary/80 transition-colors">
                  {displayTask?.title || "Untitled Task"}
                </h1>
                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Click to edit</span>
                </div>
              </div>
            )}
            
            {/* Tags */}
            {displayTask?.tags && displayTask.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {displayTask.tags.map((tag: string) => (
                  <span 
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="grid h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Left: Main content */}
            <ScrollArea className="h-full">
              <div className="space-y-1 px-5 py-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <div className="absolute inset-0 w-10 h-10 border-2 border-transparent border-t-primary/40 rounded-full animate-spin animate-reverse" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">Loading task details...</p>
                  </div>
                ) : (
                  <>
                {/* ─── DESCRIPTION SECTION ─── */}
                <CollapsibleSection 
                  title="Description" 
                  icon={FileText}
                  rightElement={
                    displayTask?.description && (
                      <span className="text-[10px] text-muted-foreground/50">
                        {displayTask.description.length} chars
                      </span>
                    )
                  }
                >
                  <div className="relative rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
                    <Textarea
                      value={displayTask?.description || ""}
                      onChange={(e) => setTaskData((prev: any) => ({ ...prev, description: e.target.value }))}
                      onBlur={() => handleUpdateField("description", displayTask?.description)}
                      placeholder="Add a detailed description...

Use this space to describe:
• What needs to be done
• Acceptance criteria
• Links to related resources"
                      className="min-h-32 resize-y border-0 bg-transparent p-4 text-sm leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
                    />
                    {!displayTask?.description && (
                      <div className="absolute bottom-3 right-3">
                        <Sparkles className="w-4 h-4 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                {/* ─── SUBTASKS SECTION ─── */}
                <CollapsibleSection 
                  title="Subtasks" 
                  icon={CheckSquare}
                  rightElement={
                    subtasks.length > 0 && (
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        subtaskProgress === 100 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {completedSubtasks}/{subtasks.length}
                      </span>
                    )
                  }
                >
                  {subtasks.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 h-2 bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700 ease-out",
                              subtaskProgress === 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-primary/60 to-primary"
                            )}
                            style={{ width: `${subtaskProgress}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-muted-foreground min-w-[40px] text-right">
                          {Math.round(subtaskProgress)}%
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1.5 mb-4">
                    {subtasks.map((s: any, index: number) => (
                      <div
                        key={s.id}
                        className={cn(
                          "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                          "border border-transparent",
                          s.isCompleted 
                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30"
                            : "hover:bg-muted/30 hover:border-border/40"
                        )}
                      >
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={!!s.isCompleted}
                            onChange={() => toggleSubtask(s.id, !!s.isCompleted)}
                            className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                          />
                        </div>
                        <span className={cn(
                          "text-sm flex-1 leading-snug transition-all",
                          s.isCompleted && "line-through text-muted-foreground"
                        )}>
                          {s.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          #{index + 1}
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
                      className="h-9 text-sm bg-muted/20 border-border/40 focus:border-primary/50"
                    />
                    <Button
                      size="sm"
                      onClick={addSubtask}
                      disabled={addingSubtask || !newSubtask.trim()}
                      className="h-9 px-4 bg-primary/90 hover:bg-primary"
                    >
                      {addingSubtask ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CollapsibleSection>

                {/* ─── ATTACHMENTS SECTION ─── */}
                {attachments.length > 0 && (
                  <CollapsibleSection 
                    title="Attachments" 
                    icon={Paperclip}
                    rightElement={
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {attachments.length}
                      </span>
                    }
                  >
                    <div className="grid grid-cols-2 gap-2">
                      {attachments.map((a: any) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/40 hover:border-border hover:bg-muted/30 transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                            <Paperclip className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="truncate flex-1 text-sm">{a.name}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </a>
                      ))}
                    </div>
                  </CollapsibleSection>
                )}

                {/* ─── COMMENTS & ACTIVITY SECTION ─── */}
                <CollapsibleSection title="Discussion" icon={MessageSquare} defaultOpen={true}>
                  {/* Tab switcher */}
                  <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg mb-4">
                    {(["comments", "activity"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab === "comments" ? "overview" : "activity")}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                          (tab === "comments" ? activeTab === "overview" : activeTab === "activity")
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {tab === "comments" ? (
                          <>
                            <MessageSquare className="w-3.5 h-3.5" />
                            Comments
                            {comments.length > 0 && (
                              <span className="bg-primary/10 text-primary text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold">
                                {comments.length}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <Activity className="w-3.5 h-3.5" />
                            Activity
                          </>
                        )}
                      </button>
                    ))}
                  </div>

                  {activeTab === "overview" ? (
                    <div className="space-y-4">
                      {comments.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground/60">No comments yet</p>
                          <p className="text-xs text-muted-foreground/40 mt-1">Be the first to comment</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {comments.map((c: any) => (
                            <div key={c.id} className="flex gap-3 group">
                              <Avatar className="w-8 h-8 shrink-0 ring-2 ring-background">
                                <AvatarImage src={c.user?.avatar} />
                                <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                                  {c.user?.name?.slice(0, 2).toUpperCase() || "??"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="bg-muted/30 border border-border/30 rounded-xl px-4 py-3">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-sm font-semibold">{c.user?.name || "User"}</span>
                                    <span className="text-[10px] text-muted-foreground/50">
                                      {c.createdAt ? getTimeAgo(new Date(c.createdAt)) : ""}
                                    </span>
                                  </div>
                                  <p className="text-sm leading-relaxed text-foreground/90">{c.text || c.content}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add comment */}
                      <div className="flex gap-3 pt-3 border-t border-border/30">
                        <Avatar className="w-8 h-8 shrink-0 ring-2 ring-background">
                          <AvatarImage src={currentUser?.avatar} />
                          <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                            {currentUser?.name?.slice(0, 2).toUpperCase() || "ME"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="relative rounded-xl border border-border/40 overflow-hidden focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                            <Textarea
                              ref={commentInputRef}
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Write a comment..."
                              rows={2}
                              className="border-0 resize-none text-sm bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pr-20"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addComment();
                              }}
                            />
                            <div className="absolute bottom-2 right-2 flex items-center gap-2">
                              <kbd className="text-[9px] text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded font-mono hidden sm:block">
                                ⌘↵
                              </kbd>
                              <Button
                                size="sm"
                                onClick={addComment}
                                disabled={addingComment || !newComment.trim()}
                                className="h-7 text-xs px-3"
                              >
                                {addingComment ? "..." : "Send"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-4">
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-border/60 via-border/40 to-transparent" />
                      <div className="space-y-4">
                        {activities.length === 0 ? (
                          <div className="text-center py-8">
                            <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground/60">No activity yet</p>
                          </div>
                        ) : (
                          activities.map((a: any) => (
                            <div key={a.id} className="flex items-start gap-3 relative">
                              <div className="w-5 h-5 rounded-full bg-background border-2 border-border shrink-0 mt-0.5 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                              </div>
                              <div className="flex-1 min-w-0 bg-muted/20 rounded-lg px-3 py-2">
                                <p className="text-sm leading-relaxed">
                                  <span className="font-semibold">{a.user?.name || "Someone"}</span>
                                  <span className="text-muted-foreground"> {a.message || formatActivityMessage(a)}</span>
                                </p>
                                <p className="text-[10px] text-muted-foreground/50 mt-1">
                                  {a.createdAt ? getTimeAgo(new Date(a.createdAt)) : ""}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </CollapsibleSection>
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Right: Properties sidebar */}
            <div className="border-t border-border/60 bg-muted/20 lg:border-l lg:border-t-0">
              <ScrollArea className="h-full">
                <div className="space-y-1 p-4">
                  <PropertyField label="Assignees" icon={Users}>
                    <div className="flex flex-wrap gap-1.5">
                      {assigneeIds.length > 0 ? (
                        assigneeIds.map((id) => {
                          const u = users.find((u) => u.id === id);
                          return (
                            <div
                              key={id}
                              className="group flex items-center gap-1.5 rounded-full border border-border/40 bg-background py-0.5 pl-0.5 pr-2 transition-colors hover:border-border"
                            >
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={u?.avatar} />
                                <AvatarFallback className="text-[8px] bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                                  {u?.name?.slice(0, 2).toUpperCase() || "??"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium">{u?.name || "Unknown"}</span>
                              <button
                                className="text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                onClick={() => {
                                  const newIds = assigneeIds.filter((aId) => aId !== id);
                                  setAssigneeIds(newIds);
                                  handleUpdateField("assigneeIds", newIds.length > 0 ? newIds : null);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground/50">Unassigned</span>
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
                        <SelectTrigger className="h-6 w-auto border-border/30 border-dashed bg-transparent px-2 text-[11px] transition-colors hover:border-primary/40">
                          <SelectValue placeholder="+ Add" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.filter((u) => !assigneeIds.includes(u.id)).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-4 h-4">
                                  <AvatarImage src={u.avatar} />
                                  <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                                    {u.name?.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs">{u.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </PropertyField>

                  <PropertyField label="Due Date" icon={Calendar} highlight={isOverdue}>
                    <Input
                      type="date"
                      value={displayTask?.dueDate ? new Date(displayTask.dueDate).toISOString().slice(0, 10) : ""}
                      onChange={(e) => handleUpdateField("dueDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                      className={cn(
                        "h-8 border-border/40 bg-background/50 text-xs focus:border-primary/50",
                        isOverdue && "border-red-400 text-red-600 focus:border-red-500"
                      )}
                    />
                  </PropertyField>

                  <PropertyField label="Team" icon={Users}>
                    <Select
                      value={displayTask?.teamId || "none"}
                      onValueChange={(v) => handleUpdateField("teamId", v === "none" ? null : v)}
                    >
                      <SelectTrigger className="h-8 border-border/40 bg-background/50 text-xs">
                        <SelectValue placeholder="No team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-xs text-muted-foreground">No team</span>
                        </SelectItem>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <span className="text-xs">{t.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PropertyField>

                  <label className="block cursor-pointer px-3 pt-2">
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploadingAttachment}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); }}
                    />
                    <div
                      className={cn(
                        "flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/40 text-xs text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:text-primary",
                        uploadingAttachment && "pointer-events-none opacity-50"
                      )}
                    >
                      {uploadingAttachment ? (
                        <>
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Attach file</span>
                        </>
                      )}
                    </div>
                  </label>

                  <div className="flex flex-col gap-1 border-t border-border/20 px-3 pt-3 text-[10px] text-muted-foreground/70">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created {displayTask?.createdAt ? new Date(displayTask.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </span>
                    <span>
                      Updated {displayTask?.updatedAt ? getTimeAgo(new Date(displayTask.updatedAt)) : "—"}
                    </span>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
