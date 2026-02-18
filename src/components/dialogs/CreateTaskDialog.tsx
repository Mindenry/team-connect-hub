import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  CheckSquare, Calendar, User, Tag, Flag, Link as LinkIcon, FileText, Target, Zap,
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
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CheckSquare className="w-5 h-5 text-primary" />Create Task</DialogTitle>
              <DialogDescription>Create a new task and assign it to a team member</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Task Title</Label><Input placeholder="e.g., Fix login bug on mobile" className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label>Description</Label><Textarea placeholder="Add task details..." className="mt-1 min-h-[80px]" value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="flex items-center gap-1"><User className="w-3 h-3" /> Assignee</Label>
                  <Select value={assigneeId || "none"} onValueChange={(v) => setAssigneeId(v === "none" ? "" : v)}>
                    <SelectTrigger className="mt-1">
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
                <div><Label className="flex items-center gap-1"><Flag className="w-3 h-3" /> Priority</Label>
                  <Select value={priority} onValueChange={setPriority}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">🔴 Urgent</SelectItem>
                      <SelectItem value="high">🟠 High</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="low">🟢 Low</SelectItem>
                    </SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due Date</Label><Input type="date" className="mt-1" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                <div><Label className="flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Team</Label>
                  <Select value={teamId || "none"} onValueChange={(v) => setTeamId(v === "none" ? "" : v)}>
                    <SelectTrigger className="mt-1">
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
              <div><Label className="flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Link to Meeting (optional)</Label>
                <Select value={meetingId || "none"} onValueChange={(v) => setMeetingId(v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1">
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

            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Sprint</Label>
                <Select value={sprintId || "none"} onValueChange={(v) => setSprintId(v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1">
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
              <div><Label className="flex items-center gap-1"><Target className="w-3 h-3" /> Epic</Label>
                <Select value={epicId || "none"} onValueChange={(v) => setEpicId(v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Epic</SelectItem>
                    {epics.map((epic) => (
                      <SelectItem key={epic.id} value={epic.id}>
                        <div className="flex items-center gap-2">
                          {epic.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: epic.color }} />}
                          {epic.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Link to Meeting</Label>
                <Select value={meetingId || "none"} onValueChange={(v) => setMeetingId(v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1">
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
              <div><Label className="flex items-center gap-1"><Zap className="w-3 h-3" /> Story Points</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g., 5"
                  className="mt-1"
                  value={storyPoints}
                  onChange={(e) => setStoryPoints(e.target.value)}
                />
              </div>
            </div>
              <div><Label className="flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</Label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tagOptions.map((tag) => (
                    <button key={tag} onClick={() => toggleTag(tag)}
                      className={`px-2 py-0.5 rounded-full text-xs transition-colors ${selectedTags.includes(tag) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

            {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}
            <DialogFooter>
              <Button variant="outline" onClick={() => { onOpenChange(false); setError(null); setTitle(""); setTaskDescription(""); setAssigneeId(""); setDueDate(""); setTeamId(""); setMeetingId(""); setSprintId(""); setEpicId(""); setStoryPoints(""); setSelectedTags([]); }}>Cancel</Button>
              <Button onClick={async () => {
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
                  window.location.reload();
                } catch (err: any) {
                  setError(err.message ?? "Failed to create task");
                } finally {
                  setLoading(false);
                }
              }} disabled={loading}>
                {loading ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
