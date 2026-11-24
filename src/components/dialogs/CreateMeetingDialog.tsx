import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Video,
  Calendar,
  Clock,
  Users,
  Loader2,
  Zap,
  Repeat,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { cn } from "@/lib/utils";


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

const pad = (value: number) => String(value).padStart(2, "0");

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toTimeInputValue = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const nextMeetingSlot = () => {
  const slot = new Date();
  slot.setSeconds(0, 0);
  if (slot.getMinutes() < 30) {
    slot.setMinutes(30);
  } else {
    slot.setHours(slot.getHours() + 1, 0, 0, 0);
  }
  if (slot.getHours() < 8) slot.setHours(9, 0, 0, 0);
  if (slot.getHours() >= 21) {
    slot.setDate(slot.getDate() + 1);
    slot.setHours(10, 0, 0, 0);
  }
  return slot;
};

const formatMeetingDay = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const formatMeetingTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

export default function CreateMeetingDialog({ open, onOpenChange }: CreateMeetingDialogProps) {
  const navigate = useNavigate();
  const [meetingType, setMeetingType] = useState<"instant" | "scheduled">("scheduled");
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
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
        .then((data) => {
          // Filter out "Personal Recordings" - it's just a personal folder, not a real team
          setTeams(Array.isArray(data) ? data.filter((t: any) => t.name.toLowerCase() !== "personal recordings") : []);
        })
        .catch(() => setTeams([]));
      setAvailability(null);
      if (!date || !time) {
        const slot = nextMeetingSlot();
        if (!date) setDate(toDateInputValue(slot));
        if (!time) setTime(toTimeInputValue(slot));
      }
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
      const [membersData, meetingsData] = await Promise.all([
        apiGet<any[]>(`/teams/${teamId}/members`),
        apiGet<any[]>(`/meetings?teamId=${teamId}`),
      ]);

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
    setDate("");
    setTime("");
    setIsRecurring(false);
    setRecurringPattern("weekly");
    setRecurringDays([]);
    setRecurringEndDate("");
    setAvailability(null);
  };

  const applyDatePreset = (offset: number) => {
    const slot = nextMeetingSlot();
    const target = new Date();
    target.setDate(target.getDate() + offset);
    setDate(toDateInputValue(offset === 0 ? slot : target));
    if (offset === 0) {
      setTime(toTimeInputValue(slot));
    } else if (!time) {
      setTime("10:00");
    }
    setAvailability(null);
  };

  const selectedTeamName = teams.find((team) => team.id === teamId)?.name;

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

      const result = await apiPost<{ id: string; meetingCode?: string }>("/meetings", {
        title,
        description: description || null,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
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
        // Use meetingCode if available, otherwise fall back to id
        const navigateId = result.meetingCode || result.id;
        navigate(`/meeting-lobby/${navigateId}`);
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
        <CommandDialogContent accent="indigo" className="max-w-[600px]">
          {/* ── Header ── */}
          <div className="px-6 pb-4 pt-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-400/10 text-indigo-300 ring-1 ring-indigo-400/20">
                <Video className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-semibold tracking-tight text-white">
                  Schedule a meeting
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-relaxed text-slate-400">
                  Pick a time and invite your team, or start one instantly.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="max-h-[68vh] space-y-4 overflow-y-auto px-6 pb-5 [scrollbar-color:rgba(148,163,184,0.35)_transparent]">
            {/* Meeting Type Toggle */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.04] p-1">
              <button
                type="button"
                onClick={() => setMeetingType("instant")}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  meetingType === "instant"
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,0.6)]"
                    : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Zap className="h-4 w-4" />
                Instant
              </button>
              <button
                type="button"
                onClick={() => setMeetingType("scheduled")}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  meetingType === "scheduled"
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,0.6)]"
                    : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Scheduled
              </button>
            </div>

            {/* Meeting Title */}
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-slate-400">Meeting title</Label>
              <Input
                placeholder="e.g., Sprint Planning, Weekly Sync"
                className={cn(
                  commandInputClass,
                  "h-10 focus-visible:ring-indigo-400/30",
                )}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Scheduled Fields */}
            {meetingType === "scheduled" && (
              <>
                {/* Date & Time */}
                <div className="space-y-3 rounded-2xl bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-400/10">
                        <Clock className="h-3.5 w-3.5 text-indigo-300" />
                      </div>
                      <span className="text-sm font-semibold text-white">Date & Time</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 rounded-lg px-2 text-[11px] text-slate-400 hover:bg-white/[0.06] hover:text-white"
                      onClick={handleCheckAvailability}
                      disabled={checkingAvailability || !teamId || !scheduledStartAndEnd}
                      title={
                        !teamId || !scheduledStartAndEnd
                          ? "Select a team, date and time first"
                          : "Check who is free at this time"
                      }
                    >
                      {checkingAvailability ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Users className="h-3 w-3" />
                      )}
                      {checkingAvailability ? "Checking..." : "Check availability"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Today", offset: 0 },
                      { label: "Tomorrow", offset: 1 },
                      { label: "Next week", offset: 7 },
                    ].map((preset) => {
                      const presetDate = new Date();
                      presetDate.setDate(presetDate.getDate() + preset.offset);
                      const value = toDateInputValue(presetDate);
                      const isActive = date === value;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyDatePreset(preset.offset)}
                          className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                            isActive
                              ? "bg-indigo-400/10 text-indigo-300 ring-1 ring-indigo-400/25"
                              : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.07] hover:text-white"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-slate-500">Date</Label>
                      <Input
                        type="date"
                        className={cn(
                          commandInputClass,
                          "h-9 text-sm focus-visible:ring-indigo-400/30",
                        )}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-slate-500">Time</Label>
                      <Input
                        type="time"
                        className={cn(
                          commandInputClass,
                          "h-9 text-sm focus-visible:ring-indigo-400/30",
                        )}
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-slate-500">Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="h-9 rounded-lg border-0 bg-white/[0.05] text-sm text-slate-200 focus:ring-2 focus:ring-indigo-400/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={commandSelectContentClass}>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1 hour 30 minutes</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Availability Results */}
                  {availability && (
                    <div className="overflow-hidden rounded-xl bg-white/[0.03]">
                      <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
                        <div className="p-2.5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[11px] font-semibold text-emerald-400">Available</span>
                          </div>
                          <div className="space-y-0.5 max-h-20 overflow-y-auto">
                            {availability.filter((m) => !m.isBusy).length === 0 && (
                              <p className="text-[11px] text-slate-500">No one free</p>
                            )}
                            {availability
                              .filter((m) => !m.isBusy)
                              .slice(0, 6)
                              .map((m) => (
                                <p key={m.userId} className="text-[11px] text-slate-200">
                                  {m.name}
                                </p>
                              ))}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-2 h-2 rounded-full bg-red-400" />
                            <span className="text-[11px] font-semibold text-red-400">Busy</span>
                          </div>
                          <div className="space-y-0.5 max-h-20 overflow-y-auto">
                            {availability.filter((m) => m.isBusy).length === 0 && (
                              <p className="text-[11px] text-slate-500">No conflicts</p>
                            )}
                            {availability
                              .filter((m) => m.isBusy)
                              .slice(0, 6)
                              .map((m) => (
                                <div key={m.userId} className="text-[11px]">
                                  <p className="text-slate-200">{m.name}</p>
                                  {m.conflicts[0] && (
                                    <p className="text-[10px] text-slate-500">
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

              </>
            )}

            {/* Team */}
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-slate-400">Team</Label>
              <Select value={teamId || "none"} onValueChange={(v) => setTeamId(v === "none" ? "" : v)}>
                <SelectTrigger className="h-10 rounded-lg border-0 bg-white/[0.05] text-sm text-slate-200 focus:ring-2 focus:ring-indigo-400/30 data-[placeholder]:text-slate-500">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent className={commandSelectContentClass}>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agenda / Description */}
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-slate-400">Agenda / Description <span className="font-normal text-slate-600">(optional)</span></Label>
              <Textarea
                placeholder="Add meeting agenda or details..."
                className={cn(
                  commandInputClass,
                  "h-auto min-h-[80px] resize-none py-3 text-sm focus-visible:ring-indigo-400/30",
                )}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {meetingType === "scheduled" && (
              <div className="space-y-3 rounded-2xl bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-400/10">
                      <Repeat className="h-3.5 w-3.5 text-indigo-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Recurring Meeting</p>
                      <p className="text-[11px] text-slate-500">Repeat on a schedule</p>
                    </div>
                  </div>
                  <Switch
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                    className="data-[state=unchecked]:bg-white/15"
                  />
                </div>
                {isRecurring && (
                  <div className="space-y-3 border-t border-white/[0.06] pt-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-slate-500">Repeat Pattern</Label>
                      <Select value={recurringPattern} onValueChange={(v) => { setRecurringPattern(v); setRecurringDays([]); }}>
                        <SelectTrigger className="h-9 rounded-lg border-0 bg-white/[0.05] text-sm text-slate-200 focus:ring-2 focus:ring-indigo-400/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={commandSelectContentClass}>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {recurringPattern === "weekly" && (
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-slate-500">Days of Week</Label>
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
                              className={`h-9 w-9 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                recurringDays.includes(day.value)
                                  ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_6px_18px_-6px_rgba(59,130,246,0.7)]"
                                  : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                              }`}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-slate-500">End Date (optional)</Label>
                      <Input
                        type="date"
                        className={cn(
                          commandInputClass,
                          "h-9 text-sm focus-visible:ring-indigo-400/30",
                        )}
                        value={recurringEndDate}
                        onChange={(e) => setRecurringEndDate(e.target.value)}
                        min={date}
                      />
                      <p className="text-[10px] text-slate-600">Leave empty to repeat indefinitely</p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ── Error ── */}
          {error && (
            <div className="mx-6 mb-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/20">
              {error}
            </div>
          )}

          {/* ── Footer ── */}
          <div className="flex shrink-0 flex-col gap-2 bg-white/[0.02] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-400">
              {meetingType === "scheduled" && scheduledStartAndEnd ? (
                <>
                  <CalendarClock className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
                  <span className="truncate whitespace-nowrap">
                    <span className="font-medium text-white">
                      {formatMeetingDay(scheduledStartAndEnd.start)}
                    </span>{" "}
                    {formatMeetingTime(scheduledStartAndEnd.start)}–
                    {formatMeetingTime(scheduledStartAndEnd.end)}
                    {selectedTeamName ? ` · ${selectedTeamName}` : ""}
                  </span>
                </>
              ) : meetingType === "instant" ? (
                <>
                  <Zap className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
                  <span className="truncate whitespace-nowrap">Starts now · 60 minutes</span>
                </>
              ) : (
                <span className="truncate">Choose a date and time to continue.</span>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={handleReset}
                className="h-10 rounded-xl px-4 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="h-10 gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 text-sm font-semibold text-white shadow-[0_12px_36px_-12px_rgba(59,130,246,0.7)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : meetingType === "instant" ? (
                  <>
                    <Zap className="h-4 w-4" />
                    Start Meeting
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4" />
                    Schedule Meeting
                  </>
                )}
              </Button>
            </div>
          </div>
        </CommandDialogContent>
      )}
    </Dialog>
  );
}
