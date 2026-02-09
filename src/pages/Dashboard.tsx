import { useState } from "react";
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

const upcomingMeetings = [
  { id: 1, title: "Sprint Planning", time: "10:00 AM", team: "Engineering", participants: 8, isNow: true },
  { id: 2, title: "Design Review", time: "2:00 PM", team: "Design", participants: 5, isNow: false },
  { id: 3, title: "1-on-1 with Manager", time: "4:30 PM", team: "", participants: 2, isNow: false },
];

const recentTasks = [
  { id: 1, title: "Fix login bug on mobile", priority: "high", status: "in_progress", assignee: "SK" },
  { id: 2, title: "Update API documentation", priority: "medium", status: "todo", assignee: "AP" },
  { id: 3, title: "Review PR #142", priority: "low", status: "todo", assignee: "SK" },
  { id: 4, title: "Deploy staging v2.3", priority: "high", status: "done", assignee: "JW" },
];

const onlineMembers = [
  { name: "สมชาย K.", initials: "SK", status: "online" as const, activity: "In meeting", room: "🎥 Meeting A" },
  { name: "อริสา P.", initials: "AP", status: "online" as const, activity: "Designing", room: "💻 Workspace" },
  { name: "จิรวัฒน์ W.", initials: "JW", status: "busy" as const, activity: "Do not disturb", room: "💻 Workspace" },
  { name: "พิมพ์ L.", initials: "PL", status: "away" as const, activity: "On break", room: "☕ Lounge" },
  { name: "ธนา S.", initials: "TS", status: "online" as const, activity: "Coding", room: "💻 Workspace" },
];

const activityFeed = [
  { id: 1, user: "อริสา P.", action: "created channel #design-system", icon: Hash, time: "10m ago", color: "bg-primary/10 text-primary" },
  { id: 2, user: "จิรวัฒน์ W.", action: "completed 'Setup CI/CD pipeline'", icon: CheckSquare, time: "25m ago", color: "bg-success/10 text-success" },
  { id: 3, user: "ธนา S.", action: "joined Sprint Planning", icon: Video, time: "30m ago", color: "bg-primary/10 text-primary" },
  { id: 4, user: "พิมพ์ L.", action: "uploaded PR #142", icon: Activity, time: "1h ago", color: "bg-warning/10 text-warning" },
  { id: 5, user: "นภา M.", action: "mentioned you in #general", icon: MessageSquare, time: "2h ago", color: "bg-destructive/10 text-destructive" },
];

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

  return (
    <motion.div className="p-6 space-y-5 max-w-[1400px]" variants={container} initial="initial" animate="animate">
      <CreateMeetingDialog open={showCreateMeeting} onOpenChange={setShowCreateMeeting} />
      <CreateTaskDialog open={showCreateTask} onOpenChange={setShowCreateTask} />

      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good morning, สมชาย 👋</h1>
          <p className="text-sm text-muted-foreground">Monday, Feb 9 · 3 meetings · 4 tasks due today</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreateMeeting(true)} className="gap-2">
            <Calendar className="w-4 h-4" />Schedule
          </Button>
          <Button size="sm" className="gradient-primary gap-2 shadow-md" asChild>
            <Link to="/meeting-room"><Video className="w-4 h-4" />Start Meeting</Link>
          </Button>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item} className="flex gap-2 flex-wrap">
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
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Meetings Today", value: "3", icon: Video, trend: "+1 from yesterday", trendColor: "text-success", gradient: "from-primary/10 to-info/10" },
          { label: "Open Tasks", value: "12", icon: CheckSquare, trend: "4 due today", trendColor: "text-warning", gradient: "from-warning/10 to-warning/5" },
          { label: "Unread Messages", value: "5", icon: MessageSquare, trend: "2 mentions", trendColor: "text-primary", gradient: "from-primary/5 to-info/5" },
          { label: "Team Online", value: "8/12", icon: Users, trend: "67% active", trendColor: "text-success", gradient: "from-success/10 to-success/5" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 + i * 0.04 }}>
            <Card className={`card-hover bg-gradient-to-br ${stat.gradient} border-0 shadow-sm`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-0.5">{stat.value}</p>
                    <p className={`text-[10px] mt-0.5 font-medium ${stat.trendColor}`}>{stat.trend}</p>
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
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Focus Timer */}
        <Card className="lg:col-span-3 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Focus Timer</CardTitle>
          </CardHeader>
          <CardContent><FocusTimer /></CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Upcoming Meetings</CardTitle>
              <Link to="/meetings" className="text-xs text-primary hover:underline flex items-center gap-0.5">View all <ArrowRight className="w-3 h-3" /></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingMeetings.map((meeting, i) => (
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
            ))}
          </CardContent>
        </Card>

        {/* Mood Check-in */}
        <Card className="lg:col-span-4 card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-warning" /> Daily Check-in</CardTitle>
          </CardHeader>
          <CardContent><MoodCheckin /></CardContent>
        </Card>
      </motion.div>

      {/* Row 2: Work Hours + Team Status + Time Zones */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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
            {onlineMembers.map((member, i) => (
              <motion.div key={member.name} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }}
                className="flex items-center gap-2.5">
                <div className="relative">
                  <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{member.initials}</AvatarFallback></Avatar>
                  <StatusIndicator status={member.status} className="absolute -bottom-0.5 -right-0.5 border-card" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{member.name}</p>
                  <p className="text-[10px] text-muted-foreground">{member.activity}</p>
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{member.room}</span>
              </motion.div>
            ))}
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
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <CheckSquare className={`w-4 h-4 shrink-0 ${task.status === "done" ? "text-success" : "text-muted-foreground"}`} />
                <span className={`flex-1 text-sm text-foreground truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                <Badge variant="outline" className={`text-[10px] ${priorityColors[task.priority]}`}>{task.priority}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {activityFeed.map((act) => (
              <div key={act.id} className="flex items-start gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${act.color}`}>
                  <act.icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground"><span className="font-medium">{act.user}</span> {act.action}</p>
                  <p className="text-[10px] text-muted-foreground">{act.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
