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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";

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
  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiStructured, setAiStructured] = useState<{
    summary: string;
    decisions: string[];
    actionItems: {
      title: string;
      ownerName?: string;
      ownerEmail?: string;
      priority?: string;
      dueDateNote?: string;
    }[];
  } | null>(null);
  
  // Data State
  const [meeting, setMeeting] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [meetingRes, tasksRes] = await Promise.all([
          apiGet<any>(`/meetings/${meetingId}`),
          apiGet<any[]>(`/tasks?meetingId=${meetingId}`).catch(() => []),
        ]);

        if (meetingRes) {
          setMeeting(meetingRes);
          // If AI summary was already generated earlier, hydrate local state
          if (meetingRes.aiSummary) {
            try {
              const parsed = JSON.parse(meetingRes.aiSummary);
              setAiStructured(parsed);
              // Build a readable block for textarea-like preview
              const readable =
                parsed.summary +
                (parsed.decisions?.length
                  ? "\n\n📌 ข้อสรุปสำคัญ\n" +
                    parsed.decisions.map((d: string, i: number) => `${i + 1}. ${d}`).join("\n")
                  : "") +
                (parsed.actionItems?.length
                  ? "\n\n✅ งานที่ต้องทำ (Action Items)\n" +
                    parsed.actionItems
                      .map((a: any, i: number) => {
                         const who =
                          a.ownerName || a.ownerEmail
                            ? `${a.ownerName || ""}${a.ownerEmail ? ` (${a.ownerEmail})` : ""}`
                            : "ไม่ระบุผู้รับผิดชอบ";
                        const prio = (a.priority || "medium").toUpperCase();
                        const due = a.dueDateNote || "ยังไม่กำหนดกำหนดส่ง";
                        return `${i + 1}. [${prio}] ${a.title}\n   ผู้รับผิดชอบ: ${who}\n   หมายเหตุเวลา: ${due}`;
                      })
                      .join("\n")
                  : "");
              setAiSummary(readable);
            } catch {
              // if parse fails, just show raw text
              setAiSummary(typeof meetingRes.aiSummary === "string" ? meetingRes.aiSummary : String(meetingRes.aiSummary));
            }
          }
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

  const handleGenerateAiSummary = async () => {
    if (!meetingId) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(`${API_BASE}/meetings/${meetingId}/ai-summary`, {
        method: "POST",
        headers: await auth.getAuthHeaders(),
      });
      if (!res.ok) {
        const text = await res.text();
        let message = "ไม่สามารถสร้างสรุปอัตโนมัติได้";

        try {
          const parsed = JSON.parse(text);
          const rawMessage: string | undefined =
            typeof parsed?.message === "string" ? parsed.message : undefined;

          if (rawMessage?.includes("Meeting chat channel not found")) {
            message =
              "ห้องนี้ยังไม่มีช่องแชทสำหรับประชุมหรือยังไม่มีข้อความในแชท จึงไม่สามารถสรุปด้วย AI ได้ กรุณาพิมพ์ในห้องแชทสักเล็กน้อยก่อน แล้วลองใหม่อีกครั้งค่ะ";
          } else if (rawMessage?.includes("No chat messages found")) {
            message =
              "ยังไม่พบข้อความแชทในห้องประชุมนี้ จึงไม่สามารถสรุปด้วย AI ได้ กรุณาพิมพ์ข้อความในแชทก่อนนะคะ";
          } else if (rawMessage) {
            message = rawMessage;
          }
        } catch {
          if (text) {
            message = text;
          }
        }

        setAiError(message);
        return;
      }
      const data = await res.json();
      // Backend returns { meeting, aiSummary, raw, createdTasksCount }
      setMeeting(data.meeting);
      setAiStructured(data.raw);
      setAiSummary(data.aiSummary);
    } catch (err: any) {
      console.error("AI summary error:", err);
      setAiError(err?.message || "ไม่สามารถสร้างสรุปอัตโนมัติได้");
    } finally {
      setAiLoading(false);
    }
  };

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
          <Button
            variant="outline"
            size="sm"
            className={cn(aiLoading && "pointer-events-none opacity-70")}
            onClick={handleGenerateAiSummary}
          >
            {aiLoading ? (
              <>
                <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                กำลังสร้างสรุปด้วย AI...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                สรุปด้วย AI
              </>
            )}
          </Button>
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


        {/* AI Summary & Agenda */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AI Meeting Summary & Agenda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Summary block */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  สรุปการประชุมอัตโนมัติ (AI)
                </p>
                {aiStructured && (
                  <Badge variant="outline" className="text-[10px]">
                    AI Generated
                  </Badge>
                )}
              </div>
              {aiError && (
                <p className="text-xs text-destructive">
                  {aiError}
                </p>
              )}
              {aiSummary ? (
                <Textarea
                  value={aiSummary}
                  readOnly
                  className="min-h-[180px] resize-none text-sm bg-muted/60"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  ยังไม่มีสรุปจาก AI คุณสามารถกดปุ่ม <span className="font-semibold">“สรุปด้วย AI”</span> ด้านบนเพื่อสร้างสรุปการประชุมและ
                  action items อัตโนมัติจากข้อความแชทในห้องประชุม
                </p>
              )}
            </div>

            <Separator />

            {/* Static / Planned agenda demo */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Agenda (planned topics)
              </p>
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
            </div>
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

      {/* Meeting Notes (manual) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Meeting Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {meeting.description ? (
            <div className="text-sm text-foreground whitespace-pre-wrap">
              {meeting.description}
            </div>
          ) : (
             <p className="text-sm text-muted-foreground">No notes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
