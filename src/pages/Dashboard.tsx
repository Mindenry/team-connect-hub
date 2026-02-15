import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Video, Calendar, MessageSquare, CheckSquare, Users, Clock,
  ArrowRight, Activity, Hash, Zap, MapPin, Globe, Target, Sparkles,
  TrendingUp, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import StatusIndicator from "@/components/shared/StatusIndicator";
import CreateMeetingDialog from "@/components/dialogs/CreateMeetingDialog";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";
import FocusTimer from "@/components/widgets/FocusTimer";
import MoodCheckin from "@/components/widgets/MoodCheckin";
import TimeZoneWidget from "@/components/widgets/TimeZoneWidget";
import WorkHoursTracker from "@/components/widgets/WorkHoursTracker";
import { auth } from "@/lib/auth";
import { usePresence } from "@/hooks/usePresence";
import { apiGet } from "@/lib/api";

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted text-muted-foreground border-border",
};

const container = { animate: { transition: { staggerChildren: 0.04 } } };
const item = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.22 } } };

export default function Dashboard() {
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    meetingsToday: 0,
    openTasks: 0,
    unreadMessages: 0,
    teamOnline: "0/0",
  });
  const [loading, setLoading] = useState(true);
  const currentUser = auth.getUser();
  const { onlineCount, isUserOnline, activeRooms } = usePresence();

  useEffect(() => {
    const loadData = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [meetingsRes, tasksRes, usersRes, teamsRes, notificationsRes] = await Promise.all([
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
        ]);

        const safeMeetings = Array.isArray(meetingsRes) ? meetingsRes : [];
        const safeTasks = Array.isArray(tasksRes) ? tasksRes : [];
        const safeUsers = Array.isArray(usersRes) ? usersRes : [];

        const upcoming = safeMeetings
          .filter((m: any) => new Date(m.startTime) >= today && new Date(m.startTime) < tomorrow)
          .slice(0, 3)
          .map((m: any) => ({
            id: m.id,
            title: m.title,
            time: new Date(m.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            team: m.team?.name || "",
            participants: 0,
            isNow: m.status === "live",
          }));

        const tasks = safeTasks.slice(0, 4).map((t: any) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          status: t.status,
          assignee: t.assignee?.name?.split(" ").map((n: string) => n[0]).join("") || "",
        }));

        const members = safeUsers.slice(0, 8).map((u: any) => ({
          id: u.id,
          name: u.name,
          initials: u.name.split(" ").map((n: string) => n[0]).join(""),
          status: u.status || "offline",
          activity: u.activity || "Available",
          room: u.currentRoom || null,
        }));

        setUpcomingMeetings(upcoming);
        setRecentTasks(tasks);
        setOnlineMembers(members);
        setStats({
          meetingsToday: upcoming.length,
          openTasks: safeTasks.length,
          unreadMessages: notificationsRes || 0,
          teamOnline: `${onlineCount}/${safeUsers.length}`,
        });
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <motion.div
      className="p-4 md:p-6 space-y-4 md:space-y-5 w-full max-w-7xl mx-auto"
      variants={container}
      initial="initial"
      animate="animate"
    >
      <CreateMeetingDialog open={showCreateMeeting} onOpenChange={setShowCreateMeeting} />
      <CreateTaskDialog open={showCreateTask} onOpenChange={setShowCreateTask} />

      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {currentUser?.name || "User"} 👋
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} · {stats.meetingsToday} meetings · {stats.openTasks} tasks
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreateMeeting(true)} className="gap-2">
            <Calendar className="w-4 h-4" /><span className="hidden sm:inline">Schedule</span>
          </Button>
          <Button size="sm" className="gradient-primary gap-2 shadow-md" asChild>
            <Link to="/meeting-room"><Video className="w-4 h-4" /><span className="hidden sm:inline">Start Meeting</span></Link>
          </Button>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item} className="flex gap-2 flex-wrap overflow-x-auto pb-1">
        {[
          { label: "New Meeting", icon: Video, action: () => setShowCreateMeeting(true) },
          { label: "New Task", icon: CheckSquare, action: () => setShowCreateTask(true) },
          { label: "Join by Code", icon: Zap, action: () => {} },
          { label: "Virtual Office", icon: MapPin, href: "/virtual-office" },
        ].map((qa) => (
          qa.href ? (
            <Button key={qa.label} variant="outline" size="sm" className="gap-2 card-hover" asChild>
              <Link to={qa.href}><qa.icon className="w-3.5 h-3.5" />{qa.label}</Link>
            </Button>
          ) : (
            <Button key={qa.label} variant="outline" size="sm" onClick={qa.action} className="gap-2 card-hover">
              <qa.icon className="w-3.5 h-3.5" />{qa.label}
            </Button>
          )
        ))}
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={item}
        className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
      >
        {[
          { label: "Meetings Today", value: stats.meetingsToday.toString(), icon: Video, trend: "", trendColor: "text-success", gradient: "from-primary/10 to-info/10" },
          { label: "Open Tasks", value: stats.openTasks.toString(), icon: CheckSquare, trend: "", trendColor: "text-warning", gradient: "from-warning/10 to-warning/5" },
          { label: "Unread Messages", value: stats.unreadMessages.toString(), icon: MessageSquare, trend: "", trendColor: "text-primary", gradient: "from-primary/5 to-info/5" },
          { label: "Team Online", value: `${onlineCount}/${stats.teamOnline}`, icon: Users, trend: "", trendColor: "text-success", gradient: "from-success/10 to-success/5" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 + i * 0.04 }}>
            <Card className={`card-hover bg-gradient-to-br ${stat.gradient} border-0 shadow-sm`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-0.5">{stat.value}</p>
                    {stat.trend && <p className={`text-[10px] mt-0.5 font-medium ${stat.trendColor}`}>{stat.trend}</p>}
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-card/80 flex items-center justify-center shadow-sm">
                    <stat.icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Row 1: Focus Timer + Mood + Meetings */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Focus Timer */}
        <Card className="md:col-span-1 lg:col-span-3 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Focus Timer</CardTitle>
          </CardHeader>
          <CardContent><FocusTimer /></CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card className="md:col-span-2 lg:col-span-5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Upcoming Meetings</CardTitle>
              <Link to="/meetings" className="text-xs text-primary hover:underline flex items-center gap-0.5">View all <ArrowRight className="w-3 h-3" /></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : upcomingMeetings.length === 0 ? (
              <div className="text-sm text-muted-foreground">No upcoming meetings</div>
            ) : (
              upcomingMeetings.map((meeting, i) => (
              <motion.div key={meeting.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
                className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-all">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{meeting.title}</p>
                    {meeting.isNow && <Badge className="bg-success text-success-foreground text-[10px] h-4 animate-pulse">LIVE</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{meeting.time} · {meeting.team || "Personal"} · {meeting.participants}p</p>
                </div>
                <Button size="sm" variant={meeting.isNow ? "default" : "outline"} className={meeting.isNow ? "gradient-primary text-xs h-7" : "text-xs h-7"} asChild>
                  <Link to="/meeting-room">{meeting.isNow ? "Join" : "View"}</Link>
                </Button>
              </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Mood Check-in */}
        <Card className="md:col-span-1 lg:col-span-4 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-warning" /> Daily Check-in</CardTitle>
          </CardHeader>
          <CardContent><MoodCheckin /></CardContent>
        </Card>
      </motion.div>

      {/* Row 2: Work Hours + Team Status + Time Zones */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Work Hours Tracker */}
        <Card className="lg:col-span-4 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Work Hours</CardTitle>
          </CardHeader>
          <CardContent><WorkHoursTracker /></CardContent>
        </Card>

        {/* Team Status with Virtual Office link */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-success" /> Team Status</CardTitle>
              <Link to="/virtual-office" className="text-xs text-primary hover:underline flex items-center gap-0.5"><MapPin className="w-3 h-3" />Office</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : onlineMembers.length === 0 ? (
              <div className="text-sm text-muted-foreground">No team members</div>
            ) : (
              onlineMembers.map((member, i) => {
                const memberOnline = isUserOnline(member.id);
                const roomNames: Record<string, string> = {
                  workspace: "💻 Workspace",
                  "meeting-1": "🎥 Meeting A",
                  "meeting-2": "🎥 Meeting B",
                  huddle: "🎧 Huddle",
                  lounge: "☕ Lounge",
                  phone: "📞 Phone",
                };
                return (
              <motion.div key={member.name} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }}
                className="flex items-center gap-2.5">
                <div className="relative">
                  <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{member.initials}</AvatarFallback></Avatar>
                  <StatusIndicator status={memberOnline ? "online" : "offline"} className="absolute -bottom-0.5 -right-0.5 border-card" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{member.name}</p>
                  <p className="text-[10px] text-muted-foreground">{member.activity}</p>
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {member.room ? (roomNames[member.room] || member.room) : (memberOnline ? "🟢 Online" : "⚫ Offline")}
                </span>
              </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Time Zones */}
        <Card className="lg:col-span-4 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-info" /> Time Zones</CardTitle>
          </CardHeader>
          <CardContent><TimeZoneWidget /></CardContent>
        </Card>
      </motion.div>

      {/* Row 3: Tasks + Activity */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">My Tasks</CardTitle>
              <Link to="/tasks" className="text-xs text-primary hover:underline flex items-center gap-0.5">View all <ArrowRight className="w-3 h-3" /></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : recentTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground">No tasks</div>
            ) : (
              recentTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <CheckSquare className={`w-4 h-4 shrink-0 ${task.status === "done" ? "text-success" : "text-muted-foreground"}`} />
                  <span className={`flex-1 text-sm text-foreground truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                  <Badge variant="outline" className={`text-[10px] ${priorityColors[task.priority]}`}>{task.priority}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Active Rooms</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {activeRooms.length > 0 ? (
              activeRooms.slice(0, 3).map((room, i) => (
                <motion.div key={room.roomId} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Video className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{room.name}</p>
                    <p className="text-[10px] text-muted-foreground">{room.participants.length} participants</p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-600 text-[9px]">LIVE</Badge>
                </motion.div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No active rooms</div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
