import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import {
  CheckSquare, Calendar, User, Tag, Flag, Link as LinkIcon, FileText,
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
import { auth } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: string) => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch(`${API_BASE}/users`).then((r) => r.json()),
        fetch(`${API_BASE}/teams`).then((r) => r.json()),
        fetch(`${API_BASE}/meetings`).then((r) => r.json()),
      ]).then(([usersData, teamsData, meetingsData]) => {
        setUsers(usersData);
        setTeams(teamsData);
        setMeetings(meetingsData);
      }).catch(() => {});
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
          </div>
          {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { onOpenChange(false); setError(null); setTitle(""); setTaskDescription(""); setAssigneeId(""); setDueDate(""); setTeamId(""); setMeetingId(""); setSelectedTags([]); }}>Cancel</Button>
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
                
                const res = await fetch(`${API_BASE}/tasks`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title,
                    description: taskDescription || null,
                    priority: priority === "high" ? "high" : priority === "low" ? "low" : "medium",
                    status: "todo",
                    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                    tags: selectedTags,
                    assigneeId: assigneeId || null,
                    teamId: teamId || null,
                    meetingId: meetingId || null,
                    createdBy: currentUser.id,
                  }),
                });

                if (!res.ok) throw new Error("Failed to create task");
                onOpenChange(false);
                setTitle("");
                setTaskDescription("");
                setAssigneeId("");
                setDueDate("");
                setTeamId("");
                setMeetingId("");
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
