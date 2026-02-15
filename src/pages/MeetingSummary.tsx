import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { auth } from "@/lib/auth";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const priorityColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-secondary text-secondary-foreground",
};

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

export default function MeetingSummary() {
  const [searchParams] = useSearchParams();
  const meetingId = searchParams.get("id");
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!meetingId) {
        toast.error("Meeting ID is required");
        setLoading(false);
        return;
      }

      try {
        const headers = await auth.getAuthHeaders();
        const [meetingRes, tasksRes] = await Promise.all([
          fetch(`${API_BASE}/meetings/${meetingId}`, { headers }).then((r) => {
            if (!r.ok) throw new Error("Failed to load meeting");
            return r.json();
          }),
          fetch(`${API_BASE}/tasks?meetingId=${meetingId}`, { headers }).then((r) => r.json()).catch(() => []),
        ]);

        setMeeting(meetingRes);
        setTasks(tasksRes || []);
      } catch (err: any) {
        console.error("Failed to load meeting summary:", err);
        toast.error("Failed to load meeting summary");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [meetingId]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center text-muted-foreground">Loading meeting summary...</div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center text-muted-foreground">Meeting not found</div>
        <Button asChild className="mt-4">
          <Link to="/meetings">Back to Meetings</Link>
        </Button>
      </div>
    );
  }

  const startTime = new Date(meeting.startTime);
  const endTime = new Date(meeting.endTime);
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMins = Math.floor(durationMs / 60000);
  const duration = `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;

  const dateStr = startTime.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const startTimeStr = startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const endTimeStr = endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const hostInitials = getInitials(meeting.host?.name || "Unknown");

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
              {dateStr} · {startTimeStr} — {endTimeStr}
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
          { icon: Clock, label: "Duration", value: duration },
          { icon: Users, label: "Team", value: meeting.team?.name || "No team" },
          { icon: Video, label: "Status", value: meeting.status },
          { icon: User, label: "Host", value: meeting.host?.name || "Unknown" },
          { icon: CheckSquare, label: "Tasks", value: String(tasks.length) },
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
        {/* Host Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Meeting Host</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">{hostInitials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{meeting.host?.name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">{meeting.host?.email || ""}</p>
              </div>
            </div>
            {meeting.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">{meeting.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meeting Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Waiting Room</span>
              <Badge variant={meeting.waitingRoom ? "default" : "secondary"}>
                {meeting.waitingRoom ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Screen Share</span>
              <Badge variant={meeting.allowScreenShare ? "default" : "secondary"}>
                {meeting.allowScreenShare ? "Allowed" : "Not Allowed"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Created */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Tasks Created from Meeting ({tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
                <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm font-medium text-foreground">{task.title}</span>
                <span className="text-xs text-muted-foreground">{task.assignee?.name || "Unassigned"}</span>
                <Badge className={`text-xs ${priorityColors[task.priority] || priorityColors.medium}`}>
                  {task.priority}
                </Badge>
                {task.dueDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Meeting Description as Notes */}
      {meeting.description && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Meeting Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-line">{meeting.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
