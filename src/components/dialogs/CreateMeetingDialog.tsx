import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Video, Calendar, Clock, Users, Shield, FileText, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { apiGet, apiPost } from "@/lib/api";

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateMeetingDialog({ open, onOpenChange }: CreateMeetingDialogProps) {
  const navigate = useNavigate();
  const [meetingType, setMeetingType] = useState<"instant" | "scheduled">("scheduled");
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [teamId, setTeamId] = useState<string>("");
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      apiGet<any[]>("/teams")
        .then((data) => setTeams(Array.isArray(data) ? data : []))
        .catch(() => setTeams([]));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Video className="w-5 h-5 text-primary" />Create Meeting</DialogTitle>
            <DialogDescription>Schedule a new meeting or start one instantly</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant={meetingType === "instant" ? "default" : "outline"} size="sm" onClick={() => setMeetingType("instant")} className="flex-1"><Video className="w-4 h-4 mr-2" />Instant</Button>
              <Button variant={meetingType === "scheduled" ? "default" : "outline"} size="sm" onClick={() => setMeetingType("scheduled")} className="flex-1"><Calendar className="w-4 h-4 mr-2" />Scheduled</Button>
            </div>
            <div><Label>Meeting Title</Label><Input placeholder="e.g., Sprint Planning" className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            {meetingType === "scheduled" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                  <div><Label>Time</Label><Input type="time" className="mt-1" value={time} onChange={(e) => setTime(e.target.value)} /></div>
                </div>
                <div>
                  <Label>Duration</Label>
                  <Select value={duration} onValueChange={setDuration}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem><SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem><SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1 hour 30 minutes</SelectItem><SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div><Label>Team</Label>
              <Select value={teamId || "none"} onValueChange={(v) => setTeamId(v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Agenda (optional)</Label><Textarea placeholder="Add meeting agenda items..." className="mt-1 min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div>
              <Label>Meeting Password (optional)</Label>
              <Input
                type="password"
                placeholder="Set a password for this meeting"
                className="mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">If set, participants must enter this password to join.</p>
            </div>
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-muted-foreground" /><div><p className="text-sm font-medium text-foreground">Waiting Room</p><p className="text-xs text-muted-foreground">Participants need to be admitted</p></div></div>
                <Switch checked={waitingRoom} onCheckedChange={setWaitingRoom} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /><div><p className="text-sm font-medium text-foreground">Allow Screen Share</p><p className="text-xs text-muted-foreground">Participants can share their screen</p></div></div>
                <Switch checked={allowScreenShare} onCheckedChange={setAllowScreenShare} />
              </div>
            </div>
          </div>
          {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { onOpenChange(false); setError(null); setTitle(""); setDescription(""); setDate(""); setTime(""); }}>Cancel</Button>
            <Button onClick={async () => {
              if (!title.trim()) {
                setError("Please enter a meeting title");
                return;
              }
              if (meetingType === "scheduled" && (!date || !time)) {
                setError("Please select date and time");
                return;
              }
              setLoading(true);
              setError(null);
              try {
                const user = auth.getUser();
                if (!user) throw new Error("Not authenticated");

                const now = new Date();
                let startTime: Date;
                let endTime: Date;

                if (meetingType === "instant") {
                  startTime = now;
                  endTime = new Date(now.getTime() + 60 * 60000);
                } else {
                  const [hours, minutes] = time.split(":").map(Number);
                  startTime = new Date(date);
                  startTime.setHours(hours, minutes, 0, 0);
                  endTime = new Date(startTime.getTime() + parseInt(duration) * 60000);
                }

                const result = await apiPost("/meetings", {
                  title,
                  description: description || null,
                  startTime: startTime.toISOString(),
                  endTime: endTime.toISOString(),
                  password: password.trim() ? password.trim() : undefined,
                  waitingRoom,
                  allowScreenShare,
                  status: meetingType === "instant" ? "live" : "upcoming",
                  teamId: teamId && teamId !== "none" ? teamId : null,
                  hostId: user.id,
                });
                onOpenChange(false);
                setTitle("");
                setDescription("");
                setDate("");
                setTime("");
                if (meetingType === "instant") {
                  navigate(`/meeting-lobby/${result.id}`);
                }
              } catch (err: any) {
                setError(err.message ?? "Failed to create meeting");
              } finally {
                setLoading(false);
              }
            }} disabled={loading}>
              {loading ? "Creating..." : meetingType === "instant" ? "Start Meeting" : "Schedule Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
