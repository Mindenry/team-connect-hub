import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";

const priorityColors: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-secondary text-secondary-foreground",
};

const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

// Component สำหรับแสดง Action Item
function ActionItemCard({ item, index }: { item: any; index: number }) {
  const priorityColors: Record<string, string> = {
    urgent: 'bg-destructive/10 text-destructive border-destructive/30',
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    medium: 'bg-warning/10 text-warning border-warning/20',
    low: 'bg-secondary/50 text-secondary-foreground border-border',
  };

  const statusColors: Record<string, string> = {
    done: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    review: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    todo: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1.5">
            <span className="text-xs font-semibold text-muted-foreground shrink-0 mt-0.5">{index}.</span>
            <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
          </div>
          
          {item.description && (
            <p className="text-xs text-muted-foreground ml-5 mb-2 line-clamp-2">{item.description}</p>
          )}
          
          <div className="flex flex-wrap items-center gap-3 ml-5 mt-2">
            {item.ownerName && (
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{item.ownerName}</span>
              </div>
            )}
            {item.dueDateNote && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{item.dueDateNote}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {item.status && (
            <Badge 
              variant="outline"
              className={`text-[10px] px-2 py-0.5 ${statusColors[item.status] || statusColors.todo}`}
            >
              {item.status.toUpperCase()}
            </Badge>
          )}
          {item.priority && (
            <Badge 
              variant="outline"
              className={`text-[10px] px-2 py-0.5 font-semibold ${priorityColors[item.priority] || priorityColors.medium}`}
            >
              {item.priority.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MeetingSummary() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const meetingId = (params.id as string | undefined) ?? searchParams.get("id");
  const [loading, setLoading] = useState(true);
  // Data State
  const [meeting, setMeeting] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!meetingId) {
        setLoading(false);
        toast.error("Meeting ID is missing");
        return;
      }
      try {
        const [meetingRes, tasksRes] = await Promise.all([
          apiGet<any>(`/meetings/${meetingId}`),
          apiGet<any[]>(`/tasks?meetingId=${meetingId}`).catch(() => []),
        ]);

        if (meetingRes) {
          setMeeting(meetingRes);
        }
        setTasks(tasksRes || []);
      } catch (err) {
        console.error("Failed to load meeting:", err);
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

  const notes: string[] = meeting?.notes || [];
  
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


        {/* Agenda */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Agenda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Fallback if no agenda */}
            {(meeting.agenda || []).length === 0 && <p className="text-sm text-muted-foreground">No agenda items.</p>}
            {(meeting.agenda || []).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    item.completed ? "bg-success" : "bg-muted"
                  }`}
                >
                  {item.completed && (
                    <CheckSquare className="w-3 h-3 text-success-foreground" />
                  )}
                </div>
                <span className="flex-1 text-sm text-foreground">{item.topic}</span>
                <span className="text-xs text-muted-foreground">{item.duration || "10m"}</span>
              </div>
            ))}
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

      {tasks.length > 0 && (
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
              
              const pColors: Record<string, string> = {
                high: "bg-destructive/10 text-destructive border-destructive/20",
                medium: "bg-warning/10 text-warning border-warning/20",
                low: "bg-secondary text-secondary-foreground",
              };

              return (
              <div key={task.id || i} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
                <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm font-medium text-foreground">{taskTitle}</span>
                <span className="text-xs text-muted-foreground">{assigneeName}</span>
                <Badge variant="outline" className={`text-xs ${pColors[priority] || pColors.medium}`}>{priority}</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{dueDate}
                </span>
              </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Meeting Description */}
      {meeting?.description && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              รายละเอียดการประชุม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-foreground whitespace-pre-wrap">
              {meeting.description}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
