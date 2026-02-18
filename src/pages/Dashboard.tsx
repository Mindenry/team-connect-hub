import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Video,
  Calendar,
  MessageSquare,
  CheckSquare,
  Users,
  ArrowRight,
  MapPin,
  Target,
  Eye,
  Timer,
  Hash,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusIndicator from "@/components/shared/StatusIndicator";
import CreateMeetingDialog from "@/components/dialogs/CreateMeetingDialog";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";
import JoinMeetingByCodeDialog from "@/components/dialogs/JoinMeetingByCodeDialog";
import FocusTimer from "@/components/widgets/FocusTimer";
import WorkHoursTracker from "@/components/widgets/WorkHoursTracker";
import { auth } from "@/lib/auth";
import { usePresence } from "@/hooks/usePresence";
import { apiGet } from "@/lib/api";

type MeetingItem = {
  id: string;
  title: string;
  startTime: string;
  team: string;
  participants: number;
  isLive: boolean;
};

type TaskItem = {
  id: string;
  title: string;
  priority: string;
  status: string;
};

type MemberItem = {
  id: string;
  name: string;
  initials: string;
  status: string;
  activity: string;
  room: string | null;
};

const priorityPills: Record<string, string> = {
  high: "bg-destructive/5 text-destructive border-destructive/20",
  medium: "bg-warning/5 text-warning border-warning/20",
  low: "bg-muted/40 text-muted-foreground border-border/60",
};

const container = { animate: { transition: { staggerChildren: 0.04 } } };
const item = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.22 } } };

export default function Dashboard() {
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showJoinByCode, setShowJoinByCode] = useState(false);

  const [todayMeetings, setTodayMeetings] = useState<MeetingItem[]>([]);
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [stats, setStats] = useState({
    meetingsToday: 0,
    openTasks: 0,
    unreadMessages: 0,
    teamTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const currentUser = auth.getUser();
  const { onlineCount, isUserOnline, activeRooms } = usePresence();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadError(null);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const now = new Date();

        const [meetingsRes, tasksRes, usersRes, teamsRes, notificationsRes, channelsRes] = await Promise.all([
          apiGet<any[]>("/meetings?status=upcoming").catch(() => []),
          apiGet<any[]>("/tasks").catch(() => []).then((tasks: any[]) =>
            Array.isArray(tasks) ? tasks.filter((t: any) => t.status === "todo" || t.status === "in_progress") : []
          ),
          apiGet<any[]>("/users").catch(() => []),
          apiGet<any[]>("/teams").catch(() => []),
          currentUser?.id
            ? apiGet<any>(`/notifications?userId=${currentUser.id}&read=false`).catch(() => []).then((res: any) =>
              Array.isArray(res) ? res.length : 0
            ) 
            : Promise.resolve(0),
          apiGet<any[]>("/channels").catch(() => []),
        ]);

        const safeMeetings = Array.isArray(meetingsRes) ? meetingsRes : [];
        const safeTasks = Array.isArray(tasksRes) ? tasksRes : [];
        const safeUsers = Array.isArray(usersRes) ? usersRes : [];

        const meetingsTodayAll: MeetingItem[] = safeMeetings
          .filter((m: any) => {
             const start = new Date(m.startTime);
             return start >= today && start < tomorrow;
          })
          .map((m: any) => ({
             id: m.id,
             title: m.title || "Untitled meeting",
             startTime: m.startTime,
             team: m.team?.name || "Personal",
             participants: m.participants?.length || 0,
             isLive: m.status === "live"
          }));

        const meetingsForList = meetingsTodayAll
          .filter((m: any) => new Date(m.startTime) >= now)
          .slice(0, 4);

        const tasks: TaskItem[] = safeTasks.slice(0, 6).map((t: any) => ({
          id: t.id,
          title: t.title || "Untitled task",
          priority: t.priority || "low",
          status: t.status || "todo",
        }));

        const memberList: MemberItem[] = safeUsers.slice(0, 8).map((u: any) => ({
          id: u.id,
          name: u.name || "Unknown",
          initials: (u.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
          status: u.status || "offline",
          activity: u.activity || "Available",
          room: u.currentRoom || null,
        }));

        // Calculate unread count if we have channels
        let unreadTotal = notificationsRes || 0;
        
         setTodayMeetings(meetingsForList);
         setRecentTasks(tasks);
         setMembers(memberList);
         setStats({
          meetingsToday: meetingsTodayAll.length,
          openTasks: safeTasks.length,
          unreadMessages: unreadTotal,
          teamTotal: safeUsers.length,
        });
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setLoadError("We couldn’t load your dashboard. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const nextMeeting = todayMeetings[0];
  const onlineSummary = `${onlineCount}/${stats.teamTotal || 0}`;

  return (
    <motion.div
       className="relative mx-auto w-full max-w-[1400px] p-4 md:p-8 space-y-5 md:space-y-7"
      variants={container}
      initial="initial"
      animate="animate"
    >
      <CreateMeetingDialog open={showCreateMeeting} onOpenChange={setShowCreateMeeting} />
      <CreateTaskDialog open={showCreateTask} onOpenChange={setShowCreateTask} />
      <JoinMeetingByCodeDialog open={showJoinByCode} onOpenChange={setShowJoinByCode} />

      {/* Hero */}
      <motion.div variants={item} className="relative overflow-hidden rounded-2xl border bg-card/70 p-5 md:p-6 shadow-sm">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-20 h-48 bg-gradient-to-b from-primary/10 via-primary/0 to-transparent blur-2xl" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
              {greeting}, {currentUser?.name || "User"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {nextMeeting ? (
                <>
                  Next: <span className="text-foreground/90">{nextMeeting.title}</span> ·{" "}
                  {new Date(nextMeeting.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </>
              ) : (
                <>No meetings scheduled for the rest of today</>
              )}{" "}
              · <span className="text-foreground/90">{onlineCount}</span> online
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowJoinByCode(true)} className="gap-2">
              <Hash className="h-4 w-4" />
              Join by code
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCreateTask(true)} className="gap-2">
              <CheckSquare className="h-4 w-4" />
              New task
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCreateMeeting(true)} className="gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </Button>
            <Button size="sm" className="gradient-primary shadow-sm gap-2" asChild>
              <Link to="/meeting-room">
                <Video className="h-4 w-4" />
                Start meeting
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {loadError && (
        <motion.div variants={item} className="rounded-xl border bg-card px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-foreground">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </motion.div>
      )}

      {/* KPI */}
      <motion.div
        variants={item}
        className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
      >
        {[
          { label: "Meetings today", value: stats.meetingsToday, icon: Video },
          { label: "Open tasks", value: stats.openTasks, icon: CheckSquare },
          { label: "Unread messages", value: stats.unreadMessages, icon: MessageSquare },
          { label: "Online now", value: onlineSummary, icon: Users },
        ].map((kpi) => (
          <Card key={kpi.label} className="border bg-card/70 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                  {loading ? (
                    <Skeleton className="mt-2 h-7 w-24" />
                  ) : (
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{kpi.value}</p>
                  )}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
                  <kpi.icon className="h-4 w-4 text-foreground/80" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Row 1 */}
      <motion.div variants={item} className="grid gap-4 lg:grid-cols-12">
        {/* Meetings */}
        <Card className="lg:col-span-7 border bg-card/70 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold">Today</CardTitle>
              <Link to="/meetings" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                View schedule <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <>
                {[0, 1, 2].map((k) => (
                  <div key={k} className="flex items-center gap-3 rounded-xl border bg-background/40 p-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </div>
                ))}
              </>
            ) : todayMeetings.length === 0 ? (
              <div className="rounded-xl border bg-background/40 p-4">
                <p className="text-sm text-foreground">No upcoming meetings today.</p>
                <p className="mt-1 text-xs text-muted-foreground">Schedule one, or start a quick meeting.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowCreateMeeting(true)} className="gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </Button>
                  <Button size="sm" className="gradient-primary gap-2" asChild>
                    <Link to="/meeting-room">
                      <Video className="h-4 w-4" />
                      Start meeting
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              todayMeetings.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.03 }}
                  className="flex items-center gap-3 rounded-xl border bg-background/40 p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 shrink-0">
                    <Video className="h-4 w-4 text-foreground/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                      {m.isLive && (
                        <Badge className="h-4 bg-success/10 text-success border border-success/20 text-[10px]">
                          LIVE
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {m.team} ·{" "}
                      {m.participants} participants
                    </p>
                  </div>
                  <Button size="sm" variant={m.isLive ? "default" : "outline"} className={m.isLive ? "gradient-primary h-8" : "h-8"} asChild>
                    <Link to={`/meeting-lobby/${m.id}`}>{m.isLive ? "Join" : "Lobby"}</Link>
                  </Button>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="lg:col-span-5 border bg-card/70 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold">My tasks</CardTitle>
              <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((k) => (
                  <div key={k} className="flex items-center gap-3 rounded-xl border bg-background/40 p-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-56" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                ))}
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="rounded-xl border bg-background/40 p-4">
                <p className="text-sm text-foreground">No tasks assigned.</p>
                <p className="mt-1 text-xs text-muted-foreground">Create one to track your next actions.</p>
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => setShowCreateTask(true)} className="gap-2">
                    <CheckSquare className="h-4 w-4" />
                    New task
                  </Button>
                </div>
              </div>
            ) : (
              recentTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border bg-background/40 p-3 hover:bg-muted/30 transition-colors">
                  <CheckSquare className={`h-4 w-4 shrink-0 ${t.status === "done" ? "text-success" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {t.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Priority · {t.priority}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${priorityPills[t.priority] || priorityPills.low}`}>
                    {t.priority}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 2 */}
      <motion.div variants={item} className="grid gap-4 lg:grid-cols-12">
        {/* Team pulse */}
        <Card className="lg:col-span-4 border bg-card/70 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4 text-foreground/70" />
                Team pulse
              </CardTitle>
              <Link to="/virtual-office" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Office
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((k) => (
                  <div key={k} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members.</p>
            ) : (
              members.map((m, i) => {
                const presenceStatus: "online" | "busy" | "away" | "offline" | "dnd" =
                  (["online", "busy", "away", "offline", "dnd"] as const).includes(
                    m.status as any,
                  )
                    ? (m.status as any)
                    : isUserOnline(m.id)
                    ? "online"
                    : "offline";
                const roomNames: Record<string, string> = {
                  workspace: "Workspace",
                  "meeting-1": "Meeting A",
                  "meeting-2": "Meeting B",
                  huddle: "Huddle",
                  lounge: "Lounge",
                  phone: "Phone",
                  "quick-huddle": "Quick huddle",
                };

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 + i * 0.02 }}
                    className="flex items-center gap-2.5"
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-muted/60 text-foreground text-[11px] font-medium">
                          {m.initials}
                        </AvatarFallback>
                      </Avatar>
                      <StatusIndicator
                        status={presenceStatus}
                        className="absolute -bottom-0.5 -right-0.5 border-card"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{m.activity}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
                      {m.room
                        ? roomNames[m.room] || m.room
                        : presenceStatus === "dnd"
                        ? "Do Not Disturb"
                        : presenceStatus === "busy"
                        ? "Busy"
                        : presenceStatus === "away"
                        ? "Away"
                        : presenceStatus === "online"
                        ? "Online"
                        : "Offline"}
                    </span>
                  </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Active rooms */}
        <Card className="lg:col-span-4 border bg-card/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Active rooms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeRooms.length === 0 ? (
              <div className="rounded-xl border bg-background/40 p-4">
                <p className="text-sm text-foreground">No live rooms right now.</p>
                <p className="mt-1 text-xs text-muted-foreground">Start a quick meeting to get moving.</p>
                <div className="mt-3">
                  <Button size="sm" className="gradient-primary gap-2" asChild>
                    <Link to="/meeting-room">
                      <Video className="h-4 w-4" />
                      Start meeting
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              activeRooms.slice(0, 4).map((room: any, i: number) => (
                <motion.div
                  key={room.roomId}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 + i * 0.02 }}
                  className="flex items-center gap-3 rounded-xl border bg-background/40 p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 shrink-0">
                    <Video className="h-4 w-4 text-foreground/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{room.name}</p>
                    <p className="text-xs text-muted-foreground">{room.participants?.length || 0} participants</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8" asChild>
                    <Link to={`/meeting-lobby/${room.roomId}`}>Join</Link>
                  </Button>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Productivity */}
        <Card className="lg:col-span-4 border bg-card/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-foreground/70" />
              Productivity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="focus" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/40">
                <TabsTrigger value="focus" className="gap-2">
                  <Timer className="h-4 w-4" />
                  Focus
                </TabsTrigger>
                <TabsTrigger value="hours" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Hours
                </TabsTrigger>
              </TabsList>
              <TabsContent value="focus" className="mt-4">
                <FocusTimer />
              </TabsContent>
              <TabsContent value="hours" className="mt-4">
                <WorkHoursTracker />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
}
