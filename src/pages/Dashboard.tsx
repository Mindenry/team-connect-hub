import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Video,
  Plus,
  Calendar,
  MessageSquare,
  CheckSquare,
  Users,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  User,
  Hash,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import StatusIndicator from "@/components/shared/StatusIndicator";
import CreateMeetingDialog from "@/components/dialogs/CreateMeetingDialog";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";

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
  { name: "สมชาย K.", initials: "SK", status: "online" as const, activity: "In meeting" },
  { name: "อริสา P.", initials: "AP", status: "online" as const, activity: "Available" },
  { name: "จิรวัฒน์ W.", initials: "JW", status: "busy" as const, activity: "Do not disturb" },
  { name: "พิมพ์ L.", initials: "PL", status: "away" as const, activity: "Away (15m)" },
  { name: "ธนา S.", initials: "TS", status: "online" as const, activity: "Available" },
];

const recentChannels = [
  { name: "#general", team: "Engineering", unread: 3, lastMsg: "ใครเจอ bug ใน production ไหม?" },
  { name: "#standup", team: "Engineering", unread: 0, lastMsg: "Daily standup เลื่อนเป็น 10:30" },
  { name: "#reviews", team: "Design", unread: 2, lastMsg: "อัปเดต mockup หน้า Settings แล้ว" },
];

const activityFeed = [
  { id: 1, user: "อริสา P.", action: "created channel #design-system", icon: Hash, time: "10m ago", color: "bg-primary/10 text-primary" },
  { id: 2, user: "จิรวัฒน์ W.", action: "completed task 'Setup CI/CD pipeline'", icon: CheckSquare, time: "25m ago", color: "bg-success/10 text-success" },
  { id: 3, user: "ธนา S.", action: "joined Sprint Planning meeting", icon: Video, time: "30m ago", color: "bg-primary/10 text-primary" },
  { id: 4, user: "พิมพ์ L.", action: "uploaded PR #142 for review", icon: Activity, time: "1h ago", color: "bg-warning/10 text-warning" },
  { id: 5, user: "นภา M.", action: "mentioned you in #general", icon: MessageSquare, time: "2h ago", color: "bg-destructive/10 text-destructive" },
];

const priorityColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-secondary text-secondary-foreground",
};

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export default function Dashboard() {
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <CreateMeetingDialog open={showCreateMeeting} onOpenChange={setShowCreateMeeting} />
      <CreateTaskDialog open={showCreateTask} onOpenChange={setShowCreateTask} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good morning, สมชาย 👋</h1>
          <p className="text-muted-foreground">Here's what's happening today — Monday, Feb 9</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreateMeeting(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Meeting
          </Button>
          <Button size="sm" asChild>
            <Link to="/meeting-room">
              <Video className="w-4 h-4 mr-2" />
              Start Instant Meeting
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        {[
          { label: "New Meeting", icon: Video, action: () => setShowCreateMeeting(true) },
          { label: "New Task", icon: CheckSquare, action: () => setShowCreateTask(true) },
          { label: "Join by Code", icon: Zap, action: () => {} },
        ].map((qa) => (
          <Button key={qa.label} variant="outline" size="sm" onClick={qa.action} className="gap-2">
            <qa.icon className="w-3.5 h-3.5" />
            {qa.label}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Meetings Today", value: "3", icon: Video, trend: "+1 from yesterday", trendColor: "text-success" },
          { label: "Open Tasks", value: "12", icon: CheckSquare, trend: "4 due today", trendColor: "text-warning" },
          { label: "Unread Messages", value: "5", icon: MessageSquare, trend: "2 mentions", trendColor: "text-primary" },
          { label: "Team Online", value: "8/12", icon: Users, trend: "67% active", trendColor: "text-success" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.trendColor}`}>{stat.trend}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Meetings */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming Meetings</CardTitle>
              <Link to="/meetings" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">{meeting.title}</p>
                    {meeting.isNow && (
                      <Badge className="bg-success text-success-foreground text-xs animate-pulse-soft">LIVE</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {meeting.time} · {meeting.team || "Personal"} · {meeting.participants} participants
                  </p>
                </div>
                <Button size="sm" variant={meeting.isNow ? "default" : "outline"} asChild>
                  <Link to="/meeting-room">{meeting.isNow ? "Join Now" : "Details"}</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Team Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {onlineMembers.map((member) => (
              <div key={member.name} className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{member.initials}</AvatarFallback>
                  </Avatar>
                  <StatusIndicator status={member.status} className="absolute -bottom-0.5 -right-0.5 border-card" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.activity}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">My Tasks</CardTitle>
              <Link to="/tasks" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm text-foreground truncate">{task.title}</span>
                <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>{task.priority}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Channels */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Channels</CardTitle>
              <Link to="/chat" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentChannels.map((ch) => (
              <Link key={ch.name} to="/chat" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{ch.name}</span>
                    <span className="text-xs text-muted-foreground">{ch.team}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{ch.lastMsg}</p>
                </div>
                {ch.unread > 0 && <Badge variant="destructive" className="text-xs">{ch.unread}</Badge>}
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityFeed.map((item) => (
              <div key={item.id} className="flex items-start gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${item.color}`}>
                  <item.icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">
                    <span className="font-medium">{item.user}</span> {item.action}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
