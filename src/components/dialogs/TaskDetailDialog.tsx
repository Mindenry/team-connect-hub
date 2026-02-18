import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckSquare, Calendar, User, Tag, Flag, MessageSquare, Paperclip,
  Clock, Link as LinkIcon, Send, ArrowUp, ArrowRight, ArrowDown, Rocket,
  Plus, X, Trash2, FileText, Upload, Target, Zap, Edit2, Save, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogHeader as DialogHeader,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: {
    id: string;
    title: string;
    priority: string;
    assignee?: { name: string; initials: string; id?: string };
    dueDate?: string;
    tags: string[];
    linkedMeeting?: string;
    sprint?: { id: string; name: string };
    epic?: { id: string; name: string; color?: string };
  };
}

const priorityIcons: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  urgent: { icon: Rocket, color: "text-red-600", label: "Urgent" },
  high: { icon: ArrowUp, color: "text-orange-600", label: "High" },
  medium: { icon: ArrowRight, color: "text-yellow-600", label: "Medium" },
  low: { icon: ArrowDown, color: "text-green-600", label: "Low" },
};

export default function TaskDetailDialog({ open, onOpenChange, task }: TaskDetailDialogProps) {
  const [comment, setComment] = useState("");
  const [taskData, setTaskData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newTimeHours, setNewTimeHours] = useState("");
  const [newTimeDescription, setNewTimeDescription] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [epics, setEpics] = useState<any[]>([]);
  const currentUser = auth.getUser();

  useEffect(() => {
    if (open && task?.id) {
      const loadTask = async () => {
        setLoading(true);
        try {
          const [taskRes, usersRes, teamsRes, sprintsRes, epicsRes] = await Promise.all([
            fetch(`${API_BASE}/tasks/${task.id}`),
            fetch(`${API_BASE}/users`),
            fetch(`${API_BASE}/teams`),
            fetch(`${API_BASE}/sprints`),
            fetch(`${API_BASE}/epics`),
          ]);

          if (taskRes.ok) {
            const data = await taskRes.json();
            setTaskData(data);
            setComments(data.comments || []);
            setActivityLog(data.activityLog || []);
            setSubtasks(data.subtasks || []);
            setTimeEntries(data.timeEntries || []);
            setAttachments(data.attachments || []);
            setEditedTitle(data.title || "");
            setEditedDescription(data.description || "");
          }

          const [usersData, teamsData, sprintsData, epicsData] = await Promise.all([
            usersRes.json(),
            teamsRes.json(),
            sprintsRes.json(),
            epicsRes.json(),
          ]);
          setUsers(usersData);
          setTeams(teamsData);
          setSprints(sprintsData);
          setEpics(epicsData);
        } catch (err) {
          console.error("Failed to load task:", err);
        } finally {
          setLoading(false);
        }
      };
      loadTask();
    }
  }, [open, task?.id]);

  const handleAddComment = async () => {
    if (!comment.trim() || !task?.id || !currentUser) return;
    setSendingComment(true);
    try {
      const res = await fetch(`${API_BASE}/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          text: comment,
        }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setComment("");
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSendingComment(false);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !task?.id) return;
    try {
      const res = await fetch(`${API_BASE}/tasks/${task.id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtaskTitle }),
      });
      if (res.ok) {
        const newSubtask = await res.json();
        setSubtasks((prev) => [...prev, newSubtask]);
        setNewSubtaskTitle("");
      }
    } catch (err) {
      console.error("Failed to add subtask:", err);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    try {
      await fetch(`${API_BASE}/tasks/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      });
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, isCompleted: !isCompleted } : s))
      );
    } catch (err) {
      console.error("Failed to update subtask:", err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await fetch(`${API_BASE}/tasks/subtasks/${subtaskId}`, {
        method: "DELETE",
      });
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    } catch (err) {
      console.error("Failed to delete subtask:", err);
    }
  };

  const handleAddTimeEntry = async () => {
    if (!newTimeHours || !task?.id || !currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/tasks/${task.id}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          hours: parseFloat(newTimeHours),
          description: newTimeDescription || undefined,
        }),
      });
      if (res.ok) {
        const newEntry = await res.json();
        setTimeEntries((prev) => [newEntry, ...prev]);
        setNewTimeHours("");
        setNewTimeDescription("");
      }
    } catch (err) {
      console.error("Failed to add time entry:", err);
    }
  };

  const handleDeleteTimeEntry = async (timeEntryId: string) => {
    try {
      await fetch(`${API_BASE}/tasks/time-entries/${timeEntryId}`, {
        method: "DELETE",
      });
      setTimeEntries((prev) => prev.filter((t) => t.id !== timeEntryId));
    } catch (err) {
      console.error("Failed to delete time entry:", err);
    }
  };

  const handleUploadAttachment = async (file: File) => {
    if (!task?.id || !currentUser) return;
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });

      if (uploadRes.ok) {
        const { url, name, size, mimetype } = await uploadRes.json();
        const attachRes = await fetch(`${API_BASE}/tasks/${task.id}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            name,
            url,
            mimeType: mimetype,
            size,
          }),
        });

        if (attachRes.ok) {
          const newAttachment = await attachRes.json();
          setAttachments((prev) => [...prev, newAttachment]);
        }
      }
    } catch (err) {
      console.error("Failed to upload attachment:", err);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await fetch(`${API_BASE}/tasks/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      console.error("Failed to delete attachment:", err);
    }
  };

  const handleUpdateField = async (field: string, value: any) => {
    if (!task?.id || !currentUser) return;
    try {
      await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [field]: value,
          userId: currentUser.id,
        }),
      });
      const res = await fetch(`${API_BASE}/tasks/${task.id}`);
      if (res.ok) {
        const data = await res.json();
        setTaskData(data);
        setActivityLog(data.activityLog || []);
      }
    } catch (err) {
      console.error("Failed to update field:", err);
    }
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      handleUpdateField("title", editedTitle);
      setEditingTitle(false);
    }
  };

  const handleSaveDescription = () => {
    handleUpdateField("description", editedDescription);
    setEditingDescription(false);
  };

  if (!task) return null;

  const displayTask = taskData || task;
  const priority = priorityIcons[displayTask.priority] || priorityIcons.medium;
  const PriorityIcon = priority.icon;
  const totalTimeSpent = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const completedSubtasks = subtasks.filter((s) => s.isCompleted).length;
  const totalSubtasks = subtasks.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0 pb-4 border-b">
            <div className="flex items-start justify-between">
              {editingTitle ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-xl font-bold"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") {
                        setEditingTitle(false);
                        setEditedTitle(displayTask.title || "");
                      }
                    }}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveTitle}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => {
                    setEditingTitle(false);
                    setEditedTitle(displayTask.title || "");
                  }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <CheckSquare className="w-5 h-5 text-primary" />
                  <span 
                    onClick={() => setEditingTitle(true)} 
                    className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2 -my-1 flex items-center gap-2"
                  >
                    {displayTask.title || task.title}
                    <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </span>
                </DialogTitle>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Left Column - Main Content */}
              <div className="col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Description</Label>
                  {editingDescription ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="min-h-[120px] text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveDescription}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditingDescription(false);
                          setEditedDescription(displayTask.description || "");
                        }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditingDescription(true)}
                      className="min-h-[120px] p-4 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors flex items-start gap-2 group border border-transparent hover:border-border"
                    >
                      <p className="text-sm text-foreground flex-1 whitespace-pre-wrap">
                        {displayTask.description || "Click to add description..."}
                      </p>
                      <Edit2 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Subtasks */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Subtasks ({completedSubtasks}/{totalSubtasks})
                    </Label>
                  </div>
                  <div className="space-y-2">
                    {subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                        <button
                          onClick={() => handleToggleSubtask(subtask.id, subtask.isCompleted)}
                          className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                            subtask.isCompleted 
                              ? "bg-primary border-primary text-primary-foreground" 
                              : "border-muted-foreground/30 hover:border-primary/50"
                          )}
                        >
                          {subtask.isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <span className={cn(
                          "flex-1 text-sm",
                          subtask.isCompleted && "line-through text-muted-foreground"
                        )}>
                          {subtask.title}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteSubtask(subtask.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <Input
                        placeholder="Add subtask..."
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSubtask();
                          }
                        }}
                        className="h-9 text-sm"
                      />
                      <Button onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim()} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Time Tracking */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Time Tracking ({totalTimeSpent.toFixed(1)}h)
                    </Label>
                  </div>
                  <div className="space-y-2 mb-3">
                    {timeEntries.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                              {entry.user?.name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{entry.user?.name || "Unknown"}</p>
                            {entry.description && (
                              <p className="text-xs text-muted-foreground">{entry.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">{entry.hours}h</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteTimeEntry(entry.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        step="0.25"
                        placeholder="Hours"
                        value={newTimeHours}
                        onChange={(e) => setNewTimeHours(e.target.value)}
                        className="h-9 text-sm"
                      />
                      <Input
                        placeholder="Description (optional)"
                        value={newTimeDescription}
                        onChange={(e) => setNewTimeDescription(e.target.value)}
                        className="h-9 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTimeHours) {
                            e.preventDefault();
                            handleAddTimeEntry();
                          }
                        }}
                      />
                    </div>
                    <Button onClick={handleAddTimeEntry} disabled={!newTimeHours} className="w-full" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Time Entry
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Attachments */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-3 block uppercase tracking-wide">Attachments</Label>
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <a
                            href={`${API_BASE}${att.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-foreground hover:text-primary truncate"
                          >
                            {att.name}
                          </a>
                          {att.size && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              ({(att.size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteAttachment(att.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <label className="flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 cursor-pointer transition-colors bg-muted/20 hover:bg-muted/30">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload file</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadAttachment(file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <Separator />

                {/* Comments */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-3 block uppercase tracking-wide">
                    Comments ({comments.length})
                  </Label>
                  <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                    {comments.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8">No comments yet</div>
                    ) : (
                      comments.map((c: any) => (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-3"
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                              {c.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{c.user?.name || "Unknown"}</p>
                            <div className="mt-1 p-2.5 rounded-lg bg-muted/50 text-sm text-foreground">{c.text}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(c.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleAddComment())}
                      placeholder="Add a comment..."
                      className="text-sm"
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={sendingComment || !comment.trim()}
                      size="sm"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Activity Log */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-3 block uppercase tracking-wide">Activity</Label>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {activityLog.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8">No activity yet</div>
                    ) : (
                      activityLog.map((log: any) => {
                        const actionText = log.action === "created" ? "created this task" :
                          log.action === "status_changed" ? `changed status from ${log.oldValue} to ${log.newValue}` :
                          log.action === "assigned" ? `assigned to ${log.newValue ? "someone" : "unassigned"}` :
                          log.action === "sprint_changed" ? `moved to sprint ${log.newValue || "none"}` :
                          log.action === "epic_changed" ? `moved to epic ${log.newValue || "none"}` :
                          log.action === "story_points_changed" ? `changed story points to ${log.newValue}` :
                          log.action;
                        return (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3"
                          >
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                {log.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-medium text-foreground">{log.user?.name || "System"}</span>{" "}
                                <span className="text-muted-foreground">{actionText}</span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(log.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Task Attributes */}
              <div className="space-y-4 border-l pl-6">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Status</Label>
                  <Select
                    value={displayTask.status || "todo"}
                    onValueChange={(v) => handleUpdateField("status", v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Assignee</Label>
                  <Select
                    value={displayTask.assigneeId || "none"}
                    onValueChange={(v) => handleUpdateField("assigneeId", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Priority</Label>
                  <Select
                    value={displayTask.priority || "medium"}
                    onValueChange={(v) => handleUpdateField("priority", v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">🔴 Urgent</SelectItem>
                      <SelectItem value="high">🟠 High</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="low">🟢 Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Due Date</Label>
                  <Input
                    type="date"
                    value={displayTask.dueDate ? new Date(displayTask.dueDate).toISOString().split("T")[0] : ""}
                    onChange={(e) => handleUpdateField("dueDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Story Points</Label>
                  <Input
                    type="number"
                    min="0"
                    value={displayTask.storyPoints || ""}
                    onChange={(e) => handleUpdateField("storyPoints", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="e.g., 5"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Sprint</Label>
                  <Select
                    value={displayTask.sprintId || "none"}
                    onValueChange={(v) => handleUpdateField("sprintId", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Sprint</SelectItem>
                      {sprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Epic</Label>
                  <Select
                    value={displayTask.epicId || "none"}
                    onValueChange={(v) => handleUpdateField("epicId", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Epic</SelectItem>
                      {epics.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          <div className="flex items-center gap-2">
                            {e.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color }} />}
                            {e.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(displayTask.tags || []).length > 0 ? (
                      displayTask.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No tags</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
