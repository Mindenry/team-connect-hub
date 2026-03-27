import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Plus,
  Save,
  Trash2,
  Eye,
} from "lucide-react";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogDescription as DialogDescription,
  AnimatedDialogHeader as DialogHeader,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";
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
import { auth } from "@/lib/auth";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

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

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [watchers, setWatchers] = useState<any[]>([]);

  const [taskData, setTaskData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [saving, setSaving] = useState(false);

  const displayTask = taskData || task;

  const statusOptions = ["todo", "in_progress", "review", "done"];
  const priorityOptions = ["urgent", "high", "medium", "low"];

  const loadAll = async () => {
    if (!task?.id) return;
    setLoading(true);
    try {
      const [taskRes, usersRes, teamsRes, meetingsRes, watchersRes] = await Promise.all([
        apiGet<any>(`/tasks/${task.id}`).catch(() => null),
        apiGet<any[]>("/users").catch(() => []),
        apiGet<any[]>("/teams").catch(() => []),
        apiGet<any[]>("/meetings").catch(() => []),
        apiGet<any[]>(`/task-watchers?taskId=${task.id}`).catch(() => []),
      ]);

      if (taskRes) {
        setTaskData(taskRes);
        setComments(Array.isArray(taskRes.comments) ? taskRes.comments : []);
        setSubtasks(Array.isArray(taskRes.subtasks) ? taskRes.subtasks : []);
        setAttachments(Array.isArray(taskRes.attachments) ? taskRes.attachments : []);
        setActivityLog(Array.isArray(taskRes.activityLog) ? taskRes.activityLog : []);
      }

      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setTeams(Array.isArray(teamsRes) ? teamsRes : []);
      setMeetings(Array.isArray(meetingsRes) ? meetingsRes : []);
      setWatchers(Array.isArray(watchersRes) ? watchersRes : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && task?.id) {
      loadAll();
    }
  }, [open, task?.id]);

  const assigneeIds = useMemo(() => {
    const ids = new Set<string>();
    if (displayTask?.assigneeId) ids.add(displayTask.assigneeId);
    if (Array.isArray(watchers)) {
      watchers.forEach((w: any) => {
        const id = w?.userId || w?.user?.id;
        if (id) ids.add(id);
      });
    }
    return Array.from(ids);
  }, [displayTask?.assigneeId, watchers]);

  const handleUpdateField = async (field: string, value: any) => {
    if (!task?.id) return;
    setSaving(true);
    try {
      const payload: any = { userId: currentUser?.id };
      payload[field] = value;
      const updated = await apiPatch<any>(`/tasks/${task.id}`, payload);
      setTaskData((prev: any) => ({ ...prev, ...updated, [field]: value }));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTitleDesc = async () => {
    if (!task?.id || !displayTask) return;
    setSaving(true);
    try {
      const updated = await apiPatch<any>(`/tasks/${task.id}`, {
        userId: currentUser?.id,
        title: displayTask.title,
        description: displayTask.description,
      });
      setTaskData((prev: any) => ({ ...prev, ...updated }));
    } finally {
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!task?.id || !newComment.trim() || !currentUser?.id) return;
    const created = await apiPost<any>(`/tasks/${task.id}/comments`, {
      userId: currentUser.id,
      text: newComment.trim(),
    });
    setComments((prev) => [...prev, created]);
    setNewComment("");
  };

  const addSubtask = async () => {
    if (!task?.id || !newSubtask.trim()) return;
    const created = await apiPost<any>(`/tasks/${task.id}/subtasks`, {
      title: newSubtask.trim(),
    });
    setSubtasks((prev) => [...prev, created]);
    setNewSubtask("");
  };

  const toggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    const updated = await apiPatch<any>(`/tasks/subtasks/${subtaskId}`, {
      isCompleted: !isCompleted,
    });
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, ...updated } : s)),
    );
  };

  const uploadAttachment = async (file: File) => {
    if (!task?.id || !currentUser?.id) return;
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
  };

  const toggleWatching = async () => {
    if (!task?.id || !currentUser?.id) return;
    const exists = watchers.some(
      (w: any) => (w.userId || w.user?.id) === currentUser.id,
    );

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
  };

  const deleteTask = async () => {
    if (!task?.id) return;
    await apiDelete(`/tasks/${task.id}`);
    onDeleted?.(task.id);
    onOpenChange(false);
  };

  if (!task?.id) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            Task Details
          </DialogTitle>
          <DialogDescription>
            Manage task within scope 5.1–5.16
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 max-h-[80vh] overflow-hidden">
          <div className="lg:col-span-2 p-5 overflow-y-auto space-y-5 border-r">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={displayTask?.title || ""}
                    onChange={(e) =>
                      setTaskData((prev: any) => ({ ...prev, title: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={displayTask?.description || ""}
                    onChange={(e) =>
                      setTaskData((prev: any) => ({ ...prev, description: e.target.value }))
                    }
                    className="min-h-24"
                  />
                  <Button size="sm" onClick={handleSaveTitleDesc} disabled={saving}>
                    <Save className="w-3.5 h-3.5 mr-1" /> Save text
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={displayTask?.status || "todo"}
                      onValueChange={(v) => handleUpdateField("status", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={displayTask?.priority || "medium"}
                      onValueChange={(v) => handleUpdateField("priority", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Assignee</Label>
                    <Select
                      value={displayTask?.assigneeId || "none"}
                      onValueChange={(v) =>
                        handleUpdateField("assigneeId", v === "none" ? null : v)
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={displayTask?.dueDate ? new Date(displayTask.dueDate).toISOString().slice(0, 10) : ""}
                      onChange={(e) =>
                        handleUpdateField(
                          "dueDate",
                          e.target.value ? new Date(e.target.value).toISOString() : null,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Team</Label>
                    <Select
                      value={displayTask?.teamId || "none"}
                      onValueChange={(v) =>
                        handleUpdateField("teamId", v === "none" ? null : v)
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No team</SelectItem>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Meeting Link</Label>
                    <Select
                      value={displayTask?.meetingId || "none"}
                      onValueChange={(v) =>
                        handleUpdateField("meetingId", v === "none" ? null : v)
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {meetings.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Subtasks</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      placeholder="Add subtask"
                    />
                    <Button size="sm" onClick={addSubtask}><Plus className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="space-y-2">
                    {subtasks.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-2 border rounded px-3 py-2">
                        <input
                          type="checkbox"
                          checked={!!s.isCompleted}
                          onChange={() => toggleSubtask(s.id, !!s.isCompleted)}
                        />
                        <span className={s.isCompleted ? "line-through text-muted-foreground" : ""}>{s.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Comments</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment"
                    />
                    <Button size="sm" onClick={addComment}>Send</Button>
                  </div>
                  <div className="space-y-2">
                    {comments.map((c: any) => (
                      <div key={c.id} className="border rounded p-3">
                        <div className="text-xs text-muted-foreground mb-1">{c.user?.name || "User"}</div>
                        <div className="text-sm">{c.text || c.content}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> Attachments</Label>
                  <Input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadAttachment(f);
                    }}
                  />
                  <div className="space-y-2">
                    {attachments.map((a: any) => (
                      <a
                        key={a.id}
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block border rounded px-3 py-2 text-sm hover:bg-muted/40"
                      >
                        {a.name}
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="p-5 overflow-y-auto space-y-4">
            <div className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase text-muted-foreground">Watchers</Label>
                <Button size="sm" variant="outline" onClick={toggleWatching}>
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  {watchers.some((w: any) => (w.userId || w.user?.id) === currentUser?.id)
                    ? "Unwatch"
                    : "Watch"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {watchers.map((w: any, idx: number) => {
                  const name = w.user?.name || "User";
                  return (
                    <Badge key={`${w.userId || w.user?.id || idx}`} variant="secondary">
                      {name}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <Label className="text-xs uppercase text-muted-foreground">Activity Log</Label>
              <div className="mt-2 space-y-2 max-h-64 overflow-auto">
                {activityLog.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No activity yet</div>
                ) : (
                  activityLog.map((log: any) => (
                    <div key={log.id} className="text-xs border rounded p-2">
                      <div className="font-medium">{log.user?.name || "System"}</div>
                      <div className="text-muted-foreground">{log.action}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border p-3 space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Quick Summary</Label>
              <div className="text-sm">Assignees: {assigneeIds.length || 0}</div>
              <div className="text-sm">Subtasks: {subtasks.length}</div>
              <div className="text-sm">Comments: {comments.length}</div>
              <div className="text-sm">Attachments: {attachments.length}</div>
            </div>

            <Button variant="destructive" className="w-full" onClick={deleteTask}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
