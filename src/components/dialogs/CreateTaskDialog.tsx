import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  CheckSquare, Calendar, User, Tag, Flag, Link as LinkIcon, Target, Zap, X, Package, Layers, AlertCircle, FileText, Clock, Plus, ChevronsUpDown, Check, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogDescription as DialogDescription,
  AnimatedDialogFooter as DialogFooter,
  AnimatedDialogHeader as DialogHeader,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";
import { apiGet, apiPost } from "@/lib/api";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import CreateProjectDialog from "./CreateProjectDialog";
import CreateEpicDialog from "./CreateEpicDialog";
import CreateComponentDialog from "./CreateComponentDialog";
import CreateVersionDialog from "./CreateVersionDialog";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle?: string;
  initialDescription?: string;
  initialTeamId?: string;
  initialMeetingId?: string;
  defaultTags?: string[];
  onCreated?: (task: any) => void;
}

const tagOptions = ["frontend", "backend", "design", "bug", "feature", "docs", "testing", "devops", "ux", "mobile", "from-chat", "from-meeting"];

export default function CreateTaskDialog({
  open,
  onOpenChange,
  initialTitle,
  initialDescription,
  initialTeamId,
  initialMeetingId,
  defaultTags,
  onCreated,
}: CreateTaskDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState("weekly");
  const [recurringInterval, setRecurringInterval] = useState("1");
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [epicId, setEpicId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [issueType, setIssueType] = useState("task");
  const [componentId, setComponentId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [storyPoints, setStoryPoints] = useState("");
  const [estimate, setEstimate] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [epics, setEpics] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Quick create dialogs
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateEpic, setShowCreateEpic] = useState(false);
  const [showCreateComponent, setShowCreateComponent] = useState(false);
  const [showCreateVersion, setShowCreateVersion] = useState(false);

  const toggleTag = (tag: string) => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const resetForm = () => {
    setTitle("");
    setTaskDescription("");
    setAssigneeId("");
    setAssigneeIds([]);
    setDueDate("");
    setIsRecurring(false);
    setRecurringPattern("weekly");
    setRecurringInterval("1");
    setRecurringEndDate("");
    setTemplateId("");
    setTeamId("");
    setMeetingId("");
    setSprintId("");
    setEpicId("");
    setProjectId("");
    setIssueType("task");
    setComponentId("");
    setVersionId("");
    setStoryPoints("");
    setEstimate("");
    setSelectedTags([]);
    setError(null);
  };

  const loadData = async (teamIdForLoad?: string) => {
    try {
      const effectiveTeamId = teamIdForLoad ?? teamId;
      const teamFilter = effectiveTeamId && effectiveTeamId !== "none" ? `?teamId=${effectiveTeamId}` : "";
      const [
        usersData,
        teamsData,
        meetingsData,
        sprintsData,
        epicsData,
        projectsData,
        componentsData,
        versionsData,
        templatesData,
      ] = await Promise.all([
        apiGet<any[]>("/users").catch(() => []),
        apiGet<any[]>("/teams").catch(() => []),
        apiGet<any[]>("/meetings").catch(() => []),
        apiGet<any[]>(`/sprints${teamFilter}`).catch(() => []),
        apiGet<any[]>(`/epics${teamFilter}`).catch(() => []),
        apiGet<any[]>(`/projects${teamFilter}`).catch(() => []),
        apiGet<any[]>(`/components${teamFilter}`).catch(() => []),
        apiGet<any[]>(`/versions${teamFilter}`).catch(() => []),
        apiGet<any[]>(`/tasks/templates${teamFilter}`).catch(() => []),
      ]);

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
      setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
      setSprints(Array.isArray(sprintsData) ? sprintsData : []);
      setEpics(Array.isArray(epicsData) ? epicsData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setComponents(Array.isArray(componentsData) ? componentsData : []);
      setVersions(Array.isArray(versionsData) ? versionsData : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
    } catch {
      setUsers([]);
      setTeams([]);
      setMeetings([]);
      setSprints([]);
      setEpics([]);
      setProjects([]);
      setComponents([]);
      setVersions([]);
      setTemplates([]);
    }
  };

  useEffect(() => {
    if (open) {
      // Apply initial values when dialog opens
      setTitle(initialTitle || "");
      setTaskDescription(initialDescription || "");
      setTeamId(initialTeamId || "");
      setMeetingId(initialMeetingId || "");
      setSelectedTags(defaultTags && defaultTags.length > 0 ? defaultTags : []);
      loadData(initialTeamId);
    } else {
      resetForm();
    }
  }, [open, initialTitle, initialDescription, initialTeamId, initialMeetingId, defaultTags]);

  // Reload dependent data when team changes
  useEffect(() => {
    if (open && teamId) {
      const teamFilter = teamId !== "none" ? `?teamId=${teamId}` : "";
      Promise.all([
        apiGet<any[]>(`/sprints${teamFilter}`).catch(() => []),
        apiGet<any[]>(`/epics${teamFilter}`).catch(() => []),
        apiGet<any[]>(`/projects${teamFilter}`).catch(() => []),
        apiGet<any[]>(`/components${teamFilter}`).catch(() => []),
        apiGet<any[]>(`/versions${teamFilter}`).catch(() => []),
        apiGet<any[]>(`/tasks/templates${teamFilter}`).catch(() => []),
      ]).then(([sprintsData, epicsData, projectsData, componentsData, versionsData, templatesData]) => {
        setSprints(Array.isArray(sprintsData) ? sprintsData : []);
        setEpics(Array.isArray(epicsData) ? epicsData : []);
        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setComponents(Array.isArray(componentsData) ? componentsData : []);
        setVersions(Array.isArray(versionsData) ? versionsData : []);
        setTemplates(Array.isArray(templatesData) ? templatesData : []);
        // Reset dependent fields when team changes
        if (teamId === "none") {
          setSprintId("");
          setEpicId("");
          setProjectId("");
          setComponentId("");
          setVersionId("");
        }
      });
    }
  }, [open, teamId]);

  // Auto-fill form when a template is selected
  useEffect(() => {
    if (templateId && templateId !== "none") {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        if (template.title) setTitle(template.title);
        if (template.content) setTaskDescription(template.content);
        if (template.priority) setPriority(template.priority);
        if (template.issueType) setIssueType(template.issueType);
        if (template.storyPoints != null) setStoryPoints(String(template.storyPoints));
        if (template.estimate != null) setEstimate(String(template.estimate));
        if (template.tags && template.tags.length > 0) {
          setSelectedTags((prev) => Array.from(new Set([...prev, ...template.tags])));
        }
      }
    }
  }, [templateId, templates]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Please enter a task title");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const currentUser = auth.getUser();
      if (!currentUser) throw new Error("Not authenticated");
      
      const selectedMultipleAssignees = assigneeIds.filter((id) => id && id !== "none");
      const primaryAssignee = assigneeId && assigneeId !== "none" ? assigneeId : selectedMultipleAssignees[0] || null;

      const created = await apiPost("/tasks", {
        title,
        description: taskDescription || null,
        priority,
        issueType: issueType || "task",
        status: "todo",
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        tags: selectedTags,
        assigneeId: primaryAssignee,
        assigneeIds: selectedMultipleAssignees,
        isRecurring,
        recurringPattern: isRecurring ? recurringPattern : null,
        recurringInterval: isRecurring ? parseInt(recurringInterval || "1") : null,
        recurringEndDate: isRecurring && recurringEndDate ? new Date(recurringEndDate).toISOString() : null,
        templateId: templateId && templateId !== "none" ? templateId : null,
        teamId: teamId && teamId !== "none" ? teamId : null,
        meetingId: meetingId && meetingId !== "none" ? meetingId : null,
        sprintId: sprintId && sprintId !== "none" ? sprintId : null,
        epicId: epicId && epicId !== "none" ? epicId : null,
        projectId: projectId && projectId !== "none" ? projectId : null,
        componentId: componentId && componentId !== "none" ? componentId : null,
        versionId: versionId && versionId !== "none" ? versionId : null,
        storyPoints: storyPoints ? parseInt(storyPoints) : null,
        estimate: estimate ? parseFloat(estimate) : null,
        createdBy: currentUser.id,
      });

      onOpenChange(false);
      resetForm();
      if (onCreated && created) {
        onCreated(created);
      } else {
        // Fallback: keep legacy behaviour when no handler is provided
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onProjectCreated={(project) => {
          setProjects((prev) => {
            if (prev.some((p) => p.id === project.id)) return prev;
            return [...prev, project];
          });
          setProjectId(project.id);
        }}
      />
      <CreateEpicDialog
        open={showCreateEpic}
        onOpenChange={setShowCreateEpic}
        onEpicCreated={(epic) => {
          setEpics((prev) => {
            if (prev.some((e) => e.id === epic.id)) return prev;
            return [...prev, epic];
          });
          setEpicId(epic.id);
        }}
      />
      <CreateComponentDialog
        open={showCreateComponent}
        onOpenChange={setShowCreateComponent}
        onComponentCreated={(component) => {
          setComponents((prev) => {
            if (prev.some((c) => c.id === component.id)) return prev;
            return [...prev, component];
          });
          setComponentId(component.id);
        }}
      />
      <CreateVersionDialog
        open={showCreateVersion}
        onOpenChange={setShowCreateVersion}
        onVersionCreated={(version) => {
          setVersions((prev) => {
            if (prev.some((v) => v.id === version.id)) return prev;
            return [...prev, version];
          });
          setVersionId(version.id);
        }}
        defaultTeamId={teamId && teamId !== "none" ? teamId : undefined}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <AnimatePresence>
          {open && (
            <DialogContent className="max-w-[600px] p-0 gap-0">
            {/* Compact Header */}
            <DialogHeader className="px-5 pt-5 pb-3 border-b">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <CheckSquare className="w-4 h-4 text-primary" />
                </div>
                Create Task
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Create a new task and assign it to a team member
              </DialogDescription>
            </DialogHeader>

            {/* Compact Content */}
            <div className="px-5 py-4 space-y-3 max-h-[calc(90vh-180px)] overflow-y-auto">
              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Task Title</Label>
                <Input 
                  placeholder="e.g., Fix login bug on mobile" 
                  className="h-9 text-sm" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  autoFocus
                />
              </div>
              
              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Description</Label>
                <Textarea 
                  placeholder="Add task details..." 
                  className="min-h-[60px] text-sm resize-none" 
                  value={taskDescription} 
                  onChange={(e) => setTaskDescription(e.target.value)} 
                />
              </div>

              {/* Row 1: Issue Type & Priority */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Layers className="w-3 h-3" /> 
                    Issue Type
                  </Label>
                  <Select value={issueType} onValueChange={setIssueType}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task">📋 Task</SelectItem>
                      <SelectItem value="bug">🐛 Bug</SelectItem>
                      <SelectItem value="story">📖 Story</SelectItem>
                      <SelectItem value="epic">🎯 Epic</SelectItem>
                      <SelectItem value="subtask">📝 Subtask</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Flag className="w-3 h-3" /> 
                    Priority
                  </Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-9 text-sm">
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

              {/* Row 1.5: Assignee & Project */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> 
                    Assignee (Primary)
                  </Label>
                  <Select value={assigneeId || "none"} onValueChange={(v) => setAssigneeId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="mt-3">
                    <Label className="text-[11px] font-medium text-muted-foreground block mb-1">Additional Assignees</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between h-9 text-xs font-normal",
                            !assigneeIds.length && "text-muted-foreground"
                          )}
                        >
                          {assigneeIds.length > 0 ? (
                            <div className="flex gap-1 overflow-hidden">
                              {assigneeIds.slice(0, 3).map(id => {
                                const user = users.find(u => u.id === id);
                                return user ? (
                                  <Badge variant="secondary" key={id} className="text-[10px] h-5 rounded-sm px-1.5 font-normal">
                                    {user.name.split(' ')[0]}
                                  </Badge>
                                ) : null;
                              })}
                              {assigneeIds.length > 3 && (
                                <Badge variant="secondary" className="text-[10px] h-5 rounded-sm px-1.5 font-normal">
                                  +{assigneeIds.length - 3} more
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
                                const isSelected = assigneeIds.includes(user.id);
                                return (
                                  <CommandItem
                                    key={user.id}
                                    value={user.name}
                                    onSelect={() => toggleAssignee(user.id)}
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
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Package className="w-3 h-3" /> 
                    Project <span className="text-muted-foreground/60">(Required)</span>
                  </Label>
                  <div className="flex gap-1.5">
                    <Select 
                      value={projectId && projectId !== "none" ? String(projectId) : "none"} 
                      onValueChange={(v) => {
                        if (v === "none") {
                          setProjectId("");
                        } else {
                          setProjectId(String(v));
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm flex-1">
                        <SelectValue placeholder="Select Project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Project</SelectItem>
                        {projects.length > 0 ? (
                          projects.map((project) => (
                            <SelectItem key={project.id} value={String(project.id)}>
                              <div className="flex items-center gap-1.5">
                                {project.color && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />}
                                <span className="font-mono text-xs">{project.key}</span>
                                <span>{project.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No projects available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setShowCreateProject(true)}
                      title="Create new project"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Row 2: Sprint & Epic */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> 
                    Sprint
                  </Label>
                  <Select 
                    value={sprintId ? sprintId : "none"} 
                    onValueChange={(v) => {
                      if (v === "none") {
                        setSprintId("");
                      } else {
                        setSprintId(v);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select Sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Sprint</SelectItem>
                      {sprints.length > 0 ? (
                        sprints.map((sprint) => (
                          <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No sprints available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" /> 
                    Epic
                  </Label>
                  <div className="flex gap-1.5">
                    <Select 
                      value={epicId ? epicId : "none"} 
                      onValueChange={(v) => {
                        if (v === "none") {
                          setEpicId("");
                        } else {
                          setEpicId(v);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm flex-1">
                        <SelectValue placeholder="Select Epic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Epic</SelectItem>
                        {epics.length > 0 ? (
                          epics.map((epic) => (
                            <SelectItem key={epic.id} value={epic.id}>
                              <div className="flex items-center gap-1.5">
                                {epic.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: epic.color }} />}
                                <span>{epic.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No epics available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setShowCreateEpic(true)}
                      title="Create new epic"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Row 3: Component & Version */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Package className="w-3 h-3" /> 
                    Component
                  </Label>
                  <div className="flex gap-1.5">
                    <Select 
                      value={componentId ? componentId : "none"} 
                      onValueChange={(v) => {
                        if (v === "none") {
                          setComponentId("");
                        } else {
                          setComponentId(v);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm flex-1">
                        <SelectValue placeholder="Select Component" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Component</SelectItem>
                        {components.length > 0 ? (
                          components.map((component) => (
                            <SelectItem key={component.id} value={component.id}>{component.name}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No components available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setShowCreateComponent(true)}
                      title="Create new component"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" /> 
                    Version
                  </Label>
                  <div className="flex gap-1.5">
                    <Select 
                      value={versionId ? versionId : "none"} 
                      onValueChange={(v) => {
                        if (v === "none") {
                          setVersionId("");
                        } else {
                          setVersionId(v);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm flex-1">
                        <SelectValue placeholder="Select Version" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Version</SelectItem>
                        {versions.length > 0 ? (
                          versions
                            .sort((a, b) => {
                              // Sort: released first, then by name
                              if (a.released && !b.released) return -1;
                              if (!a.released && b.released) return 1;
                              return a.name.localeCompare(b.name);
                            })
                            .map((version) => (
                              <SelectItem key={version.id} value={version.id}>
                                {version.name}
                                {version.released && " ✓ Released"}
                                {version.releaseDate && ` (${new Date(version.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                              </SelectItem>
                            ))
                        ) : (
                          <SelectItem value="none" disabled>No versions available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setShowCreateVersion(true)}
                      title="Create new version"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Row 4: Due Date & Team */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> 
                    Due Date
                  </Label>
                  <Input 
                    type="date" 
                    className="h-9 text-sm" 
                    value={dueDate} 
                    onChange={(e) => setDueDate(e.target.value)} 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> 
                    Team
                  </Label>
                  <Select value={teamId || "none"} onValueChange={(v) => setTeamId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 4.5: Template + Recurring */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Task Template
                  </Label>
                  <Select value={templateId || "none"} onValueChange={(v) => setTemplateId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Template</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Recurring Task
                  </Label>
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                    />
                    <span className="text-xs">Enable recurring</span>
                  </div>
                  {isRecurring && (
                    <div className="grid grid-cols-3 gap-1.5">
                      <Select value={recurringPattern} onValueChange={setRecurringPattern}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                        onChange={(e) => setRecurringInterval(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Every"
                      />
                      <Input
                        type="date"
                        value={recurringEndDate}
                        onChange={(e) => setRecurringEndDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Row 5: Meeting, Story Points & Estimate */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> 
                    Meeting
                  </Label>
                  <Select value={meetingId || "none"} onValueChange={(v) => setMeetingId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {meetings.map((meeting) => (
                        <SelectItem key={meeting.id} value={meeting.id}>{meeting.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3" /> 
                    Story Points
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g., 5"
                    className="h-9 text-sm"
                    value={storyPoints}
                    onChange={(e) => setStoryPoints(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 
                    Estimate (hours)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g., 8"
                    className="h-9 text-sm"
                    value={estimate}
                    onChange={(e) => setEstimate(e.target.value)}
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3" /> 
                  Tags
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {tagOptions.map((tag) => (
                    <button 
                      key={tag} 
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all",
                        selectedTags.includes(tag) 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-md">
                  {error}
                </div>
              )}
            </div>
            
            {/* Compact Footer */}
            <DialogFooter className="px-5 py-3 border-t gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8"
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={handleSubmit}
                disabled={loading}
                className="h-8 min-w-[90px]"
              >
                {loading ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
    </>
  );
}
