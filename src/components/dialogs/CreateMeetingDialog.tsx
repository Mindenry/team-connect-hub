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
  Lock,
  Zap,
  Repeat,
  MonitorUp,
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

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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

  const handleReset = () => {
    onOpenChange(false);
    setError(null);
    setTitle("");
    setDescription("");
    setPassword("");
    setDate("");
    setTime("");
    setIsRecurring(false);
    setRecurringPattern("weekly");
    setRecurringDays([]);
    setRecurringEndDate("");
    setAvailability(null);
  };

  const handleCreate = async () => {
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-w-[520px] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border/40 shadow-2xl">
          {/* ── Gradient Header ── */}
          <div className="meeting-dialog-header px-6 py-5 shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20 shadow-lg">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white tracking-tight">
                  Create Meeting
                </DialogTitle>
                <DialogDescription className="text-white/70 text-xs mt-0.5">
                  Schedule a new meeting or start one instantly
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin">
            {/* Meeting Type Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/50 dark:bg-muted/30 border border-border/50">
              <button
                type="button"
                onClick={() => setMeetingType("instant")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  meetingType === "instant"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Zap className="w-4 h-4" />
                Instant
              </button>
              <button
                type="button"
                onClick={() => setMeetingType("scheduled")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  meetingType === "scheduled"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Scheduled
              </button>
            </div>

            {/* Meeting Title */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Meeting Title</Label>
              <Input
                placeholder="e.g., Sprint Planning, Weekly Sync"
                className="meeting-input h-10 rounded-lg"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Scheduled Fields */}
            {meetingType === "scheduled" && (
              <>
                {/* Date & Time */}
                <div className="meeting-section space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Date & Time</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                      <Input
                        type="date"
                        className="meeting-input h-9 rounded-lg text-sm"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Time</Label>
                      <Input
                        type="time"
                        className="meeting-input h-9 rounded-lg text-sm"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="meeting-input h-9 rounded-lg text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1 hour 30 minutes</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Availability Check */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>Check team availability</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs rounded-lg"
                      onClick={handleCheckAvailability}
                      disabled={checkingAvailability || !teamId}
                    >
                      {checkingAvailability ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        "Check"
                      )}
                    </Button>
                  </div>
                  {/* Availability Results */}
                  {availability && (
                    <div className="rounded-lg border border-border/50 bg-background/50 dark:bg-[hsl(222,35%,10%)] overflow-hidden">
                      <div className="grid grid-cols-2 divide-x divide-border/40">
                        <div className="p-2.5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Available</span>
                          </div>
                          <div className="space-y-0.5 max-h-20 overflow-y-auto">
                            {availability.filter((m) => !m.isBusy).length === 0 && (
                              <p className="text-[11px] text-muted-foreground">No one free</p>
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
                        <div className="p-2.5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">Busy</span>
                          </div>
                          <div className="space-y-0.5 max-h-20 overflow-y-auto">
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

                {/* Recurring Meeting */}
                <div className="meeting-section space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Repeat className="w-3.5 h-3.5 text-violet-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Recurring Meeting</p>
                        <p className="text-[11px] text-muted-foreground">Repeat on a schedule</p>
                      </div>
                    </div>
                    <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                  </div>
                  {isRecurring && (
                    <div className="space-y-3 pt-2 border-t border-border/40">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Repeat Pattern</Label>
                        <Select value={recurringPattern} onValueChange={(v) => { setRecurringPattern(v); setRecurringDays([]); }}>
                          <SelectTrigger className="meeting-input h-9 text-sm rounded-lg">
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
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Days of Week</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { value: 0, label: "S" },
                              { value: 1, label: "M" },
                              { value: 2, label: "T" },
                              { value: 3, label: "W" },
                              { value: 4, label: "T" },
                              { value: 5, label: "F" },
                              { value: 6, label: "S" },
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
                                className={`w-9 h-9 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                                  recurringDays.includes(day.value)
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25"
                                    : "bg-background border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50"
                                }`}
                              >
                                {day.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">End Date (optional)</Label>
                        <Input
                          type="date"
                          className="meeting-input h-9 text-sm rounded-lg"
                          value={recurringEndDate}
                          onChange={(e) => setRecurringEndDate(e.target.value)}
                          min={date}
                        />
                        <p className="text-[10px] text-muted-foreground">Leave empty to repeat indefinitely</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Team */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Team</Label>
              <Select value={teamId || "none"} onValueChange={(v) => setTeamId(v === "none" ? "" : v)}>
                <SelectTrigger className="meeting-input h-10 rounded-lg">
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

            {/* Agenda / Description */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Agenda / Description <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea
                placeholder="Add meeting agenda or details..."
                className="meeting-input min-h-[80px] rounded-lg text-sm resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-sm font-semibold text-foreground">Password <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
              </div>
              <Input
                type="password"
                placeholder="Set a password for this meeting"
                className="meeting-input h-10 rounded-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground pl-1">If set, participants must enter this password to join.</p>
            </div>


          </div>

          {/* ── Error ── */}
          {error && (
            <div className="mx-6 mb-2 text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg font-medium">
              {error}
            </div>
          )}

          {/* ── Footer ── */}
          <DialogFooter className="px-6 py-4 shrink-0 border-t border-border/40 bg-muted/20 dark:bg-muted/10">
            <Button
              variant="ghost"
              onClick={handleReset}
              className="px-5 rounded-lg text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="meeting-btn-create px-6 rounded-lg text-sm h-10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : meetingType === "instant" ? (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Start Meeting
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
