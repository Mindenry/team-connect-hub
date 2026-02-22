import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  CheckSquare, Calendar, User, Tag, Flag, Link as LinkIcon, Target, Zap, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface CreateTaskDialogProps { open: boolean; onOpenChange: (open: boolean) => void; }

const tagOptions = ["frontend", "backend", "design", "bug", "feature", "docs", "testing", "devops", "ux", "mobile"];

export default function CreateTaskDialog({ open, onOpenChange }: CreateTaskDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [teamId, setTeamId] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [epicId, setEpicId] = useState("");
  const [storyPoints, setStoryPoints] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [epics, setEpics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: string) => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const resetForm = () => {
    setTitle("");
    setTaskDescription("");
    setAssigneeId("");
    setDueDate("");
    setTeamId("");
    setMeetingId("");
    setSprintId("");
    setEpicId("");
    setStoryPoints("");
    setSelectedTags([]);
    setError(null);
  };

  useEffect(() => {
    if (open) {
      Promise.all([
        apiGet<any[]>("/users").catch(() => []),
        apiGet<any[]>("/teams").catch(() => []),
        apiGet<any[]>("/meetings").catch(() => []),
        apiGet<any[]>("/sprints").catch(() => []),
        apiGet<any[]>("/epics").catch(() => []),
      ]).then(([usersData, teamsData, meetingsData, sprintsData, epicsData]) => {
        setUsers(Array.isArray(usersData) ? usersData : []);
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
        setSprints(Array.isArray(sprintsData) ? sprintsData : []);
        setEpics(Array.isArray(epicsData) ? epicsData : []);
      }).catch(() => {
        setUsers([]);
        setTeams([]);
        setMeetings([]);
        setSprints([]);
        setEpics([]);
      });
    } else {
      resetForm();
    }
  }, [open]);

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
      
      await apiPost("/tasks", {
        title,
        description: taskDescription || null,
        priority,
        status: "todo",
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        tags: selectedTags,
        assigneeId: assigneeId && assigneeId !== "none" ? assigneeId : null,
        teamId: teamId && teamId !== "none" ? teamId : null,
        meetingId: meetingId && meetingId !== "none" ? meetingId : null,
        sprintId: sprintId && sprintId !== "none" ? sprintId : null,
        epicId: epicId && epicId !== "none" ? epicId : null,
        storyPoints: storyPoints ? parseInt(storyPoints) : null,
        createdBy: currentUser.id,
      });

      onOpenChange(false);
      resetForm();
      window.location.reload();
    } catch (err: any) {
      setError(err.message ?? "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogContent className="max-w-[420px] p-0 gap-0">
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

              {/* Row 1: Assignee & Priority */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> 
                    Assignee
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

              {/* Row 2: Due Date & Team */}
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

              {/* Row 3: Sprint & Epic */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> 
                    Sprint
                  </Label>
                  <Select value={sprintId || "none"} onValueChange={(v) => setSprintId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Sprint</SelectItem>
                      {sprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" /> 
                    Epic
                  </Label>
                  <Select value={epicId || "none"} onValueChange={(v) => setEpicId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Epic</SelectItem>
                      {epics.map((epic) => (
                        <SelectItem key={epic.id} value={epic.id}>
                          <div className="flex items-center gap-1.5">
                            {epic.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: epic.color }} />}
                            <span>{epic.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 4: Meeting & Story Points */}
              <div className="grid grid-cols-2 gap-2.5">
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
  );
}
