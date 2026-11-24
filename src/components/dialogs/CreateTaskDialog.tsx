import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarIcon,
  ChevronDown,
  ClipboardList,
  Loader2,
  Plus,
  Repeat,
  Settings2,
  Tag,
  Users,
  X,
} from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogDescription as DialogDescription,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";
import {
  CommandDialogContent,
  commandInputClass,
  commandSelectContentClass,
} from "@/components/shared/CommandDialog";
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

const toLocalInputValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const dueDatePresets = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "+7 days", days: 7 },
];

const priorityDarkClass: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-300 ring-1 ring-red-400/25",
  high: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/25",
  medium: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25",
  low: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/20",
};

const statusDarkClass: Record<string, string> = {
  todo: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/20",
  in_progress: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/25",
  review: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25",
  done: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25",
};

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
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      Promise.all([
        apiGet<any[]>("/teams").catch(() => []),
        apiGet<TaskTemplate[]>("/tasks/templates").catch(() => []),
      ]).then(([teamRows, templateRows]) => {
        setTeams(
          Array.isArray(teamRows)
            ? teamRows.filter(
                (team: any) => team.name.toLowerCase() !== "personal recordings",
              )
            : [],
        );
        setTemplates(Array.isArray(templateRows) ? templateRows : []);
      });
    }
  }, [open]);

  useEffect(() => {
    if (teamId && teamId !== "none") {
      apiGet<any[]>(`/teams/${teamId}/members`)
        .then((response) => {
          const members = Array.isArray(response)
            ? response.map((member: any) => ({
                id: member.user?.id || member.userId,
                name: member.user?.name || "Unknown",
                email: member.user?.email || "",
                avatar: member.user?.avatar,
                role: member.role,
              }))
            : [];
          setTeamMembers(members);
          setAssigneeIds((previous) =>
            previous.filter((id) => members.some((member: any) => member.id === id)),
          );
        })
        .catch(() => setTeamMembers([]));
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
  }, [
    defaultTeamId,
    defaultStatus,
    initialTitle,
    initialDescription,
    initialTeamId,
    defaultTags,
  ]);

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
    setError(null);
  };

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    if (!id) return;
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    setTitle(template.title);
    if (template.description) setDescription(template.description);
    setPriority(template.priority || "medium");
    setTags(template.tags || []);
    if (template.storyPoints) setStoryPoints(String(template.storyPoints));
    if (template.estimate) setEstimate(String(template.estimate));
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((item) => item !== tag));
  };

  const applyDuePreset = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(18, 0, 0, 0);
    setDueDate(toLocalInputValue(date));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Give the task a title so your team knows what to do.");
      return;
    }

    setSubmitting(true);
    try {
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
      toast.success("Task created");
      onCreated?.(created);
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "The task couldn't be created. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const priorities = Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>;
  const assignableMembers = teamMembers.filter((member) => !assigneeIds.includes(member.id));

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetForm();
        onOpenChange(value);
      }}
    >
      <CommandDialogContent
        accent="amber"
        className="max-w-[780px]"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void handleSubmit();
          }
        }}
      >
        <div className="px-6 pb-4 pt-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold tracking-tight text-white">
                New task
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-relaxed text-slate-400">
                Add work to a team board. You can edit the details later.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-6 pb-5 [scrollbar-color:rgba(148,163,184,0.35)_transparent]">
          {templates.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[11px] font-medium text-slate-500">
                Start from
              </span>
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => handleTemplateSelect("")}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40",
                    templateId === ""
                      ? "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25"
                      : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.07] hover:text-white",
                  )}
                >
                  Blank
                </button>
                {templates.slice(0, 5).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template.id)}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40",
                      templateId === template.id
                        ? "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/25"
                        : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.07] hover:text-white",
                    )}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(270px,0.85fr)]">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="task-title" className="text-[11px] font-medium text-slate-400">
                  Title <span className="text-amber-400">*</span>
                </Label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setError(null);
                  }}
                  placeholder="What needs to be done?"
                  className={cn(
                    commandInputClass,
                    "h-11 text-[15px] font-medium focus-visible:ring-amber-400/30",
                  )}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-description" className="text-[11px] font-medium text-slate-400">
                  Description
                </Label>
                <Textarea
                  id="task-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add context, acceptance criteria, or links."
                  className={cn(
                    commandInputClass,
                    "h-auto min-h-[200px] resize-none py-3 text-sm focus-visible:ring-amber-400/30",
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="task-tag-input"
                  className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400"
                >
                  <Tag className="h-3.5 w-3.5 text-slate-500" />
                  Tags
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="task-tag-input"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    placeholder="Add a tag and press Enter"
                    className={cn(
                      commandInputClass,
                      "h-9 flex-1 text-sm focus-visible:ring-amber-400/30",
                    )}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 rounded-lg bg-white/[0.04] px-3 text-slate-300 hover:bg-white/[0.08] hover:text-white"
                    onClick={addTag}
                    aria-label="Add tag"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-300"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          aria-label={`Remove ${tag} tag`}
                          className="rounded-sm text-slate-500 transition-colors hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((value) => !value)}
                  className="flex w-full items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
                  aria-expanded={showAdvanced}
                >
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-3.5 w-3.5" />
                    Advanced options
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      showAdvanced && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 pt-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-slate-500">
                              Story points
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={storyPoints}
                              onChange={(event) => setStoryPoints(event.target.value)}
                              placeholder="0"
                              className={cn(
                                commandInputClass,
                                "h-9 text-sm focus-visible:ring-amber-400/30",
                              )}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-slate-500">
                              Estimate (hours)
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={estimate}
                              onChange={(event) => setEstimate(event.target.value)}
                              placeholder="0"
                              className={cn(
                                commandInputClass,
                                "h-9 text-sm focus-visible:ring-amber-400/30",
                              )}
                            />
                          </div>
                        </div>

                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Repeat className="h-3.5 w-3.5 text-violet-400" />
                              <div>
                                <p className="text-xs font-medium text-white">
                                  Recurring task
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  Repeat on a schedule
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={isRecurring}
                              onCheckedChange={setIsRecurring}
                              className="data-[state=unchecked]:bg-white/15"
                            />
                          </div>

                          {isRecurring && (
                            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3">
                              <Select
                                value={recurringPattern}
                                onValueChange={setRecurringPattern}
                              >
                                <SelectTrigger className="h-9 rounded-lg border-0 bg-white/[0.05] text-xs text-slate-200 focus:ring-2 focus:ring-amber-400/30">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className={commandSelectContentClass}>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                min="1"
                                value={recurringInterval}
                                onChange={(event) =>
                                  setRecurringInterval(parseInt(event.target.value) || 1)
                                }
                                className={cn(
                                  commandInputClass,
                                  "h-9 text-xs focus-visible:ring-amber-400/30",
                                )}
                                placeholder="Interval"
                              />
                              <Input
                                type="date"
                                value={recurringEndDate}
                                onChange={(event) => setRecurringEndDate(event.target.value)}
                                className={cn(
                                  commandInputClass,
                                  "h-9 text-xs focus-visible:ring-amber-400/30",
                                )}
                                aria-label="Recurring end date"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <aside className="space-y-4 self-start rounded-2xl bg-white/[0.03] p-4">
              <div>
                <Label className="text-[11px] font-medium text-slate-500">Priority</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {priorities.map((value) => {
                    const config = PRIORITY_CONFIG[value];
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPriority(value)}
                        className={cn(
                          "flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40",
                          priority === value
                            ? priorityDarkClass[value]
                            : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200",
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-slate-500">Status</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {ALL_STATUSES.map((value) => {
                    const config = STATUS_CONFIG[value];
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setStatus(value)}
                        className={cn(
                          "flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40",
                          status === value
                            ? statusDarkClass[value]
                            : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200",
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="space-y-1.5">
                <Label htmlFor="task-team" className="text-[11px] font-medium text-slate-500">
                  Team
                </Label>
                <Select
                  value={teamId || "none"}
                  onValueChange={(value) => setTeamId(value === "none" ? "" : value)}
                >
                  <SelectTrigger
                    id="task-team"
                    className="h-9 rounded-lg border-0 bg-white/[0.05] text-xs text-slate-200 focus:ring-2 focus:ring-amber-400/30 data-[placeholder]:text-slate-500"
                  >
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent className={commandSelectContentClass}>
                    <SelectItem value="none">No team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <Users className="h-3 w-3" />
                  Assignees
                </Label>
                <Select
                  value=""
                  onValueChange={(id) => {
                    if (id && id !== "none" && !assigneeIds.includes(id)) {
                      setAssigneeIds([...assigneeIds, id]);
                    }
                  }}
                  disabled={!teamId || teamId === "none"}
                >
                  <SelectTrigger className="h-9 rounded-lg border-0 bg-white/[0.05] text-xs text-slate-200 focus:ring-2 focus:ring-amber-400/30 data-[placeholder]:text-slate-500">
                    <SelectValue
                      placeholder={
                        teamId && teamId !== "none"
                          ? "Add an assignee"
                          : "Select a team first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className={commandSelectContentClass}>
                    {assignableMembers.length > 0 ? (
                      assignableMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <span className="flex items-center gap-2">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="bg-white/10 text-[8px] text-slate-200">
                                {member.name
                                  .split(" ")
                                  .map((part: string) => part[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {member.name}
                          </span>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-xs text-slate-500">
                        {teamId && teamId !== "none"
                          ? "No more members to add"
                          : "Select a team first"}
                      </div>
                    )}
                  </SelectContent>
                </Select>

                {assigneeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {assigneeIds.map((id) => {
                      const member = teamMembers.find((item) => item.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex max-w-full items-center gap-1 rounded-lg bg-white/[0.06] py-0.5 pl-0.5 pr-1 text-[10px] text-slate-300"
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={member?.avatar} />
                            <AvatarFallback className="bg-white/10 text-[8px] text-slate-200">
                              {(member?.name || "?")
                                .split(" ")
                                .map((part: string) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{member?.name || id}</span>
                          <button
                            type="button"
                            onClick={() => setAssigneeIds(assigneeIds.filter((item) => item !== id))}
                            aria-label={`Remove ${member?.name || "assignee"}`}
                            className="ml-0.5 text-slate-500 transition-colors hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="task-due-date"
                  className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500"
                >
                  <CalendarIcon className="h-3 w-3" />
                  Due date
                </Label>
                <Input
                  id="task-due-date"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className={cn(
                    commandInputClass,
                    "h-9 text-xs focus-visible:ring-amber-400/30",
                  )}
                />
                <div className="flex flex-wrap items-center gap-1">
                  {dueDatePresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyDuePreset(preset.days)}
                      className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
                    >
                      {preset.label}
                    </button>
                  ))}
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate("")}
                      className="rounded-md px-1.5 py-0.5 text-[10px] text-slate-500 transition-colors hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </aside>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/20"
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 bg-white/[0.02] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-500">Ctrl/⌘ + Enter to create</p>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={submitting}
              className="h-10 rounded-xl px-4 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="h-10 gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 text-sm font-semibold text-slate-950 shadow-[0_12px_36px_-12px_rgba(251,146,60,0.7)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {submitting ? "Creating…" : "Create task"}
            </Button>
          </div>
        </div>
      </CommandDialogContent>
    </Dialog>
  );
}
