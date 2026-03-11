import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  CheckSquare, Calendar, User, Tag, Flag, MessageSquare, Paperclip,
  Clock, Link as LinkIcon, Send, ArrowUp, ArrowRight, ArrowDown, Rocket,
  Plus, X, Trash2, FileText, Upload, Target, Zap, Edit2, Save, CheckCircle2, Package,
  Eye, EyeOff, ChevronsUpDown, Check, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogDescription as DialogDescription,
  AnimatedDialogHeader as DialogHeader,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";
import { PresenceIndicator } from "@/components/tasks/PresenceIndicator";
import { getSocket } from "@/lib/websocket";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// ─── Linked Issues sub-component ───
function LinkedIssuesSection({ taskId }: { taskId: string }) {
  const [links, setLinks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [linkType, setLinkType] = useState("relates_to");

  useEffect(() => {
    if (!taskId) return;
    apiGet<any[]>(`/issue-links?taskId=${taskId}`)
      .then((data) => setLinks(Array.isArray(data) ? data : []))
      .catch(() => setLinks([]));
  }, [taskId]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const results = await apiGet<any[]>(`/tasks?search=${encodeURIComponent(q)}&limit=5`);
      setSearchResults((Array.isArray(results) ? results : []).filter((t) => t.id !== taskId));
    } catch { setSearchResults([]); }
  };

  const handleAddLink = async (targetId: string) => {
    try {
      const link = await apiPost<any>("/issue-links", { sourceId: taskId, targetId, type: linkType });
      if (link) {
        setLinks((prev) => [...prev, { ...link, direction: "outgoing", linkedTask: link.target, type: linkType }]);
      }
      setSearchQuery("");
      setSearchResults([]);
      setShowSearch(false);
    } catch (err) {
      console.error("Failed to create link:", err);
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    try {
      await apiDelete(`/issue-links/${linkId}`);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err) {
      console.error("Failed to remove link:", err);
    }
  };

  const linkTypeLabels: Record<string, string> = {
    blocks: "blocks",
    is_blocked_by: "is blocked by",
    relates_to: "relates to",
    duplicates: "duplicates",
  };

  return (
    <section className="rounded-2xl border border-border/40 bg-background/95 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Linked Issues
          </Label>
          <Badge variant="outline" className="h-5 rounded-full px-2 text-[11px]">
            {links.length}
          </Badge>
        </div>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowSearch(!showSearch)}>
          <Plus className="w-3 h-3 mr-1" /> Link
        </Button>
      </div>

      {showSearch && (
        <div className="mb-3 space-y-2 p-3 rounded-lg border border-border/40 bg-muted/30">
          <div className="flex gap-2">
            <Select value={linkType} onValueChange={setLinkType}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relates_to">relates to</SelectItem>
                <SelectItem value="blocks">blocks</SelectItem>
                <SelectItem value="is_blocked_by">is blocked by</SelectItem>
                <SelectItem value="duplicates">duplicates</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Search tasks to link..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-8 text-sm flex-1"
              autoFocus
            />
          </div>
          {searchResults.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {searchResults.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleAddLink(t.id)}
                  className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-muted/70 transition-colors flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-primary/40 shrink-0" />
                  <span className="truncate">{t.title}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground capitalize shrink-0">{t.status?.replace("_", " ")}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {links.length === 0 && !showSearch ? (
          <p className="text-xs text-muted-foreground text-center py-3">No linked issues</p>
        ) : (
          links.map((link, i) => (
            <div key={link.id || `link-${i}`} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors">
              <span className="text-[10px] text-muted-foreground shrink-0 w-20 truncate">
                {linkTypeLabels[link.type] || link.type}
              </span>
              <LinkIcon className="w-3 h-3 text-muted-foreground/50 shrink-0" />
              <span className="flex-1 text-sm truncate">{link.linkedTask?.title || "Unknown"}</span>
              <span className="text-[10px] text-muted-foreground capitalize shrink-0">
                {link.linkedTask?.status?.replace("_", " ")}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => handleRemoveLink(link.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ─── Watchers sub-component ───
function WatchersSection({ taskId, currentUserId }: { taskId: string; currentUserId?: string }) {
  const [watchers, setWatchers] = useState<any[]>([]);
  const [isWatching, setIsWatching] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    apiGet<any[]>(`/task-watchers?taskId=${taskId}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setWatchers(list);
        if (currentUserId) {
          setIsWatching(list.some((w) => w.userId === currentUserId || w.user?.id === currentUserId));
        }
      })
      .catch(() => setWatchers([]));
  }, [taskId, currentUserId]);

  const toggleWatch = async () => {
    if (!currentUserId) return;
    try {
      if (isWatching) {
        await apiDelete(`/task-watchers?taskId=${taskId}&userId=${currentUserId}`);
        setWatchers((prev) => prev.filter((w) => (w.userId || w.user?.id) !== currentUserId));
        setIsWatching(false);
      } else {
        await apiPost("/task-watchers", { taskId, userId: currentUserId });
        setWatchers((prev) => [...prev, { userId: currentUserId, user: { id: currentUserId, name: "You" } }]);
        setIsWatching(true);
      }
    } catch (err) {
      console.error("Failed to toggle watch:", err);
    }
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Watchers
          </Label>
          <Badge variant="outline" className="h-5 rounded-full px-2 text-[11px]">
            {watchers.length}
          </Badge>
        </div>
        <Button
          size="sm"
          variant={isWatching ? "secondary" : "outline"}
          className="h-7 px-2 text-xs gap-1"
          onClick={toggleWatch}
        >
          {isWatching ? (
            <><EyeOff className="w-3 h-3" /> Unwatch</>
          ) : (
            <><Eye className="w-3 h-3" /> Watch</>
          )}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {watchers.length === 0 ? (
          <span className="text-xs text-muted-foreground">No watchers</span>
        ) : (
          watchers.map((w, i) => {
            const user = w.user || {};
            const initials = user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
            return (
              <Avatar key={w.id || `watcher-${i}`} className="h-7 w-7">
                <AvatarImage src={user.avatar} alt={user.name || "Watcher"} />
                <AvatarFallback className="bg-primary/10 text-primary text-[9px]">{initials}</AvatarFallback>
              </Avatar>
            );
          })
        )}
      </div>
    </section>
  );
}

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
  onDeleted?: (taskId: string) => void;
}

const priorityIcons: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  urgent: { icon: Rocket, color: "text-red-600", label: "Urgent" },
  high: { icon: ArrowUp, color: "text-orange-600", label: "High" },
  medium: { icon: ArrowRight, color: "text-yellow-600", label: "Medium" },
  low: { icon: ArrowDown, color: "text-green-600", label: "Low" },
};

export default function TaskDetailDialog({ open, onOpenChange, task, onDeleted }: TaskDetailDialogProps) {
  const [comment, setComment] = useState("");
  const [taskData, setTaskData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [childTasks, setChildTasks] = useState<any[]>([]);
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
  const [projects, setProjects] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [viewingUsers, setViewingUsers] = useState<Array<{ userId: string; name: string; initials?: string; avatar?: string }>>([]);
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; fetchUrl?: string; name: string; mimetype?: string } | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const previewBlobUrlRef = useRef<string | null>(null);
  
  // Use useMemo to prevent infinite loop
  const currentUser = useMemo(() => auth.getUser(), []);

  useEffect(() => {
    // Reset all state when task changes or dialog closes
    if (!open || !task?.id) {
      setTaskData(null);
      setComments([]);
      setActivityLog([]);
      setSubtasks([]);
      setTimeEntries([]);
      setAttachments([]);
      setEditedTitle("");
      setEditedDescription("");
      setEditingTitle(false);
      setEditingDescription(false);
      setViewingUsers([]);
      setPreviewAttachment(null);
      return;
    }

    // รีเซ็ต preview เมื่อเปลี่ยน task
    setPreviewAttachment(null);

    let cancelled = false;

    const loadTask = async () => {
      setLoading(true);
      // Reset state immediately when task changes
      if (!cancelled) {
        setTaskData(null);
        setComments([]);
        setActivityLog([]);
        setSubtasks([]);
        setTimeEntries([]);
        setAttachments([]);
        setEditedTitle("");
        setEditedDescription("");
        setEditingTitle(false);
        setEditingDescription(false);
      }
      
      try {
        const [taskData, usersData, teamsData, sprintsData, epicsData, projectsData, componentsData, versionsData] = await Promise.all([
          apiGet<any>(`/tasks/${task.id}`).catch(() => null),
          apiGet<any[]>("/users").catch(() => []),
          apiGet<any[]>("/teams").catch(() => []),
          apiGet<any[]>("/sprints").catch(() => []),
          apiGet<any[]>("/epics").catch(() => []),
          apiGet<any[]>("/projects").catch(() => []),
          apiGet<any[]>("/components").catch(() => []),
          apiGet<any[]>("/versions").catch(() => []),
        ]);

        if (cancelled) return;

        if (taskData) {
          setTaskData(taskData);
          setComments(
            (taskData.comments || []).map((c: any) => ({
              ...c,
              text: c.text ?? c.content ?? "",
              user: c.user || { id: "", name: "Unknown" },
            }))
          );
          setActivityLog(taskData.activityLog || []);
          setSubtasks(
            (taskData.subtasks || []).map((s: any) => ({
              id: s.id,
              title: s.title ?? s.content ?? "",
              isCompleted: s.isCompleted ?? false,
              position: s.position ?? 0,
            }))
          );
          setChildTasks(taskData.childTasks || []);
          setTimeEntries(taskData.timeEntries || []);
          setAttachments(taskData.attachments || []);
          setEditedTitle(taskData.title || "");
          setEditedDescription(taskData.description || "");
        }

        setUsers(
          Array.isArray(usersData)
            ? usersData.filter(
                (u: any) =>
                  u?.role !== "system" &&
                  !String(u?.name || "").toLowerCase().includes("standup bot") &&
                  !String(u?.email || "").toLowerCase().includes("standup-bot@")
              )
            : []
        );
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setSprints(Array.isArray(sprintsData) ? sprintsData : []);
        setEpics(Array.isArray(epicsData) ? epicsData : []);
        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setComponents(Array.isArray(componentsData) ? componentsData : []);
        setVersions(Array.isArray(versionsData) ? versionsData : []);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load task:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    loadTask();

    // Track viewing
    const socket = getSocket();
    const userId = currentUser?.id;
    const userName = currentUser?.name;
    
    if (userId && task.id) {
      socket.emit('task:viewing', { 
        taskId: task.id, 
        userId, 
        userName: userName || 'Unknown',
        avatar: (currentUser as any)?.avatar,
      });
    }

    const handleViewingUpdate = (data: { taskId: string; users: Array<{ userId: string; name: string; avatar?: string }> }) => {
      if (!cancelled && data.taskId === task.id) {
        const mapped = data.users.map(u => ({
          userId: u.userId,
          name: u.name,
          initials: u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          avatar: u.avatar,
          isViewing: true,
        }));
        setViewingUsers(mapped);
      }
    };

    socket.on('task:viewing:update', handleViewingUpdate);

    return () => {
      cancelled = true;
      if (userId && task.id) {
        socket.emit('task:viewing:stop', { taskId: task.id, userId });
      }
      socket.off('task:viewing:update', handleViewingUpdate);
    };
  }, [open, task?.id]);

  // โหลดไฟล์สำหรับ preview (PDF/รูป) ด้วย auth เพื่อ bypass CORS + X-Frame-Options
  useEffect(() => {
    if (!previewAttachment) {
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
      setPreviewObjectUrl(null);
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      try {
        const token = auth.getToken() || (await auth.refreshAccessToken());
        const src = previewAttachment.fetchUrl || previewAttachment.url;
        const res = await fetch(src, {
          method: "GET",
          mode: "cors",
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok || cancelled) {
          console.warn("Preview fetch failed", res.status, res.statusText);
          if (!cancelled) {
            // fallback: ใช้ URL ตรง (อาจโดน X-Frame-Options สำหรับ PDF)
            setPreviewObjectUrl(previewAttachment.url);
          }
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        if (previewBlobUrlRef.current) {
          URL.revokeObjectURL(previewBlobUrlRef.current);
        }
        previewBlobUrlRef.current = url;
        setPreviewObjectUrl(url);
      } catch (err) {
        console.error("Failed to load preview blob", err);
        if (!cancelled) {
          setPreviewObjectUrl(previewAttachment.url);
        }
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
      setPreviewObjectUrl(null);
    };
  }, [previewAttachment?.fetchUrl, previewAttachment?.url]);

  const closePreview = useCallback(() => {
    setPreviewAttachment(null);
    if (previewBlobUrlRef.current) {
      URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = null;
    }
    setPreviewObjectUrl(null);
  }, []);

  // สร้าง full URL สำหรับไฟล์แนบ (เหมือน Shared Drive) — ใช้สำหรับเปิดในแท็บใหม่ / thumbnail
  const getAttachmentPreviewUrl = (att: { url: string }) => {
    const u = att.url || "";
    return u.startsWith("http") ? u : `${API_BASE}${u}`;
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !task?.id || !currentUser) return;
    setSendingComment(true);
    try {
      const newComment = await apiPost<any>(`/tasks/${task.id}/comments`, {
        userId: currentUser.id,
        text: comment,
      });
      const enrichedComment = {
        ...newComment,
        text: newComment.text ?? comment,
        user: newComment.user || {
          id: currentUser.id,
          name: currentUser.name || "You",
        },
        createdAt: newComment.createdAt ?? new Date().toISOString(),
      };
      setComments((prev) => [...prev, enrichedComment]);
      setComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSendingComment(false);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !task?.id) return;
    const title = newSubtaskTitle.trim();
    try {
      // Create as real Task with parentTaskId (relational subtask)
      const newChild = await apiPost<any>('/tasks', {
        title,
        parentTaskId: task.id,
        issueType: 'subtask',
        status: 'todo',
        createdBy: currentUser?.id,
      });
      if (newChild?.id) {
        setChildTasks((prev) => [...prev, {
          id: newChild.id,
          title: newChild.title ?? title,
          status: newChild.status ?? 'todo',
          priority: newChild.priority ?? 'medium',
          assigneeId: newChild.assigneeId ?? null,
        }]);
      }
      setNewSubtaskTitle("");
    } catch (err) {
      console.error("Failed to add subtask:", err);
      // Fallback: try legacy subtask API
      try {
        const fallback = await apiPost<any>(`/tasks/${task.id}/subtasks`, { title });
        setSubtasks((prev) => [...prev, {
          id: fallback.id,
          title: fallback.title ?? title,
          isCompleted: fallback.isCompleted ?? false,
          position: fallback.position ?? 0,
        }]);
        setNewSubtaskTitle("");
      } catch (fallbackErr) {
        console.error("Fallback subtask creation failed:", fallbackErr);
      }
    }
  };

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    if (!subtaskId) return;
    try {
      await apiPatch(`/tasks/subtasks/${subtaskId}`, {
        isCompleted: !isCompleted,
      });
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, isCompleted: !isCompleted } : s))
      );
    } catch (err) {
      console.error("Failed to update subtask:", err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!subtaskId) return;
    try {
      await apiDelete(`/tasks/subtasks/${subtaskId}`);
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    } catch (err) {
      console.error("Failed to delete subtask:", err);
    }
  };

  const handleAddTimeEntry = async () => {
    if (!newTimeHours || !task?.id || !currentUser) return;
    try {
      const newEntry = await apiPost<any>(`/tasks/${task.id}/time-entries`, {
        userId: currentUser.id,
        hours: parseFloat(newTimeHours),
        description: newTimeDescription || undefined,
      });
      setTimeEntries((prev) => [newEntry, ...prev]);
      setNewTimeHours("");
      setNewTimeDescription("");
    } catch (err) {
      console.error("Failed to add time entry:", err);
    }
  };

  const handleDeleteTimeEntry = async (timeEntryId: string) => {
    try {
      await apiDelete(`/tasks/time-entries/${timeEntryId}`);
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

      let token = auth.getToken() || (await auth.refreshAccessToken());
      const uploadUrl = `${API_BASE}/api/upload${file.name ? `?filename=${encodeURIComponent(file.name)}` : ""}`;

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
        body: formData,
      });

      if (uploadRes.ok) {
        const raw = await uploadRes.json();
        const meta = raw?.data ?? raw;
        const url: string | undefined = meta?.url;
        // ใช้ file.name จาก browser เพื่อรองรับภาษาไทย (backend/multer อาจ decode ผิด)
        const name: string =
          file.name || meta?.name || meta?.filename || "attachment";
        const size: number | undefined = meta?.size;
        const mimetype: string | undefined = meta?.mimetype || meta?.mimeType || file.type || undefined;

        if (!url || !name) {
          console.error("Upload response missing url or name", { raw, meta });
          return;
        }
        const newAttachment = await apiPost<any>(`/tasks/${task.id}/attachments`, {
          userId: currentUser.id,
          name,
          url,
          mimeType: mimetype,
          size,
        });
        setAttachments((prev) => [...prev, newAttachment]);
      }
    } catch (err) {
      console.error("Failed to upload attachment:", err);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await apiDelete(`/tasks/attachments/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      console.error("Failed to delete attachment:", err);
    }
  };

  const handleDeleteTask = async () => {
    if (!task?.id) return;
    let canProceed = false;
    try {
      await apiDelete(`/tasks/${task.id}`);
      canProceed = true;
    } catch (err: any) {
      console.error("Failed to delete task:", err);
      // ถ้า backend ตอบว่า "Task not found" ให้ถือว่า task ถูกลบไปแล้ว
      if (err?.message && typeof err.message === "string" && err.message.toLowerCase().includes("task not found")) {
        canProceed = true;
      }
    }

    if (canProceed) {
      if (onDeleted) {
        onDeleted(task.id);
      } else {
        onOpenChange(false);
      }
    }
  };

  const handleUpdateField = async (field: string, value: any) => {
    // Allow field updates even if currentUser is temporarily unavailable
    // (e.g. local auth storage issue). Backend treats userId as optional.
    if (!task?.id) return;
    
    // Store current taskData for reference
    const currentData = taskData || task;
    
    // Optimistic update - update UI immediately
    if (taskData) {
      setTaskData((prev: any) => {
        const updated = {
          ...prev,
          [field]: value,
        };
        
        // Handle related object updates
        if (field === 'projectId') {
          if (value === null) {
            updated.project = null;
          } else {
            // Preserve project object if it matches, or find it from projects list
            const project = projects.find((p: any) => p.id === value);
            if (project) {
              updated.project = project;
            } else if (prev.project?.id === value) {
              // Keep existing project object if ID matches
              updated.project = prev.project;
            }
          }
        } else if (field === 'sprintId') {
          if (value === null) {
            updated.sprint = null;
          } else {
            const sprint = sprints.find((s: any) => s.id === value);
            if (sprint) {
              updated.sprint = sprint;
            } else if (prev.sprint?.id === value) {
              updated.sprint = prev.sprint;
            }
          }
        } else if (field === 'epicId') {
          if (value === null) {
            updated.epic = null;
          } else {
            const epic = epics.find((e: any) => e.id === value);
            if (epic) {
              updated.epic = epic;
            } else if (prev.epic?.id === value) {
              updated.epic = prev.epic;
            }
          }
        } else if (field === 'assigneeId') {
          if (value === null) {
            updated.assignee = null;
          } else {
            const user = users.find((u: any) => u.id === value);
            if (user) {
              updated.assignee = {
                id: user.id,
                name: user.name,
                initials: user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?",
              };
            } else if (prev.assignee?.id === value) {
              updated.assignee = prev.assignee;
            }
          }
        } else if (value === null) {
          // Clear related object if field is cleared
          const relatedField = field.replace('Id', '');
          if (relatedField !== field) {
            updated[relatedField] = null;
          }
        }
        
        return updated;
      });
    } else {
      // If no taskData, create initial state from task prop
      const initialData: any = {
        ...task,
        [field]: value,
      };
      
      // Handle related objects for initial state
      if (field === 'projectId' && value !== null) {
        const project = projects.find((p: any) => p.id === value);
        if (project) {
          initialData.project = project;
        }
      } else if (field === 'projectId' && value === null) {
        initialData.project = null;
      }
      
      setTaskData(initialData);
    }
    
    try {
      // Call API and get updated task data
      const updatedTask = await apiPatch<any>(`/tasks/${task.id}`, {
        [field]: value,
        userId: currentUser?.id,
      });
      
      // Update state with API response (which includes all related objects)
      if (updatedTask) {
        // Merge with current state to preserve any optimistic updates
        setTaskData((prev: any) => ({
          ...prev,
          ...updatedTask,
          // Ensure projectId and project object are in sync
          projectId: updatedTask.projectId ?? updatedTask.project?.id ?? prev.projectId,
          project: updatedTask.project ?? (updatedTask.projectId ? projects.find((p: any) => p.id === updatedTask.projectId) : null) ?? prev.project,
          // Ensure other related objects are in sync
          sprintId: updatedTask.sprintId ?? updatedTask.sprint?.id ?? prev.sprintId,
          sprint: updatedTask.sprint ?? (updatedTask.sprintId ? sprints.find((s: any) => s.id === updatedTask.sprintId) : null) ?? prev.sprint,
          epicId: updatedTask.epicId ?? updatedTask.epic?.id ?? prev.epicId,
          epic: updatedTask.epic ?? (updatedTask.epicId ? epics.find((e: any) => e.id === updatedTask.epicId) : null) ?? prev.epic,
          assigneeId: updatedTask.assigneeId ?? updatedTask.assignee?.id ?? prev.assigneeId,
          assignee: updatedTask.assignee ?? (updatedTask.assigneeId ? users.find((u: any) => u.id === updatedTask.assigneeId) : null) ?? prev.assignee,
        }));
        if (updatedTask.activityLog) {
          setActivityLog(updatedTask.activityLog);
        }
      } else {
        // Fallback: reload if response doesn't include full task
        const data = await apiGet<any>(`/tasks/${task.id}`);
        setTaskData((prev: any) => ({
          ...prev,
          ...data,
          // Ensure related objects are preserved
          projectId: data.projectId ?? data.project?.id ?? prev.projectId,
          project: data.project ?? (data.projectId ? projects.find((p: any) => p.id === data.projectId) : null) ?? prev.project,
        }));
        setActivityLog(data.activityLog || []);
      }
    } catch (err) {
      console.error("Failed to update field:", err);
      // Revert on error - reload original data
      try {
        const data = await apiGet<any>(`/tasks/${task.id}`);
        setTaskData((prev: any) => ({
          ...prev,
          ...data,
          // Ensure related objects are preserved
          projectId: data.projectId ?? data.project?.id ?? prev.projectId,
          project: data.project ?? (data.projectId ? projects.find((p: any) => p.id === data.projectId) : null) ?? prev.project,
        }));
        setActivityLog(data.activityLog || []);
      } catch (reloadErr) {
        console.error("Failed to reload task:", reloadErr);
      }
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
  const totalTimeSpent = timeEntries.reduce((sum, e) => sum + ((e.duration ? e.duration / 3600 : 0) || (e.hours || 0)), 0);
  const completedSubtasks = subtasks.filter((s) => s.isCompleted).length + childTasks.filter((c) => c.status === 'done').length;
  const totalSubtasks = subtasks.length + childTasks.length;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-b from-background via-background to-muted/40">
          <DialogHeader className="shrink-0 pb-4 border-b border-border/60">
            <DialogDescription className="sr-only">Task details and management</DialogDescription>

            {/* Presence + Meta strip */}
            <div className="flex items-start justify-between mb-3">
              {viewingUsers.length > 0 ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>กำลังดู:</span>
                  <PresenceIndicator users={viewingUsers} maxVisible={5} />
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">Task detail</span>
              )}

              <div className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {(displayTask.estimate ?? 0).toFixed(1)}h ·{" "}
                  {completedSubtasks}/{totalSubtasks || 0} subtasks
                </span>
              </div>
            </div>

            {/* Title + status / priority */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 min-w-0">
                {editingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-xl font-semibold"
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
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingTitle(false);
                        setEditedTitle(displayTask.title || "");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5">
                      <CheckSquare className="w-4 h-4 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-semibold leading-snug">
                      <button
                        type="button"
                        onClick={() => setEditingTitle(true)}
                        className="inline-flex items-center gap-2 rounded-md px-1 -mx-1 py-0.5 hover:bg-muted/60 transition-colors group"
                      >
                        <span className="truncate max-w-[32rem] text-left">
                          {displayTask.title || task.title}
                        </span>
                        <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </button>
                    </DialogTitle>
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {displayTask.project?.key && (
                    <Badge variant="outline" className="h-6 rounded-full px-2 text-[11px]">
                      {displayTask.project.key}
                    </Badge>
                  )}
                  {displayTask.issueType && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5">
                      <FileText className="w-3 h-3" />
                      <span className="capitalize">{displayTask.issueType}</span>
                    </span>
                  )}
                  {displayTask.epic?.name && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5">
                      <Target className="w-3 h-3" />
                      <span className="truncate max-w-[10rem]">{displayTask.epic.name}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Status / Priority summary pill */}
              <div className="flex flex-col gap-2 items-stretch sm:items-end">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
                  <span className="text-xs font-medium capitalize">
                    {displayTask.status?.replace("_", " ") || "To Do"}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <PriorityIcon className="w-3.5 h-3.5" />
                  <span>{priority.label} priority</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.35fr)]">
              {/* Left Column - main content */}
              <div className="space-y-4">
                {/* Description */}
                <section className="rounded-2xl border border-border/40 bg-background/95 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Description
                      </Label>
                    </div>
                  </div>
                  {editingDescription ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="min-h-[140px] text-sm"
                        autoFocus
                      />
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <Button size="sm" onClick={handleSaveDescription}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingDescription(false);
                            setEditedDescription(displayTask?.description || "");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingDescription(true);
                        setEditedDescription(displayTask?.description || "");
                      }}
                      className="group flex w-full items-start gap-2 rounded-xl border border-dashed border-border/60 bg-muted/40 px-3 py-3 text-left hover:border-primary/50 hover:bg-muted/60 transition-colors"
                    >
                      <p className="flex-1 whitespace-pre-wrap text-sm text-foreground">
                        {displayTask?.description || "คลิกเพื่อเขียนรายละเอียดงาน เช่น Objective, Scope, Note สำคัญ ฯลฯ"}
                      </p>
                      <Edit2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-60 group-hover:text-primary group-hover:opacity-100" />
                    </button>
                  )}
                </section>

                {/* Subtasks */}
                <section className="rounded-2xl border border-border/40 bg-background/95 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" />
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Subtasks
                      </Label>
                      <Badge variant="outline" className="h-5 rounded-full px-2 text-[11px]">
                        {completedSubtasks}/{totalSubtasks || 0} done
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {subtasks.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        ยังไม่มี subtask แยกงานออกเป็น step เล็กๆ เพื่อให้ track progress ได้ชัดเจน
                      </p>
                    )}
                    {subtasks.map((subtask, index) => (
                      <div
                        key={subtask.id || `subtask-${index}`}
                        className="group flex items-center gap-3 rounded-xl border border-transparent bg-muted/40 px-3 py-2 hover:border-primary/40 hover:bg-muted/70 transition-colors"
                      >
                        <button
                          onClick={() => handleToggleSubtask(subtask.id, subtask.isCompleted)}
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] transition-colors",
                            subtask.isCompleted
                              ? "border-emerald-500 bg-emerald-500 text-emerald-50"
                              : "border-muted-foreground/30 bg-background hover:border-primary/60"
                          )}
                        >
                          {subtask.isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                        <span
                          className={cn(
                            "flex-1 text-sm",
                            subtask.isCompleted && "text-muted-foreground line-through"
                          )}
                        >
                          {subtask.title ?? subtask.content ?? ""}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteSubtask(subtask.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}

                    {/* Relational child tasks (real Task records with parentTaskId) */}
                    {childTasks.map((child, index) => (
                      <div
                        key={child.id || `child-${index}`}
                        className="group flex items-center gap-3 rounded-xl border border-transparent bg-muted/40 px-3 py-2 hover:border-primary/40 hover:bg-muted/70 transition-colors"
                      >
                        <div
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] transition-colors",
                            child.status === 'done'
                              ? "border-emerald-500 bg-emerald-500 text-emerald-50"
                              : "border-muted-foreground/30 bg-background"
                          )}
                        >
                          {child.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                        <span
                          className={cn(
                            "flex-1 text-sm",
                            child.status === 'done' && "text-muted-foreground line-through"
                          )}
                        >
                          {child.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {child.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}

                    <div className="flex gap-2 pt-1">
                      <Input
                        placeholder="เพิ่ม subtask ใหม่..."
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
                        <Plus className="mr-1 h-4 w-4" />
                        เพิ่ม
                      </Button>
                    </div>
                  </div>
                </section>

                {/* Attachments */}
                <section className="rounded-2xl border border-border/40 bg-background/95 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Attachments
                      </Label>
                    </div>
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    รองรับรูปภาพ, PDF, เอกสารทั่วไป (สูงสุด 50MB) — ชื่อไฟล์ภาษาไทยได้
                  </p>
                  <div className="space-y-2">
                    {attachments.map((att, index) => {
                      const fullUrl = getAttachmentPreviewUrl(att);
                      const mimetype = (att.mimeType || att.mimetype || "").toLowerCase();
                      const isPdf =
                        mimetype.includes("pdf") || (att.name || "").toLowerCase().endsWith(".pdf");
                      const isImage =
                        mimetype.startsWith("image/") ||
                        /\.(jpe?g|png|gif|webp|bmp)$/i.test(att.name || "");
                      const canPreview = isPdf || isImage;
                      return (
                        <div
                          key={att.id || `attachment-${index}`}
                          className="group flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5 hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {isImage ? (
                              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted">
                                <img src={fullUrl} alt="" className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            {canPreview ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const fetchUrl = fullUrl;
                                  setPreviewAttachment({
                                    url: fullUrl,
                                    fetchUrl,
                                    name: att.name || "ไฟล์",
                                    mimetype:
                                      isPdf ? "application/pdf" : mimetype || (isImage ? "image/*" : ""),
                                  });
                                }}
                                className="truncate text-sm text-foreground hover:text-primary text-left"
                              >
                                {att.name}
                              </button>
                            ) : (
                              <a
                                href={fullUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate text-sm text-foreground hover:text-primary"
                              >
                                {att.name}
                              </a>
                            )}
                            {att.size && (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {(att.size / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteAttachment(att.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground hover:border-primary/60 hover:bg-muted/40 transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>Upload file</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadAttachment(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </section>

                {/* Comments */}
                <section className="rounded-2xl border border-border/40 bg-background/95 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Comments
                      </Label>
                      <Badge variant="outline" className="h-5 rounded-full px-2 text-[11px]">
                        {comments.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="mb-3 max-h-80 space-y-3 overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        ยังไม่มี comment เริ่ม thread แรกเพื่อ sync ทีม
                      </div>
                    ) : (
                      comments.map((c: any, index: number) => {
                        const createdAt = c.createdAt;
                        const dateStr = createdAt
                          ? (() => {
                              const d = new Date(createdAt);
                              return isNaN(d.getTime()) ? "—" : d.toLocaleString("th-TH");
                            })()
                          : "—";
                        return (
                          <motion.div
                            key={c.id || `comment-${index}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3"
                          >
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={c.user?.avatar} alt={c.user?.name || "Avatar"} />
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                {c.user?.name
                                  ?.split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {c.user?.name || "Unknown"}
                              </p>
                              <div className="mt-1 rounded-lg bg-muted/60 p-2.5 text-sm text-foreground whitespace-pre-wrap">
                                {c.text ?? c.content ?? ""}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{dateStr}</p>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        (e.preventDefault(), handleAddComment())
                      }
                      placeholder="เขียน comment เพื่อถาม/อัปเดตทีม..."
                      className="text-sm"
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={sendingComment || !comment.trim()}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </section>

                {/* Linked Issues */}
                <LinkedIssuesSection taskId={task.id} />

                {/* Activity History */}
                <section className="rounded-2xl border border-border/40 bg-background/95 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Activity
                      </Label>
                      <Badge variant="outline" className="h-5 rounded-full px-2 text-[11px]">
                        {activityLog.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {activityLog.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No activity recorded yet</p>
                    ) : (
                      activityLog.map((log: any, index: number) => {
                        const logDate = log.createdAt
                          ? (() => {
                              const d = new Date(log.createdAt);
                              return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                            })()
                          : "—";
                        const actionLabel: Record<string, string> = {
                          created: "created this task",
                          status_changed: "changed status",
                          assigned: "changed assignee",
                          priority_changed: "changed priority",
                          due_date_changed: "changed due date",
                          sprint_changed: "changed sprint",
                          epic_changed: "changed epic",
                          story_points_changed: "changed story points",
                          link_created: "linked an issue",
                          link_removed: "unlinked an issue",
                        };
                        return (
                          <div key={log.id || `activity-${index}`} className="flex items-start gap-2.5 text-xs group">
                            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-foreground">{log.user?.name || "System"}</span>{" "}
                              <span className="text-muted-foreground">
                                {actionLabel[log.action] || log.action?.replace(/_/g, " ")}
                              </span>
                              {log.oldValue && log.newValue && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  <span className="line-through opacity-60">{log.oldValue}</span>
                                  {" → "}
                                  <span className="font-medium text-foreground">{log.newValue}</span>
                                </span>
                              )}
                              {!log.oldValue && log.newValue && (
                                <span className="text-muted-foreground"> → <span className="font-medium text-foreground">{log.newValue}</span></span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground/50 shrink-0">{logDate}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>

              {/* Right Column - summary + controls */}
              <div className="space-y-4 lg:border-l lg:border-border/60 lg:pl-5">
                {/* Compact summary card */}
                <section className="rounded-2xl border border-border/40 bg-background/95 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Task Summary
                    </Label>
                    <Badge variant="outline" className="h-5 rounded-full px-2 text-[11px]">
                      {displayTask.storyPoints ?? 0} pts
                    </Badge>
                  </div>
                  <div className="space-y-3 text-sm">
                    {/* Assignee */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        Assignee
                      </span>
                      <div className="flex-1">
                        <Select
                          value={
                            displayTask.assigneeId && displayTask.assigneeId !== "none"
                              ? String(displayTask.assigneeId)
                              : displayTask.assignee?.id && displayTask.assignee.id !== "none"
                              ? String(displayTask.assignee.id)
                              : "none"
                          }
                          onValueChange={(v) => handleUpdateField("assigneeId", v === "none" ? null : v)}
                        >
                          <SelectTrigger className="h-8 w-full justify-between">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={String(u.id)}>
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Additional Assignees
                      </Label>
                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between h-8 text-xs font-normal",
                              (!displayTask.assignments || displayTask.assignments.length === 0) && "text-muted-foreground"
                            )}
                          >
                            {displayTask.assignments && displayTask.assignments.length > 0 ? (
                              <div className="flex gap-1 overflow-hidden">
                                {displayTask.assignments.slice(0, 3).map((a: any) => {
                                  const userId = a.userId || a.user?.id;
                                  const user = users.find(u => u.id === userId);
                                  return user ? (
                                    <Badge variant="secondary" key={`badge-extra-${userId}`} className="text-[10px] h-5 rounded-sm px-1.5 font-normal">
                                      {user.name.split(' ')[0]}
                                    </Badge>
                                  ) : null;
                                })}
                                {displayTask.assignments.length > 3 && (
                                  <Badge variant="secondary" className="text-[10px] h-5 rounded-sm px-1.5 font-normal">
                                    +{displayTask.assignments.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              "Select members..."
                            )}
                            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search users..." className="h-9 text-xs" />
                            <CommandList>
                              <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">No users found.</CommandEmpty>
                              <CommandGroup className="max-h-60 overflow-y-auto">
                                {users.map((user) => {
                                  const existing = Array.isArray(displayTask.assignments)
                                    ? displayTask.assignments.map((a: any) => a.userId || a.user?.id).filter(Boolean)
                                    : [];
                                  const isSelected = existing.includes(user.id);
                                  
                                  return (
                                    <CommandItem
                                      key={`cmd-extra-${user.id}`}
                                      value={user.name}
                                      onSelect={() => {
                                        const next = isSelected
                                          ? existing.filter((id: string) => id !== user.id)
                                          : [...existing, user.id];
                                        handleUpdateField("assigneeIds", next);
                                      }}
                                      className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer"
                                    >
                                      <div className={cn(
                                        "mr-1 flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border",
                                        isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 opacity-50"
                                      )}>
                                        {isSelected && <Check className="h-2.5 w-2.5" />}
                                      </div>
                                      <Avatar className="h-5 w-5 rounded-full border border-border/50">
                                        <AvatarImage src={user.avatar} />
                                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                          {user.name?.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{user.name}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] text-muted-foreground">Recurring Task</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!displayTask.isRecurring}
                          onChange={(e) => handleUpdateField("isRecurring", e.target.checked)}
                        />
                        <span className="text-xs">Enable recurring</span>
                      </div>
                      {displayTask.isRecurring && (
                        <div className="grid grid-cols-3 gap-2">
                          <Select
                            value={displayTask.recurringPattern || "weekly"}
                            onValueChange={(v) => handleUpdateField("recurringPattern", v)}
                          >
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min="1"
                            className="h-8"
                            value={String(displayTask.recurringInterval || 1)}
                            onChange={(e) => handleUpdateField("recurringInterval", Number(e.target.value || 1))}
                          />
                          <Input
                            type="date"
                            className="h-8"
                            value={displayTask.recurringEndDate ? new Date(displayTask.recurringEndDate).toISOString().slice(0,10) : ""}
                            onChange={(e) => handleUpdateField("recurringEndDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Zap className="h-3.5 w-3.5" />
                        Status
                      </span>
                      <div className="flex-1">
                        <Select
                          value={displayTask.status || "todo"}
                          onValueChange={(v) => handleUpdateField("status", v)}
                        >
                          <SelectTrigger className="h-8 w-full justify-between">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="in_review">In Review</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="canceled">Canceled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Flag className="h-3.5 w-3.5" />
                        Priority
                      </span>
                      <div className="flex-1">
                        <Select
                          value={displayTask.priority || "medium"}
                          onValueChange={(v) => handleUpdateField("priority", v)}
                        >
                          <SelectTrigger className="h-8 w-full justify-between">
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
                    </div>

                    {/* Project */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Rocket className="h-3.5 w-3.5" />
                        Project
                      </span>
                      <div className="flex-1">
                        <Select
                          value={
                            displayTask.projectId && displayTask.projectId !== "none"
                              ? String(displayTask.projectId)
                              : displayTask.project?.id && displayTask.project.id !== "none"
                              ? String(displayTask.project.id)
                              : "none"
                          }
                          onValueChange={(v) =>
                            handleUpdateField("projectId", v === "none" ? null : v)
                          }
                        >
                          <SelectTrigger className="h-8 w-full justify-between">
                            <SelectValue placeholder="No project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Project</SelectItem>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                <div className="flex items-center gap-2">
                                  {p.color && (
                                    <div
                                      className="h-3 w-3 rounded-full"
                                      style={{ backgroundColor: p.color }}
                                    />
                                  )}
                                  <span className="font-mono text-[11px]">{p.key}</span>
                                  <span>{p.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Sprint */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Target className="h-3.5 w-3.5" />
                        Sprint
                      </span>
                      <div className="flex-1">
                        <Select
                          value={
                            displayTask.sprintId && displayTask.sprintId !== "none"
                              ? String(displayTask.sprintId)
                              : displayTask.sprint?.id && displayTask.sprint.id !== "none"
                              ? String(displayTask.sprint.id)
                              : "none"
                          }
                          onValueChange={(v) => handleUpdateField("sprintId", v === "none" ? null : v)}
                        >
                          <SelectTrigger className="h-8 w-full justify-between">
                            <SelectValue placeholder="No sprint" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Sprint</SelectItem>
                            {sprints.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Epic */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Target className="h-3.5 w-3.5" />
                        Epic
                      </span>
                      <div className="flex-1">
                        <Select
                          value={
                            displayTask.epicId && displayTask.epicId !== "none"
                              ? String(displayTask.epicId)
                              : displayTask.epic?.id && displayTask.epic.id !== "none"
                              ? String(displayTask.epic.id)
                              : "none"
                          }
                          onValueChange={(v) => handleUpdateField("epicId", v === "none" ? null : v)}
                        >
                          <SelectTrigger className="h-8 w-full justify-between">
                            <SelectValue placeholder="No epic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Epic</SelectItem>
                            {epics.map((e) => (
                              <SelectItem key={e.id} value={String(e.id)}>
                                <div className="flex items-center gap-2">
                                  {e.color && (
                                    <div
                                      className="h-3 w-3 rounded-full"
                                      style={{ backgroundColor: e.color }}
                                    />
                                  )}
                                  {e.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Component */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Package className="h-3.5 w-3.5" />
                        Component
                      </span>
                      <div className="flex-1">
                        <Select
                          value={
                            displayTask.componentId
                              ? displayTask.componentId
                              : displayTask.component?.id
                              ? displayTask.component.id
                              : "none"
                          }
                          onValueChange={(v) =>
                            handleUpdateField("componentId", v === "none" ? null : v)
                          }
                        >
                          <SelectTrigger className="h-8 w-full justify-between">
                            <SelectValue placeholder="No component" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Component</SelectItem>
                            {components.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Version */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Tag className="h-3.5 w-3.5" />
                        Version
                      </span>
                      <div className="flex-1">
                        <Select
                          value={
                            displayTask.versionId
                              ? displayTask.versionId
                              : displayTask.version?.id
                              ? displayTask.version.id
                              : "none"
                          }
                          onValueChange={(v) =>
                            handleUpdateField("versionId", v === "none" ? null : v)
                          }
                        >
                          <SelectTrigger className="h-8 w-full justify-between">
                            <SelectValue placeholder="No version" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Version</SelectItem>
                            {versions
                              .sort((a, b) => {
                                if (a.released && !b.released) return -1;
                                if (!a.released && b.released) return 1;
                                return a.name.localeCompare(b.name);
                              })
                              .map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  <div className="flex w-full items-center gap-2">
                                    <span className="flex-1">{v.name}</span>
                                    {v.released && (
                                      <span className="text-[10px] font-semibold text-emerald-600">
                                        ✓ Released
                                      </span>
                                    )}
                                    {v.releaseDate && (
                                      <span className="text-[10px] text-muted-foreground">
                                        (
                                        {new Date(v.releaseDate).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                        )
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Due date */}
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        Due date
                      </span>
                      <div className="flex-1">
                        <Input
                          type="date"
                          value={
                            displayTask.dueDate
                              ? new Date(displayTask.dueDate).toISOString().split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            handleUpdateField(
                              "dueDate",
                              e.target.value ? new Date(e.target.value).toISOString() : null
                            )
                          }
                          className="h-8 w-full"
                        />
                      </div>
                    </div>

                    {/* Estimate / Story points */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                          Original estimate (h)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={displayTask.estimate ?? ""}
                          onChange={(e) =>
                            handleUpdateField(
                              "estimate",
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                          placeholder="8"
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                          Story points
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={displayTask.storyPoints || ""}
                          onChange={(e) =>
                            handleUpdateField(
                              "storyPoints",
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          placeholder="5"
                          className="h-8"
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="pt-1">
                      <Label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                        Tags
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {(displayTask.tags || []).length > 0 ? (
                          displayTask.tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-[11px]">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No tags</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Time tracking */}
                <section className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Time Tracking
                      </Label>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>
                        Est: <strong>{(displayTask.estimate ?? 0).toFixed(1)}h</strong>
                      </span>
                      <span>
                        Spent: <strong>{totalTimeSpent.toFixed(1)}h</strong>
                      </span>
                      <span>
                        Remaining:{" "}
                        <strong>
                          {Math.max(0, (displayTask.estimate ?? 0) - totalTimeSpent).toFixed(1)}h
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="mb-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                    {timeEntries.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        ยังไม่มีการ log เวลา ลองเริ่มบันทึกเพื่อดู effort ที่ใช้จริง
                      </p>
                    ) : (
                      timeEntries.slice(0, 5).map((entry, index) => (
                        <div
                          key={entry.id || `time-entry-${index}`}
                          className="group flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5 hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={entry.user?.avatar} alt={entry.user?.name || "Avatar"} />
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                {entry.user?.name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {entry.user?.name || "Unknown"}
                              </p>
                              {entry.description && (
                                <p className="text-xs text-muted-foreground">
                                  {entry.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(entry.startTime || entry.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">
                              {(
                                (entry.duration ? entry.duration / 3600 : 0) ||
                                entry.hours ||
                                0
                              ).toFixed(1)}
                              h
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100"
                              onClick={() => handleDeleteTimeEntry(entry.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2 border-t pt-2">
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
                    <Button
                      onClick={handleAddTimeEntry}
                      disabled={!newTimeHours}
                      className="w-full"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Time Entry
                    </Button>
                  </div>
                </section>

                {/* Watchers */}
                <WatchersSection taskId={task.id} currentUserId={currentUser?.id} />

                {/* Activity */}
                <section className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Activity
                      </Label>
                    </div>
                  </div>
                  <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                    {activityLog.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        ยังไม่มี activity จากระบบหรือทีม
                      </div>
                    ) : (
                      activityLog.map((log: any, index: number) => {
                        const actionText =
                          log.action === "created"
                            ? "created this task"
                            : log.action === "status_changed"
                            ? `changed status from ${log.oldValue} to ${log.newValue}`
                            : log.action === "assigned"
                            ? `assigned to ${log.newValue ? "someone" : "unassigned"}`
                            : log.action === "sprint_changed"
                            ? `moved to sprint ${log.newValue || "none"}`
                            : log.action === "epic_changed"
                            ? `moved to epic ${log.newValue || "none"}`
                            : log.action === "story_points_changed"
                            ? `changed story points to ${log.newValue}`
                            : log.action;
                        return (
                          <motion.div
                            key={log.id || `log-${index}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3"
                          >
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={log.user?.avatar} alt={log.user?.name || "Avatar"} />
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                {log.user?.name
                                  ?.split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-medium text-foreground">
                                  {log.user?.name || "System"}
                                </span>{" "}
                                <span className="text-muted-foreground">{actionText}</span>
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </section>

                {/* Reporter + Danger zone */}
                <section className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm shadow-black/5 space-y-3">
                  {(() => {
                    const createdLog = activityLog.find((l: any) => l.action === "created");
                    const reporter = createdLog?.user;
                    return reporter ? (
                      <div>
                        <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Reporter
                        </Label>
                        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={reporter.avatar} alt={reporter.name || "Avatar"} />
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                              {reporter.name
                                ?.split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{reporter.name}</span>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div>
                    <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-destructive">
                      Danger zone
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center border-destructive/40 text-destructive hover:bg-destructive/5 hover:border-destructive/60"
                      onClick={handleDeleteTask}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete task
                    </Button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>

    {/* PDF / รูปภาพ Preview Dialog - แสดงเฉพาะเมื่อ main dialog เปิด และ user คลิก attachment */}
    {open && previewAttachment && (
      <Dialog
        open={true}
        onOpenChange={(o) => {
          if (!o) closePreview();
        }}
      >
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0"
          onPointerDownOutside={closePreview}
          onEscapeKeyDown={closePreview}
          onInteractOutside={closePreview}
        >
          <DialogDescription className="sr-only">
            แสดงตัวอย่างไฟล์แนบ
          </DialogDescription>
          <DialogHeader className="shrink-0 px-6 py-4 border-b flex-row items-center justify-between gap-4">
            <DialogTitle className="truncate text-base font-medium">
              {previewAttachment.name}
            </DialogTitle>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={previewAttachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  เปิดในแท็บใหม่
                </a>
              </Button>
              <Button variant="ghost" size="icon" onClick={closePreview} aria-label="ปิด">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto p-4 bg-muted/30">
            {(() => {
              // ใช้ blob URL ที่โหลดผ่าน fetch (ถ้ามี) เพื่อเลี่ยง CORS + X-Frame-Options สำหรับ PDF/รูป
              const src = previewObjectUrl || previewAttachment.url;
              const isImage = (previewAttachment.mimetype || "").toLowerCase().startsWith("image/");
              const isPdf = (previewAttachment.mimetype || "").includes("pdf");
              if (isImage) {
                return (
                  <div className="flex items-center justify-center w-full min-h-[400px]">
                    <img
                      src={src}
                      alt={previewAttachment.name}
                      className="max-w-full h-auto max-h-[70vh] object-contain rounded-lg shadow-lg"
                    />
                  </div>
                );
              }
              if (isPdf) {
                return (
                  <div className="flex flex-col w-full h-full bg-background rounded-xl overflow-hidden shadow-lg border border-border/60">
                    <div className="flex-1 bg-muted/20 min-h-[500px]">
                      <iframe
                        src={src}
                        title={previewAttachment.name}
                        className="w-full h-full min-h-[500px] border-0 rounded-lg"
                      />
                    </div>
                  </div>
                );
              }
              return (
                <div className="flex flex-col items-center justify-center h-[70vh] gap-4 text-muted-foreground">
                  <p>ไม่สามารถแสดงตัวอย่างไฟล์นี้ได้</p>
                  <Button asChild>
                    <a href={src} target="_blank" rel="noopener noreferrer">
                      เปิดในแท็บใหม่
                    </a>
                  </Button>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
