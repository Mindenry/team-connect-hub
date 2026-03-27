import { useEffect, useMemo, useState } from "react";
import {
  FileBarChart,
  TrendingUp,
  Users,
  Calendar,
  CheckSquare,
  Loader2,
  Activity,
  BarChart3,
  Download,
  MessageSquare,
  AlertTriangle,
  Trophy,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch, apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


// ─── Types ───────────────────────────────────────────────────────────────────

type DateRangeKey = "week" | "month" | "quarter" | "year";
type ExportFormat = "csv" | "json" | "xlsx" | "pdf";

interface PersonalReportData {
  tasksCompleted?: number;
  meetingsAttended?: number;
  messagesSent?: number;
  productivityScore?: number;
  teamMetrics?: {
    teamName: string;
    tasksCompleted?: number;
    meetingsAttended?: number;
    messagesSent?: number;
  }[];
}

interface TeamProductivityReport {
  period: { start: string | Date; end: string | Date };
  team: { id: string; name: string };
  summary: {
    members: number;
    tasks: {
      total: number;
      byStatus?: Record<string, number>;
      byPriority?: Record<string, number>;
      completed: number;
      inProgress: number;
    };
    meetings: {
      total: number;
      completed: number;
      scheduled: number;
      totalDuration: number;
    };
  };
  members: {
    user: { id: string; name: string; email: string };
    tasks: { total: number; completed: number; inProgress: number };
    messagesSent: number;
    meetingsAttended: number;
  }[];
}

interface MeetingReport {
  summary: {
    totalMeetings: number;
    totalDuration: number;
    totalParticipants: number;
    avgParticipants: number;
    avgDuration: number;
  };
  meetingsByTeam: Record<string, number>;
  meetings: {
    id: string;
    title: string;
    startTime: string;
    endTime: string | null;
    duration: number;
    host: string;
    team?: string | null;
    participants: number;
  }[];
}

interface TaskReport {
  summary: {
    totalTasks: number;
    overdueTasks: number;
    completedTasks: number;
    inProgressTasks: number;
  };
  tasksByStatus?: Record<string, number>;
  tasksByPriority?: Record<string, number>;
  overdueTasks: {
    id: string;
    title: string;
    dueDate: string | null;
    assignee?: string | null;
    team?: string | null;
    priority: string;
  }[];
}

interface TeamWorkloadReport {
  team: { id: string; name: string };
  workload: {
    userId: string;
    userName: string;
    totalTasks: number;
    completed: number;
    inProgress: number;
    todo: number;
    overdue: number;
  }[];
}

interface PerformanceDashboard {
  period: { startDate: string; endDate: string };
  taskCompletionRates: {
    userId: string;
    userName: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }[];
  meetingAttendanceRates?: {
    userId: string;
    userName: string;
    totalMeetings: number;
    attendedMeetings: number;
    attendanceRate: number;
  }[];
  collaborationActivity: {
    userId: string;
    userName: string;
    completedTasks: number;
    attendedMeetings: number;
    messagesSent: number;
    totalInteractions: number;
  }[];
}

interface TeamOption { id: string; name: string; }
type ReportTab = "overview" | "team" | "performance";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateRangeLabel(range: DateRangeKey): string {
  switch (range) {
    case "week": return "สัปดาห์ที่ผ่านมา";
    case "month": return "เดือนที่ผ่านมา";
    case "quarter": return "ไตรมาสที่ผ่านมา";
    case "year": return "ปีที่ผ่านมา";
  }
}

function getDateRange(range: DateRangeKey): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (range) {
    case "week": start.setDate(start.getDate() - 7); break;
    case "month": start.setMonth(start.getMonth() - 1); break;
    case "quarter": start.setMonth(start.getMonth() - 3); break;
    case "year": start.setFullYear(start.getFullYear() - 1); break;
  }
  return { start, end };
}

function toIsoDate(date: Date): string {
  return date.toISOString();
}

function getProductivityColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 50) return "text-blue-500";
  if (score >= 30) return "text-amber-500";
  return "text-red-500";
}

function getProductivityGradient(score: number) {
  if (score >= 80) return "from-emerald-500 to-teal-500";
  if (score >= 50) return "from-blue-500 to-cyan-500";
  if (score >= 30) return "from-amber-500 to-yellow-500";
  return "from-red-500 to-rose-500";
}

const priorityColor: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-blue-500",
  low: "bg-slate-400",
};

const priorityLabel: Record<string, string> = {
  urgent: "เร่งด่วน",
  high: "สูง",
  medium: "ปานกลาง",
  low: "ต่ำ",
};

const statusColor: Record<string, string> = {
  done: "bg-emerald-500",
  in_progress: "bg-blue-500",
  review: "bg-amber-500",
  todo: "bg-slate-400",
};

const statusLabel: Record<string, string> = {
  done: "เสร็จแล้ว",
  in_progress: "กำลังทำ",
  review: "รอรีวิว",
  todo: "ยังไม่เริ่ม",
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Reports() {
  const { toast } = useToast();
  useAuth();

  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [dateRange, setDateRange] = useState<DateRangeKey>("month");

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();

  const [loading, setLoading] = useState(true);
  const [loadingSecondary, setLoadingSecondary] = useState(false);

  const [personalReport, setPersonalReport] = useState<PersonalReportData | null>(null);
  const [teamReport, setTeamReport] = useState<TeamProductivityReport | null>(null);
  const [meetingReport, setMeetingReport] = useState<MeetingReport | null>(null);
  const [taskReport, setTaskReport] = useState<TaskReport | null>(null);
  const [teamWorkload, setTeamWorkload] = useState<TeamWorkloadReport | null>(null);
  const [performance, setPerformance] = useState<PerformanceDashboard | null>(null);

  const currentRangeLabel = getDateRangeLabel(dateRange);
  const isLoadingAny = loading || loadingSecondary;

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  // Load base data
  useEffect(() => {
    const loadBase = async () => {
      try {
        setLoading(true);
        const [{ start, end }] = [getDateRange(dateRange)];

        const [teamsRes, personalRes] = await Promise.all([
          apiGet<any[]>("/teams").catch(() => []),
          apiGet<PersonalReportData>(`/reports?range=${dateRange}`).catch(() => ({} as PersonalReportData)),
        ]);

        setTeams((teamsRes || []).map((t: any) => ({ id: t.id, name: t.name })));
        setPersonalReport(personalRes && Object.keys(personalRes).length > 0 ? personalRes : null);

        if (!selectedTeamId && (teamsRes || []).length > 0) {
          setSelectedTeamId(teamsRes[0].id);
        }

        // Preload for overview
        await Promise.all([
          apiGet<MeetingReport>(
            `/reports/meetings?startDate=${encodeURIComponent(toIsoDate(start))}&endDate=${encodeURIComponent(toIsoDate(end))}`
          ).then((data) => setMeetingReport(data)).catch(() => setMeetingReport(null)),
          apiGet<PerformanceDashboard>(
            `/reports/performance?startDate=${encodeURIComponent(toIsoDate(start))}&endDate=${encodeURIComponent(toIsoDate(end))}`
          ).then((data) => setPerformance(data)).catch(() => setPerformance(null)),
          apiGet<TaskReport>(
            `/reports/tasks?startDate=${encodeURIComponent(toIsoDate(start))}&endDate=${encodeURIComponent(toIsoDate(end))}`
          ).then((data) => setTaskReport(data)).catch(() => setTaskReport(null)),
        ]);
      } catch (error: any) {
        console.error("Failed to load reports:", error);
        toast({ title: "เกิดข้อผิดพลาด", description: error.message || "ไม่สามารถโหลดรายงานได้", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Load tab-specific
  useEffect(() => {
    const loadTabData = async () => {
      const { start, end } = getDateRange(dateRange);
      const startIso = encodeURIComponent(toIsoDate(start));
      const endIso = encodeURIComponent(toIsoDate(end));
      try {
        setLoadingSecondary(true);
        if (activeTab === "team" && selectedTeamId) {
          const [teamRes, workloadRes, tasksRes] = await Promise.all([
            apiGet<TeamProductivityReport>(`/reports/team-productivity?teamId=${encodeURIComponent(selectedTeamId)}&startDate=${startIso}&endDate=${endIso}`).catch(() => null),
            apiGet<TeamWorkloadReport>(`/reports/teams/${encodeURIComponent(selectedTeamId)}/workload?startDate=${startIso}&endDate=${endIso}`).catch(() => null),
            apiGet<TaskReport>(`/reports/tasks?startDate=${startIso}&endDate=${endIso}&teamId=${encodeURIComponent(selectedTeamId)}`).catch(() => null),
          ]);
          setTeamReport(teamRes);
          setTeamWorkload(workloadRes);
          setTaskReport(tasksRes);
        }
        if (activeTab === "performance") {
          const perfRes = await apiGet<PerformanceDashboard>(
            `/reports/performance?startDate=${startIso}&endDate=${endIso}${selectedTeamId ? `&teamId=${encodeURIComponent(selectedTeamId)}` : ""}`
          ).catch(() => null);
          setPerformance(perfRes);
        }
      } catch (error: any) {
        console.error("Failed to load tab data:", error);
      } finally {
        setLoadingSecondary(false);
      }
    };
    loadTabData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedTeamId, dateRange]);

  // Export
  const handleExport = async (format: ExportFormat) => {
    try {
      const { start, end } = getDateRange(dateRange);
      const startIso = encodeURIComponent(toIsoDate(start));
      const endIso = encodeURIComponent(toIsoDate(end));

      let type: ReportTab = activeTab;
      if (type === "team" && !selectedTeamId) {
        toast({ title: "เลือกทีมก่อน", description: "กรุณาเลือกทีมเพื่อออกรายงาน" });
        return;
      }

      const query = new URLSearchParams({
        type,
        range: dateRange,
        format,
      });

      if (type === "team") {
        query.set("teamId", selectedTeamId as string);
        query.set("startDate", startIso);
        query.set("endDate", endIso);
      } else if (type === "performance") {
        if (selectedTeamId) {
          query.set("teamId", selectedTeamId);
        }
        query.set("startDate", startIso);
        query.set("endDate", endIso);
      }

      const url = `/reports/export?${query.toString()}`;
      const res = await apiFetch(url, { method: "GET" });
      if (!res.ok) {
        throw new Error("Download failed");
      }
      const blob = await res.blob();
      const filenameBase = `${type}_report_${new Date().toISOString().slice(0, 10)}`;
      const extension = format === "xlsx" ? "xlsx" : format;
      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `${filenameBase}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(fileUrl);
    } catch (error: any) {
      console.error("Export failed", error);
      toast({ title: "เกิดข้อผิดพลาด", description: error?.message || "ส่งออกไฟล์ไม่สำเร็จ", variant: "destructive" });
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="flex-none border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Reports & Analytics</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    รายงานผลงาน · วิเคราะห์ประสิทธิภาพ · สถิติทีม
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Date Range Filter */}
                <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeKey)}>
                  <SelectTrigger className="w-[160px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">สัปดาห์ที่ผ่านมา</SelectItem>
                    <SelectItem value="month">เดือนที่ผ่านมา</SelectItem>
                    <SelectItem value="quarter">ไตรมาสที่ผ่านมา</SelectItem>
                    <SelectItem value="year">ปีที่ผ่านมา</SelectItem>
                  </SelectContent>
                </Select>

                {/* Export */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm" className="h-9 gap-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-lg shadow-red-500/20">
                      <Download className="w-3.5 h-3.5" />
                      <span>Export</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="text-xs">ดาวน์โหลดรายงาน</DropdownMenuLabel>
                    <DropdownMenuItem className="text-xs" onClick={() => handleExport("csv")} disabled={isLoadingAny}>CSV (.csv)</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs" onClick={() => handleExport("xlsx")} disabled={isLoadingAny}>Excel (.xlsx)</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs" onClick={() => handleExport("json")} disabled={isLoadingAny}>JSON (.json)</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs" onClick={() => handleExport("pdf")} disabled={isLoadingAny}>PDF (.pdf)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-4">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)}>
              <TabsList className="bg-muted/50 h-10">
                <TabsTrigger value="overview" className="text-xs gap-1.5 px-4">
                  <BarChart3 className="w-3.5 h-3.5" /> ภาพรวม
                </TabsTrigger>
                <TabsTrigger value="team" className="text-xs gap-1.5 px-4">
                  <Users className="w-3.5 h-3.5" /> ทีม & งาน
                </TabsTrigger>
                <TabsTrigger value="performance" className="text-xs gap-1.5 px-4">
                  <TrendingUp className="w-3.5 h-3.5" /> ประสิทธิภาพ
                </TabsTrigger>
              </TabsList>

              {isLoadingAny ? (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground font-medium animate-pulse">กำลังจัดเตรียมรายงาน...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* ─── Tab: ภาพรวม ──────────────────────────────────────────── */}
                  <TabsContent value="overview" className="mt-4 space-y-4">
                    {/* KPI Cards */}
                    {personalReport && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard
                          title="งานที่เสร็จแล้ว"
                          value={personalReport.tasksCompleted ?? 0}
                          suffix="งาน"
                          icon={CheckSquare}
                          gradient="from-emerald-500 to-teal-500"
                          shadowColor="shadow-emerald-500/20"
                        />
                        <KpiCard
                          title="การประชุมที่เข้าร่วม"
                          value={personalReport.meetingsAttended ?? 0}
                          suffix="การประชุม"
                          icon={Calendar}
                          gradient="from-blue-500 to-cyan-500"
                          shadowColor="shadow-blue-500/20"
                        />
                        <KpiCard
                          title="ข้อความที่ส่ง"
                          value={personalReport.messagesSent ?? 0}
                          suffix="ข้อความ"
                          icon={MessageSquare}
                          gradient="from-violet-500 to-purple-500"
                          shadowColor="shadow-violet-500/20"
                        />
                        <ProductivityScoreCard score={personalReport.productivityScore ?? 0} />
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Task Status Breakdown */}
                      {taskReport && (
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-1">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Target className="w-4 h-4 text-blue-500" />
                              สถานะงานทั้งหมด
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-foreground">{taskReport.summary.totalTasks}</div>
                              <div className="text-xs text-muted-foreground">งานทั้งหมด</div>
                            </div>
                            <div className="space-y-2.5">
                              {Object.entries(taskReport.tasksByStatus || {
                                done: taskReport.summary.completedTasks,
                                in_progress: taskReport.summary.inProgressTasks,
                                todo: Math.max(0, taskReport.summary.totalTasks - taskReport.summary.completedTasks - taskReport.summary.inProgressTasks),
                              }).map(([status, count]) => (
                                <StatusBarRow
                                  key={status}
                                  label={statusLabel[status] || status}
                                  count={count as number}
                                  total={taskReport.summary.totalTasks}
                                  color={statusColor[status] || "bg-slate-400"}
                                />
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Top Performers */}
                      {performance && performance.taskCompletionRates.length > 0 && (
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-1">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-amber-500" />
                              Top Performers
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {performance.taskCompletionRates
                              .slice()
                              .sort((a, b) => b.completionRate - a.completionRate)
                              .slice(0, 5)
                              .map((r, i) => (
                                <div key={r.userId} className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                                    i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-orange-600" : "bg-muted-foreground/40"
                                  )}>
                                    {i + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate">{r.userName}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Progress value={r.completionRate} className="h-1.5 flex-1" />
                                      <span className="text-[10px] text-muted-foreground font-medium w-10 text-right">
                                        {r.completionRate.toFixed(0)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </CardContent>
                        </Card>
                      )}

                      {/* Meeting Overview */}
                      {meetingReport && (
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-1">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              สรุปการประชุม
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <MiniStat label="จำนวนประชุม" value={meetingReport.summary.totalMeetings} />
                              <MiniStat label="ระยะเวลาเฉลี่ย" value={`${meetingReport.summary.avgDuration.toFixed(0)} นาที`} />
                              <MiniStat label="ผู้เข้าร่วมรวม" value={meetingReport.summary.totalParticipants} />
                              <MiniStat label="ผู้เข้าร่วม/ห้อง" value={meetingReport.summary.avgParticipants.toFixed(1)} />
                            </div>
                            {Object.keys(meetingReport.meetingsByTeam).length > 0 && (
                              <div>
                                <div className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">ประชุมตามทีม</div>
                                <div className="space-y-1.5">
                                  {Object.entries(meetingReport.meetingsByTeam)
                                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                                    .slice(0, 4)
                                    .map(([team, count]) => (
                                      <div key={team} className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground truncate mr-2">{team}</span>
                                        <Badge variant="secondary" className="text-[10px] h-5 px-2">{count as number}</Badge>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Team Metrics */}
                    {personalReport?.teamMetrics && personalReport.teamMetrics.length > 0 && (
                      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            สถิติทีมที่คุณอยู่
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {personalReport.teamMetrics.map((t) => (
                              <div key={t.teamName} className="p-3 rounded-xl bg-muted/30 border border-border/40">
                                <div className="font-medium text-xs mb-2">{t.teamName}</div>
                                <div className="flex gap-4 text-[11px] text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <CheckSquare className="w-3 h-3 text-emerald-500" />
                                    <span>{t.tasksCompleted ?? 0} งาน</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-blue-500" />
                                    <span>{t.meetingsAttended ?? 0} ประชุม</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3 text-violet-500" />
                                    <span>{t.messagesSent ?? 0} แชท</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* ─── Tab: ทีม & งาน ───────────────────────────────────────── */}
                  <TabsContent value="team" className="mt-4 space-y-4">
                    {/* Team Selector */}
                    {teams.length > 0 && (
                      <div className="flex items-center gap-3">
                        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                          <SelectTrigger className="w-[200px] h-9 text-xs">
                            <SelectValue placeholder="เลือกทีม" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Badge variant="outline" className="text-[10px]">{currentRangeLabel}</Badge>
                      </div>
                    )}

                    {teamReport && selectedTeam ? (
                      <>
                        {/* Team Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <KpiCard title="สมาชิกทีม" value={teamReport.summary.members} icon={Users} gradient="from-primary to-blue-500" shadowColor="shadow-primary/20" />
                          <KpiCard title="งานทั้งหมด" value={teamReport.summary.tasks.total} icon={CheckSquare} gradient="from-blue-500 to-cyan-500" shadowColor="shadow-blue-500/20" />
                          <KpiCard title="งานเสร็จแล้ว" value={teamReport.summary.tasks.completed} icon={Target} gradient="from-emerald-500 to-teal-500" shadowColor="shadow-emerald-500/20" />
                          <KpiCard title="จำนวนประชุม" value={teamReport.summary.meetings.total} icon={Calendar} gradient="from-violet-500 to-purple-500" shadowColor="shadow-violet-500/20" />
                        </div>

                        {/* Member Workload */}
                        {teamWorkload && teamWorkload.workload.length > 0 && (
                          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Activity className="w-4 h-4 text-primary" />
                                ภาระงานรายสมาชิก – {selectedTeam.name}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {teamWorkload.workload.map((w) => {
                                  const completionRate = w.totalTasks > 0 ? (w.completed / w.totalTasks) * 100 : 0;
                                  return (
                                    <div key={w.userId} className="p-3 rounded-xl bg-muted/20 border border-border/30">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="text-xs font-medium">{w.userName}</div>
                                        <div className="flex gap-2">
                                          <Badge variant="secondary" className="text-[10px] h-5">{w.totalTasks} งาน</Badge>
                                          {w.overdue > 0 && (
                                            <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                                              <AlertTriangle className="w-2.5 h-2.5" /> {w.overdue} ค้าง
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
                                          {w.completed > 0 && (
                                            <div className="bg-emerald-500 h-full" style={{ width: `${(w.completed / Math.max(w.totalTasks, 1)) * 100}%` }} />
                                          )}
                                          {w.inProgress > 0 && (
                                            <div className="bg-blue-500 h-full" style={{ width: `${(w.inProgress / Math.max(w.totalTasks, 1)) * 100}%` }} />
                                          )}
                                          {w.todo > 0 && (
                                            <div className="bg-slate-400 h-full" style={{ width: `${(w.todo / Math.max(w.totalTasks, 1)) * 100}%` }} />
                                          )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-medium w-10 text-right">
                                          {completionRate.toFixed(0)}%
                                        </span>
                                      </div>
                                      <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" />{w.completed} เสร็จ</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" />{w.inProgress} กำลังทำ</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400" />{w.todo} ยังไม่เริ่ม</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Overdue Tasks */}
                        {taskReport && taskReport.overdueTasks.length > 0 && (
                          <Card className="border-border/50 bg-card/80 backdrop-blur-sm border-l-4 border-l-red-500">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-500">
                                <AlertTriangle className="w-4 h-4" />
                                งานที่ค้างเกินกำหนด ({taskReport.overdueTasks.length})
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {taskReport.overdueTasks.slice(0, 10).map((t) => (
                                  <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                                    <div className="flex-1 min-w-0 mr-3">
                                      <div className="text-xs font-medium truncate">{t.title}</div>
                                      <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                                        <span>{t.assignee || "ไม่มีผู้รับผิดชอบ"}</span>
                                        {t.dueDate && <span>· กำหนด: {new Date(t.dueDate).toLocaleDateString("th-TH")}</span>}
                                      </div>
                                    </div>
                                    <Badge className={cn("text-[10px] h-5 text-white", priorityColor[t.priority] || "bg-slate-400")}>
                                      {priorityLabel[t.priority] || t.priority}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    ) : (
                      <EmptyState message="เลือกทีมเพื่อดูรายงาน หรือยังไม่มีข้อมูลสำหรับทีมนี้" />
                    )}
                  </TabsContent>

                  {/* ─── Tab: ประสิทธิภาพ ─────────────────────────────────────── */}
                  <TabsContent value="performance" className="mt-4 space-y-4">
                    {/* Team filter for performance */}
                    {teams.length > 0 && (
                      <div className="flex items-center gap-3">
                        <Select value={selectedTeamId || "all"} onValueChange={(v) => setSelectedTeamId(v === "all" ? undefined : v)}>
                          <SelectTrigger className="w-[200px] h-9 text-xs">
                            <SelectValue placeholder="ทุกทีม" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">ทุกทีม</SelectItem>
                            {teams.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Badge variant="outline" className="text-[10px]">{currentRangeLabel}</Badge>
                      </div>
                    )}

                    {performance ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Task Completion Rate */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Target className="w-4 h-4 text-emerald-500" />
                              อัตราสำเร็จงาน (Task Completion)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {performance.taskCompletionRates
                              .slice()
                              .sort((a, b) => b.completionRate - a.completionRate)
                              .map((r) => (
                                <div key={r.userId} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium truncate mr-2">{r.userName}</span>
                                    <span className="text-muted-foreground">
                                      {r.completedTasks}/{r.totalTasks} ({r.completionRate.toFixed(0)}%)
                                    </span>
                                  </div>
                                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        r.completionRate >= 80 ? "bg-emerald-500" :
                                        r.completionRate >= 50 ? "bg-blue-500" :
                                        r.completionRate >= 30 ? "bg-amber-500" : "bg-red-500"
                                      )}
                                      style={{ width: `${r.completionRate}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                          </CardContent>
                        </Card>

                        {/* Collaboration Activity */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Zap className="w-4 h-4 text-amber-500" />
                              กิจกรรมการทำงานร่วมกัน
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2.5">
                              {performance.collaborationActivity
                                .slice()
                                .sort((a, b) => b.totalInteractions - a.totalInteractions)
                                .map((w) => (
                                  <div key={w.userId} className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-xs font-medium">{w.userName}</span>
                                      <Badge variant="secondary" className="text-[10px] h-5 font-bold">
                                        {w.totalInteractions} รวม
                                      </Badge>
                                    </div>
                                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <CheckSquare className="w-2.5 h-2.5 text-emerald-500" /> {w.completedTasks} งาน
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-2.5 h-2.5 text-blue-500" /> {w.attendedMeetings} ประชุม
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <MessageSquare className="w-2.5 h-2.5 text-violet-500" /> {w.messagesSent} แชท
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Meeting Attendance */}
                        {performance.meetingAttendanceRates && performance.meetingAttendanceRates.length > 0 && (
                          <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-2">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                อัตราเข้าร่วมประชุม (Meeting Attendance)
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {performance.meetingAttendanceRates
                                  .slice()
                                  .sort((a, b) => b.attendanceRate - a.attendanceRate)
                                  .map((r) => (
                                    <div key={r.userId} className="p-3 rounded-lg bg-muted/20 border border-border/30">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-medium truncate mr-2">{r.userName}</span>
                                        <span className={cn("text-xs font-bold", r.attendanceRate >= 80 ? "text-emerald-500" : r.attendanceRate >= 50 ? "text-blue-500" : "text-amber-500")}>
                                          {r.attendanceRate.toFixed(0)}%
                                        </span>
                                      </div>
                                      <Progress value={r.attendanceRate} className="h-1.5" />
                                      <div className="text-[10px] text-muted-foreground mt-1">
                                        {r.attendedMeetings}/{r.totalMeetings} ครั้ง
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : (
                      <EmptyState message="ยังไม่มีข้อมูลประสิทธิภาพสำหรับช่วงเวลานี้" />
                    )}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Sub Components ──────────────────────────────────────────────────────────

function KpiCard({ title, value, suffix, icon: Icon, gradient, shadowColor }: {
  title: string;
  value: string | number;
  suffix?: string;
  icon: React.ElementType;
  gradient: string;
  shadowColor: string;
}) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg", gradient, shadowColor)}>
            <Icon className="w-4.5 h-4.5 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground flex items-baseline gap-1">
          <span>{value}</span>
          {suffix && <span className="text-xs text-muted-foreground font-normal">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductivityScoreCard({ score }: { score: number }) {
  return (
    <Card className={cn(
      "border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
      "bg-gradient-to-br from-background via-background to-primary/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">คะแนนประสิทธิภาพ</CardTitle>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg", getProductivityGradient(score), "shadow-primary/20")}>
            <TrendingUp className="w-4.5 h-4.5 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold mb-2", getProductivityColor(score))}>{Math.round(score)}%</div>
        <Progress value={score} className="h-2" />
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
          <Activity className="w-3 h-3" />
          <span>ยิ่งเข้าใกล้ 100% แสดงว่าทำงานได้คุ้มค่ามากขึ้น</span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-2.5 h-2.5 rounded-full", color)} />
      <span className="text-xs text-muted-foreground w-20 truncate">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground font-medium w-12 text-right">{count} ({pct.toFixed(0)}%)</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-2 rounded-lg bg-muted/30">
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <FileBarChart className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">ไม่มีข้อมูลรายงาน</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">{message}</p>
      </CardContent>
    </Card>
  );
}
