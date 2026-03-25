import { useEffect, useMemo, useState } from "react";
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
  Building2,
  X,
  Grid3x3,
  List,
  ArrowRight,
  VideoOff,
  Play,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import JoinMeetingByCodeDialog from "@/components/dialogs/JoinMeetingByCodeDialog";
import { getSocket } from "@/lib/websocket";
import { auth } from "@/lib/auth";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/usePresence";

interface MeetingHost {
  name: string;
  initials: string;
  avatar?: string | null;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  team: string;
  teamId?: string;
  host: MeetingHost;
  participants: number;
  status: "upcoming" | "ended";
  hasWaitingRoom: boolean;
  startTime: Date;
  endTime?: Date;
  meetingCode?: string;
}

interface ActiveRoom {
  roomId: string;
  name: string;
  participants: Array<{
    peerId: string;
    name: string;
    userId?: string;
    avatar?: string;
  }>;
  createdAt: Date;
}

function mapMeeting(m: any): Meeting {
  const start = new Date(m.startTime);
  const end = new Date(m.endTime);
  const now = new Date();
  const durationMinutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000),
  );
  const duration =
    durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 ? ` ${durationMinutes % 60}m` : ""}`
      : `${durationMinutes}m`;
  const date = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const time = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  // Check if meeting has ended (either status is "ended" or endTime has passed)
  const isPast = end.getTime() < now.getTime();
  const status = m.status === "ended" || isPast ? "ended" : "upcoming";

  const hostName: string = m.host?.name ?? "Host";
  const hostAvatar: string | null | undefined = m.host?.avatar ?? null;
  const hostInitials =
    hostName
      .split(" ")
      .map((p: string) => p[0])
      .join("")
      .toUpperCase() || "H";

  return {
    id: m.id,
    title: m.title,
    date,
    time,
    duration,
    team: m.team?.name ?? "Personal",
    teamId: m.teamId ?? undefined,
    host: {
      name: hostName,
      initials: hostInitials,
      avatar: hostAvatar,
    },
    participants: m.participants?.length ?? 0,
    status,
    hasWaitingRoom: m.waitingRoom ?? false,
    startTime: start,
    endTime: end,
    meetingCode: m.meetingCode,
  };
}

type ViewMode = "grid" | "list";
type TabFilter = "all" | "live" | "upcoming" | "past";

function MeetingCardGrid({
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
  const room = activeRooms.find(
    (r) => r.roomId === meeting.id || r.roomId === meeting.meetingCode,
  );
  const participantCount = room ? room.participants.length : 0;
  const roomParticipants = room?.participants || [];

  const isActuallyLive =
    room &&
    (participantCount > 1 ||
      (participantCount === 1 &&
        room.participants[0].userId !== currentUser?.id));
  const isOnlyMe =
    room &&
    participantCount === 1 &&
    room.participants[0].userId === currentUser?.id;
  const isEnded = meeting.status === "ended";

  const statusLabel = isEnded
    ? "Ended"
    : isActuallyLive
      ? "Live"
      : isOnlyMe
        ? "Waiting"
        : "Scheduled";
  const statusTone = isEnded
    ? "ended"
    : isActuallyLive
      ? "live"
      : isOnlyMe
        ? "waiting"
        : "upcoming";

  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0, duration: 0.1 }}
    >
      <Card
        className={cn(
          "group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-300 cursor-pointer overflow-hidden",
          "hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1 sm:hover:-translate-y-1.5",
          "ring-0 hover:ring-1 hover:ring-primary/10",
        )}
        onClick={() => !isEnded && navigate(`/meeting-lobby/${meeting.id}`)}
      >
        <CardContent className="p-3 sm:p-4 md:p-5">
          <div className="flex flex-col h-full">
            {/* Icon & Status */}
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div
                className={cn(
                  "w-10 h-10 sm:w-12 md:w-14 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm",
                  "bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10",
                  "group-hover:scale-110 group-hover:shadow-md",
                  statusTone === "live" &&
                    "from-emerald-500/15 to-emerald-500/5",
                  statusTone === "ended" && "from-muted/60 to-muted/40",
                )}
              >
                {statusTone === "live" ? (
                  <Play className="w-5 h-5 sm:w-6 md:w-7 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Video
                    className={cn(
                      "w-5 h-5 sm:w-6 md:w-7",
                      statusTone === "ended"
                        ? "text-muted-foreground"
                        : "text-primary",
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full",
                  statusTone === "live" &&
                    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                  statusTone === "ended" && "bg-muted/60 text-muted-foreground",
                  statusTone === "waiting" &&
                    "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                  statusTone === "upcoming" && "bg-primary/10 text-primary",
                )}
              >
                {statusLabel}
              </span>
            </div>

            {/* Content */}
            <h3 className="font-semibold text-xs sm:text-sm text-foreground mb-2 sm:mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-200">
              {meeting.title}
            </h3>
            <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>
                  {meeting.date} · {meeting.time}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>{meeting.duration}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">{meeting.team}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Show participants if room is active */}
                {roomParticipants.length > 0 ? (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex -space-x-1 sm:-space-x-1.5">
                      {roomParticipants.slice(0, 3).map((p, i) => (
                        <Avatar
                          key={p.peerId || i}
                          className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-background"
                        >
                          <AvatarImage
                            src={(p as any).avatar}
                            alt={p.name || "Avatar"}
                          />
                          <AvatarFallback className="text-[7px] sm:text-[8px] font-semibold bg-muted">
                            {p.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {roomParticipants.length > 3 && (
                        <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                          <span className="text-[7px] sm:text-[8px] font-semibold text-muted-foreground">
                            +{roomParticipants.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                      {roomParticipants.length}{" "}
                      {roomParticipants.length === 1 ? "person" : "people"}
                    </span>
                  </div>
                ) : (
                  <>
                    <Avatar className="h-5 w-5 sm:h-6 sm:w-6 border border-border/50">
                      <AvatarImage
                        src={(meeting.host as any).avatar}
                        alt={meeting.host.name || "Avatar"}
                      />
                      <AvatarFallback className="text-[9px] sm:text-[10px] font-semibold bg-muted">
                        {meeting.host.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate max-w-[80px] sm:max-w-[100px]">
                      {meeting.host.name}
                    </span>
                  </>
                )}
              </div>
              {isEnded ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-medium text-muted-foreground cursor-default"
                  >
                    Ended
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant={isActuallyLive || isOnlyMe ? "default" : "outline"}
                  className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/meeting-lobby/${meeting.id}`);
                  }}
                >
                  {isActuallyLive || isOnlyMe ? "Join" : "Open"}
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5 sm:ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MeetingCardList({
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
  const room = activeRooms.find(
    (r) => r.roomId === meeting.id || r.roomId === meeting.meetingCode,
  );
  const participantCount = room ? room.participants.length : 0;
  const roomParticipants = room?.participants || [];

  const isActuallyLive =
    room &&
    (participantCount > 1 ||
      (participantCount === 1 &&
        room.participants[0].userId !== currentUser?.id));
  const isOnlyMe =
    room &&
    participantCount === 1 &&
    room.participants[0].userId === currentUser?.id;
  // Check if meeting has ended (status or past endTime)
  const now = new Date();
  const isPast = meeting.endTime
    ? meeting.endTime.getTime() < now.getTime()
    : false;
  const isEnded = meeting.status === "ended" || isPast;

  const statusLabel = isEnded
    ? "Ended"
    : isActuallyLive
      ? "Live"
      : isOnlyMe
        ? "Waiting"
        : "Scheduled";
  const statusTone = isEnded
    ? "ended"
    : isActuallyLive
      ? "live"
      : isOnlyMe
        ? "waiting"
        : "upcoming";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <Card
        className={cn(
          "group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-300 cursor-pointer",
          "hover:shadow-lg hover:shadow-black/8 ring-0 hover:ring-1 hover:ring-primary/10",
        )}
        onClick={() => !isEnded && navigate(`/meeting-lobby/${meeting.id}`)}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <div
              className={cn(
                "w-9 h-9 sm:w-10 md:w-12 rounded-md sm:rounded-lg flex items-center justify-center transition-all duration-300 shrink-0",
                "bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10",
                statusTone === "live" && "from-emerald-500/15 to-emerald-500/5",
                statusTone === "ended" && "from-muted/60 to-muted/40",
              )}
            >
              {statusTone === "live" ? (
                <Play className="w-4 h-4 sm:w-5 md:w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Video
                  className={cn(
                    "w-4 h-4 sm:w-5 md:w-6",
                    statusTone === "ended"
                      ? "text-muted-foreground"
                      : "text-primary",
                  )}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {meeting.title}
                </h3>
                <span
                  className={cn(
                    "text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full shrink-0",
                    statusTone === "live" &&
                      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                    statusTone === "ended" &&
                      "bg-muted/60 text-muted-foreground",
                    statusTone === "waiting" &&
                      "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    statusTone === "upcoming" && "bg-primary/10 text-primary",
                  )}
                >
                  {statusLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  {meeting.date} · {meeting.time}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  {meeting.duration}
                </span>
                <span className="flex items-center gap-1 hidden sm:flex">
                  <Building2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  {meeting.team}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Show participants if room is active */
              {roomParticipants.length > 0 ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex -space-x-1 sm:-space-x-1.5">
                    {roomParticipants.slice(0, 3).map((p, i) => (
                      <Avatar
                        key={p.peerId || i}
                        className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-background"
                      >
                        <AvatarImage
                          src={(p as any).avatar}
                          alt={p.name || "Avatar"}
                        />
                        <AvatarFallback className="text-[7px] sm:text-[8px] font-semibold bg-muted">
                          {p.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {roomParticipants.length > 3 && (
                      <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-[7px] sm:text-[8px] font-semibold text-muted-foreground">
                          +{roomParticipants.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium hidden sm:inline">
                    {roomParticipants.length}{" "}
                    {roomParticipants.length === 1 ? "person" : "people"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Avatar className="h-5 w-5 sm:h-6 sm:w-6 border border-border/50">
                    <AvatarImage
                      src={(meeting.host as any).avatar}
                      alt={meeting.host.name || "Avatar"}
                    />
                    <AvatarFallback className="text-[9px] sm:text-[10px] font-semibold bg-muted">
                      {meeting.host.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
                    {meeting.host.name}
                  </span>
                </div>
              )}
              {isEnded ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs cursor-default"
                  >
                    Ended
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant={isActuallyLive || isOnlyMe ? "default" : "outline"}
                  className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/meeting-lobby/${meeting.id}`);
                  }}
                >
                  {isActuallyLive || isOnlyMe ? "Join" : "Open"}
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5 sm:ml-1" />
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
  const isQuickHuddle = room.roomId.startsWith("quick-huddle");
  const myParticipant = room.participants.find(
    (p) => p.userId === currentUser?.id,
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card
        className={cn(
          "group border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent hover:from-emerald-500/10 transition-all duration-300 cursor-pointer",
          "hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5",
          "ring-0 hover:ring-1 hover:ring-emerald-500/20",
        )}
        onClick={() => navigate(`/meeting-lobby/${room.roomId}`)}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className="relative shrink-0">
              <div
                className={cn(
                  "w-9 h-9 sm:w-10 md:w-12 rounded-lg sm:rounded-xl flex items-center justify-center",
                  isQuickHuddle
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                )}
              >
                {isQuickHuddle ? (
                  <Zap className="w-4 h-4 sm:w-5 md:w-6" />
                ) : (
                  <Video className="w-4 h-4 sm:w-5 md:w-6" />
                )}
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                {room.name}
              </h3>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-1.5">
                <div className="flex -space-x-1.5 sm:-space-x-2">
                  {room.participants.slice(0, 4).map((p, i) => (
                    <Avatar
                      key={p.peerId || i}
                      className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-background"
                    >
                      <AvatarImage
                        src={(p as any).avatar}
                        alt={p.name || "Avatar"}
                      />
                      <AvatarFallback className="text-[7px] sm:text-[8px] font-semibold bg-muted">
                        {p.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                  {room.participants.length} online
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant={myParticipant ? "default" : "outline"}
              className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/meeting-lobby/${room.roomId}`);
              }}
            >
              {myParticipant ? "Return" : "Join"}
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5 sm:ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function Meetings() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
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
  const { activeRooms } = usePresence();
  const createQuickHuddlePath = () =>
    `/meeting-lobby/quick-huddle-${crypto.randomUUID()}`;

  useEffect(() => {
    apiGet<any[]>("/teams")
      .then((data) => setTeams(Array.isArray(data) ? data : []))
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
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
  }, []);

  const activeRoomIds = useMemo(
    () => new Set(activeRooms.map((r) => r.roomId)),
    [activeRooms],
  );

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

  const MeetingCard = viewMode === "grid" ? MeetingCardGrid : MeetingCardList;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <CreateMeetingDialog
          open={showCreateMeeting}
          onOpenChange={setShowCreateMeeting}
        />
        <JoinMeetingByCodeDialog
          open={showJoinByCode}
          onOpenChange={setShowJoinByCode}
        />

        {/* Filter Dialog */}
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

        {/* Header */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4">
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

              <div className="flex items-center gap-1.5 sm:gap-2 self-stretch sm:self-auto justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 sm:h-9 px-2.5 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowJoinByCode(true)}
                >
                  <Grid3x3 className="w-3.5 h-3.5 mr-1" />
                  Join by code
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 sm:h-9 gap-1.5 px-2.5 text-[11px] sm:text-xs border-border/60 bg-background/50 hover:bg-background"
                      onClick={() => navigate(createQuickHuddlePath())}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="hidden sm:inline">Quick Huddle</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>เริ่มประชุมด่วนทันที</TooltipContent>
                </Tooltip>
                <Button
                  size="sm"
                  className="h-8 sm:h-9 gap-1.5 px-2.5 text-[11px] sm:text-xs font-medium shrink-0"
                  onClick={() => setShowCreateMeeting(true)}
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">New Meeting</span>
                </Button>
              </div>
            </div>

            {/* Overview stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
              <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  ทั้งหมด
                </span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-lg sm:text-xl font-semibold tabular-nums">
                    {stats.total}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    meetings
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "rounded-xl border px-3 py-2.5 flex flex-col justify-between",
                  stats.live > 0
                    ? "border-emerald-500/60 bg-emerald-500/5"
                    : "border-border/60 bg-card/60",
                )}
              >
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Live ตอนนี้
                </span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-lg sm:text-xl font-semibold tabular-nums">
                    {stats.live}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    rooms
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  วันนี้
                </span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-lg sm:text-xl font-semibold tabular-nums">
                    {stats.today}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    meetings
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  กำลังจะถึง
                </span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-lg sm:text-xl font-semibold tabular-nums">
                    {stats.upcoming}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    upcoming
                  </span>
                </div>
              </div>
              <div className="hidden lg:flex rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 flex-col justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  ที่ผ่านมาแล้ว
                </span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-lg sm:text-xl font-semibold tabular-nums">
                    {stats.past}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ended
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-full flex flex-col">
            {/* Toolbar */}
            <div className="py-3 sm:py-4 md:py-6 space-y-3 sm:space-y-4">
              {/* Tab Pills */}
              <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-muted/40 rounded-lg border border-border/50 backdrop-blur-sm w-fit overflow-x-auto">
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

              {/* Search & Actions */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="relative flex-1 min-w-0 sm:min-w-[280px]">
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

            {/* Content Area */}
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
                  {/* Active Rooms */}
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

                  {/* Meetings */}
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
                                  onClick={() =>
                                    navigate(createQuickHuddlePath())
                                  }
                                  className="gap-2 h-9 sm:h-10"
                                >
                                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  Quick Huddle
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
