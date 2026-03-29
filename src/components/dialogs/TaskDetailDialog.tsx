import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  MessageSquare,
  Paperclip,
  Plus,
  Save,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  Calendar,
  Flag,
  User,
  Clock,
  Tag,
  Link2,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Edit3,
  MoreHorizontal,
  Activity,
  Bell,
  Users,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { auth } from "@/lib/auth";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: {
    id: string;
    title?: string;
    priority?: string;
    assignee?: { name: string; initials?: string; id?: string; avatar?: string };
    dueDate?: string;
    tags?: string[];
    linkedMeeting?: string;
    sprint?: { id: string; name: string };
    epic?: { id: string; name: string; color?: string };
  };
  onDeleted?: (taskId: string) => void;
}

export default function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  onDeleted,
}: TaskDetailDialogProps) {
  const currentUser = auth.getUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [epics, setEpics] = useState<any[]>([]);
  const [watchers, setWatchers] = useState<any[]>([]);

  const [taskData, setTaskData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);

  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [togglingWatch, setTogglingWatch] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  const displayTask = taskData || task;

  const statusOptions = [
    { value: "todo", label: "Open", color: "bg-muted text-muted-foreground" },
    { value: "in_progress", label: "In Progress", color: "bg-primary/10 text-primary" },
    { value: "in_review", label: "In Review", color: "bg-primary/10 text-primary" },
    { value: "done", label: "Done", color: "bg-muted text-muted-foreground" },
  ];

  const priorityOptions = [
    { value: "urgent", label: "Urgent", color: "text-destructive" },
    { value: "high", label: "High", color: "text-primary" },
    { value: "medium", label: "Medium", color: "text-muted-foreground" },
    { value: "low", label: "Low", color: "text-muted-foreground" },
  ];

  const loadAll = async () => {
    if (!task?.id) return;
    setLoading(true);
    try {
      const [taskRes, usersRes, teamsRes, sprintsRes, epicsRes, watchersRes] = await Promise.all([
        apiGet<any>(`/tasks/${task.id}`).catch(() => null),
        apiGet<any[]>("/users").catch(() => []),
        apiGet<any[]>("/teams").catch(() => []),
        apiGet<any[]>("/sprints").catch(() => []),
        apiGet<any[]>("/epics").catch(() => []),
        apiGet<any[]>(`/task-watchers?taskId=${task.id}`).catch(() => []),
      ]);

      if (taskRes) {
        setTaskData(taskRes);
        setComments(Array.isArray(taskRes.comments) ? taskRes.comments : []);
        setSubtasks(Array.isArray(taskRes.subtasks) ? taskRes.subtasks : []);
        setAttachments(Array.isArray(taskRes.attachments) ? taskRes.attachments : []);
      } else {
        setTaskData(task ?? null);
      }

      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setTeams(Array.isArray(teamsRes) ? teamsRes : []);
      setSprints(Array.isArray(sprintsRes) ? sprintsRes : []);
      setEpics(Array.isArray(epicsRes) ? epicsRes : []);
      setWatchers(Array.isArray(watchersRes) ? watchersRes : []);

      // Load activity log
      const activityRes = await apiGet<any[]>(`/tasks/${task.id}/activity`).catch(() => []);
      setActivities(Array.isArray(activityRes) ? activityRes : []);

      // Load multiple assignees
      if (taskRes?.assignees) {
        setAssigneeIds(taskRes.assignees.map((a: any) => a.id || a.userId));
      } else if (taskRes?.assigneeId) {
        setAssigneeIds([taskRes.assigneeId]);
      }
    } catch {
      toast({ title: "Failed to load task", variant: "destructive" });
      setTaskData(task ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && task?.id) loadAll();
  }, [open, task?.id]);

  const isWatching = watchers.some(
    (w: any) => (w.userId || w.user?.id) === currentUser?.id,
  );

  const isOverdue =
    !!displayTask?.dueDate &&
    new Date(displayTask.dueDate) < new Date() &&
    displayTask?.status !== "done";

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

  const handleSaveTitle = async () => {
    if (!task?.id || !displayTask) return;
    setSaving(true);
    try {
      await apiPatch<any>(`/tasks/${task.id}`, {
        userId: currentUser?.id,
        title: displayTask.title,
      });
      setEditingTitle(false);
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
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
        prev.map((s) => (s.id === subtaskId ? { ...s, ...updated } : s)),
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
        },
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
      (w: any) => (w.userId || w.user?.id) === currentUser.id,
    );

    setTogglingWatch(true);
    try {
      if (exists) {
        await apiDelete(`/task-watchers?taskId=${task.id}&userId=${currentUser.id}`);
        setWatchers((prev) =>
          prev.filter((w: any) => (w.userId || w.user?.id) !== currentUser.id),
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

  if (!task?.id) return null;

  const formatActivityMessage = (a: any): string => {
    const taskTitle = a.task?.title || 'this task';
    switch (a.action) {
      case 'created':
        return `created this task`;
      case 'status_changed':
        return `changed status from ${a.oldValue || 'previous'} to ${a.newValue || 'new'}`;
      case 'assigned':
        return `assigned this task`;
      case 'priority_changed':
        return `changed priority to ${a.newValue || 'new'}`;
      case 'comment_added':
        return `commented on this task`;
      default:
        return `updated this task`;
    }
  };

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const currentStatus = statusOptions.find(s => s.value === displayTask?.status) || statusOptions[0];
  const currentPriority = priorityOptions.find(p => p.value === displayTask?.priority) || priorityOptions[2];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b bg-muted/30 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                {displayTask?.project?.key && (
                  <span className="text-xs font-mono text-muted-foreground">{displayTask.project.key}</span>
                )}
              </div>
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={displayTask?.title || ""}
                    onChange={(e) =>
                      setTaskData((prev: any) => ({ ...prev, title: e.target.value }))
                    }
                    className="text-lg font-semibold"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveTitle} disabled={saving}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>Cancel</Button>
                </div>
              ) : (
                <h2
                  className="text-lg font-semibold text-foreground truncate cursor-pointer hover:text-primary"
                  onClick={() => setEditingTitle(true)}
                >
                  {displayTask?.title || "Untitled"}
                </h2>
              )}
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-h-0 flex">
          {/* Left panel - Main content */}
          <ScrollArea className="flex-1 min-w-0">
            <div className="p-6 space-y-6">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (
                <>
                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Description</Label>
                    <Textarea
                      value={displayTask?.description || ""}
                      onChange={(e) =>
                        setTaskData((prev: any) => ({ ...prev, description: e.target.value }))
                      }
                      onBlur={() => handleUpdateField("description", displayTask?.description)}
                      placeholder="Add a description..."
                      className="min-h-24 resize-none"
                    />
                  </div>

                  {/* Subtasks */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                        <CheckSquare className="w-3.5 h-3.5" />
                        Subtasks
                        <Badge variant="secondary" className="text-[10px]">{subtasks.length}</Badge>
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        placeholder="Add subtask..."
                        onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                      />
                      <Button size="sm" onClick={addSubtask} disabled={addingSubtask || !newSubtask.trim()}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {subtasks.map((s: any) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={!!s.isCompleted}
                            onChange={() => toggleSubtask(s.id, !!s.isCompleted)}
                            className="w-4 h-4 rounded"
                          />
                          <span className={cn("text-sm flex-1", s.isCompleted && "line-through text-muted-foreground")}>
                            {s.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Comments
                      <Badge variant="secondary" className="text-[10px]">{comments.length}</Badge>
                    </Label>
                    <div className="space-y-3">
                      {comments.map((c: any) => (
                        <div key={c.id} className="flex gap-3">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarImage src={c.user?.avatar} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {c.user?.name?.slice(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{c.user?.name || "User"}</span>
                              <span className="text-xs text-muted-foreground">
                                {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{c.text || c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        onKeyDown={(e) => e.key === "Enter" && addComment()}
                      />
                      <Button size="sm" onClick={addComment} disabled={addingComment || !newComment.trim()}>
                        Send
                      </Button>
                    </div>
                  </div>

                  {/* Attachments */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                      <Paperclip className="w-3.5 h-3.5" />
                      Attachments
                      <Badge variant="secondary" className="text-[10px]">{attachments.length}</Badge>
                    </Label>
                    <div className="flex items-center gap-2">
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
                        <Button variant="outline" size="sm" asChild disabled={uploadingAttachment}>
                          <span>
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            {uploadingAttachment ? "Uploading..." : "Upload file"}
                          </span>
                        </Button>
                      </label>
                    </div>
                    <div className="space-y-1">
                      {attachments.map((a: any) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors text-sm"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="truncate">{a.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                      <Activity className="w-3.5 h-3.5" />
                      Activity
                      <Badge variant="secondary" className="text-[10px]">{activities.length}</Badge>
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {activities.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No activity yet</p>
                      ) : (
                        activities.slice(0, 10).map((a: any) => (
                          <div key={a.id} className="flex items-start gap-2 text-xs">
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                              {a.action === 'created' ? (
                                <Plus className="w-3 h-3 text-muted-foreground" />
                              ) : a.action === 'status_changed' ? (
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              ) : (
                                <Activity className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{a.user?.name || 'Someone'}</span>
                              <span className="text-muted-foreground"> {a.message || formatActivityMessage(a)}</span>
                              <span className="text-muted-foreground/60 ml-1">
                                {a.createdAt ? getTimeAgo(new Date(a.createdAt)) : ''}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Right panel - Sidebar */}
          <div className="w-72 shrink-0 border-l bg-muted/20">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Status</Label>
                  <Select
                    value={displayTask?.status || "todo"}
                    onValueChange={(v) => handleUpdateField("status", v)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Priority</Label>
                  <Select
                    value={displayTask?.priority || "medium"}
                    onValueChange={(v) => handleUpdateField("priority", v)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignees - Multiple */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Assignees
                  </Label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {assigneeIds.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      ) : (
                        assigneeIds.map((id) => {
                          const user = users.find((u) => u.id === id);
                          return (
                            <Badge key={id} variant="secondary" className="text-xs flex items-center gap-1">
                              {user?.name || 'Unknown'}
                              <button
                                className="ml-1 hover:text-destructive"
                                onClick={() => {
                                  const newIds = assigneeIds.filter((aId) => aId !== id);
                                  setAssigneeIds(newIds);
                                  handleUpdateField('assigneeIds', newIds.length > 0 ? newIds : null);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          );
                        })
                      )}
                    </div>
                    <Select
                      value=""
                      onValueChange={(v) => {
                        if (v && !assigneeIds.includes(v)) {
                          const newIds = [...assigneeIds, v];
                          setAssigneeIds(newIds);
                          handleUpdateField('assigneeIds', newIds);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-background h-8">
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

                {/* Due Date */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due Date
                  </Label>
                  <Input
                    type="date"
                    value={displayTask?.dueDate ? new Date(displayTask.dueDate).toISOString().slice(0, 10) : ""}
                    onChange={(e) =>
                      handleUpdateField("dueDate", e.target.value ? new Date(e.target.value).toISOString() : null)
                    }
                    className={cn("bg-background", isOverdue && "border-destructive")}
                  />
                  {isOverdue && (
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="w-3 h-3" />
                      Overdue
                    </div>
                  )}
                  {displayTask?.dueDate && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={async () => {
                        if (!task?.id || !currentUser?.id) return;
                        try {
                          const remindAt = new Date(displayTask.dueDate!);
                          remindAt.setHours(9, 0, 0, 0); // 9 AM on due date
                          await apiPost('/reminders', {
                            title: `Task due: ${displayTask.title}`,
                            type: 'task_due',
                            relatedId: task.id,
                            relatedType: 'task',
                            remindAt: remindAt.toISOString(),
                            recipientIds: [currentUser.id],
                          });
                          toast({ title: 'Reminder set for due date' });
                        } catch {
                          toast({ title: 'Failed to set reminder', variant: 'destructive' });
                        }
                      }}
                    >
                      <Bell className="w-3 h-3 mr-1" />
                      Set Reminder
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Team */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Team</Label>
                  <Select
                    value={displayTask?.teamId || "none"}
                    onValueChange={(v) => handleUpdateField("teamId", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="No team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sprint */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Sprint</Label>
                  <Select
                    value={displayTask?.sprintId || "none"}
                    onValueChange={(v) => handleUpdateField("sprintId", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="No sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No sprint</SelectItem>
                      {sprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Epic */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Epic</Label>
                  <Select
                    value={displayTask?.epicId || "none"}
                    onValueChange={(v) => handleUpdateField("epicId", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="No epic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No epic</SelectItem>
                      {epics.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Watchers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase text-muted-foreground">Watchers</Label>
                    <Button
                      size="sm"
                      variant={isWatching ? "default" : "outline"}
                      onClick={toggleWatching}
                      disabled={togglingWatch}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {isWatching ? "Watching" : "Watch"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {watchers.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No watchers</span>
                    ) : (
                      watchers.map((w: any) => (
                        <Avatar key={w.userId || w.user?.id} className="w-6 h-6">
                          <AvatarImage src={w.user?.avatar} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {w.user?.name?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                      ))
                    )}
                  </div>
                </div>

                {/* Story Points */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground">Story Points</Label>
                  <Input
                    type="number"
                    value={displayTask?.storyPoints || ""}
                    onChange={(e) => handleUpdateField("storyPoints", e.target.value ? parseInt(e.target.value) : null)}
                    className="bg-background"
                    placeholder="0"
                  />
                </div>

                <Separator />

                {/* Quick Stats */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span>{displayTask?.createdAt ? new Date(displayTask.createdAt).toLocaleDateString() : "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Updated</span>
                    <span>{displayTask?.updatedAt ? new Date(displayTask.updatedAt).toLocaleDateString() : "-"}</span>
                  </div>
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={deleteTask}
                  disabled={deletingTask}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deletingTask ? "Deleting..." : "Delete task"}
                </Button>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
