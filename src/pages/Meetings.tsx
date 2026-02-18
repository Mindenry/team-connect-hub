import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  Filter,
  Zap,
  Phone,
  ChevronRight,
  Building2,
  DoorOpen,
  X,
  LayoutList,
  CalendarDays,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreateMeetingDialog from "@/components/dialogs/CreateMeetingDialog";
import { getSocket } from "@/lib/websocket";
import { auth } from "@/lib/auth";
import { apiGet } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  team: string;
  teamId?: string;
  host: { name: string; initials: string };
  participants: number;
  status: "upcoming" | "ended";
  hasWaitingRoom: boolean;
  startTime: Date;
  meetingCode?: string;
}

interface ActiveRoom {
  roomId: string;
  name: string;
  participants: Array<{ peerId: string; name: string; userId?: string }>;
  createdAt: Date;
}

interface Team {
  id: string;
  name: string;
  meetings: Meeting[];
}



function mapMeeting(m: any): Meeting {
  const start = new Date(m.startTime);
  const end = new Date(m.endTime);
  const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const duration = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 ? ` ${durationMinutes % 60}m` : ""}`
    : `${durationMinutes}m`;
  const date = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const status = m.status === "ended" ? "ended" : "upcoming";
  return {
    id: m.id,
    title: m.title,
    date,
    time,
    duration,
    team: m.team?.name ?? "Personal",
    teamId: m.teamId ?? undefined,
    host: {
      name: m.host?.name ?? "Host",
      initials: m.host?.name?.split(" ").map((p: string) => p[0]).join("").toUpperCase() ?? "H",
    },
    participants: m.participants?.length ?? 0,
    status,
    hasWaitingRoom: m.waitingRoom ?? false,
    startTime: start,
    meetingCode: m.meetingCode,
  };
}

function MeetingCard({
  meeting,
  index,
  activeRooms = [],
}: {
  meeting: Meeting;
  index: number;
  activeRooms?: ActiveRoom[];
}) {
  const navigate = useNavigate();
  const currentUser = auth.getUser();
  const room = activeRooms.find((r) => r.roomId === meeting.id);
  const participantCount = room ? room.participants.length : 0;

  const isActuallyLive =
    room &&
    (participantCount > 1 ||
      (participantCount === 1 && room.participants[0].userId !== currentUser?.id));
  const isOnlyMe = room && participantCount === 1 && room.participants[0].userId === currentUser?.id;
  const isEnded = meeting.status === "ended";

  const statusLabel = isEnded ? "Ended" : isActuallyLive ? "Live now" : "Scheduled";
  const statusTone = isEnded ? "ended" : isActuallyLive ? "live" : "upcoming";

  const statusClasses =
    statusTone === "live"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200 border-emerald-100 dark:border-emerald-500/40"
      : statusTone === "ended"
      ? "bg-slate-50 text-slate-600 dark:bg-slate-800/40 dark:text-slate-200 border-slate-100 dark:border-slate-700"
      : "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-100 border-sky-100 dark:border-sky-500/40";

  const iconToneClasses =
    statusTone === "live"
      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-200"
      : statusTone === "ended"
      ? "bg-muted text-muted-foreground"
      : "bg-primary/5 text-primary/70";

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      className="group"
    >
      <Card className="overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-card">
        <CardContent className="p-3.5 md:p-4">
          <div className="flex gap-3 md:gap-4">
            <div className="flex flex-col items-center gap-2 pt-0.5">
              <div
                className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 transition-colors ${iconToneClasses}`}
              >
                <Video className="w-4 h-4" />
              </div>
              {isActuallyLive && (
                <span className="hidden md:inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-[pulse_1.4s_ease_in_out_infinite]" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {meeting.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {meeting.date} · {meeting.time}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{meeting.duration}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      <span>
                        {room ? participantCount : meeting.participants}{" "}
                        <span className="hidden sm:inline">people</span>
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="w-3 h-3" />
                      <span className="truncate max-w-[120px] sm:max-w-[160px]">{meeting.team}</span>
                    </span>
                    {meeting.hasWaitingRoom && (
                      <span className="inline-flex items-center gap-1.5">
                        <DoorOpen className="w-3 h-3" />
                        <span className="text-[10px] font-medium uppercase tracking-wide">
                          Waiting room
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={`border text-[10px] font-semibold tracking-wide rounded-full px-2.5 py-0.5 ${statusClasses}`}
                  >
                    {statusLabel}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground hidden md:inline">
                    Host · {meeting.host.name}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 shrink-0">
              {isEnded ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link to={`/meeting-summary/${meeting.id}`}>Summary</Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant={isActuallyLive || isOnlyMe ? "default" : "secondary"}
                  className="h-8 px-4 text-xs font-semibold rounded-lg shadow-sm transition-transform hover:-translate-y-0.5"
                  onClick={() => navigate(`/meeting-lobby/${meeting.id}`)}
                >
                  {isActuallyLive || isOnlyMe ? "Join now" : "Open lobby"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ActiveRoomCard({ room, index }: { room: ActiveRoom; index: number }) {
  const navigate = useNavigate();
  const currentUser = auth.getUser();
  const isQuickHuddle = room.roomId === "quick-huddle";
  const myParticipant = room.participants.find((p) => p.userId === currentUser?.id);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
    >
      <Card className="overflow-hidden rounded-xl border border-border/60 bg-card/70 transition-colors duration-200 hover:border-primary/40 hover:bg-card">
        <CardContent className="p-3.5 md:p-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative shrink-0">
              <div
                className={`h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center border ${
                  isQuickHuddle
                    ? "border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
                    : "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                }`}
              >
                {isQuickHuddle ? (
                  <Zap className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <DoorOpen className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </div>
              <span
                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background ${
                  myParticipant ? "bg-primary" : "bg-emerald-500"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-medium text-sm text-foreground truncate">{room.name}</h3>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {room.participants.length} online
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {room.participants.slice(0, 3).map((p, i) => (
                    <Avatar key={p.peerId || i} className="h-5 w-5 border-2 border-background">
                      <AvatarFallback className="text-[7px] font-bold bg-muted">
                        {p.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant={myParticipant ? "default" : "secondary"}
              className="h-8 md:h-9 rounded-lg font-semibold px-3.5 md:px-4"
              onClick={() => navigate(`/meeting-lobby/${room.roomId}`)}
            >
              {myParticipant ? "Return" : "Join"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TeamSection({
  team,
  isExpanded,
  onToggle,
  activeRooms = [],
}: {
  team: Team;
  isExpanded: boolean;
  onToggle: () => void;
  activeRooms?: ActiveRoom[];
}) {
  const currentUser = auth.getUser();
  const isActuallyLive = (meetingId: string) => {
    const room = activeRooms.find((r) => r.roomId === meetingId);
    if (!room) return false;
    return (
      room.participants.length > 1 ||
      (room.participants.length === 1 && room.participants[0].userId !== currentUser?.id)
    );
  };

  const upcoming = team.meetings.filter(m => m.status === "upcoming");
  const live = team.meetings.filter(m => isActuallyLive(m.id));
  const past = team.meetings.filter(m => m.status === "ended");

  return (
    <div className="space-y-2.5">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between rounded-xl border px-3.5 py-3 transition-all duration-200 ${
          isExpanded
            ? "bg-card shadow-sm border-primary/30"
            : "bg-muted/40 hover:bg-muted/60 border-border/40"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center border transition-colors ${
              isExpanded ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-background"
            }`}
          >
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-sm text-foreground">{team.name}</h3>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
              <span>{team.meetings.length} sessions</span>
              {live.length > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {live.length} live
                </span>
              )}
              {past.length > 0 && (
                <span className="hidden sm:inline text-xs text-muted-foreground/80">
                  {past.length} archived
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
            isExpanded ? "rotate-90" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-1 pb-4 space-y-2.5">
              {live.concat(upcoming).map((m, i) => (
                <MeetingCard key={m.id} meeting={m} index={i} activeRooms={activeRooms} />
              ))}
              {past.length > 0 && (
                <div className="pt-1 space-y-1.5">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Past sessions
                    </span>
                    <div className="h-px flex-1 bg-border/40" />
                  </div>
                  <div className="space-y-1.5">
                    {past.map((m, i) => (
                      <MeetingCard key={m.id} meeting={m} index={i} activeRooms={activeRooms} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MeetingStatCard({
  title,
  value,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "info";
}) {
  const toneStyles =
    tone === "success" ? "border-green-500/10 bg-green-500/[0.02]" : 
    tone === "info" ? "border-blue-500/10 bg-blue-500/[0.02]" : 
    "border-border/40 bg-card/40";

  const iconStyles = 
    tone === "success" ? "bg-green-500/10 text-green-600" : 
    tone === "info" ? "bg-blue-500/10 text-blue-600" : 
    "bg-primary/5 text-primary/70";

  return (
    <Card className={`border shadow-none rounded-xl transition-all duration-300 hover:shadow-sm ${toneStyles}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconStyles}`}>
          {icon}
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-0.5">{title}</div>
          <div className="text-xl font-black tracking-tight text-foreground leading-none">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Meetings() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  });
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`${API_BASE}/teams`)
      .then((r) => r.json())
      .then((data) => {
        setTeams(data);
        if (data.length > 0) setExpandedTeams(new Set([data[0].id]));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<any[]>("/meetings").catch(() => []);
        const mapped: Meeting[] = Array.isArray(data) ? data.map(mapMeeting) : [];
        if (!cancelled) setItems(mapped);
      } catch (e: any) {
        if (!cancelled) {
          console.error("Failed to load meetings:", e);
          setError(e.message ?? "Failed to load meetings");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const socket = getSocket();
    socket.on('meeting:created', (m) => !cancelled && setItems(prev => [...prev, mapMeeting(m)]));
    socket.on('meeting:updated', (m) => !cancelled && setItems(prev => prev.map(item => item.id === m.id ? mapMeeting(m) : item)));
    socket.on('meeting:deleted', ({ id }) => !cancelled && setItems(prev => prev.filter(m => m.id !== id)));
    return () => { cancelled = true; socket.off('meeting:created'); socket.off('meeting:updated'); socket.off('meeting:deleted'); };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("rooms:get-active");
    const onActiveRooms = (rooms: ActiveRoom[]) => setActiveRooms(rooms || []);
    socket.on("rooms:active", onActiveRooms);
    return () => { socket.off("rooms:active", onActiveRooms); };
  }, []);

  const filteredMeetings = useMemo(() => {
    return items.filter((m) => {
      const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.team.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || m.status === filterStatus;
      const matchesTeam = filterTeam === "all" || m.teamId === filterTeam;
      return matchesSearch && matchesStatus && matchesTeam;
    });
  }, [items, searchQuery, filterStatus, filterTeam]);

  const activeRoomIds = useMemo(() => new Set(activeRooms.map((r) => r.roomId)), [activeRooms]);
  const counts = useMemo(() => ({
    live: filteredMeetings.filter((m) => activeRoomIds.has(m.id)).length,
    upcoming: filteredMeetings.filter((m) => m.status === "upcoming").length,
    ended: filteredMeetings.filter((m) => m.status === "ended").length,
  }), [filteredMeetings, activeRoomIds]);

  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  const meetingsForSelectedDay = useMemo(() => {
    return filteredMeetings
      .filter((m) => {
        const d = new Date(m.startTime);
        d.setHours(0,0,0,0);
        return d.getTime() === selectedDay.getTime();
      })
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [filteredMeetings, selectedDay]);

  const teamsWithMeetings: Team[] = useMemo(() => {
    const mapped: Team[] = teams
      .map((team) => ({
        id: team.id,
        name: team.name,
        meetings: filteredMeetings.filter((m) => m.teamId === team.id),
      }))
      .filter((team) => team.meetings.length > 0 || filterTeam === "all");

    const personal = filteredMeetings.filter((m) => !m.teamId || !teams.find((t) => t.id === m.teamId));
    if (personal.length > 0) mapped.push({ id: "personal", name: "Personal", meetings: personal });
    return mapped;
  }, [teams, filteredMeetings, filterTeam]);

  const toggleTeam = (id: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const hasActiveFilters = filterStatus !== "all" || filterTeam !== "all";

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-background/95">
      <CreateMeetingDialog open={showCreateMeeting} onOpenChange={setShowCreateMeeting} />

      {/* Filter Dialog */}
      <Dialog open={showFilter} onOpenChange={setShowFilter}>
        <DialogContent className="max-w-xs rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Filter Meetings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-10 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="ended">Ended</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Team</Label>
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="h-10 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="ghost" className="flex-1 h-10 text-xs font-bold" onClick={() => { setFilterStatus("all"); setFilterTeam("all"); setShowFilter(false); }}>Reset</Button>
            <Button className="flex-1 h-10 text-xs font-bold" onClick={() => setShowFilter(false)}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modern Compact Header */}
      <div className="bg-white dark:bg-card border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                  Meetings Hub
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Team meetings, in one view
              </h1>
              <p className="text-sm text-muted-foreground max-w-md">
                A calm overview of upcoming sessions, live rooms, and past conversations across your
                teams.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/meeting-lobby/quick-huddle")}
                className="h-10 rounded-lg border-2 font-bold px-4 gap-2 hover:bg-orange-500/5 hover:border-orange-500/20"
              >
                <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
                Quick Huddle
              </Button>
              <Button 
                size="sm" 
                onClick={() => setShowCreateMeeting(true)}
                className="h-10 rounded-lg font-bold px-5 gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                New Session
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <MeetingStatCard title="Live" value={counts.live.toString()} icon={<Phone className="w-5 h-5" />} tone="success" />
            <MeetingStatCard title="Upcoming" value={counts.upcoming.toString()} icon={<Calendar className="w-5 h-5" />} />
            <MeetingStatCard title="Ended" value={counts.ended.toString()} icon={<Clock className="w-5 h-5" />} />
            <MeetingStatCard title="Teams" value={teams.length.toString()} icon={<Users className="w-5 h-5" />} tone="info" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Sticky Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-4 z-30 bg-white/80 dark:bg-background/80 backdrop-blur-md p-2 rounded-xl border border-border/40 shadow-sm">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border-none bg-muted/40 text-sm font-medium rounded-lg focus-visible:ring-0 focus-visible:bg-muted/60"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilter(true)}
              className={`h-10 w-10 rounded-lg border transition-all ${hasActiveFilters ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="h-8 rounded-md text-[11px] font-bold px-3 gap-1.5">
              <LayoutList className="w-3.5 h-3.5" /> List
            </Button>
            <Button variant={viewMode === "timeline" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("timeline")} className="h-8 rounded-md text-[11px] font-bold px-3 gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> Timeline
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 rounded-xl bg-muted/20 animate-pulse border border-border/20" />)}
            </motion.div>
          ) : viewMode === "timeline" ? (
            <motion.div key="timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar border-b border-border/20">
                {weekDays.map((day) => {
                  const active = day.getTime() === selectedDay.getTime();
                  const isToday = day.getTime() === (new Date().setHours(0,0,0,0));
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      className={`flex flex-col items-center justify-center min-w-[70px] h-[90px] rounded-xl border-2 transition-all active:scale-95 mb-2 ${
                        active
                          ? "bg-primary/10 border-primary/60 text-primary shadow-sm"
                          : "bg-card border-border/40 hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`text-[10px] font-medium uppercase mb-1 ${
                          active ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {day.toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                      <span className="text-xl font-semibold tracking-tight">{day.getDate()}</span>
                      {isToday && (
                        <div
                          className={`w-1 h-1 rounded-full mt-1.5 ${
                            active ? "bg-primary" : "bg-primary/80"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedDay.getTime() === new Date().setHours(0, 0, 0, 0)
                      ? "Today’s agenda"
                      : selectedDay.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                  </h2>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-medium rounded-full px-3 py-1"
                  >
                    {meetingsForSelectedDay.length} sessions
                  </Badge>
                </div>
                {meetingsForSelectedDay.length > 0 ? (
                  <div className="space-y-3">
                    {meetingsForSelectedDay.map((m, i) => <MeetingCard key={m.id} meeting={m} index={i} activeRooms={activeRooms} />)}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 rounded-2xl bg-muted/5 border-2 border-dashed border-border/40">
                    <Calendar className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-sm font-bold text-muted-foreground">No sessions scheduled for this day.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
              {activeRooms.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border/60">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-sm font-semibold text-foreground">Active rooms</h2>
                      <p className="text-xs text-muted-foreground">
                        Join an ongoing conversation or re-enter your own room.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {activeRooms.map((room, i) => <ActiveRoomCard key={room.roomId} room={room} index={i} />)}
                  </div>
                </div>
              )}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border/40 pb-6">
                  <div className="space-y-1">
                    <h2 className="text-base md:text-lg font-semibold tracking-tight text-foreground">
                      Meeting directory
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Browse meetings by team, with live, upcoming, and archived sessions in one place.
                    </p>
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterStatus("all");
                        setFilterTeam("all");
                      }}
                      className="text-[11px] font-medium text-primary hover:bg-primary/5"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
                {teamsWithMeetings.length > 0 ? (
                  <div className="space-y-4">
                    {teamsWithMeetings.map((team) => <TeamSection key={team.id} team={team} isExpanded={expandedTeams.has(team.id)} onToggle={() => toggleTeam(team.id)} activeRooms={activeRooms} />)}
                  </div>
                ) : (
                  <div className="py-24 text-center space-y-4 rounded-2xl bg-muted/5 border-2 border-dashed border-border/40">
                    <Search className="w-10 h-10 text-muted-foreground/20 mx-auto" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No meetings match your filters right now.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
