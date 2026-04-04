import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  X,
  CalendarIcon,
  Tag,
  Repeat,
  Loader2,
  Users,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Task, TaskTemplate } from "@/components/tasks/types";
import { PRIORITY_CONFIG, STATUS_CONFIG, ALL_STATUSES } from "@/components/tasks/types";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (task: Task) => void;
  defaultTeamId?: string;
  defaultStatus?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialTeamId?: string;
  initialMeetingId?: string;
  defaultTags?: string[];
}

export default function CreateTaskDialog({
  open,
  onOpenChange,
  onCreated,
  defaultTeamId,
  defaultStatus,
  initialTitle,
  initialDescription,
  initialTeamId,
  initialMeetingId,
  defaultTags,
}: CreateTaskDialogProps) {
  const currentUser = auth.getUser();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [status, setStatus] = useState<string>(defaultStatus || "todo");
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [teamId, setTeamId] = useState<string>(defaultTeamId || "");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState("weekly");
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [storyPoints, setStoryPoints] = useState<string>("");
  const [estimate, setEstimate] = useState<string>("");

  const [teams, setTeams] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]); // Members of selected team
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (open) {
      Promise.all([
        apiGet<any[]>("/teams").catch(() => []),
        apiGet<TaskTemplate[]>("/tasks/templates").catch(() => []),
      ]).then(([t, tmpl]) => {
        // Filter out "Personal Recordings" - it's just a personal folder, not a real team
        setTeams(Array.isArray(t) ? t.filter((team: any) => team.name.toLowerCase() !== "personal recordings") : []);
        setTemplates(Array.isArray(tmpl) ? tmpl : []);
      });
    }
  }, [open]);

  // Fetch team members when team is selected
  useEffect(() => {
    if (teamId && teamId !== "none") {
      apiGet<any[]>(`/teams/${teamId}/members`).then((res) => {
        const members = Array.isArray(res) ? res.map((m: any) => ({
          id: m.user?.id || m.userId,
          name: m.user?.name || "Unknown",
          email: m.user?.email || "",
          avatar: m.user?.avatar,
          role: m.role,
        })) : [];
        setTeamMembers(members);
        // Clear assignees that are not in the new team
        setAssigneeIds(prev => prev.filter(id => members.some((m: any) => m.id === id)));
      }).catch(() => setTeamMembers([]));
    } else {
      setTeamMembers([]);
      setAssigneeIds([]);
    }
  }, [teamId]);

  useEffect(() => {
    if (defaultTeamId) setTeamId(defaultTeamId);
    if (initialTeamId) setTeamId(initialTeamId);
    if (defaultStatus) setStatus(defaultStatus);
    if (initialTitle) setTitle(initialTitle);
    if (initialDescription) setDescription(initialDescription);
    if (defaultTags) setTags(defaultTags);
  }, [defaultTeamId, defaultStatus, initialTitle, initialDescription, initialTeamId, defaultTags]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setStatus(defaultStatus || "todo");
    setDueDate("");
    setAssigneeIds([]);
    setTeamId(defaultTeamId || "");
    setTags([]);
    setTagInput("");
    setIsRecurring(false);
    setRecurringPattern("weekly");
    setRecurringInterval(1);
    setRecurringEndDate("");
    setTemplateId("");
    setStoryPoints("");
    setEstimate("");
    setShowAdvanced(false);
  };

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) {
      setTitle(tmpl.title);
      if (tmpl.description) setDescription(tmpl.description);
      setPriority(tmpl.priority || "medium");
      setTags(tmpl.tags || []);
      if (tmpl.storyPoints) setStoryPoints(String(tmpl.storyPoints));
      if (tmpl.estimate) setEstimate(String(tmpl.estimate));
    }
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    setSubmitting(true);
    try {
      // First assignee goes to assigneeId, rest go to watchers
      const primaryAssignee = assigneeIds[0] || null;
      const additionalAssignees = assigneeIds.slice(1);
      
      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        tags,
        createdBy: currentUser?.id,
      };
      if (dueDate) payload.dueDate = new Date(dueDate).toISOString();
      if (primaryAssignee) payload.assigneeId = primaryAssignee;
      if (additionalAssignees.length > 0) payload.watcherIds = additionalAssignees;
      if (teamId && teamId !== "none") payload.teamId = teamId;
      if (initialMeetingId) payload.meetingId = initialMeetingId;
      if (storyPoints) payload.storyPoints = parseInt(storyPoints);
      if (estimate) payload.estimate = parseFloat(estimate);
      if (isRecurring) {
        payload.isRecurring = true;
        payload.recurringPattern = recurringPattern;
        payload.recurringInterval = recurringInterval;
        if (recurringEndDate) payload.recurringEndDate = new Date(recurringEndDate).toISOString();
      }

      const created = await apiPost<Task>("/tasks", payload);
      toast.success("Task created successfully");
      onCreated?.(created);
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            Create New Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Template selector */}
          {templates.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Template</Label>
              <Select value={templateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Use a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="h-10 rounded-lg"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task..."
              className="min-h-[80px] rounded-lg resize-none"
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 rounded-lg text-sm">
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

            {/* Team & Assignees */ }
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Team</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> Assignees
              </Label>
              <Select
                value=""
                onValueChange={(id) => {
                  if (id && id !== "none" && !assigneeIds.includes(id)) {
                    setAssigneeIds([...assigneeIds, id]);
                  }
                }}
              >
                <SelectTrigger className="h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Add assignee..." />
                </SelectTrigger>
                <SelectContent>
                  {teamId && teamId !== "none" ? (
                    teamMembers.filter((u) => !assigneeIds.includes(u.id)).length > 0 ? (
                      teamMembers.filter((u) => !assigneeIds.includes(u.id)).map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No members in this team</div>
                    )
                  ) : (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Select a team first</div>
                  )}
                </SelectContent>
              </Select>
              {assigneeIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {assigneeIds.map((id) => {
                    const u = teamMembers.find((usr) => usr.id === id);
                    return (
                      <Badge key={id} variant="secondary" className="text-xs gap-1 pr-1 items-center">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={u?.avatar} />
                          <AvatarFallback className="text-[8px]">{u?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {u?.name || id}
                        <button onClick={() => setAssigneeIds(assigneeIds.filter((a) => a !== id))} className="hover:text-destructive transition-colors ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" /> Due Date
            </Label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 rounded-lg text-sm"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Tags
            </Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag..."
                className="h-9 rounded-lg text-sm flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              />
              <Button type="button" size="sm" variant="outline" className="h-9" onClick={addTag}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {showAdvanced ? "Hide" : "Show"} advanced options
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-1 border-t border-border/50">
              {/* Story Points & Estimate */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Story Points</Label>
                  <Input
                    type="number"
                    min="0"
                    value={storyPoints}
                    onChange={(e) => setStoryPoints(e.target.value)}
                    placeholder="0"
                    className="h-9 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Estimate (hours)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={estimate}
                    onChange={(e) => setEstimate(e.target.value)}
                    placeholder="0"
                    className="h-9 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Recurring */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5" /> Recurring Task
                  </Label>
                  <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                </div>
                {isRecurring && (
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={recurringPattern} onValueChange={setRecurringPattern}>
                      <SelectTrigger className="h-9 rounded-lg text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={recurringInterval}
                      onChange={(e) => setRecurringInterval(parseInt(e.target.value) || 1)}
                      className="h-9 rounded-lg text-sm"
                      placeholder="Interval"
                    />
                    <Input
                      type="date"
                      value={recurringEndDate}
                      onChange={(e) => setRecurringEndDate(e.target.value)}
                      className="h-9 rounded-lg text-sm"
                      placeholder="End date"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => { resetForm(); onOpenChange(false); }} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
