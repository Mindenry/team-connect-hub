import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Video,
  Plus,
  Search,
  Calendar,
  Clock,
  Filter,
  Zap,
  X,
  Grid3x3,
  List,
  VideoOff,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CreateMeetingDialog from "@/components/dialogs/CreateMeetingDialog";
import EditMeetingDialog from "@/components/dialogs/EditMeetingDialog";
import JoinMeetingByCodeDialog from "@/components/dialogs/JoinMeetingByCodeDialog";
import MeetingMinutesDialog from "@/components/dialogs/MeetingMinutesDialog";
import { getSocket } from "@/lib/websocket";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/usePresence";

import {
  MeetingCardGrid,
  MeetingCardList,
  ActiveRoomCard,
  mapMeeting,
  type Meeting,
  type ActiveRoom,
  type ViewMode,
  type TabFilter,
} from "@/components/meetings";

export default function Meetings() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [showEditMeeting, setShowEditMeeting] = useState(false);
  const [editMeetingId, setEditMeetingId] = useState<string | null>(null);
  const [showMinutesDialog, setShowMinutesDialog] = useState(false);
  const [minutesMeetingId, setMinutesMeetingId] = useState<string | null>(null);
  const [minutesMeetingTitle, setMinutesMeetingTitle] = useState<string>("");
  const [showJoinByCode, setShowJoinByCode] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [tabFilter, setTabFilter] = useState<TabFilter>("all");
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const lastPresenceRefreshRef = useRef(0);
  const { activeRooms, refreshPresence } = usePresence();
  const [creatingQuickHuddle, setCreatingQuickHuddle] = useState(false);

  const createQuickHuddle = async () => {
    setCreatingQuickHuddle(true);
    try {
      const meeting = await apiPost<any>("/meetings/quick-huddle", {});
      toast.success("Quick Huddle created", {
        description: `Meeting code: ${meeting.meetingCode}`,
      });
      navigate(`/meeting-lobby/${meeting.meetingCode}`);
    } catch (err: any) {
      toast.error("Failed to create Quick Huddle", {
        description: err.message || "Please try again",
      });
    } finally {
      setCreatingQuickHuddle(false);
    }
  };

  useEffect(() => {
    // Filter out "Personal Recordings" - it's just a personal folder, not a real team
    apiGet<any[]>("/teams")
      .then((data) =>
        setTeams(
          Array.isArray(data)
            ? data.filter(
                (t: any) => t.name.toLowerCase() !== "personal recordings",
              )
            : [],
        ),
      )
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    const now = Date.now();
    if (now - lastPresenceRefreshRef.current > 1000) {
      refreshPresence();
      lastPresenceRefreshRef.current = now;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<any[]>("/meetings").catch(() => []);
        const mapped: Meeting[] = Array.isArray(data)
          ? data.map(mapMeeting)
          : [];
        if (!cancelled) setItems(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message ?? "Failed to load meetings");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const socket = getSocket();
    socket.on(
      "meeting:created",
      (m) => !cancelled && setItems((prev) => [...prev, mapMeeting(m)]),
    );
    socket.on(
      "meeting:updated",
      (m) =>
        !cancelled &&
        setItems((prev) =>
          prev.map((item) => (item.id === m.id ? mapMeeting(m) : item)),
        ),
    );
    socket.on(
      "meeting:deleted",
      ({ id }) =>
        !cancelled && setItems((prev) => prev.filter((m) => m.id !== id)),
    );
    return () => {
      cancelled = true;
      socket.off("meeting:created");
      socket.off("meeting:updated");
      socket.off("meeting:deleted");
    };
  }, [refreshPresence]);

  useEffect(() => {
    const handleWindowFocus = () => {
      const now = Date.now();
      if (now - lastPresenceRefreshRef.current > 1000) {
        refreshPresence();
        lastPresenceRefreshRef.current = now;
      }
    };
    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, [refreshPresence]);

  const activeRoomIds = useMemo(() => {
    const ids = new Set<string>();
    activeRooms.forEach((r) => ids.add(r.roomId));
    return ids;
  }, [activeRooms]);

  const filteredMeetings = useMemo(() => {
    return items.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.team.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || m.status === filterStatus;
      const matchesTeam = filterTeam === "all" || m.teamId === filterTeam;
      return matchesSearch && matchesStatus && matchesTeam;
    });
  }, [items, searchQuery, filterStatus, filterTeam]);

  const { live, upcoming, past } = useMemo(() => {
    const liveList = filteredMeetings.filter((m) => activeRoomIds.has(m.id));
    const upcomingList = filteredMeetings.filter(
      (m) => m.status === "upcoming" && !activeRoomIds.has(m.id),
    );
    const pastList = filteredMeetings.filter((m) => m.status === "ended");
    return { live: liveList, upcoming: upcomingList, past: pastList };
  }, [filteredMeetings, activeRoomIds]);

  const displayedMeetings = useMemo(() => {
    if (tabFilter === "live") return live;
    if (tabFilter === "upcoming") return upcoming;
    if (tabFilter === "past") return past;
    return [...live, ...upcoming, ...past];
  }, [tabFilter, live, upcoming, past]);

  const stats = useMemo(() => {
    const today = new Date();
    const isSameDay = (d: Date) =>
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    const todayCount = filteredMeetings.filter((m) =>
      isSameDay(m.startTime),
    ).length;
    return {
      total: filteredMeetings.length,
      live: live.length,
      upcoming: upcoming.length,
      past: past.length,
      today: todayCount,
    };
  }, [filteredMeetings, live, upcoming, past]);

  const hasActiveFilters = filterStatus !== "all" || filterTeam !== "all";

  const handleOpenMinutes = (meetingId: string, meetingTitle: string) => {
    setMinutesMeetingId(meetingId);
    setMinutesMeetingTitle(meetingTitle);
    setShowMinutesDialog(true);
  };

  const MeetingCard = viewMode === "grid" ? MeetingCardGrid : MeetingCardList;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <CreateMeetingDialog
          open={showCreateMeeting}
          onOpenChange={setShowCreateMeeting}
        />
        <EditMeetingDialog
          open={showEditMeeting}
          onOpenChange={setShowEditMeeting}
          meetingId={editMeetingId}
          onSuccess={() => {
            apiGet<any[]>("/meetings").then((data) => {
              const mapped: Meeting[] = Array.isArray(data)
                ? data.map(mapMeeting)
                : [];
              setItems(mapped);
            });
          }}
        />
        <JoinMeetingByCodeDialog
          open={showJoinByCode}
          onOpenChange={setShowJoinByCode}
        />
        <MeetingMinutesDialog
          open={showMinutesDialog && !!minutesMeetingId}
          onOpenChange={(open) => {
            setShowMinutesDialog(open);
            if (!open) {
              setMinutesMeetingId(null);
              setMinutesMeetingTitle("");
            }
          }}
          meetingId={minutesMeetingId || ""}
          meetingTitle={minutesMeetingTitle}
        />

        <Dialog open={showFilter} onOpenChange={setShowFilter}>
          <DialogContent className="max-w-sm rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Filter
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Status
                </Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Team
                </Label>
                <Select value={filterTeam} onValueChange={setFilterTeam}>
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterStatus("all");
                  setFilterTeam("all");
                  setShowFilter(false);
                }}
              >
                Reset
              </Button>
              <Button onClick={() => setShowFilter(false)}>Apply</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[2000px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 space-y-3 sm:space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10 ring-1 ring-primary/20">
                    <Video className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  {activeRooms.length > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-semibold sm:font-bold text-foreground tracking-tight">
                    Meetings
                  </h1>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                    ศูนย์กลางสำหรับดูภาพรวมการประชุมวันนี้ · สร้าง · เข้าร่วม ·
                    ทำงานร่วมกันแบบเรียลไทม์
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 self-stretch sm:self-auto justify-end flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 sm:h-9 px-2 sm:px-2.5 text-[10px] sm:text-[11px] md:text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowJoinByCode(true)}
                >
                  <Grid3x3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-0.5 sm:mr-1" />
                  <span className="hidden sm:inline">Join by code</span>
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 sm:h-9 gap-1 sm:gap-1.5 px-2 sm:px-2.5 text-[10px] sm:text-[11px] md:text-xs border-border/60 bg-background/50 hover:bg-background"
                      onClick={createQuickHuddle}
                      disabled={creatingQuickHuddle}
                    >
                      <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="hidden md:inline">
                        {creatingQuickHuddle ? "Creating..." : "Quick Huddle"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>เริ่มประชุมด่วนทันที</TooltipContent>
                </Tooltip>
                <Button
                  size="sm"
                  className="h-8 sm:h-9 gap-1 sm:gap-1.5 px-2 sm:px-2.5 text-[10px] sm:text-[11px] md:text-xs font-medium shrink-0"
                  onClick={() => setShowCreateMeeting(true)}
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="hidden sm:inline">New Meeting</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              <div className="rounded-xl border border-border/60 bg-card/60 px-2.5 sm:px-3 py-2 sm:py-2.5 flex flex-col justify-between">
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  ทั้งหมด
                </span>
                <div className="flex items-baseline gap-0.5 sm:gap-1 mt-1">
                  <span className="text-base sm:text-lg md:text-xl font-semibold tabular-nums">
                    {stats.total}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                    meetings
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "rounded-xl border px-2.5 sm:px-3 py-2 sm:py-2.5 flex flex-col justify-between",
                  stats.live > 0
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : "border-border/60 bg-card/60",
                )}
              >
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Live
                </span>
                <div className="flex items-baseline gap-0.5 sm:gap-1 mt-1">
                  <span className="text-base sm:text-lg md:text-xl font-semibold tabular-nums">
                    {stats.live}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                    rooms
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 px-2.5 sm:px-3 py-2 sm:py-2.5 flex flex-col justify-between">
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  วันนี้
                </span>
                <div className="flex items-baseline gap-0.5 sm:gap-1 mt-1">
                  <span className="text-base sm:text-lg md:text-xl font-semibold tabular-nums">
                    {stats.today}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                    meetings
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 px-2.5 sm:px-3 py-2 sm:py-2.5 flex flex-col justify-between">
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  กำลังจะถึง
                </span>
                <div className="flex items-baseline gap-0.5 sm:gap-1 mt-1">
                  <span className="text-base sm:text-lg md:text-xl font-semibold tabular-nums">
                    {stats.upcoming}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                    upcoming
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 px-2.5 sm:px-3 py-2 sm:py-2.5 flex flex-col justify-between col-span-2 sm:col-span-1">
                <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  ที่ผ่านมา
                </span>
                <div className="flex items-baseline gap-0.5 sm:gap-1 mt-1">
                  <span className="text-base sm:text-lg md:text-xl font-semibold tabular-nums">
                    {stats.past}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                    ended
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[2000px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-full flex flex-col">
            <div className="py-3 sm:py-4 md:py-6 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-muted/40 rounded-lg border border-border/50 backdrop-blur-sm w-full sm:w-fit overflow-x-auto flex-nowrap">
                {[
                  {
                    id: "all" as TabFilter,
                    label: "All",
                    count: filteredMeetings.length,
                  },
                  {
                    id: "live" as TabFilter,
                    label: "Live",
                    count: live.length,
                  },
                  {
                    id: "upcoming" as TabFilter,
                    label: "Upcoming",
                    count: upcoming.length,
                  },
                  {
                    id: "past" as TabFilter,
                    label: "Past",
                    count: past.length,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTabFilter(tab.id)}
                    className={cn(
                      "px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap",
                      tabFilter === tab.id
                        ? "bg-background shadow-md ring-1 ring-border/50 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span
                        className={cn(
                          "ml-1 sm:ml-1.5 text-[10px] sm:text-xs font-semibold px-1 sm:px-1.5 py-0.5 rounded",
                          tabFilter === tab.id
                            ? "bg-primary/15 text-primary"
                            : "bg-muted/80 text-muted-foreground",
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาการประชุม..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 sm:pl-9 h-9 sm:h-10 text-sm bg-background/50 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-muted/40 rounded-lg border border-border/50 backdrop-blur-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="icon"
                        className={cn(
                          "h-7 w-7 sm:h-8 sm:w-8 transition-all duration-200",
                          viewMode === "grid" &&
                            "bg-background shadow-md ring-1 ring-border/50",
                        )}
                        onClick={() => setViewMode("grid")}
                      >
                        <Grid3x3
                          className={cn(
                            "w-3.5 h-3.5 sm:w-4 sm:h-4",
                            viewMode === "grid" && "text-primary",
                          )}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>มุมมองแบบ Grid</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="icon"
                        className={cn(
                          "h-7 w-7 sm:h-8 sm:w-8 transition-all duration-200",
                          viewMode === "list" &&
                            "bg-background shadow-md ring-1 ring-border/50",
                        )}
                        onClick={() => setViewMode("list")}
                      >
                        <List
                          className={cn(
                            "w-3.5 h-3.5 sm:w-4 sm:h-4",
                            viewMode === "list" && "text-primary",
                          )}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>มุมมองแบบ List</TooltipContent>
                  </Tooltip>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-9 w-9 sm:h-10 sm:w-10 border-border/60 bg-background/50 hover:bg-background",
                        hasActiveFilters &&
                          "bg-primary/10 border-primary/30 text-primary",
                      )}
                      onClick={() => setShowFilter(true)}
                    >
                      <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>กรอง</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex-1 overflow-auto pb-3 sm:pb-4 md:pb-6">
              {loading ? (
                <div
                  className={cn(
                    "gap-3 sm:gap-4",
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                      : "space-y-2",
                  )}
                >
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl bg-muted/20 animate-pulse border border-border/20",
                        viewMode === "grid" ? "h-48 sm:h-64" : "h-16 sm:h-20",
                      )}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {activeRooms.length > 0 && (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-foreground">
                          Active Rooms
                        </span>
                      </div>
                      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {activeRooms.map((room, i) => (
                          <ActiveRoomCard
                            key={room.roomId}
                            room={room}
                            index={i}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 sm:space-y-4">
                    {activeRooms.length > 0 && (
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-foreground">
                          All Meetings
                        </span>
                        {hasActiveFilters && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-primary hover:bg-primary/5"
                            onClick={() => {
                              setSearchQuery("");
                              setFilterStatus("all");
                              setFilterTeam("all");
                            }}
                          >
                            Clear filters
                          </Button>
                        )}
                      </div>
                    )}

                    {displayedMeetings.length > 0 ? (
                      viewMode === "grid" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                          {displayedMeetings.map((m, i) => (
                            <MeetingCard
                              key={m.id}
                              meeting={m}
                              index={i}
                              activeRooms={activeRooms}
                              onEdit={(id) => {
                                setEditMeetingId(id);
                                setShowEditMeeting(true);
                              }}
                              onMinutes={handleOpenMinutes}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1.5 sm:space-y-2">
                          {displayedMeetings.map((m, i) => (
                            <MeetingCard
                              key={m.id}
                              meeting={m}
                              index={i}
                              activeRooms={activeRooms}
                              onEdit={(id) => {
                                setEditMeetingId(id);
                                setShowEditMeeting(true);
                              }}
                              onMinutes={handleOpenMinutes}
                            />
                          ))}
                        </div>
                      )
                    ) : (
                      <Card className="border-border/50 border-dashed bg-card/40">
                        <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 px-4 sm:px-6">
                          <div className="w-14 h-14 sm:w-16 md:w-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-muted/60 to-muted/40 flex items-center justify-center mb-4 sm:mb-5 shadow-sm">
                            {searchQuery || tabFilter !== "all" ? (
                              <Search className="w-7 h-7 sm:w-8 md:w-10 sm:h-8 md:h-10 text-muted-foreground" />
                            ) : (
                              <VideoOff className="w-7 h-7 sm:w-8 md:w-10 sm:h-8 md:h-10 text-muted-foreground" />
                            )}
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5 sm:mb-2">
                            {searchQuery ||
                            hasActiveFilters ||
                            tabFilter !== "all"
                              ? "ไม่พบการประชุม"
                              : "ยังไม่มีการประชุม"}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-xs sm:max-w-sm leading-relaxed">
                            {searchQuery ||
                            hasActiveFilters ||
                            tabFilter !== "all"
                              ? "ลองเปลี่ยนตัวกรองหรือคำค้นหา"
                              : "เริ่มต้นด้วยการสร้างการประชุมใหม่หรือเข้าร่วม Quick Huddle"}
                          </p>
                          {!searchQuery &&
                            !hasActiveFilters &&
                            tabFilter === "all" && (
                              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                                <Button
                                  onClick={() => setShowCreateMeeting(true)}
                                  className="gap-2 h-9 sm:h-10"
                                >
                                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  New Meeting
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={createQuickHuddle}
                                  disabled={creatingQuickHuddle}
                                  className="gap-2 h-9 sm:h-10"
                                >
                                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  {creatingQuickHuddle
                                    ? "Creating..."
                                    : "Quick Huddle"}
                                </Button>
                              </div>
                            )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
