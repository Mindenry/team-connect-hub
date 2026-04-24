import { apiGet, apiFetch } from "./api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DateRangeKey = "week" | "month" | "quarter" | "year";
export type ExportFormat = "csv" | "json" | "xlsx" | "pdf";
export type ReportType = "overview" | "personal" | "team" | "performance";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PersonalReportData {
  tasksCompleted: number;
  tasksTotal: number;
  meetingsAttended: number;
  messagesSent: number;
  productivityScore: number;
  taskCompletionRate: number;
  avgTaskCompletionTime?: number;
  activeDays?: number;
  productivityBreakdown?: {
    adjustedTaskPerformance: number;
    meaningfulEngagement: number;
    communicationEffectiveness: number;
    workConsistency: number;
    difficultyFactor: number;
    activeDays: number;
    periodDays: number;
    weights: {
      adjustedTaskPerformance: number;
      meaningfulEngagement: number;
      communicationEffectiveness: number;
      workConsistency: number;
    };
    antiGamingApplied: boolean;
    methodology: string;
  };
  teamMetrics: {
    teamId: string;
    teamName: string;
    tasksCompleted: number;
    meetingsAttended: number;
    messagesSent: number;
  }[];
  weeklyTrend?: {
    week: string;
    tasks: number;
    meetings: number;
    messages: number;
  }[];
}

export interface TeamProductivityReport {
  period: { start: string; end: string };
  team: { id: string; name: string };
  summary: {
    members: number;
    tasks: {
      total: number;
      completed: number;
      inProgress: number;
      todo: number;
      overdue: number;
      byStatus: Record<string, number>;
      byPriority: Record<string, number>;
    };
    meetings: {
      total: number;
      completed: number;
      scheduled: number;
      totalDuration: number;
      avgDuration: number;
    };
    messages: {
      total: number;
      channels: number;
    };
  };
  members: {
    user: { id: string; name: string; email: string; avatar?: string };
    tasks: {
      total: number;
      completed: number;
      inProgress: number;
      todo: number;
    };
    messagesSent: number;
    meetingsAttended: number;
    productivityScore: number;
  }[];
  taskTrend?: {
    date: string;
    completed: number;
    created: number;
  }[];
}

// MeetingReport and TaskReport removed - not in scope 6.1-6.4

export interface TeamWorkloadReport {
  team: { id: string; name: string };
  workload: {
    userId: string;
    userName: string;
    userEmail: string;
    userAvatar?: string;
    totalTasks: number;
    completed: number;
    inProgress: number;
    todo: number;
    overdue: number;
    workloadPercentage: number;
  }[];
  summary: {
    avgWorkload: number;
    maxWorkload: number;
    minWorkload: number;
    totalOverdue: number;
  };
}

export interface PerformanceDashboard {
  period: { startDate: string; endDate: string };
  summary: {
    avgTaskCompletionRate: number;
    avgMeetingAttendanceRate: number;
    totalInteractions: number;
    topPerformer?: {
      userId: string;
      userName: string;
      score: number;
    };
  };
  taskCompletionRates: {
    userId: string;
    userName: string;
    userAvatar?: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    trend?: "up" | "down" | "stable";
  }[];
  meetingAttendanceRates: {
    userId: string;
    userName: string;
    userAvatar?: string;
    totalMeetings: number;
    attendedMeetings: number;
    attendanceRate: number;
    trend?: "up" | "down" | "stable";
  }[];
  collaborationActivity: {
    userId: string;
    userName: string;
    userAvatar?: string;
    completedTasks: number;
    attendedMeetings: number;
    messagesSent: number;
    totalInteractions: number;
    activityScore: number;
  }[];
  trend?: {
    date: string;
    completionRate: number;
    attendanceRate: number;
    activityScore: number;
  }[];
}

// OverviewDashboard removed - not used in scope 6.1-6.4

export interface TeamOption {
  id: string;
  name: string;
  memberCount?: number;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

export function getDateRange(range: DateRangeKey): DateRange {
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

export function getDateRangeLabel(range: DateRangeKey): string {
  const labels: Record<DateRangeKey, string> = {
    week: "สัปดาห์ที่ผ่านมา",
    month: "เดือนที่ผ่านมา",
    quarter: "ไตรมาสที่ผ่านมา",
    year: "ปีที่ผ่านมา",
  };
  return labels[range];
}

export function toIsoDate(date: Date): string {
  return date.toISOString();
}

export function formatDateForApi(date: Date): string {
  return encodeURIComponent(toIsoDate(date));
}

// ─── API Functions ───────────────────────────────────────────────────────────

export const reportsApi = {
  async getTeams(): Promise<TeamOption[]> {
    const teams = await apiGet<any[]>("/teams").catch(() => []);
    return (teams || []).map((t) => ({
      id: t.id,
      name: t.name,
      memberCount: t.members?.length || t.memberCount || 0,
    }));
  },

  async getPersonalReport(
    range: DateRangeKey,
  ): Promise<PersonalReportData | null> {
    return apiGet<PersonalReportData>(`/reports?range=${range}`).catch(
      () => null,
    );
  },

  // getOverviewDashboard removed - not in scope 6.1-6.4

  // getTaskReport removed - not in scope 6.1-6.4

  // getMeetingReport removed - not in scope 6.1-6.4

  async getTeamProductivityReport(
    teamId: string,
    dateRange: DateRange,
  ): Promise<TeamProductivityReport | null> {
    const { start, end } = dateRange;
    const params = new URLSearchParams({
      teamId,
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
    });
    return apiGet<TeamProductivityReport>(
      `/reports/team-productivity?${params}`,
    ).catch(() => null);
  },

  async getTeamWorkload(
    teamId: string,
    dateRange: DateRange,
  ): Promise<TeamWorkloadReport | null> {
    const { start, end } = dateRange;
    const params = new URLSearchParams({
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
    });
    return apiGet<TeamWorkloadReport>(
      `/reports/teams/${teamId}/workload?${params}`,
    ).catch(() => null);
  },

  async getPerformanceDashboard(
    dateRange: DateRange,
    teamId?: string,
  ): Promise<PerformanceDashboard | null> {
    const { start, end } = dateRange;
    const params = new URLSearchParams({
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
    });
    if (teamId) params.append("teamId", teamId);
    return apiGet<PerformanceDashboard>(`/reports/performance?${params}`).catch(
      () => null,
    );
  },

  async exportReport(
    type: ReportType,
    format: ExportFormat,
    options: { dateRange: DateRange; teamId?: string; range?: DateRangeKey },
  ): Promise<Blob> {
    const { start, end } = options.dateRange;
    const params = new URLSearchParams({
      type,
      format,
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
    });
    if (options.teamId) params.append("teamId", options.teamId);
    if (options.range) params.append("range", options.range);

    const res = await apiFetch(`/reports/export?${params}`);
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  },
};

// ─── Export Utilities ────────────────────────────────────────────────────────

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Design Tokens ───────────────────────────────────────────────────────────

const BRAND = {
  // Primary palette
  navy: [15, 23, 42] as [number, number, number], // #0F172A — headings, text
  blue: [37, 99, 235] as [number, number, number], // #2563EB — primary accent
  blueLight: [96, 165, 250] as [number, number, number], // #60A5FA — secondary accent
  bluePale: [219, 234, 254] as [number, number, number], // #DBEAFE — tint backgrounds

  // Status colours
  green: [16, 185, 129] as [number, number, number], // #10B981
  greenPale: [209, 250, 229] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number], // #F59E0B
  amberPale: [254, 243, 199] as [number, number, number],
  red: [239, 68, 68] as [number, number, number], // #EF4444
  redPale: [254, 226, 226] as [number, number, number],
  purple: [139, 92, 246] as [number, number, number], // #8B5CF6

  // Neutrals
  slate900: [15, 23, 42] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate300: [203, 213, 225] as [number, number, number],
  slate100: [241, 245, 249] as [number, number, number],
  slate50: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

// ─── PDF Layout Helpers ───────────────────────────────────────────────────────

interface PdfContext {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  margin: number;
  contentW: number;
  y: number;
}

function newPage(ctx: PdfContext): void {
  ctx.doc.addPage();
  ctx.y = ctx.margin;
  drawPageBackground(ctx);
}

function ensureSpace(ctx: PdfContext, needed: number): void {
  if (ctx.y + needed > ctx.pageH - ctx.margin - 20) newPage(ctx);
}

function drawPageBackground(ctx: PdfContext): void {
  const { doc, pageW, pageH } = ctx;
  // Subtle left accent strip
  doc.setFillColor(...BRAND.blue);
  doc.rect(0, 0, 3, pageH, "F");
  // Very light page tint
  doc.setFillColor(250, 251, 255);
  doc.rect(3, 0, pageW - 3, pageH, "F");
}

function drawSectionHeading(
  ctx: PdfContext,
  title: string,
  icon?: string,
): void {
  ensureSpace(ctx, 18);
  const { doc, margin, contentW, y } = ctx;

  // Pill background
  doc.setFillColor(...BRAND.bluePale);
  doc.roundedRect(margin, y, contentW, 10, 2, 2, "F");

  // Left accent bar on pill
  doc.setFillColor(...BRAND.blue);
  doc.roundedRect(margin, y, 3, 10, 1, 1, "F");

  // Title text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.blue);
  doc.text(
    (icon ? icon + "  " : "") + title.toUpperCase(),
    margin + 8,
    y + 6.8,
  );

  ctx.y += 14;
}

function drawKpiRow(
  ctx: PdfContext,
  kpis: {
    label: string;
    value: string | number;
    sub?: string;
    color?: [number, number, number];
    paleColor?: [number, number, number];
  }[],
): void {
  ensureSpace(ctx, 30);
  const { doc, margin, contentW, y } = ctx;
  const count = kpis.length;
  const cardW = (contentW - (count - 1) * 4) / count;

  kpis.forEach((kpi, i) => {
    const x = margin + i * (cardW + 4);
    const accent = kpi.color || BRAND.blue;
    const pale = kpi.paleColor || BRAND.bluePale;

    // Card shadow (fake — shifted rect)
    doc.setFillColor(200, 210, 230);
    doc.roundedRect(x + 0.8, y + 0.8, cardW, 26, 3, 3, "F");

    // Card body
    doc.setFillColor(...BRAND.white);
    doc.roundedRect(x, y, cardW, 26, 3, 3, "F");

    // Top colour strip
    doc.setFillColor(...accent);
    doc.roundedRect(x, y, cardW, 4, 3, 3, "F");
    doc.rect(x, y + 2, cardW, 2, "F"); // flatten bottom of strip

    // Dot
    doc.setFillColor(...pale);
    doc.circle(x + cardW - 9, y + 13, 5, "F");
    doc.setFillColor(...accent);
    doc.circle(x + cardW - 9, y + 13, 2.5, "F");

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...BRAND.navy);
    doc.text(String(kpi.value), x + 5, y + 16);

    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.slate500);
    doc.text(kpi.label, x + 5, y + 22);

    // Sub text
    if (kpi.sub) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(...BRAND.slate500);
      doc.text(kpi.sub, x + 5, y + 26.5);
    }
  });

  ctx.y += 32;
}

function drawHorizontalBar(
  ctx: PdfContext,
  label: string,
  value: number, // 0–100
  displayValue: string,
  color: [number, number, number],
  weight?: string,
): void {
  ensureSpace(ctx, 14);
  const { doc, margin, contentW, y } = ctx;
  const trackW = contentW - 48;

  // Label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.slate700);
  doc.text(label, margin, y + 4);

  // Weight badge
  if (weight) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...color);
    doc.text(weight, margin + trackW + 4 + 12, y + 4, { align: "right" });
  }

  // Track background
  doc.setFillColor(...BRAND.slate100);
  doc.roundedRect(margin, y + 6, trackW, 5, 2, 2, "F");

  // Filled bar
  const fillW = Math.max(0, (value / 100) * trackW);
  if (fillW > 0) {
    doc.setFillColor(...color);
    doc.roundedRect(margin, y + 6, fillW, 5, 2, 2, "F");
  }

  // Score label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.navy);
  doc.text(displayValue, margin + trackW + 4, y + 10.5);

  ctx.y += 14;
}

function drawDivider(ctx: PdfContext, spaceAbove = 4, spaceBelow = 4): void {
  ctx.y += spaceAbove;
  ctx.doc.setDrawColor(...BRAND.slate300);
  ctx.doc.setLineWidth(0.2);
  ctx.doc.line(ctx.margin, ctx.y, ctx.margin + ctx.contentW, ctx.y);
  ctx.y += spaceBelow;
}

function drawStatusBadge(doc: jsPDF, text: string, x: number, y: number): void {
  const t = text.toLowerCase();
  const color: [number, number, number] = t.includes("complet")
    ? BRAND.green
    : t.includes("progress")
      ? BRAND.blue
      : t.includes("overdue") || t.includes("cancel")
        ? BRAND.red
        : t.includes("todo") || t.includes("pending")
          ? BRAND.amber
          : BRAND.slate500;

  const pale: [number, number, number] = t.includes("complet")
    ? BRAND.greenPale
    : t.includes("progress")
      ? BRAND.bluePale
      : t.includes("overdue") || t.includes("cancel")
        ? BRAND.redPale
        : t.includes("todo") || t.includes("pending")
          ? BRAND.amberPale
          : BRAND.slate100;

  doc.setFillColor(...pale);
  doc.roundedRect(x - 1, y - 3.5, 20, 5, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...color);
  doc.text(text.charAt(0).toUpperCase() + text.slice(1), x, y, {
    align: "left",
  });
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

function drawCoverPage(
  ctx: PdfContext,
  opts: { title: string; subtitle: string; period: string; reportType: string },
): void {
  const { doc, pageW, pageH } = ctx;

  // Full navy background
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, pageW, pageH, "F");

  // Geometric accent shapes
  doc.setFillColor(37, 99, 235, 0.25); // translucent blue
  doc.setFillColor(30, 58, 138);
  doc.ellipse(pageW - 20, 30, 55, 55, "F");
  doc.setFillColor(23, 37, 84);
  doc.ellipse(pageW - 5, 50, 35, 35, "F");
  doc.setFillColor(30, 58, 138);
  doc.ellipse(20, pageH - 30, 40, 40, "F");
  doc.setFillColor(23, 37, 84);
  doc.ellipse(5, pageH - 10, 22, 22, "F");

  // Thin horizontal rule at 45%
  const ruleY = pageH * 0.45;
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.4);
  doc.line(14, ruleY, pageW - 14, ruleY);

  // Brand mark — left coloured bar + wordmark
  doc.setFillColor(...BRAND.blue);
  doc.rect(14, 24, 4, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BRAND.white);
  doc.text("Team Connect", 22, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.blueLight);
  doc.text("Productivity & Analytics Platform", 22, 46);

  // Report type badge
  doc.setFillColor(...BRAND.blue);
  doc.roundedRect(14, ruleY + 14, 42, 8, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.white);
  doc.text(opts.reportType.toUpperCase() + " REPORT", 35, ruleY + 19.5, {
    align: "center",
  });

  // Main title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...BRAND.white);
  const titleLines = doc.splitTextToSize(opts.title, pageW - 28) as string[];
  let titleY = ruleY + 30;
  titleLines.forEach((line: string) => {
    doc.text(line, 14, titleY);
    titleY += 11;
  });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.blueLight);
  doc.text(opts.subtitle, 14, titleY + 4);

  // Period pill
  titleY += 18;
  doc.setFillColor(255, 255, 255, 0.12);
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(14, titleY, 80, 10, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.blueLight);
  doc.text("Reporting Period:", 18, titleY + 6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.white);
  doc.text(opts.period, 50, titleY + 6.5);

  // Generation timestamp (bottom)
  const now = new Date();
  const genStr = `Generated on ${now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} at ${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.slate500);
  doc.text(genStr, pageW - 14, pageH - 12, { align: "right" });
  doc.text("CONFIDENTIAL — FOR INTERNAL USE ONLY", 14, pageH - 12);
}

// ─── Header/Footer ────────────────────────────────────────────────────────────

function drawHeader(ctx: PdfContext, reportTitle: string): void {
  const { doc, pageW, margin } = ctx;

  // Left strip (already drawn in background, but reinforce)
  doc.setFillColor(...BRAND.blue);
  doc.rect(0, 0, 3, 18, "F");

  // White header bar
  doc.setFillColor(...BRAND.white);
  doc.rect(3, 0, pageW - 3, 18, "F");

  // Brand name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.blue);
  doc.text("Team Connect", margin, 11);

  // Report title (centre)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.slate500);
  doc.text(reportTitle, pageW / 2, 11, { align: "center" });

  // Thin underline
  doc.setDrawColor(...BRAND.slate300);
  doc.setLineWidth(0.3);
  doc.line(margin, 18, pageW - margin, 18);
}

function drawFooters(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  margin: number,
): void {
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    // skip cover (page 1)
    doc.setPage(i);

    doc.setDrawColor(...BRAND.slate300);
    doc.setLineWidth(0.2);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.slate500);
    doc.text(
      "Team Connect  •  Confidential — Internal Use Only",
      margin,
      pageH - 8,
    );
    doc.text(`Page ${i - 1} of ${total - 1}`, pageW - margin, pageH - 8, {
      align: "right",
    });
  }
}

// ─── exportUtils ─────────────────────────────────────────────────────────────

// Helper to flatten value for CSV
function flattenValue(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (Array.isArray(v)) {
      return v
        .map((item) =>
          typeof item === "object" ? JSON.stringify(item) : String(item),
        )
        .join("; ");
    }
    return JSON.stringify(v);
  }
  return String(v);
}

export const exportUtils = {
  // ── CSV ──────────────────────────────────────────────────────────────────
  toCSV(data: Record<string, any>[], filename: string): void {
    if (!data.length) return;

    // Group data by category for better structure
    const grouped = new Map<string, Record<string, any>[]>();
    data.forEach((row) => {
      const cat = row.category || "Data";
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(row);
    });

    const lines: string[] = [];

    // Add header
    lines.push(`# Team Connect Report Export`);
    lines.push(`# Generated: ${new Date().toLocaleString("en-GB")}`);
    lines.push(`# Total Records: ${data.length}`);
    lines.push("");

    // Process each category group
    grouped.forEach((rows, category) => {
      // Category header
      lines.push(`### ${category.toUpperCase()} ###`);

      // Get headers for this group (exclude 'category' from display)
      const headers = Array.from(
        new Set(
          rows.flatMap((r) => Object.keys(r).filter((k) => k !== "category")),
        ),
      );

      // Header row
      lines.push(headers.map((h) => `"${formatHeader(h)}"`).join(","));

      // Data rows
      rows.forEach((row) => {
        const values = headers.map((h) => {
          const v = row[h];
          const s = flattenValue(v);
          return s.includes(",") ||
            s.includes('"') ||
            s.includes("\n") ||
            s.includes(";")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        });
        lines.push(values.join(","));
      });

      lines.push(""); // Empty line between categories
    });

    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    downloadBlob(blob, `${filename}.csv`);
  },

  // ── Excel (single sheet) ─────────────────────────────────────────────────
  toExcel(
    data: Record<string, any>[],
    filename: string,
    sheetName = "Report",
  ): void {
    if (!data.length) return;

    const wb = XLSX.utils.book_new();

    // Group data by category for better structure
    const grouped = new Map<string, Record<string, any>[]>();
    data.forEach((row) => {
      const cat = row.category || "Data";
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(row);
    });

    // Build sheet data with section headers
    const sheetData: any[][] = [];

    // Title row
    sheetData.push(["Team Connect Report Export"]);
    sheetData.push([`Generated: ${new Date().toLocaleString("en-GB")}`]);
    sheetData.push([`Total Records: ${data.length}`]);
    sheetData.push([]); // Empty row

    // Process each category
    grouped.forEach((rows, category) => {
      // Category header row (will be styled differently)
      sheetData.push([`=== ${category.toUpperCase()} ===`]);

      // Get headers for this group
      const headers = Array.from(
        new Set(
          rows.flatMap((r) => Object.keys(r).filter((k) => k !== "category")),
        ),
      );

      // Header row with formatted names
      sheetData.push(headers.map((h) => formatHeader(h)));

      // Data rows
      rows.forEach((row) => {
        const values = headers.map((h) => {
          const v = row[h];
          if (v === null || v === undefined) return "";
          if (typeof v === "object") {
            if (Array.isArray(v)) return v.join("; ");
            return JSON.stringify(v);
          }
          return v;
        });
        sheetData.push(values);
      });

      sheetData.push([]); // Empty row between sections
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths based on content
    const colWidths: number[] = [];
    sheetData.forEach((row) => {
      row.forEach((cell: any, colIdx: number) => {
        const len = String(cell ?? "").length;
        colWidths[colIdx] = Math.max(
          colWidths[colIdx] || 10,
          Math.min(50, len + 2),
        );
      });
    });
    ws["!cols"] = colWidths.map((w) => ({ wch: w }));

    // Add metadata for Excel to recognize it as a formatted table
    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: {
        r: sheetData.length - 1,
        c: Math.max(...colWidths.map((_, i) => i)),
      },
    });

    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    XLSX.writeFile(wb, `${filename}.xlsx`);
  },

  // ── JSON ─────────────────────────────────────────────────────────────────
  toJSON(data: any, filename: string): void {
    const payload = {
      meta: {
        exportedAt: new Date().toISOString(),
        generator: "Team Connect Report Export",
        version: "2.0",
        filename,
      },
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, `${filename}.json`);
  },

  // ── Excel Multi-sheet ────────────────────────────────────────────────────
  toExcelMultiSheet(
    sheets: { name: string; data: Record<string, any>[] }[],
    filename: string,
  ): void {
    const wb = XLSX.utils.book_new();

    sheets.forEach(({ name, data }) => {
      if (!data.length) return;

      // Group data by category
      const grouped = new Map<string, Record<string, any>[]>();
      data.forEach((row) => {
        const cat = row.category || "Data";
        if (!grouped.has(cat)) grouped.set(cat, []);
        grouped.get(cat)!.push(row);
      });

      const sheetData: any[][] = [];

      // Title
      sheetData.push([`${name} - Team Connect`]);
      sheetData.push([`Generated: ${new Date().toLocaleString("en-GB")}`]);
      sheetData.push([]);

      grouped.forEach((rows, category) => {
        sheetData.push([`=== ${category.toUpperCase()} ===`]);
        const headers = Array.from(
          new Set(
            rows.flatMap((r) => Object.keys(r).filter((k) => k !== "category")),
          ),
        );
        sheetData.push(headers.map((h) => formatHeader(h)));

        rows.forEach((row) => {
          const values = headers.map((h) => {
            const v = row[h];
            if (v === null || v === undefined) return "";
            if (typeof v === "object") {
              if (Array.isArray(v)) return v.join("; ");
              return JSON.stringify(v);
            }
            return v;
          });
          sheetData.push(values);
        });
        sheetData.push([]);
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      const colWidths: number[] = [];
      sheetData.forEach((row) => {
        row.forEach((cell: any, colIdx: number) => {
          const len = String(cell ?? "").length;
          colWidths[colIdx] = Math.max(
            colWidths[colIdx] || 10,
            Math.min(50, len + 2),
          );
        });
      });
      ws["!cols"] = colWidths.map((w) => ({ wch: w }));

      XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
    });

    XLSX.writeFile(wb, `${filename}.xlsx`);
  },

  // ── PDF ──────────────────────────────────────────────────────────────────
  toPDF(
    data: Record<string, any>[],
    filename: string,
    options: {
      title?: string;
      subtitle?: string;
      columns?: { header: string; dataKey: string }[];
      orientation?: "portrait" | "landscape";
      reportType?: ReportType;
      reportData?: PersonalReportData;
      period?: string;
    } = {},
  ): void {
    const doc = new jsPDF({
      orientation: options.orientation || "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;

    const ctx: PdfContext = {
      doc,
      pageW,
      pageH,
      margin,
      contentW: pageW - margin * 2,
      y: margin,
    };

    // ── Page 1: Cover ──────────────────────────────────────────────────────

    const now = new Date();
    const periodLabel =
      options.period ||
      options.subtitle ||
      now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const reportTypeName =
      options.reportType === "personal"
        ? "Personal Productivity"
        : options.reportType === "team"
          ? "Team Productivity"
          : options.reportType === "performance"
            ? "Performance Analytics"
            : "Overview";

    drawCoverPage(ctx, {
      title: options.title || "Productivity Report",
      subtitle: options.subtitle || "Detailed Analytics & Insights",
      period: periodLabel,
      reportType: reportTypeName,
    });

    // ── Page 2: Summary ────────────────────────────────────────────────────

    doc.addPage();
    drawPageBackground(ctx);
    drawHeader(ctx, options.title || "Productivity Report");
    ctx.y = 26;

    // ── KPI cards ─────────────────────────────────────────────────────────

    const rd = options.reportData;
    const summaryRow = data.find(
      (d) => d.category === "Summary" || d.category === "Personal Report",
    );

    if (rd || summaryRow) {
      drawSectionHeading(ctx, "Key Performance Indicators");

      drawKpiRow(ctx, [
        {
          label: "Tasks Completed",
          value:
            rd?.tasksCompleted ??
            summaryRow?.completed ??
            summaryRow?.completedTasks ??
            0,
          sub: `Rate: ${rd?.taskCompletionRate ?? 0}%`,
          color: BRAND.green,
          paleColor: BRAND.greenPale,
        },
        {
          label: "Meetings Attended",
          value: rd?.meetingsAttended ?? summaryRow?.meetingsAttended ?? 0,
          color: BRAND.blue,
          paleColor: BRAND.bluePale,
        },
        {
          label: "Messages Sent",
          value: rd?.messagesSent ?? summaryRow?.messagesSent ?? 0,
          color: BRAND.purple,
          paleColor: [237, 233, 254] as [number, number, number],
        },
        {
          label: "Productivity Score",
          value: `${rd?.productivityScore ?? summaryRow?.productivityScore ?? 0}%`,
          sub: rd?.activeDays ? `${rd.activeDays} active days` : undefined,
          color: BRAND.amber,
          paleColor: BRAND.amberPale,
        },
      ]);
    }

    // ── Productivity Breakdown ────────────────────────────────────────────

    if (rd?.productivityBreakdown) {
      const bd = rd.productivityBreakdown;
      drawSectionHeading(ctx, "Performance Breakdown");

      // Methodology note
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...BRAND.slate500);
      doc.text(
        "Methodology: Balanced Scorecard (Kaplan & Norton, 1996) with Task Difficulty Adjustment",
        margin,
        ctx.y,
      );
      ctx.y += 7;

      drawHorizontalBar(
        ctx,
        "Adjusted Task Performance",
        bd.adjustedTaskPerformance,
        `${bd.adjustedTaskPerformance}%`,
        BRAND.green,
        `${bd.weights?.adjustedTaskPerformance ?? 45}% weight`,
      );
      drawHorizontalBar(
        ctx,
        "Meaningful Engagement",
        bd.meaningfulEngagement,
        `${bd.meaningfulEngagement}%`,
        BRAND.blue,
        `${bd.weights?.meaningfulEngagement ?? 20}% weight`,
      );
      drawHorizontalBar(
        ctx,
        "Communication Effectiveness",
        bd.communicationEffectiveness,
        `${bd.communicationEffectiveness}%`,
        BRAND.purple,
        `${bd.weights?.communicationEffectiveness ?? 20}% weight`,
      );
      drawHorizontalBar(
        ctx,
        "Work Consistency",
        bd.workConsistency,
        `${bd.workConsistency}%`,
        BRAND.amber,
        `${bd.weights?.workConsistency ?? 15}% weight`,
      );

      ctx.y += 4;

      // Meta row
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...BRAND.slate500);
      doc.text(
        `Active Days: ${bd.activeDays} / ${bd.periodDays}   •   Difficulty Factor: ×${bd.difficultyFactor}`,
        margin,
        ctx.y,
      );
      ctx.y += 8;

      if (bd.antiGamingApplied) {
        doc.setFillColor(...BRAND.amberPale);
        doc.roundedRect(margin, ctx.y, ctx.contentW, 9, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...BRAND.amber);
        doc.text(
          "⚠  Anti-Gaming Rule Applied: Score capped at 50% due to low task completion rate",
          margin + 4,
          ctx.y + 5.5,
        );
        ctx.y += 14;
      }
    }

    // ── Team Contributions ────────────────────────────────────────────────

    const teamMetrics =
      rd?.teamMetrics || data.filter((d) => d.category === "Team");
    if (teamMetrics && teamMetrics.length > 0) {
      drawDivider(ctx);
      drawSectionHeading(ctx, "Team Contributions");

      teamMetrics.forEach((t: any, i: number) => {
        ensureSpace(ctx, 20);
        const { y } = ctx;

        // Alternating row tint
        if (i % 2 === 0) {
          doc.setFillColor(...BRAND.slate50);
          doc.roundedRect(margin, y, ctx.contentW, 15, 2, 2, "F");
        }

        // Team name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...BRAND.navy);
        doc.text(t.teamName || `Team ${i + 1}`, margin + 4, y + 6);

        // Stats inline
        const stats = [
          { label: "Tasks", val: t.tasksCompleted ?? t.tasks ?? 0 },
          { label: "Meetings", val: t.meetingsAttended ?? t.meetings ?? 0 },
          { label: "Messages", val: t.messagesSent ?? t.messages ?? 0 },
        ];
        stats.forEach((s, si) => {
          const sx = margin + 60 + si * 42;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(...BRAND.navy);
          doc.text(String(s.val), sx, y + 6);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(...BRAND.slate500);
          doc.text(s.label, sx, y + 12);
        });

        ctx.y += 17;
      });
    }

    // ── Detailed Data Table ───────────────────────────────────────────────

    const tableData = data.filter(
      (d) =>
        d.category !== "Summary" &&
        d.category !== "Personal Report" &&
        d.category !== "Team",
    );

    if (tableData.length > 0) {
      ensureSpace(ctx, 20);
      drawDivider(ctx);
      drawSectionHeading(ctx, "Detailed Data");

      const columns =
        options.columns ||
        Object.keys(tableData[0]).map((k) => ({
          header: formatHeader(k),
          dataKey: k,
        }));

      // Category column gets a badge; status column gets coloured text
      const statusColIdx = columns.findIndex((c) =>
        c.dataKey.toLowerCase().includes("status"),
      );
      const catColIdx = columns.findIndex(
        (c) => c.dataKey.toLowerCase() === "category",
      );

      autoTable(doc, {
        head: [columns.map((c) => c.header)],
        body: tableData.map((row) =>
          columns.map((c) => String(row[c.dataKey] ?? "")),
        ),
        startY: ctx.y,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
          font: "helvetica",
          lineColor: BRAND.slate300,
          lineWidth: 0.1,
          valign: "middle",
        },
        headStyles: {
          fillColor: BRAND.navy,
          textColor: BRAND.white,
          fontStyle: "bold",
          fontSize: 7.5,
          halign: "left",
          cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        },
        alternateRowStyles: {
          fillColor: BRAND.slate50,
        },
        columnStyles: {
          ...(catColIdx >= 0
            ? {
                [catColIdx]: {
                  fontStyle: "bold",
                  textColor: BRAND.blue,
                  cellWidth: 32,
                },
              }
            : {}),
          ...(statusColIdx >= 0
            ? {
                [statusColIdx]: { fontStyle: "bold" },
              }
            : {}),
        },
        didDrawCell: (hookData) => {
          // Colour status cells
          if (
            statusColIdx >= 0 &&
            hookData.column.index === statusColIdx &&
            hookData.section === "body"
          ) {
            const raw = String(
              tableData[hookData.row.index]?.[columns[statusColIdx].dataKey] ??
                "",
            );
            drawStatusBadge(
              doc,
              raw,
              hookData.cell.x + 4,
              hookData.cell.y + hookData.cell.height / 2 + 1.5,
            );
          }
        },
        tableLineColor: BRAND.slate300,
        tableLineWidth: 0.15,
      });

      ctx.y = (doc as any).lastAutoTable?.finalY + 6 || ctx.y + 30;
    }

    // ── Footers on all content pages ──────────────────────────────────────
    drawFooters(doc, pageW, pageH, margin);

    doc.save(`${filename}.pdf`);
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function formatHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ─── Data Transformation Utilities ──────────────────────────────────────────

export const reportTransformers = {
  // taskReportToRows removed - not in scope 6.1-6.4
  // meetingReportToRows removed - not in scope 6.1-6.4

  teamProductivityToRows(
    report: TeamProductivityReport,
  ): Record<string, any>[] {
    const rows: Record<string, any>[] = [];
    const summary = report?.summary;
    const team = report?.team;

    if (team && summary) {
      rows.push({
        category: "Team Summary",
        teamName: team.name,
        members: summary.members ?? 0,
        totalTasks: summary.tasks?.total ?? 0,
        completedTasks: summary.tasks?.completed ?? 0,
        totalMeetings: summary.meetings?.total ?? 0,
        totalDuration: `${summary.meetings?.totalDuration ?? 0} min`,
      });
    }

    (report?.members || []).forEach((m) => {
      rows.push({
        category: "Member",
        name: m.user?.name || "—",
        email: m.user?.email || "—",
        totalTasks: m.tasks?.total ?? 0,
        completedTasks: m.tasks?.completed ?? 0,
        inProgress: m.tasks?.inProgress ?? 0,
        messagesSent: m.messagesSent ?? 0,
        meetingsAttended: m.meetingsAttended ?? 0,
        productivityScore: m.productivityScore?.toFixed(1) || "—",
      });
    });

    return rows;
  },

  performanceToRows(dashboard: PerformanceDashboard): Record<string, any>[] {
    const rows: Record<string, any>[] = [];
    const summary = dashboard?.summary;

    if (summary) {
      rows.push({
        category: "Summary",
        avgCompletionRate: `${summary.avgTaskCompletionRate?.toFixed(1) ?? 0}%`,
        avgAttendanceRate: `${summary.avgMeetingAttendanceRate?.toFixed(1) ?? 0}%`,
        totalInteractions: summary.totalInteractions ?? 0,
        topPerformer: summary.topPerformer?.userName || "—",
      });
    }

    (dashboard?.taskCompletionRates || []).forEach((r) => {
      rows.push({
        category: "Task Completion",
        userName: r.userName,
        totalTasks: r.totalTasks ?? 0,
        completedTasks: r.completedTasks ?? 0,
        completionRate: `${r.completionRate?.toFixed(1) ?? 0}%`,
        trend: r.trend || "—",
      });
    });

    (dashboard?.collaborationActivity || []).forEach((a) => {
      rows.push({
        category: "Collaboration",
        userName: a.userName,
        completedTasks: a.completedTasks ?? 0,
        meetingsAttended: a.attendedMeetings ?? 0,
        messagesSent: a.messagesSent ?? 0,
        totalInteractions: a.totalInteractions ?? 0,
        activityScore: a.activityScore?.toFixed(1) || "—",
      });
    });

    return rows;
  },

  workloadToRows(report: TeamWorkloadReport): Record<string, any>[] {
    return (report?.workload || []).map((w) => ({
      userName: w.userName || "—",
      userEmail: w.userEmail || "—",
      totalTasks: w.totalTasks ?? 0,
      completed: w.completed ?? 0,
      inProgress: w.inProgress ?? 0,
      todo: w.todo ?? 0,
      overdue: w.overdue ?? 0,
      workloadPercentage: `${w.workloadPercentage?.toFixed(1) ?? 0}%`,
    }));
  },
};
