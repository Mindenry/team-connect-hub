import { useEffect, useMemo, useState, useCallback } from "react";
import {
  BarChart3,
  Download,
  Users,
  Calendar,
  CheckSquare,
  MessageSquare,
  Target,
  Trophy,
  Activity,
  TrendingUp,
  PieChart,
  LineChart,
  AlertTriangle,
  Zap,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  Area,
  AreaChart,
  Legend,
  ComposedChart,
} from "recharts";
import { reportsApi, exportUtils, reportTransformers, getDateRange, getDateRangeLabel, toIsoDate } from "@/lib/reports";
import type { DateRangeKey, ExportFormat, PersonalReportData, TeamProductivityReport, MeetingReport, TaskReport, TeamWorkloadReport, PerformanceDashboard, TeamOption } from "@/lib/reports";
import {
  KpiCard,
  ProductivityScoreCard,
  StatusBarRow,
  MiniStat,
  EmptyState,
  CHART_COLORS,
  statusLabel,
  statusColor,
  priorityColor,
  priorityLabel,
  getProductivityColor,
  getTrendIcon,
  getTrendColor,
} from "@/components/reports";
import type { ReportTab } from "@/components/reports";

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

        const filteredTeams = (teamsRes || [])
          .filter((t: any) => t.name.toLowerCase() !== "personal recordings")
          .map((t: any) => ({ id: t.id, name: t.name }));
        setTeams(filteredTeams);
        setPersonalReport(personalRes && Object.keys(personalRes).length > 0 ? personalRes : null);

        if (!selectedTeamId && filteredTeams.length > 0) {
          setSelectedTeamId(filteredTeams[0].id);
        }

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
  }, [activeTab, selectedTeamId, dateRange]);

  // Export
  const handleExport = useCallback(async (format: ExportFormat) => {
    try {
      const { start, end } = getDateRange(dateRange);
      const filenameBase = `${activeTab}_report_${new Date().toISOString().slice(0, 10)}`;

      const tryServerExport = async () => {
        const startIso = toIsoDate(start);
        const endIso = toIsoDate(end);

        if (activeTab === "team" && !selectedTeamId) {
          throw new Error("กรุณาเลือกทีมเพื่อออกรายงาน");
        }

        const query = new URLSearchParams({
          type: activeTab,
          range: dateRange,
          format,
        });

        if (activeTab === "team" && selectedTeamId) {
          query.set("teamId", selectedTeamId);
          query.set("startDate", startIso);
          query.set("endDate", endIso);
        } else if (activeTab === "performance") {
          if (selectedTeamId) query.set("teamId", selectedTeamId);
          query.set("startDate", startIso);
          query.set("endDate", endIso);
        } else if (activeTab === "overview" || activeTab === "personal") {
          query.set("startDate", startIso);
          query.set("endDate", endIso);
        }

        const url = `/reports/export?${query.toString()}`;
        const res = await apiFetch(url, { method: "GET" });
        if (!res.ok) throw new Error("Server export not available");

        const blob = await res.blob();
        const extension = format === "xlsx" ? "xlsx" : format;
        const fileUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = `${filenameBase}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(fileUrl);
      };

      const clientExport = () => {
        let data: Record<string, any>[] = [];
        let exportData: any = null;

        switch (activeTab) {
          case "overview":
          case "personal":
            if (personalReport) {
              data = [
                { category: "Personal Report", period: currentRangeLabel },
                { metric: "Tasks Completed", value: personalReport.tasksCompleted ?? 0 },
                { metric: "Meetings Attended", value: personalReport.meetingsAttended ?? 0 },
                { metric: "Messages Sent", value: personalReport.messagesSent ?? 0 },
                { metric: "Productivity Score", value: personalReport.productivityScore ?? 0 },
                { metric: "Task Completion Rate", value: `${personalReport.taskCompletionRate ?? 0}%` },
              ];
              if (personalReport.teamMetrics) {
                personalReport.teamMetrics
                  .filter(t => t.teamName.toLowerCase() !== 'personal recordings')
                  .forEach(t => {
                    data.push({ category: "Team", teamName: t.teamName, tasks: t.tasksCompleted ?? 0, meetings: t.meetingsAttended ?? 0, messages: t.messagesSent ?? 0 });
                  });
              }
            }
            exportData = personalReport;
            break;

          case "team":
            if (teamReport && teamWorkload) {
              data = reportTransformers.teamProductivityToRows(teamReport);
              if (teamWorkload.workload.length > 0) {
                data.push(...reportTransformers.workloadToRows(teamWorkload));
              }
            }
            exportData = { teamReport, teamWorkload };
            break;

          case "performance":
            if (performance) {
              data = reportTransformers.performanceToRows(performance);
            }
            exportData = performance;
            break;
        }

        if (data.length === 0 && !exportData) {
          throw new Error("ไม่มีข้อมูลสำหรับส่งออก");
        }

        switch (format) {
          case "csv":
            exportUtils.toCSV(data.length > 0 ? data : [exportData], filenameBase);
            break;
          case "xlsx":
            if (activeTab === "team" && teamReport && teamWorkload) {
              exportUtils.toExcelMultiSheet([
                { name: "Team Summary", data: reportTransformers.teamProductivityToRows(teamReport) },
                { name: "Workload", data: reportTransformers.workloadToRows(teamWorkload) },
              ], filenameBase);
            } else {
              exportUtils.toExcel(data, filenameBase, activeTab.charAt(0).toUpperCase() + activeTab.slice(1));
            }
            break;
          case "json":
            exportUtils.toJSON(exportData || data, filenameBase);
            break;
          case "pdf":
            exportUtils.toPDF(data, filenameBase, {
              title: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report`,
              subtitle: currentRangeLabel,
              orientation: "portrait",
              reportType: activeTab,
              reportData: personalReport,
            });
            break;
        }
      };

      try {
        await tryServerExport();
        toast({ title: "ส่งออกสำเร็จ", description: `ดาวน์โหลด ${format.toUpperCase()} เรียบร้อยแล้ว` });
      } catch {
        clientExport();
        toast({ title: "ส่งออกสำเร็จ", description: `ดาวน์โหลด ${format.toUpperCase()} เรียบร้อยแล้ว (client-side)` });
      }
    } catch (error: any) {
      console.error("Export failed", error);
      toast({ title: "เกิดข้อผิดพลาด", description: error?.message || "ส่งออกไฟล์ไม่สำเร็จ", variant: "destructive" });
    }
  }, [activeTab, dateRange, selectedTeamId, personalReport, teamReport, teamWorkload, performance, currentRangeLabel, toast]);

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
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)}>
              <TabsList className="bg-muted/50 h-10">
                <TabsTrigger value="overview" className="text-xs gap-1.5 px-4">
                  <BarChart3 className="w-3.5 h-3.5" /> ภาพรวม
                </TabsTrigger>
                <TabsTrigger value="personal" className="text-xs gap-1.5 px-4">
                  <User className="w-3.5 h-3.5" /> ส่วนตัว
                </TabsTrigger>
                <TabsTrigger value="team" className="text-xs gap-1.5 px-4">
                  <Users className="w-3.5 h-3.5" /> ทีม
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
                  {/* Tab: ภาพรวม */}
                  <TabsContent value="overview" className="mt-4 space-y-4">
                    {personalReport && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard title="งานที่เสร็จแล้ว" value={personalReport.tasksCompleted ?? 0} suffix="งาน" icon={CheckSquare} gradient="from-emerald-500 to-teal-500" shadowColor="shadow-emerald-500/20" />
                        <KpiCard title="การประชุมที่เข้าร่วม" value={personalReport.meetingsAttended ?? 0} suffix="การประชุม" icon={Calendar} gradient="from-blue-500 to-cyan-500" shadowColor="shadow-blue-500/20" />
                        <KpiCard title="ข้อความที่ส่ง" value={personalReport.messagesSent ?? 0} suffix="ข้อความ" icon={MessageSquare} gradient="from-violet-500 to-purple-500" shadowColor="shadow-violet-500/20" />
                        <ProductivityScoreCard score={personalReport.productivityScore ?? 0} breakdown={personalReport.productivityBreakdown} />
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                                <StatusBarRow key={status} label={statusLabel[status] || status} count={count as number} total={taskReport.summary.totalTasks} color={statusColor[status] || "bg-slate-400"} />
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {performance && performance.taskCompletionRates.length > 0 && (
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-1">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-amber-500" />
                              Top Performers
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {performance.taskCompletionRates.slice().sort((a, b) => b.completionRate - a.completionRate).slice(0, 5).map((r, i) => (
                              <div key={r.userId} className="flex items-center gap-3">
                                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white", i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-orange-600" : "bg-muted-foreground/40")}>{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">{r.userName}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Progress value={r.completionRate} className="h-1.5 flex-1" />
                                    <span className="text-[10px] text-muted-foreground font-medium w-10 text-right">{r.completionRate.toFixed(0)}%</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

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
                                  {Object.entries(meetingReport.meetingsByTeam).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 4).map(([team, count]) => (
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

                    {personalReport?.teamMetrics && personalReport.teamMetrics.filter(t => t.teamName.toLowerCase() !== 'personal recordings').length > 0 && (
                      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            สถิติทีมที่คุณอยู่
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {personalReport.teamMetrics.filter(t => t.teamName.toLowerCase() !== 'personal recordings').map((t) => (
                              <div key={t.teamName} className="p-3 rounded-xl bg-muted/30 border border-border/40">
                                <div className="font-medium text-xs mb-2">{t.teamName}</div>
                                <div className="flex gap-4 text-[11px] text-muted-foreground">
                                  <div className="flex items-center gap-1"><CheckSquare className="w-3 h-3 text-emerald-500" /><span>{t.tasksCompleted ?? 0} งาน</span></div>
                                  <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-blue-500" /><span>{t.meetingsAttended ?? 0} ประชุม</span></div>
                                  <div className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-violet-500" /><span>{t.messagesSent ?? 0} แชท</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Tab: รายงานส่วนตัว */}
                  <TabsContent value="personal" className="mt-4 space-y-4">
                    {personalReport ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <KpiCard title="งานที่เสร็จแล้ว" value={personalReport.tasksCompleted ?? 0} suffix="งาน" icon={CheckSquare} gradient="from-emerald-500 to-teal-500" shadowColor="shadow-emerald-500/20" />
                          <KpiCard title="การประชุมที่เข้าร่วม" value={personalReport.meetingsAttended ?? 0} suffix="ครั้ง" icon={Calendar} gradient="from-blue-500 to-cyan-500" shadowColor="shadow-blue-500/20" />
                          <KpiCard title="ข้อความที่ส่ง" value={personalReport.messagesSent ?? 0} suffix="ข้อความ" icon={MessageSquare} gradient="from-violet-500 to-purple-500" shadowColor="shadow-violet-500/20" />
                          <ProductivityScoreCard score={personalReport.productivityScore ?? 0} breakdown={personalReport.productivityBreakdown} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Target className="w-4 h-4 text-emerald-500" />
                                อัตราการทำงานสำเร็จ
                              </CardTitle>
                              <CardDescription className="text-xs">เปรียบเทียบงานที่ได้รับมอบหมายกับงานที่ทำเสร็จ</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-center py-4">
                                <div className="relative w-40 h-40">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                      <Pie data={[{ name: 'เสร็จแล้ว', value: personalReport.tasksCompleted ?? 0, color: CHART_COLORS.emerald }, { name: 'ยังไม่เสร็จ', value: Math.max(0, (100 - (personalReport.taskCompletionRate ?? 0))), color: '#e5e7eb' }]} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                                        <Cell fill={CHART_COLORS.emerald} />
                                        <Cell fill="#e5e7eb" />
                                      </Pie>
                                    </RechartsPieChart>
                                  </ResponsiveContainer>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                      <div className={cn("text-2xl font-bold", getProductivityColor(personalReport.taskCompletionRate ?? 0))}>{Math.round(personalReport.taskCompletionRate ?? 0)}%</div>
                                      <div className="text-[10px] text-muted-foreground">Completion</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-center gap-4 text-xs mt-2">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                  <span className="text-muted-foreground">เสร็จ {personalReport.tasksCompleted ?? 0} งาน</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-500" />
                                สถิติการทำงาน
                              </CardTitle>
                              <CardDescription className="text-xs">ข้อมูลการทำงานใน{currentRangeLabel}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg bg-muted/30">
                                  <div className="text-lg font-bold text-foreground">{personalReport.activeDays ?? '-'}</div>
                                  <div className="text-[10px] text-muted-foreground">วันที่ทำงาน</div>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/30">
                                  <div className="text-lg font-bold text-foreground">{personalReport.avgTaskCompletionTime ? `${personalReport.avgTaskCompletionTime} ชม.` : '-'}</div>
                                  <div className="text-[10px] text-muted-foreground">เวลาทำงานเฉลี่ย</div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">งาน/วันเฉลี่ย</span>
                                  <span className="font-medium">{personalReport.activeDays && personalReport.activeDays > 0 ? ((personalReport.tasksCompleted ?? 0) / personalReport.activeDays).toFixed(1) : '-'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">ข้อความ/วันเฉลี่ย</span>
                                  <span className="font-medium">{personalReport.activeDays && personalReport.activeDays > 0 ? ((personalReport.messagesSent ?? 0) / personalReport.activeDays).toFixed(1) : '-'}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {personalReport.teamMetrics && personalReport.teamMetrics.filter(t => t.teamName.toLowerCase() !== 'personal recordings').length > 0 && (
                          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                การมีส่วนร่วมในทีม
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {personalReport.teamMetrics.filter(t => t.teamName.toLowerCase() !== 'personal recordings').map((team) => (
                                  <div key={team.teamId || team.teamName} className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                    <div className="font-medium text-sm mb-3">{team.teamName}</div>
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 text-muted-foreground"><CheckSquare className="w-3 h-3 text-emerald-500" /><span>งานที่ทำ</span></div>
                                        <span className="font-medium">{team.tasksCompleted ?? 0}</span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="w-3 h-3 text-blue-500" /><span>ประชุม</span></div>
                                        <span className="font-medium">{team.meetingsAttended ?? 0}</span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 text-muted-foreground"><MessageSquare className="w-3 h-3 text-violet-500" /><span>ข้อความ</span></div>
                                        <span className="font-medium">{team.messagesSent ?? 0}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {personalReport.weeklyTrend && personalReport.weeklyTrend.length > 0 && (
                          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                แนวโน้มการทำงานรายสัปดาห์
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <ComposedChart data={personalReport.weeklyTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                    <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="tasks" name="งาน" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="meetings" name="ประชุม" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                                    <Line type="monotone" dataKey="messages" name="ข้อความ" stroke={CHART_COLORS.violet} strokeWidth={2} />
                                  </ComposedChart>
                                </ResponsiveContainer>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    ) : (
                      <EmptyState message="ยังไม่มีข้อมูลรายงานส่วนตัวในช่วงเวลานี้" />
                    )}
                  </TabsContent>

                  {/* Tab: ทีม & งาน */}
                  <TabsContent value="team" className="mt-4 space-y-4">
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <KpiCard title="สมาชิกทีม" value={teamReport.summary.members} icon={Users} gradient="from-primary to-blue-500" shadowColor="shadow-primary/20" />
                          <KpiCard title="งานทั้งหมด" value={teamReport.summary.tasks.total} icon={CheckSquare} gradient="from-blue-500 to-cyan-500" shadowColor="shadow-blue-500/20" />
                          <KpiCard title="งานเสร็จแล้ว" value={teamReport.summary.tasks.completed} icon={Target} gradient="from-emerald-500 to-teal-500" shadowColor="shadow-emerald-500/20" />
                          <KpiCard title="จำนวนประชุม" value={teamReport.summary.meetings.total} icon={Calendar} gradient="from-violet-500 to-purple-500" shadowColor="shadow-violet-500/20" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <PieChart className="w-4 h-4 text-primary" />
                                การกระจายสถานะงาน
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RechartsPieChart>
                                    <Pie data={[{ name: 'เสร็จแล้ว', value: teamReport.summary.tasks.completed, color: CHART_COLORS.emerald }, { name: 'กำลังทำ', value: teamReport.summary.tasks.inProgress, color: CHART_COLORS.blue }, { name: 'ยังไม่เริ่ม', value: teamReport.summary.tasks.todo, color: '#94a3b8' }].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                                      {[{ color: CHART_COLORS.emerald }, { color: CHART_COLORS.blue }, { color: '#94a3b8' }].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: number, name: string) => [`${value} งาน`, name]} />
                                    <Legend verticalAlign="bottom" height={36} formatter={(value, entry) => `${value} (${entry.payload?.value || 0})`} />
                                  </RechartsPieChart>
                                </ResponsiveContainer>
                              </div>
                            </CardContent>
                          </Card>

                          {teamReport.taskTrend && teamReport.taskTrend.length > 0 && (
                            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                  <LineChart className="w-4 h-4 text-primary" />
                                  แนวโน้มงาน
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-48">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={teamReport.taskTrend}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                      <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                                      <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                                      <Area type="monotone" dataKey="completed" name="เสร็จแล้ว" stroke={CHART_COLORS.emerald} fill={CHART_COLORS.emerald} fillOpacity={0.3} />
                                      <Area type="monotone" dataKey="created" name="สร้างใหม่" stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue} fillOpacity={0.3} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>

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
                                          {w.overdue > 0 && <Badge variant="destructive" className="text-[10px] h-5 gap-1"><AlertTriangle className="w-2.5 h-2.5" /> {w.overdue} ค้าง</Badge>}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
                                          {w.completed > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${(w.completed / Math.max(w.totalTasks, 1)) * 100}%` }} />}
                                          {w.inProgress > 0 && <div className="bg-blue-500 h-full" style={{ width: `${(w.inProgress / Math.max(w.totalTasks, 1)) * 100}%` }} />}
                                          {w.todo > 0 && <div className="bg-slate-400 h-full" style={{ width: `${(w.todo / Math.max(w.totalTasks, 1)) * 100}%` }} />}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-medium w-10 text-right">{completionRate.toFixed(0)}%</span>
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
                                    <Badge className={cn("text-[10px] h-5 text-white", priorityColor[t.priority] || "bg-slate-400")}>{priorityLabel[t.priority] || t.priority}</Badge>
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

                  {/* Tab: ประสิทธิภาพ */}
                  <TabsContent value="performance" className="mt-4 space-y-4">
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
                      <>
                        {performance.summary && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                              <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <Target className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">Avg Completion Rate</div>
                                    <div className={cn("text-xl font-bold", getProductivityColor(performance.summary.avgTaskCompletionRate ?? 0))}>{(performance.summary.avgTaskCompletionRate ?? 0).toFixed(1)}%</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                              <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <Calendar className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">Avg Attendance Rate</div>
                                    <div className={cn("text-xl font-bold", getProductivityColor(performance.summary.avgMeetingAttendanceRate ?? 0))}>{(performance.summary.avgMeetingAttendanceRate ?? 0).toFixed(1)}%</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                              <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                    <Zap className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">Total Interactions</div>
                                    <div className="text-xl font-bold text-foreground">{performance.summary.totalInteractions ?? 0}</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {performance.trend && performance.trend.length > 0 && (
                          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                แนวโน้มประสิทธิภาพ
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <ComposedChart data={performance.trend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                    <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="completionRate" name="Completion %" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="attendanceRate" name="Attendance %" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                                    <Line type="monotone" dataKey="activityScore" name="Activity" stroke={CHART_COLORS.violet} strokeWidth={2} />
                                  </ComposedChart>
                                </ResponsiveContainer>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Target className="w-4 h-4 text-emerald-500" />
                                อัตราสำเร็จงาน (Task Completion)
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {performance.taskCompletionRates.slice().sort((a, b) => b.completionRate - a.completionRate).map((r) => {
                                const TrendIcon = getTrendIcon(r.trend);
                                return (
                                  <div key={r.userId} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-medium truncate mr-2">{r.userName}</span>
                                      <div className="flex items-center gap-2">
                                        {r.trend && <TrendIcon className={cn("w-3 h-3", getTrendColor(r.trend))} />}
                                        <span className="text-muted-foreground">{r.completedTasks}/{r.totalTasks} ({r.completionRate.toFixed(0)}%)</span>
                                      </div>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                      <div className={cn("h-full rounded-full transition-all duration-500", r.completionRate >= 80 ? "bg-emerald-500" : r.completionRate >= 50 ? "bg-blue-500" : r.completionRate >= 30 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${r.completionRate}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </CardContent>
                          </Card>

                          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500" />
                                กิจกรรมการทำงานร่วมกัน
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2.5">
                                {performance.collaborationActivity.slice().sort((a, b) => b.totalInteractions - a.totalInteractions).map((w) => (
                                  <div key={w.userId} className="p-2.5 rounded-lg bg-muted/20 border border-border/30">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-xs font-medium">{w.userName}</span>
                                      <Badge variant="secondary" className="text-[10px] h-5 font-bold">{w.totalInteractions} รวม</Badge>
                                    </div>
                                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                                      <span className="flex items-center gap-1"><CheckSquare className="w-2.5 h-2.5 text-emerald-500" /> {w.completedTasks} งาน</span>
                                      <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5 text-blue-500" /> {w.attendedMeetings} ประชุม</span>
                                      <span className="flex items-center gap-1"><MessageSquare className="w-2.5 h-2.5 text-violet-500" /> {w.messagesSent} แชท</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

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
                                  {performance.meetingAttendanceRates.slice().sort((a, b) => b.attendanceRate - a.attendanceRate).map((r) => (
                                    <div key={r.userId} className="p-3 rounded-lg bg-muted/20 border border-border/30">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-medium truncate mr-2">{r.userName}</span>
                                        <span className={cn("text-xs font-bold", r.attendanceRate >= 80 ? "text-emerald-500" : r.attendanceRate >= 50 ? "text-blue-500" : "text-amber-500")}>{r.attendanceRate.toFixed(0)}%</span>
                                      </div>
                                      <Progress value={r.attendanceRate} className="h-1.5" />
                                      <div className="text-[10px] text-muted-foreground mt-1">{r.attendedMeetings}/{r.totalMeetings} ครั้ง</div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </>
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
