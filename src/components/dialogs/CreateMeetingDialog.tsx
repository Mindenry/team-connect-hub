import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Video,
  Calendar,
  Clock,
  Users,
  Shield,
  FileText,
  X,
  Loader2,
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

interface MemberAvailability {
  userId: string;
  name: string;
  isBusy: boolean;
  conflicts: {
    id: string;
    title: string;
    startTime: string;
    endTime?: string | null;
  }[];
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
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<MemberAvailability[] | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState<string>("weekly");
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringEndDate, setRecurringEndDate] = useState("");

  useEffect(() => {
    if (open) {
      apiGet<any[]>("/teams")
        .then((data) => setTeams(Array.isArray(data) ? data : []))
        .catch(() => setTeams([]));
      setAvailability(null);
    }
  }, [open]);

  const scheduledStartAndEnd = useMemo(() => {
    if (meetingType !== "scheduled" || !date || !time || !duration) return null;
    const [hours, minutes] = time.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    const start = new Date(date);
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + parseInt(duration, 10) * 60000);
    return { start, end };
  }, [meetingType, date, time, duration]);

  const handleCheckAvailability = async () => {
    if (meetingType !== "scheduled") {
      setError("Availability check is only for scheduled meetings");
      return;
    }
    if (!teamId) {
      setError("Please select a team to check availability");
      return;
    }
    if (!scheduledStartAndEnd) {
      setError("Please select date, time, and duration first");
      return;
    }

    setCheckingAvailability(true);
    setError(null);
    try {
      const [membersRes, meetingsRes] = await Promise.all([
        fetch(`${API_BASE}/teams/${teamId}/members`),
        fetch(`${API_BASE}/meetings?teamId=${teamId}`),
      ]);
      if (!membersRes.ok || !meetingsRes.ok) {
        throw new Error("Failed to load availability data");
      }
      const membersData = await membersRes.json();
      const meetingsData = await meetingsRes.json();

      const members = (membersData || []).map((m: any) => m.user).filter(Boolean);
      const { start, end } = scheduledStartAndEnd;

      const result: MemberAvailability[] = members.map((u: any) => {
        const conflicts = (meetingsData || []).filter((m: any) => {
          if (!m.startTime) return false;
          const mStart = new Date(m.startTime);
          const mEnd = new Date(m.endTime || m.startTime);
          if (m.status === "ended") return false;

          const isParticipant =
            Array.isArray(m.participants) &&
            m.participants.some(
              (p: any) => p.userId === u.id || p.user?.id === u.id
            );
          const isHost = m.host?.id === u.id;
          if (!isHost && !isParticipant) return false;

          const overlap = mEnd > start && end > mStart;
          return overlap;
        });

        return {
          userId: u.id,
          name: u.name,
          isBusy: conflicts.length > 0,
          conflicts: conflicts.map((c: any) => ({
            id: c.id,
            title: c.title,
            startTime: c.startTime,
            endTime: c.endTime,
          })),
        };
      });

      setAvailability(result);
    } catch (err: any) {
      setError(err.message ?? "Failed to check availability");
      setAvailability(null);
    } finally {
      setCheckingAvailability(false);
    }
  };

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
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>Check team availability for this time</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={handleCheckAvailability}
                      disabled={checkingAvailability || !teamId}
                    >
                      {checkingAvailability ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>Check</>
                      )}
                    </Button>
                  </div>
                  {availability && (
                    <div className="mt-2 rounded-md border bg-muted/40 px-2.5 py-2 max-h-32 overflow-y-auto">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold text-emerald-600 mb-1">Available</p>
                          <div className="space-y-0.5">
                            {availability.filter((m) => !m.isBusy).length === 0 && (
                              <p className="text-[11px] text-muted-foreground">No one fully free at this time</p>
                            )}
                            {availability
                              .filter((m) => !m.isBusy)
                              .slice(0, 6)
                              .map((m) => (
                                <p key={m.userId} className="text-[11px] text-foreground">
                                  {m.name}
                                </p>
                              ))}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold text-destructive mb-1">Busy</p>
                          <div className="space-y-0.5">
                            {availability.filter((m) => m.isBusy).length === 0 && (
                              <p className="text-[11px] text-muted-foreground">No conflicts</p>
                            )}
                            {availability
                              .filter((m) => m.isBusy)
                              .slice(0, 6)
                              .map((m) => (
                                <div key={m.userId} className="text-[11px]">
                                  <p className="text-foreground">{m.name}</p>
                                  {m.conflicts[0] && (
                                    <p className="text-[10px] text-muted-foreground">
                                      {m.conflicts[0].title} ·{" "}
                                      {new Date(m.conflicts[0].startTime).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                      {" - "}
                                      {new Date(
                                        m.conflicts[0].endTime || m.conflicts[0].startTime
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Recurring Meeting Options */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Recurring Meeting</p>
                        <p className="text-xs text-muted-foreground">Repeat this meeting on a schedule</p>
                      </div>
                    </div>
                    <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                  </div>
                  {isRecurring && (
                    <div className="space-y-3 pl-6">
                      <div>
                        <Label className="text-xs">Repeat Pattern</Label>
                        <Select value={recurringPattern} onValueChange={(v) => { setRecurringPattern(v); setRecurringDays([]); }}>
                          <SelectTrigger className="mt-1 h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {recurringPattern === "weekly" && (
                        <div>
                          <Label className="text-xs">Days of Week</Label>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {[
                              { value: 0, label: "Sun" },
                              { value: 1, label: "Mon" },
                              { value: 2, label: "Tue" },
                              { value: 3, label: "Wed" },
                              { value: 4, label: "Thu" },
                              { value: 5, label: "Fri" },
                              { value: 6, label: "Sat" },
                            ].map((day) => (
                              <button
                                key={day.value}
                                type="button"
                                onClick={() => {
                                  setRecurringDays((prev) =>
                                    prev.includes(day.value)
                                      ? prev.filter((d) => d !== day.value)
                                      : [...prev, day.value]
                                  );
                                }}
                                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                                  recurringDays.includes(day.value)
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border hover:bg-muted"
                                }`}
                              >
                                {day.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">End Date (optional)</Label>
                        <Input
                          type="date"
                          className="mt-1 h-9 text-xs"
                          value={recurringEndDate}
                          onChange={(e) => setRecurringEndDate(e.target.value)}
                          min={date}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Leave empty to repeat indefinitely</p>
                      </div>
                    </div>
                  )}
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
            <Button variant="outline" onClick={() => { 
              onOpenChange(false); 
              setError(null); 
              setTitle(""); 
              setDescription(""); 
              setDate(""); 
              setTime(""); 
              setIsRecurring(false);
              setRecurringPattern("weekly");
              setRecurringDays([]);
              setRecurringEndDate("");
            }}>Cancel</Button>
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
                  isInstant: meetingType === "instant",
                  teamId: teamId && teamId !== "none" ? teamId : null,
                  hostId: user.id,
                  isRecurring: meetingType === "scheduled" ? isRecurring : false,
                  recurringPattern: meetingType === "scheduled" && isRecurring ? recurringPattern : undefined,
                  recurringDays: meetingType === "scheduled" && isRecurring && recurringPattern === "weekly" ? recurringDays : undefined,
                  recurringEndDate: meetingType === "scheduled" && isRecurring && recurringEndDate ? new Date(recurringEndDate).toISOString() : undefined,
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
