import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileBarChart,
  TrendingUp,
  Users,
  Calendar,
  CheckSquare,
  Clock,
  Loader2,
  Activity,
  BarChart3,
  Download,
  BarChart2,
  MessageSquare,
} from "lucide-react";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DateRangeKey = "week" | "month" | "quarter" | "year";

type ExportFormat = "csv" | "xlsx" | "json" | "pdf";

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
      byStatus: Record<string, number>;
      byPriority: Record<string, number>;
      completed: number;
      inProgress: number;
    };
    meetings: {
      total: number;
      completed: number;
      scheduled: number;
      totalDuration: number;
      withRecordings: number;
      withMinutes: number;
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
  hostStats: Record<string, number>;
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
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  tasksByAssignee: Record<string, number>;
  tasksByTeam: Record<string, number>;
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
  meetingAttendanceRates: {
    userId: string;
    userName: string;
    totalMeetings: number;
    attendedMeetings: number;
    attendanceRate: number;
  }[];
  chatResponseTimes: {
    userId: string;
    userName: string;
    totalMessages: number;
    respondedMessages: number;
    avgResponseTimeMinutes: number | null;
    avgResponseTimeHours: number | null;
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

interface TeamOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
}

type ReportTab = "overview" | "personal" | "team" | "meetings" | "tasks" | "performance";

function getDateRangeLabel(range: DateRangeKey): string {
  switch (range) {
    case "week":
      return "สัปดาห์ที่ผ่านมา";
    case "month":
      return "เดือนที่ผ่านมา";
    case "quarter":
      return "ไตรมาสที่ผ่านมา";
    case "year":
      return "ปีที่ผ่านมา";
    default:
      return "";
  }
}

function getDateRange(range: DateRangeKey): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(start.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      break;
  }

  return { start, end };
}

function getProductivityColor(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

function getProductivityGradient(score: number) {
  if (score >= 80) return "from-green-500 to-emerald-600";
  if (score >= 60) return "from-blue-500 to-cyan-600";
  if (score >= 40) return "from-orange-500 to-amber-600";
  return "from-red-500 to-rose-600";
}

function toIsoDate(date: Date): string {
  return date.toISOString();
}

function formatDateForPdf(date: Date): string {
  // ใช้รูปแบบ YYYY-MM-DD ให้คงที่และไม่ผูกกับ locale (เลี่ยงปี พ.ศ.)
  return date.toISOString().slice(0, 10);
}

let thaiFontLoaded = false;

async function ensureThaiFont(doc: any) {
  if (thaiFontLoaded) {
    doc.setFont("THSarabunNew");
    return;
  }

  try {
    const res = await fetch("/font/THSarabunNew.ttf");
    if (!res.ok) {
      console.error("Failed to load THSarabunNew.ttf for PDF", res.status);
      return;
    }
    const buffer = await res.arrayBuffer();
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    const base64 = btoa(binary);

    (doc as any).addFileToVFS("THSarabunNew.ttf", base64);
    (doc as any).addFont("THSarabunNew.ttf", "THSarabunNew", "normal");
    doc.setFont("THSarabunNew");
    thaiFontLoaded = true;
  } catch (err) {
    console.error("Error loading THSarabunNew font", err);
  }
}

function downloadCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    return;
  }
  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  const escape = (value: any) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes('"') || str.includes(",") || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadJson(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    return;
  }
  const json = JSON.stringify(rows, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadXlsx(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function downloadPdfFromDom(filename: string, element: HTMLElement | null) {
  if (!element) return;
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
  });
  const imgData = canvas.toDataURL("image/png");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const imgWidth = canvas.width * ratio;
  const imgHeight = canvas.height * ratio;
  const x = (pageWidth - imgWidth) / 2;
  const y = (pageHeight - imgHeight) / 2;

  doc.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
  doc.save(filename);
}

export default function Reports() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [dateRange, setDateRange] = useState<DateRangeKey>("month");

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();

  const [loading, setLoading] = useState(true);
  const [loadingSecondary, setLoadingSecondary] = useState(false);

  const [personalReport, setPersonalReport] = useState<PersonalReportData | null>(null);
  const [teamReport, setTeamReport] = useState<TeamProductivityReport | null>(null);
  const [meetingReport, setMeetingReport] = useState<MeetingReport | null>(null);
  const [taskReport, setTaskReport] = useState<TaskReport | null>(null);
  const [teamWorkload, setTeamWorkload] = useState<TeamWorkloadReport | null>(null);
  const [performance, setPerformance] = useState<PerformanceDashboard | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  const isManagerOrAbove =
    currentUser?.role === "manager" || currentUser?.role === "admin" || currentUser?.role === "org_owner";

  // Load base data (teams, users, personal report)
  useEffect(() => {
    const loadBase = async () => {
      try {
        setLoading(true);
        const [{ start, end }] = [getDateRange(dateRange)];

        const [teamsRes, usersRes, personalRes] = await Promise.all([
          apiGet<any[]>("/teams").catch(() => []),
          isManagerOrAbove ? apiGet<any[]>("/users").catch(() => []) : Promise.resolve([]),
          apiGet<PersonalReportData>(`/reports?range=${dateRange}`).catch(() => ({} as PersonalReportData)),
        ]);

        setTeams(
          (teamsRes || []).map((t: any) => ({
            id: t.id,
            name: t.name,
          }))
        );

        setUsers(
          (usersRes || []).map((u: any) => ({
            id: u.id,
            name: u.name || u.email,
          }))
        );

        setPersonalReport(personalRes && Object.keys(personalRes).length > 0 ? personalRes : null);

        // Default team filter: first team (for manager/admin), otherwise undefined
        if (!selectedTeamId && (teamsRes || []).length > 0) {
          setSelectedTeamId(teamsRes[0].id);
        }

        // Preload some reports for Overview
        await Promise.all([
          apiGet<MeetingReport>(
            `/reports/meetings?startDate=${encodeURIComponent(toIsoDate(start))}&endDate=${encodeURIComponent(
              toIsoDate(end)
            )}`
          )
            .then((data) => setMeetingReport(data))
            .catch(() => setMeetingReport(null)),
          apiGet<PerformanceDashboard>(
            `/reports/performance?startDate=${encodeURIComponent(toIsoDate(start))}&endDate=${encodeURIComponent(
              toIsoDate(end)
            )}`
          )
            .then((data) => setPerformance(data))
            .catch(() => setPerformance(null)),
        ]);
      } catch (error: any) {
        console.error("Failed to load reports:", error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: error.message || "ไม่สามารถโหลดรายงานได้",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Load tab-specific data when activeTab or filters change
  useEffect(() => {
    const loadTabData = async () => {
      const { start, end } = getDateRange(dateRange);
      const startIso = encodeURIComponent(toIsoDate(start));
      const endIso = encodeURIComponent(toIsoDate(end));

      try {
        setLoadingSecondary(true);

        if (activeTab === "team" && selectedTeamId) {
          const data = await apiGet<TeamProductivityReport>(
            `/reports/team-productivity?teamId=${encodeURIComponent(selectedTeamId)}&startDate=${startIso}&endDate=${endIso}`
          );
          setTeamReport(data);
        }

        if (activeTab === "meetings") {
          const data = await apiGet<MeetingReport>(
            `/reports/meetings?startDate=${startIso}&endDate=${endIso}${
              selectedTeamId ? `&teamId=${encodeURIComponent(selectedTeamId)}` : ""
            }`
          );
          setMeetingReport(data);
        }

        if (activeTab === "tasks") {
          const [tasksRes, workloadRes] = await Promise.all([
            apiGet<TaskReport>(
              `/reports/tasks?startDate=${startIso}&endDate=${endIso}${
                selectedTeamId ? `&teamId=${encodeURIComponent(selectedTeamId)}` : ""
              }`
            ).catch(() => null as any),
            selectedTeamId
              ? apiGet<TeamWorkloadReport>(
                  `/reports/teams/${encodeURIComponent(
                    selectedTeamId
                  )}/workload?startDate=${startIso}&endDate=${endIso}`
                ).catch(() => null as any)
              : Promise.resolve(null as any),
          ]);
          setTaskReport(tasksRes);
          setTeamWorkload(workloadRes);
        }

        if (activeTab === "performance") {
          const data = await apiGet<PerformanceDashboard>(
            `/reports/performance?startDate=${startIso}&endDate=${endIso}${
              selectedTeamId ? `&teamId=${encodeURIComponent(selectedTeamId)}` : ""
            }`
          );
          setPerformance(data);
        }
      } catch (error) {
        console.error("Failed to load tab data:", error);
      } finally {
        setLoadingSecondary(false);
      }
    };

    if (!loading) {
      loadTabData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateRange, selectedTeamId]);

  const currentRangeLabel = getDateRangeLabel(dateRange);
  const { start: pdfStart, end: pdfEnd } = getDateRange(dateRange);
  const pdfPeriodLabel = `${formatDateForPdf(pdfStart)} – ${formatDateForPdf(pdfEnd)}`;

  const performanceSummary = useMemo(() => {
    if (!performance) return null;
    const totalUsers = performance.taskCompletionRates.length;
    const avgCompletionRate =
      totalUsers > 0
        ? performance.taskCompletionRates.reduce((sum, r) => sum + r.completionRate, 0) / totalUsers
        : 0;
    const totalHours = performance.collaborationActivity.reduce((sum, w) => sum + w.totalInteractions, 0); // Using total interactions instead of hours for metric
    const avgOutputPerHour =
      performance.collaborationActivity.length > 0
        ? performance.collaborationActivity.reduce((sum, w) => sum + w.completedTasks, 0) /
          performance.collaborationActivity.length
        : 0;

    return {
      totalUsers,
      avgCompletionRate,
      totalHours,
      avgOutputPerHour,
    };
  }, [performance]);

  // แสดง loading เต็มหน้าจอเฉพาะตอนโหลดครั้งแรกเท่านั้น
  // เวลาเปลี่ยนแท็บให้ใช้ loadingSecondary แบบเบาๆ (ไม่ดัน layout กระโดด)
  const isLoadingAny = loading;

  const handleExport = async (format: ExportFormat) => {
    const { start, end } = getDateRange(dateRange);
    const periodStart = toIsoDate(start);
    const periodEnd = toIsoDate(end);
    const periodLabelForPdf = `${formatDateForPdf(start)} – ${formatDateForPdf(end)}`;
    const baseMeta = {
      periodStart,
      periodEnd,
      periodLabel: currentRangeLabel,
      rangeKey: dateRange,
      team: selectedTeam?.name ?? "",
      tab: activeTab,
    };

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const suffix = `${dateRange}-${timestamp}`;

    try {
      let rows: Record<string, any>[] | null = null;
      let filename = "";

      if (activeTab === "personal" && personalReport) {
        rows = [];
        rows.push({
          ...baseMeta,
          type: "summary",
          tasksCompleted: personalReport.tasksCompleted ?? 0,
          meetingsAttended: personalReport.meetingsAttended ?? 0,
          messagesSent: personalReport.messagesSent ?? 0,
          productivityScore: personalReport.productivityScore ?? 0,
        });
        if (personalReport.teamMetrics && personalReport.teamMetrics.length > 0) {
          personalReport.teamMetrics.forEach((t) =>
            rows!.push({
              ...baseMeta,
              type: "team",
              teamName: t.teamName,
              tasksCompleted: t.tasksCompleted ?? 0,
              meetingsAttended: t.meetingsAttended ?? 0,
              messagesSent: t.messagesSent ?? 0,
            })
          );
        }
        filename = `personal-report-${suffix}`;
      } else if (activeTab === "team" && teamReport) {
        rows = teamReport.members.map((m) => ({
          ...baseMeta,
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          totalTasks: m.tasks.total,
          completedTasks: m.tasks.completed,
          inProgressTasks: m.tasks.inProgress,
          messagesSent: m.messagesSent,
          meetingsAttended: m.meetingsAttended,
        }));
        filename = `team-productivity-${suffix}`;
      } else if (activeTab === "meetings" && meetingReport) {
        rows = meetingReport.meetings.map((m) => ({
          ...baseMeta,
          id: m.id,
          title: m.title,
          team: m.team ?? "",
          host: m.host,
          startTime: m.startTime,
          endTime: m.endTime ?? "",
          durationMinutes: m.duration,
          participants: m.participants,
        }));
        filename = `meetings-${suffix}`;
      } else if (activeTab === "tasks") {
        if (teamWorkload && teamWorkload.workload.length > 0) {
          rows = teamWorkload.workload.map((w) => ({
            ...baseMeta,
            userId: w.userId,
            userName: w.userName,
            totalTasks: w.totalTasks,
            completed: w.completed,
            inProgress: w.inProgress,
            todo: w.todo,
            overdue: w.overdue,
          }));
          filename = `team-workload-${suffix}`;
        } else if (taskReport && taskReport.overdueTasks.length > 0) {
          rows = taskReport.overdueTasks.map((t) => ({
            ...baseMeta,
            id: t.id,
            title: t.title,
            dueDate: t.dueDate ?? "",
            assignee: t.assignee ?? "",
            team: t.team ?? "",
            priority: t.priority,
          }));
          filename = `tasks-overdue-${suffix}`;
        }
      } else if (activeTab === "performance" && performance) {
        const completionByUser = new Map(
          performance.taskCompletionRates.map((r) => [r.userId, r])
        );
        rows = performance.collaborationActivity.map((w) => {
          const completion = completionByUser.get(w.userId);
          return {
            ...baseMeta,
            userId: w.userId,
            userName: w.userName,
            completedTasks: completion?.completedTasks ?? w.completedTasks,
            completionRate: completion?.completionRate ?? 0,
            attendedMeetings: w.attendedMeetings,
            messagesSent: w.messagesSent,
            totalInteractions: w.totalInteractions,
          };
        });
        filename = `performance-${suffix}`;
      } else if (personalReport) {
        // Overview or fallback: export basic personal+team metrics if available
        rows = [
          {
            ...baseMeta,
            type: "personal-summary",
            tasksCompleted: personalReport.tasksCompleted ?? 0,
            meetingsAttended: personalReport.meetingsAttended ?? 0,
            messagesSent: personalReport.messagesSent ?? 0,
            productivityScore: personalReport.productivityScore ?? 0,
          },
        ];
        filename = `reports-overview-${suffix}`;
      }

      if (format === "pdf") {
        await downloadPdfFromDom(`${filename}.pdf`, printRef.current);
        return;
      }

      if (!rows || rows.length === 0) {
        toast({
          title: "ไม่มีข้อมูลให้ Export",
          description: "ลองเปลี่ยนช่วงเวลา หรือเลือก team/user อื่น",
        });
        return;
      }

      if (format === "csv") {
        downloadCsv(`${filename}.csv`, rows);
      } else if (format === "xlsx") {
        downloadXlsx(`${filename}.xlsx`, rows);
      } else if (format === "json") {
        downloadJson(`${filename}.json`, rows);
      }
    } catch (error: any) {
      console.error("Export failed:", error);
      toast({
        title: "Export ไม่สำเร็จ",
        description: error.message || "ไม่สามารถสร้างไฟล์รายงานได้",
        variant: "destructive",
      });
    }
  };

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId),
    [teams, selectedTeamId]
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-[1920px] mx-auto px-6 lg:px-8">
            <div className="h-20 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                    <FileBarChart className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background animate-pulse-soft" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-foreground tracking-tight">Reports & Analytics</h1>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    รายงานผลงาน · วิเคราะห์ประสิทธิภาพ · สถิติทีม · ข้อมูลเชิงลึก
                  </p>
                </div>
              </div>

              {/* Global date range */}
              <div className="flex items-center gap-3">
                <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRangeKey)}>
                  <SelectTrigger className="w-[180px] h-9 border-border/50 bg-background/50 hover:bg-background text-xs">
                    <SelectValue placeholder="เลือกช่วงเวลา" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">สัปดาห์ที่ผ่านมา</SelectItem>
                    <SelectItem value="month">เดือนที่ผ่านมา</SelectItem>
                    <SelectItem value="quarter">ไตรมาสที่ผ่านมา</SelectItem>
                    <SelectItem value="year">ปีที่ผ่านมา</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Top Sticky Tabs */}
          <div className="bg-background border-b border-border/50 sticky top-0 z-10 px-6 lg:px-8 py-3 w-full overflow-x-auto hide-scrollbar">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ReportTab)} className="w-full">
              <TabsList className="bg-muted/60 border border-border/60 h-10 inline-flex min-w-max justify-start">
                <TabsTrigger value="overview" className="text-[13px] px-4">
                  ภาพรวม
                </TabsTrigger>
                <TabsTrigger value="personal" className="text-[13px] px-4">
                  รายบุคคล
                </TabsTrigger>
                <TabsTrigger value="team" className="text-[13px] px-4">
                  ทีม
                </TabsTrigger>
                <TabsTrigger value="meetings" className="text-[13px] px-4">
                  Meetings
                </TabsTrigger>
                <TabsTrigger value="tasks" className="text-[13px] px-4">
                  Tasks & Workload
                </TabsTrigger>
                <TabsTrigger value="performance" className="text-[13px] px-4">
                  Performance
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Main Scrollable Content */}
          <div
            className="max-w-[1920px] w-full mx-auto px-6 lg:px-8 py-4 h-full flex flex-col overflow-y-auto"
            style={{ scrollbarGutter: "stable" }}
          >
            {/* Filter and Action Bar */}
            <div className="mb-4 flex flex-col gap-3 bg-card/40 border border-border/50 rounded-xl p-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
                {/* Dynamic Filters (Left Side of Filter Bar) */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {isManagerOrAbove &&
                    (activeTab === "team" ||
                      activeTab === "meetings" ||
                      activeTab === "tasks" ||
                      activeTab === "performance") && (
                    <div className="flex items-center gap-1.5 bg-background/50 rounded-md p-1 border border-border/50">
                      <span className="text-muted-foreground/80 px-2 font-medium">มุมมองทีม:</span>
                      <Select
                        value={selectedTeamId ?? "__all__"}
                        onValueChange={(val) =>
                          setSelectedTeamId(val === "__all__" ? undefined : val)
                        }
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0">
                          <SelectValue placeholder="ทุกทีม" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">ทุกทีม</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {isManagerOrAbove && activeTab === "personal" && (
                    <div className="flex items-center gap-1.5 bg-background/50 rounded-md p-1 border border-border/50">
                      <span className="text-muted-foreground/80 px-2 font-medium">พนักงาน:</span>
                      <Select
                        value={selectedUserId || currentUser?.id}
                        onValueChange={(val) => setSelectedUserId(val)}
                      >
                        <SelectTrigger className="w-[200px] h-8 text-xs border-0 bg-transparent shadow-none focus:ring-0">
                          <SelectValue placeholder="เลือกพนักงาน" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentUser && (
                            <SelectItem value={currentUser.id}>
                              ฉันเอง ({currentUser.name || currentUser.email})
                            </SelectItem>
                          )}
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="hidden lg:block text-muted-foreground/60 text-[11px] ml-2">
                    ข้อมูลคำนวณจากกิจกรรมจริงในระบบ
                  </div>
                </div>

                {/* Export Actions (Right Side) */}
                <div className="flex items-center gap-3 shrink-0 auto-ml shrink-0 ml-auto md:ml-0">
                  <div className="hidden xl:flex text-[11px] text-muted-foreground items-center gap-2 pr-2 border-r border-border/50">
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>
                      ช่วงเวลา: <span className="font-medium text-foreground">{currentRangeLabel}</span>
                    </span>
                    {selectedTeam && activeTab !== 'personal' && activeTab !== 'overview' && (
                      <>
                        <span className="text-muted-foreground/40">|</span>
                        <span>
                          ทีม: <span className="font-medium text-foreground">{selectedTeam.name}</span>
                        </span>
                      </>
                    )}
                  </div>
                  <Tooltip>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            className="h-9 gap-2 text-xs font-medium shadow-sm"
                            disabled={isLoadingAny}
                          >
                            <Download className="w-4 h-4" />
                            <span>Export</span>
                          </Button>
                        </TooltipTrigger>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="text-[11px]">รูปแบบไฟล์</DropdownMenuLabel>
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => handleExport("csv")}
                          disabled={isLoadingAny}
                        >
                          CSV (.csv)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => handleExport("xlsx")}
                          disabled={isLoadingAny}
                        >
                          Excel (.xlsx)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => handleExport("json")}
                          disabled={isLoadingAny}
                        >
                          JSON (.json)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => handleExport("pdf")}
                          disabled={isLoadingAny}
                        >
                          PDF (.pdf)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <TooltipContent>
                      ดาวน์โหลดข้อมูลรายงานตามมุมมองปัจจุบัน เลือกรูปแบบไฟล์ได้
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Main content per tab */}
            {isLoadingAny ? (
              <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground font-medium animate-pulse">กำลังจัดเตรียมรายงาน...</span>
                </div>
              </div>
            ) : (
              <Tabs value={activeTab} className="flex-1 flex flex-col min-h-0 w-full">
                {/* Overview */}
                <TabsContent value="overview" className="mt-0 flex-1 flex flex-col gap-4 w-full">
                  {/* Reuse personal summary cards as high-level overview */}
                  {personalReport ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <SummaryCard
                        title="งานที่เสร็จแล้ว"
                        icon={CheckSquare}
                        iconColor="text-primary"
                        bgColor="bg-primary/10"
                        value={personalReport.tasksCompleted ?? 0}
                        suffix="งาน"
                      />
                      <SummaryCard
                        title="การประชุมที่เข้าร่วม"
                        icon={Calendar}
                        iconColor="text-blue-600"
                        bgColor="bg-blue-500/10"
                        value={personalReport.meetingsAttended ?? 0}
                        suffix="การประชุม"
                      />
                      <SummaryCard
                        title="ข้อความที่ส่ง"
                        icon={MessageSquare}
                        iconColor="text-orange-600"
                        bgColor="bg-orange-500/10"
                        value={personalReport.messagesSent ?? 0}
                        suffix="ข้อความ"
                      />
                      <ProductivityCard score={personalReport.productivityScore ?? 0} />
                    </div>
                  ) : (
                    <EmptyState message="ยังไม่มีข้อมูลภาพรวมสำหรับช่วงเวลานี้" />
                  )}

                  {/* Simple high-level blocks using meetingReport & performance if available */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card className="border-border/50 bg-card/70">
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-primary" />
                          Meetings overview
                        </CardTitle>
                        <Badge variant="outline" className="text-[11px]">
                          {currentRangeLabel}
                        </Badge>
                      </CardHeader>
                      <CardContent className="text-xs space-y-2">
                        {meetingReport ? (
                          <>
                            <div className="flex gap-4">
                              <div>
                                <div className="text-muted-foreground/80">จำนวนประชุม</div>
                                <div className="text-lg font-semibold">
                                  {meetingReport.summary.totalMeetings}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground/80">ระยะเวลาเฉลี่ย</div>
                                <div className="text-lg font-semibold">
                                  {meetingReport.summary.avgDuration.toFixed(1)} นาที
                                </div>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="text-muted-foreground/80 mb-1">ประชุมตามทีม (Top 3)</div>
                              <div className="space-y-1">
                                {Object.entries(meetingReport.meetingsByTeam)
                                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                                  .slice(0, 3)
                                  .map(([team, count]) => (
                                    <div key={team} className="flex justify-between text-[11px]">
                                      <span className="truncate mr-2">{team}</span>
                                      <span className="font-medium">{count}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground text-xs">
                            ยังไม่มีข้อมูลการประชุมสำหรับช่วงเวลานี้
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-border/50 bg-card/70">
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Activity className="w-4 h-4 text-primary" />
                          Productivity snapshot
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-2">
                        {performance ? (
                          <>
                            <div className="flex gap-4">
                              <div>
                                <div className="text-muted-foreground/80">ผู้ใช้งานที่ติดตาม</div>
                                <div className="text-lg font-semibold">
                                  {performance.taskCompletionRates.length}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground/80">อัตราสำเร็จงานเฉลี่ย</div>
                                <div className="text-lg font-semibold">
                                  {(
                                    performance.taskCompletionRates.reduce(
                                      (sum, r) => sum + r.completionRate,
                                      0
                                    ) / (performance.taskCompletionRates.length || 1)
                                  ).toFixed(1)}
                                  %
                                </div>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="text-muted-foreground/80 mb-1">
                                Top 3 ตามอัตราสำเร็จงาน
                              </div>
                              <div className="space-y-1">
                                {performance.taskCompletionRates
                                  .slice()
                                  .sort((a, b) => b.completionRate - a.completionRate)
                                  .slice(0, 3)
                                  .map((r) => (
                                    <div
                                      key={r.userId}
                                      className="flex justify-between text-[11px]"
                                    >
                                      <span className="truncate mr-2">{r.userName}</span>
                                      <span className="font-medium">
                                        {r.completionRate.toFixed(1)}%
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground text-xs">
                            ยังไม่มีข้อมูลประสิทธิภาพสำหรับช่วงเวลานี้
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Personal */}
                <TabsContent value="personal" className="mt-0 flex-1 flex flex-col">
                  {personalReport ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <SummaryCard
                          title="งานที่เสร็จแล้ว"
                          icon={CheckSquare}
                          iconColor="text-primary"
                          bgColor="bg-primary/10"
                          value={personalReport.tasksCompleted ?? 0}
                          suffix="งาน"
                        />
                        <SummaryCard
                          title="การประชุมที่เข้าร่วม"
                          icon={Calendar}
                          iconColor="text-blue-600"
                          bgColor="bg-blue-500/10"
                          value={personalReport.meetingsAttended ?? 0}
                          suffix="การประชุม"
                        />
                        <SummaryCard
                          title="ข้อความที่ส่ง"
                          icon={MessageSquare}
                          iconColor="text-orange-600"
                          bgColor="bg-orange-500/10"
                          value={personalReport.messagesSent ?? 0}
                          suffix="ข้อความ"
                        />
                        <ProductivityCard score={personalReport.productivityScore ?? 0} />
                      </div>

                      {personalReport.teamMetrics && personalReport.teamMetrics.length > 0 && (
                        <Card className="border-border/50 bg-card/70">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Users className="w-4 h-4 text-primary" />
                              สถิติทีมที่คุณอยู่
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-xs">
                            {personalReport.teamMetrics.map((t) => (
                              <div
                                key={t.teamName}
                                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                              >
                                <div className="font-medium">{t.teamName}</div>
                                <div className="flex gap-4 text-[11px] text-muted-foreground">
                                  <span>งาน: {t.tasksCompleted ?? 0}</span>
                                  <span>ประชุม: {t.meetingsAttended ?? 0}</span>
                                  <span>แชท: {t.messagesSent ?? 0}</span>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <EmptyState message="ยังไม่มีข้อมูลสำหรับผู้ใช้ในช่วงเวลานี้" />
                  )}
                </TabsContent>

                {/* Team */}
                <TabsContent value="team" className="mt-0 flex-1 flex flex-col">
                  {teamReport && selectedTeam ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SummaryCard
                          title="จำนวนสมาชิกทีม"
                          icon={Users}
                          iconColor="text-primary"
                          bgColor="bg-primary/10"
                          value={teamReport.summary.members}
                        />
                        <SummaryCard
                          title="งานทั้งหมด"
                          icon={CheckSquare}
                          iconColor="text-blue-600"
                          bgColor="bg-blue-500/10"
                          value={teamReport.summary.tasks.total}
                        />
                        <SummaryCard
                          title="จำนวนประชุม"
                          icon={Calendar}
                          iconColor="text-emerald-600"
                          bgColor="bg-emerald-500/10"
                          value={teamReport.summary.meetings.total}
                        />
                      </div>

                      <Card className="border-border/50 bg-card/70">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            ภาระงานและผลงานรายคนในทีม {selectedTeam.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs overflow-x-auto">
                          <table className="w-full border-collapse text-[11px]">
                            <thead className="bg-muted/60">
                              <tr>
                                <th className="text-left px-2 py-1 font-medium">ชื่อ</th>
                                <th className="text-right px-2 py-1 font-medium">งานทั้งหมด</th>
                                <th className="text-right px-2 py-1 font-medium">เสร็จแล้ว</th>
                                <th className="text-right px-2 py-1 font-medium">กำลังทำ</th>
                                <th className="text-right px-2 py-1 font-medium">ข้อความที่ส่ง</th>
                                <th className="text-right px-2 py-1 font-medium">จำนวนประชุมที่เข้าร่วม</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teamReport.members.map((m) => (
                                <tr key={m.user.id} className="border-t border-border/40">
                                  <td className="px-2 py-1">{m.user.name}</td>
                                  <td className="px-2 py-1 text-right">{m.tasks.total}</td>
                                  <td className="px-2 py-1 text-right">{m.tasks.completed}</td>
                                  <td className="px-2 py-1 text-right">{m.tasks.inProgress}</td>
                                  <td className="px-2 py-1 text-right">
                                    {m.messagesSent}
                                  </td>
                                  <td className="px-2 py-1 text-right">{m.meetingsAttended}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <EmptyState message="เลือกทีมเพื่อดูรายงาน หรือยังไม่มีข้อมูลสำหรับทีมนี้" />
                  )}
                </TabsContent>

                {/* Meetings */}
                <TabsContent value="meetings" className="mt-0 flex-1 flex flex-col">
                  {meetingReport ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <SummaryCard
                          title="จำนวนประชุม"
                          icon={Calendar}
                          iconColor="text-primary"
                          bgColor="bg-primary/10"
                          value={meetingReport.summary.totalMeetings}
                        />
                        <SummaryCard
                          title="ระยะเวลารวม"
                          icon={Clock}
                          iconColor="text-blue-600"
                          bgColor="bg-blue-500/10"
                          value={meetingReport.summary.totalDuration.toFixed(1)}
                          suffix="นาที"
                        />
                        <SummaryCard
                          title="ผู้เข้าร่วมทั้งหมด"
                          icon={Users}
                          iconColor="text-emerald-600"
                          bgColor="bg-emerald-500/10"
                          value={meetingReport.summary.totalParticipants}
                        />
                        <SummaryCard
                          title="ผู้เข้าร่วมเฉลี่ย"
                          icon={Users}
                          iconColor="text-orange-600"
                          bgColor="bg-orange-500/10"
                          value={meetingReport.summary.avgParticipants.toFixed(1)}
                        />
                      </div>

                      <Card className="border-border/50 bg-card/70">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold">
                            รายการประชุมในช่วง {currentRangeLabel}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs overflow-x-auto">
                          <table className="w-full border-collapse text-[11px]">
                            <thead className="bg-muted/60">
                              <tr>
                                <th className="text-left px-2 py-1 font-medium">ชื่อประชุม</th>
                                <th className="text-left px-2 py-1 font-medium">ทีม</th>
                                <th className="text-left px-2 py-1 font-medium">Host</th>
                                <th className="text-left px-2 py-1 font-medium">เริ่ม</th>
                                <th className="text-right px-2 py-1 font-medium">ระยะเวลา (นาที)</th>
                                <th className="text-right px-2 py-1 font-medium">ผู้เข้าร่วม</th>
                              </tr>
                            </thead>
                            <tbody>
                              {meetingReport.meetings.map((m) => (
                                <tr key={m.id} className="border-t border-border/40">
                                  <td className="px-2 py-1 max-w-[200px] truncate">{m.title}</td>
                                  <td className="px-2 py-1">{m.team ?? "-"}</td>
                                  <td className="px-2 py-1">{m.host}</td>
                                  <td className="px-2 py-1">
                                    {m.startTime ? new Date(m.startTime).toLocaleString() : "-"}
                                  </td>
                                  <td className="px-2 py-1 text-right">
                                    {m.duration.toFixed(1)}
                                  </td>
                                  <td className="px-2 py-1 text-right">{m.participants}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <EmptyState message="ยังไม่มีข้อมูลการประชุมสำหรับช่วงเวลานี้" />
                  )}
                </TabsContent>

                {/* Tasks & Workload */}
                <TabsContent value="tasks" className="mt-0 flex-1 flex flex-col">
                  {taskReport ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <SummaryCard
                          title="งานทั้งหมด"
                          icon={CheckSquare}
                          iconColor="text-primary"
                          bgColor="bg-primary/10"
                          value={taskReport.summary.totalTasks}
                        />
                        <SummaryCard
                          title="งานเสร็จแล้ว"
                          icon={CheckSquare}
                          iconColor="text-emerald-600"
                          bgColor="bg-emerald-500/10"
                          value={taskReport.summary.completedTasks}
                        />
                        <SummaryCard
                          title="กำลังทำ"
                          icon={CheckSquare}
                          iconColor="text-blue-600"
                          bgColor="bg-blue-500/10"
                          value={taskReport.summary.inProgressTasks}
                        />
                        <SummaryCard
                          title="งานค้าง (Overdue)"
                          icon={CheckSquare}
                          iconColor="text-red-600"
                          bgColor="bg-red-500/10"
                          value={taskReport.summary.overdueTasks}
                        />
                      </div>

                      {teamWorkload && teamWorkload.workload.length > 0 && (
                        <Card className="border-border/50 bg-card/70">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">
                              ภาระงานรายคนในทีม {teamWorkload.team.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-xs overflow-x-auto">
                            <table className="w-full border-collapse text-[11px]">
                              <thead className="bg-muted/60">
                                <tr>
                                  <th className="text-left px-2 py-1 font-medium">ชื่อ</th>
                                  <th className="text-right px-2 py-1 font-medium">งานทั้งหมด</th>
                                  <th className="text-right px-2 py-1 font-medium">เสร็จแล้ว</th>
                                  <th className="text-right px-2 py-1 font-medium">กำลังทำ</th>
                                  <th className="text-right px-2 py-1 font-medium">ยังไม่เริ่ม</th>
                                  <th className="text-right px-2 py-1 font-medium">ค้าง</th>
                                </tr>
                              </thead>
                              <tbody>
                                {teamWorkload.workload.map((w) => (
                                  <tr key={w.userId} className="border-t border-border/40">
                                    <td className="px-2 py-1">{w.userName}</td>
                                    <td className="px-2 py-1 text-right">{w.totalTasks}</td>
                                    <td className="px-2 py-1 text-right">{w.completed}</td>
                                    <td className="px-2 py-1 text-right">{w.inProgress}</td>
                                    <td className="px-2 py-1 text-right">{w.todo}</td>
                                    <td className="px-2 py-1 text-right">{w.overdue}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </CardContent>
                        </Card>
                      )}

                      {taskReport.overdueTasks.length > 0 && (
                        <Card className="border-border/50 bg-card/70">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">
                              งานที่ค้างเกินกำหนด (Overdue)
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-xs overflow-x-auto">
                            <table className="w-full border-collapse text-[11px]">
                              <thead className="bg-muted/60">
                                <tr>
                                  <th className="text-left px-2 py-1 font-medium">ชื่อเรื่อง</th>
                                  <th className="text-left px-2 py-1 font-medium">ผู้รับผิดชอบ</th>
                                  <th className="text-left px-2 py-1 font-medium">ทีม</th>
                                  <th className="text-left px-2 py-1 font-medium">Priority</th>
                                  <th className="text-left px-2 py-1 font-medium">Due date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {taskReport.overdueTasks.map((t) => (
                                  <tr key={t.id} className="border-t border-border/40">
                                    <td className="px-2 py-1 max-w-[220px] truncate">{t.title}</td>
                                    <td className="px-2 py-1">{t.assignee ?? "-"}</td>
                                    <td className="px-2 py-1">{t.team ?? "-"}</td>
                                    <td className="px-2 py-1">{t.priority}</td>
                                    <td className="px-2 py-1">
                                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <EmptyState message="ยังไม่มีข้อมูลงานสำหรับช่วงเวลานี้ หรือยังไม่ได้เลือกทีม" />
                  )}
                </TabsContent>

                {/* Performance */}
                <TabsContent value="performance" className="mt-0 flex-1 flex flex-col">
                  {performance ? (
                    <div className="space-y-4">
                      <Card className="border-border/50 bg-card/70">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            Task completion rate
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs overflow-x-auto">
                          <table className="w-full border-collapse text-[11px]">
                            <thead className="bg-muted/60">
                              <tr>
                                <th className="text-left px-2 py-1 font-medium">ชื่อ</th>
                                <th className="text-right px-2 py-1 font-medium">งานทั้งหมด</th>
                                <th className="text-right px-2 py-1 font-medium">เสร็จแล้ว</th>
                                <th className="text-right px-2 py-1 font-medium">Completion rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {performance.taskCompletionRates.map((r) => (
                                <tr key={r.userId} className="border-t border-border/40">
                                  <td className="px-2 py-1">{r.userName}</td>
                                  <td className="px-2 py-1 text-right">{r.totalTasks}</td>
                                  <td className="px-2 py-1 text-right">{r.completedTasks}</td>
                                  <td className="px-2 py-1 text-right">
                                    {r.completionRate.toFixed(1)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50 bg-card/70">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            Collaboration Activity
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs overflow-x-auto">
                          <table className="w-full border-collapse text-[11px]">
                            <thead className="bg-muted/60">
                              <tr>
                                <th className="text-left px-2 py-1 font-medium">ชื่อ</th>
                                <th className="text-right px-2 py-1 font-medium">งานที่เสร็จ</th>
                                <th className="text-right px-2 py-1 font-medium">ประชุมที่เข้าร่วม</th>
                                <th className="text-right px-2 py-1 font-medium">ข้อความแชท</th>
                                <th className="text-right px-2 py-1 font-medium">รวมการมีส่วนร่วม</th>
                              </tr>
                            </thead>
                            <tbody>
                              {performance.collaborationActivity.map((w) => (
                                <tr key={w.userId} className="border-t border-border/40">
                                  <td className="px-2 py-1">{w.userName}</td>
                                  <td className="px-2 py-1 text-right">{w.completedTasks}</td>
                                  <td className="px-2 py-1 text-right">{w.attendedMeetings}</td>
                                  <td className="px-2 py-1 text-right">{w.messagesSent}</td>
                                  <td className="px-2 py-1 text-right font-semibold">
                                    {w.totalInteractions}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <EmptyState message="ยังไม่มีข้อมูล performance สำหรับช่วงเวลานี้" />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>

      {/* Hidden print layout for PDF export (document-style) */}
      <div
        ref={printRef}
        className="fixed top-0 left-[-9999px] bg-white text-black p-10"
        style={{ width: "1123px" }}
      >
        {activeTab === "performance" && performance && (
          <div className="space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Team Connect – Performance Dashboard
                </h1>
                <p className="text-sm text-slate-700 mt-1">
                  Period: {pdfPeriodLabel}
                  {selectedTeam ? ` · Team: ${selectedTeam.name}` : ""}
                </p>
              </div>
              <div className="text-xs text-slate-500 text-right">
                <div>Generated at</div>
                <div>{new Date().toLocaleString()}</div>
              </div>
            </div>

            {/* Task completion rate */}
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Task completion rate
              </h2>
              <table className="w-full border border-slate-300 border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 text-left font-semibold border-b border-slate-300">
                      ชื่อ
                    </th>
                    <th className="px-3 py-2 text-right font-semibold border-b border-slate-300">
                      งานทั้งหมด
                    </th>
                    <th className="px-3 py-2 text-right font-semibold border-b border-slate-300">
                      เสร็จแล้ว
                    </th>
                    <th className="px-3 py-2 text-right font-semibold border-b border-slate-300">
                      Completion rate (%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {performance.taskCompletionRates.map((r, idx) => (
                    <tr
                      key={r.userId}
                      className={idx % 2 === 1 ? "bg-slate-50" : undefined}
                    >
                      <td className="px-3 py-2 border-t border-slate-200">
                        {r.userName}
                      </td>
                      <td className="px-3 py-2 text-right border-t border-slate-200">
                        {r.totalTasks}
                      </td>
                      <td className="px-3 py-2 text-right border-t border-slate-200">
                        {r.completedTasks}
                      </td>
                      <td className="px-3 py-2 text-right border-t border-slate-200">
                        {r.completionRate.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Collaboration Activity */}
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Collaboration Activity
              </h2>
              <table className="w-full border border-slate-300 border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 text-left font-semibold border-b border-slate-300">
                      ชื่อ
                    </th>
                    <th className="px-3 py-2 text-right font-semibold border-b border-slate-300">
                      งานที่เสร็จ
                    </th>
                    <th className="px-3 py-2 text-right font-semibold border-b border-slate-300">
                      ประชุมที่เข้าร่วม
                    </th>
                    <th className="px-3 py-2 text-right font-semibold border-b border-slate-300">
                      ข้อความแชท
                    </th>
                    <th className="px-3 py-2 text-right font-semibold border-b border-slate-300">
                      รวมการมีส่วนร่วม
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {performance.collaborationActivity.map((w, idx) => (
                    <tr
                      key={w.userId}
                      className={idx % 2 === 1 ? "bg-slate-50" : undefined}
                    >
                      <td className="px-3 py-2 border-t border-slate-200">
                        {w.userName}
                      </td>
                      <td className="px-3 py-2 text-right border-t border-slate-200">
                        {w.completedTasks}
                      </td>
                      <td className="px-3 py-2 text-right border-t border-slate-200">
                        {w.attendedMeetings}
                      </td>
                      <td className="px-3 py-2 text-right border-t border-slate-200">
                        {w.messagesSent}
                      </td>
                      <td className="px-3 py-2 text-right font-bold border-t border-slate-200">
                        {w.totalInteractions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

interface SummaryCardProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  value: string | number;
  suffix?: string;
}

function SummaryCard({ title, icon: Icon, iconColor, bgColor, value, suffix }: SummaryCardProps) {
  return (
    <Card className="border-border/50 bg-card/70 hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", bgColor)}>
            <Icon className={cn("w-4.5 h-4.5", iconColor)} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1 flex items-baseline gap-1">
          <span>{value}</span>
          {suffix && <span className="text-xs text-muted-foreground font-normal">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductivityCard({ score }: { score: number }) {
  return (
    <Card
      className={cn(
        "border-border/50 bg-card/70 hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        "bg-gradient-to-br from-background via-background to-primary/5"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">คะแนนประสิทธิภาพ</CardTitle>
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br",
              getProductivityGradient(score)
            )}
          >
            <TrendingUp className="w-4.5 h-4.5 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold mb-2", getProductivityColor(score))}>
          {Math.round(score)}%
        </div>
        <Progress value={score} className="h-2" />
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2">
          <Activity className="w-3 h-3" />
          <span>ยิ่งเข้าใกล้ 100% แสดงว่าทำงานได้คุ้มค่าต่อชั่วโมงมากขึ้น</span>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-border/50 bg-card/70 flex-1">
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
