import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const defaultMeetingSummary = {
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
  const { id } = useParams();
  const navigate = useNavigate();
  const [meetingData, setMeetingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate("/meetings");
      return;
    }

    const loadMeeting = async () => {
      try {
        const res = await fetch(`${API_BASE}/meetings/${id}`);
        if (res.ok) {
          const data = await res.json();
          setMeetingData(data);
        }
      } catch (err) {
        console.error("Failed to load meeting:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMeeting();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading meeting summary...</p>
        </div>
      </div>
    );
  }

  const meeting = meetingData || defaultMeetingSummary;
  const participants = meetingData?.participants || defaultMeetingSummary.participants;
  const tasks = meetingData?.tasks || defaultMeetingSummary.tasksCreated;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/meetings"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{meeting.title}</h1>
            <p className="text-sm text-muted-foreground">
              {meetingData ? (
                <>
                  {new Date(meeting.actualStartTime || meeting.startTime).toLocaleDateString()} ·{" "}
                  {new Date(meeting.actualStartTime || meeting.startTime).toLocaleTimeString()} —{" "}
                  {meeting.actualEndTime 
                    ? new Date(meeting.actualEndTime).toLocaleTimeString()
                    : "Ongoing"}
                </>
              ) : (
                <>
                  {meeting.date} · {meeting.startTime} — {meeting.endTime}
                </>
              )}
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
          { 
            icon: Clock, 
            label: "Duration", 
            value: meetingData && meeting.actualStartTime && meeting.actualEndTime
              ? `${Math.round((new Date(meeting.actualEndTime).getTime() - new Date(meeting.actualStartTime).getTime()) / 60000)}m`
              : meeting.duration
          },
          { icon: Users, label: "Participants", value: String(participants.length || meeting.totalParticipants) },
          { icon: Monitor, label: "Screen Shares", value: String(meeting.stats?.screenShares || 0) },
          { icon: Hand, label: "Hand Raises", value: String(meeting.stats?.handRaises || 0) },
          { icon: MessageSquare, label: "Chat Messages", value: String(meeting.stats?.chatMessages || 0) },
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
              {participants.map((p: any) => {
                const participantName = p.user?.name || p.name || "Unknown";
                const initials = participantName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                const joinedAt = p.joinedAt ? new Date(p.joinedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "?";
                const leftAt = p.leftAt ? new Date(p.leftAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "?";
                const duration = p.joinedAt && p.leftAt 
                  ? `${Math.round((new Date(p.leftAt).getTime() - new Date(p.joinedAt).getTime()) / 60000)}m`
                  : p.duration || "?";
                return (
                <div key={p.userId || p.id} className="grid grid-cols-5 items-center text-sm p-2 rounded-lg hover:bg-muted/50">
                  <div className="col-span-2 flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-foreground truncate">{participantName}</span>
                    {meetingData?.hostId === p.userId && <Badge variant="secondary" className="text-[10px] px-1">Host</Badge>}
                  </div>
                  <span className="text-muted-foreground text-xs">{joinedAt}</span>
                  <span className="text-muted-foreground text-xs">{leftAt}</span>
                  <span className="text-right text-muted-foreground text-xs">{duration}</span>
                </div>
                );
              })}
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
            Tasks Created from Meeting ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.map((task: any, i: number) => {
            const taskTitle = task.title || "Untitled Task";
            const assigneeName = task.assignee?.name || "Unassigned";
            const priority = task.priority || "medium";
            const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No due date";
            return (
            <div key={task.id || i} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
              <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm font-medium text-foreground">{taskTitle}</span>
              <span className="text-xs text-muted-foreground">{assigneeName}</span>
              <Badge className={`text-xs ${priorityColors[priority]}`}>{priority}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />{dueDate}
              </span>
            </div>
            );
          })}
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
          {meetingData?.summary ? (
            <div className="text-sm text-foreground whitespace-pre-wrap">{meetingData.summary}</div>
          ) : (
          <ul className="space-y-2">
              {meeting.notes.map((note: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {note}
              </li>
            ))}
          </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
