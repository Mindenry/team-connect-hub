import { Link } from "react-router-dom";
import {
  Video,
  Clock,
  Users,
  CheckSquare,
  FileText,
  Download,
  ArrowLeft,
  Calendar,
  User,
  MessageSquare,
  Hand,
  Monitor,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const meetingSummary = {
  title: "Sprint Planning",
  date: "February 9, 2026",
  startTime: "10:00 AM",
  endTime: "10:42 AM",
  duration: "42 minutes",
  host: { name: "สมชาย K.", initials: "SK" },
  team: "Engineering",
  totalParticipants: 6,
  participants: [
    { name: "สมชาย K.", initials: "SK", role: "Host", joinedAt: "10:00", leftAt: "10:42", duration: "42m" },
    { name: "อริสา P.", initials: "AP", role: "Participant", joinedAt: "10:00", leftAt: "10:42", duration: "42m" },
    { name: "จิรวัฒน์ W.", initials: "JW", role: "Participant", joinedAt: "10:01", leftAt: "10:42", duration: "41m" },
    { name: "พิมพ์ L.", initials: "PL", role: "Participant", joinedAt: "10:00", leftAt: "10:40", duration: "40m" },
    { name: "ธนา S.", initials: "TS", role: "Participant", joinedAt: "10:03", leftAt: "10:42", duration: "39m" },
    { name: "นภา M.", initials: "NM", role: "Participant", joinedAt: "10:05", leftAt: "10:42", duration: "37m" },
  ],
  stats: {
    screenShares: 3,
    handRaises: 5,
    chatMessages: 12,
    waitingRoomAdmits: 1,
  },
  agenda: [
    { topic: "Review previous sprint outcomes", duration: "8m", completed: true },
    { topic: "Discuss API v2 migration plan", duration: "15m", completed: true },
    { topic: "Mobile responsive fixes review", duration: "10m", completed: true },
    { topic: "Assign tasks for next sprint", duration: "9m", completed: true },
  ],
  tasksCreated: [
    { title: "Fix Safari upload bug", assignee: "จิรวัฒน์ W.", priority: "high", dueDate: "Feb 10" },
    { title: "Update API documentation", assignee: "อริสา P.", priority: "medium", dueDate: "Feb 12" },
    { title: "Design new onboarding flow", assignee: "พิมพ์ L.", priority: "medium", dueDate: "Feb 15" },
    { title: "Database migration v2.3", assignee: "ธนา S.", priority: "high", dueDate: "Feb 10" },
  ],
  notes: [
    "API v2 migration needs to be backward-compatible",
    "Safari upload bug is a CORS issue — จิรวัฒน์ will investigate",
    "New onboarding flow should reduce signup time by 30%",
    "Next standup moved to 10:30 AM starting tomorrow",
  ],
};

const priorityColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-secondary text-secondary-foreground",
};

export default function MeetingSummary() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/meetings"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{meetingSummary.title}</h1>
            <p className="text-sm text-muted-foreground">
              {meetingSummary.date} · {meetingSummary.startTime} — {meetingSummary.endTime}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Clock, label: "Duration", value: meetingSummary.duration },
          { icon: Users, label: "Participants", value: String(meetingSummary.totalParticipants) },
          { icon: Monitor, label: "Screen Shares", value: String(meetingSummary.stats.screenShares) },
          { icon: Hand, label: "Hand Raises", value: String(meetingSummary.stats.handRaises) },
          { icon: MessageSquare, label: "Chat Messages", value: String(meetingSummary.stats.chatMessages) },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 text-center">
              <stat.icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Participants */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-5 text-xs font-medium text-muted-foreground px-2 pb-1">
                <span className="col-span-2">Name</span>
                <span>Joined</span>
                <span>Left</span>
                <span className="text-right">Duration</span>
              </div>
              {meetingSummary.participants.map((p) => (
                <div key={p.name} className="grid grid-cols-5 items-center text-sm p-2 rounded-lg hover:bg-muted/50">
                  <div className="col-span-2 flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{p.initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-foreground truncate">{p.name}</span>
                    {p.role === "Host" && <Badge variant="secondary" className="text-[10px] px-1">Host</Badge>}
                  </div>
                  <span className="text-muted-foreground text-xs">{p.joinedAt}</span>
                  <span className="text-muted-foreground text-xs">{p.leftAt}</span>
                  <span className="text-right text-muted-foreground text-xs">{p.duration}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Agenda */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Agenda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {meetingSummary.agenda.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.completed ? "bg-success" : "bg-muted"}`}>
                  {item.completed && <CheckSquare className="w-3 h-3 text-success-foreground" />}
                </div>
                <span className="flex-1 text-sm text-foreground">{item.topic}</span>
                <span className="text-xs text-muted-foreground">{item.duration}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Tasks Created */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            Tasks Created from Meeting ({meetingSummary.tasksCreated.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {meetingSummary.tasksCreated.map((task, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
              <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm font-medium text-foreground">{task.title}</span>
              <span className="text-xs text-muted-foreground">{task.assignee}</span>
              <Badge className={`text-xs ${priorityColors[task.priority]}`}>{task.priority}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />{task.dueDate}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Meeting Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Meeting Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {meetingSummary.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {note}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
