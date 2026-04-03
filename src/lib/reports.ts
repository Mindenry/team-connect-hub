import { apiGet, apiFetch } from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DateRangeKey = 'week' | 'month' | 'quarter' | 'year';
export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'pdf';
export type ReportType = 'overview' | 'personal' | 'team' | 'performance';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PersonalReportData {
  tasksCompleted: number;
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
    tasks: { total: number; completed: number; inProgress: number; todo: number };
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

export interface MeetingReport {
  summary: {
    totalMeetings: number;
    completedMeetings: number;
    scheduledMeetings: number;
    totalDuration: number;
    totalParticipants: number;
    avgParticipants: number;
    avgDuration: number;
  };
  meetingsByTeam: Record<string, number>;
  meetingsByStatus: Record<string, number>;
  meetings: {
    id: string;
    title: string;
    startTime: string;
    endTime: string | null;
    duration: number;
    host: string;
    hostId: string;
    team?: string | null;
    teamId?: string | null;
    participants: number;
    status: string;
  }[];
  trend?: {
    date: string;
    count: number;
    duration: number;
  }[];
}

export interface TaskReport {
  summary: {
    totalTasks: number;
    overdueTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    reviewTasks: number;
    avgCompletionTime?: number;
  };
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  tasksByAssignee?: {
    userId: string;
    userName: string;
    total: number;
    completed: number;
  }[];
  overdueTasks: {
    id: string;
    title: string;
    dueDate: string | null;
    assignee?: string | null;
    assigneeId?: string | null;
    team?: string | null;
    teamId?: string | null;
    priority: string;
    status: string;
    daysOverdue: number;
  }[];
  trend?: {
    date: string;
    created: number;
    completed: number;
  }[];
}

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
    trend?: 'up' | 'down' | 'stable';
  }[];
  meetingAttendanceRates: {
    userId: string;
    userName: string;
    userAvatar?: string;
    totalMeetings: number;
    attendedMeetings: number;
    attendanceRate: number;
    trend?: 'up' | 'down' | 'stable';
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

export interface OverviewDashboard {
  personal: PersonalReportData;
  tasks: TaskReport;
  meetings: MeetingReport;
  performance: PerformanceDashboard;
  generatedAt: string;
}

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
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  
  return { start, end };
}

export function getDateRangeLabel(range: DateRangeKey): string {
  const labels: Record<DateRangeKey, string> = {
    week: 'สัปดาห์ที่ผ่านมา',
    month: 'เดือนที่ผ่านมา',
    quarter: 'ไตรมาสที่ผ่านมา',
    year: 'ปีที่ผ่านมา',
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
  // Get all teams for filtering
  async getTeams(): Promise<TeamOption[]> {
    const teams = await apiGet<any[]>('/teams').catch(() => []);
    return (teams || []).map((t) => ({
      id: t.id,
      name: t.name,
      memberCount: t.members?.length || t.memberCount || 0,
    }));
  },

  // Get personal report
  async getPersonalReport(range: DateRangeKey): Promise<PersonalReportData | null> {
    return apiGet<PersonalReportData>(`/reports?range=${range}`).catch(() => null);
  },

  // Get overview dashboard data
  async getOverviewDashboard(dateRange: DateRange, teamId?: string): Promise<OverviewDashboard | null> {
    const { start, end } = dateRange;
    const params = new URLSearchParams({
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
    });
    if (teamId) params.append('teamId', teamId);
    
    return apiGet<OverviewDashboard>(`/reports/overview?${params}`).catch(() => null);
  },

  // Get task report
  async getTaskReport(dateRange: DateRange, teamId?: string): Promise<TaskReport | null> {
    const { start, end } = dateRange;
    const params = new URLSearchParams({
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
    });
    if (teamId) params.append('teamId', teamId);
    
    return apiGet<TaskReport>(`/reports/tasks?${params}`).catch(() => null);
  },

  // Get meeting report
  async getMeetingReport(dateRange: DateRange, teamId?: string): Promise<MeetingReport | null> {
    const { start, end } = dateRange;
    const params = new URLSearchParams({
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
    });
    if (teamId) params.append('teamId', teamId);
    
    return apiGet<MeetingReport>(`/reports/meetings?${params}`).catch(() => null);
  },

  // Get team productivity report
  async getTeamProductivityReport(teamId: string, dateRange: DateRange): Promise<TeamProductivityReport | null> {
    const { start, end } = dateRange;
    const params = new URLSearchParams({
      teamId,
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
    });
    
    return apiGet<TeamProductivityReport>(`/reports/team-productivity?${params}`).catch(() => null);
  },

  // Get team workload
  async getTeamWorkload(teamId: string, dateRange: DateRange): Promise<TeamWorkloadReport | null> {
    const { start, end } = dateRange;
    const params = new URLSearchParams({
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
    });
    
    return apiGet<TeamWorkloadReport>(`/reports/teams/${teamId}/workload?${params}`).catch(() => null);
  },

  // Get performance dashboard
  async getPerformanceDashboard(dateRange: DateRange, teamId?: string): Promise<PerformanceDashboard | null> {
    const { start, end } = dateRange;
    const params = new URLSearchParams({
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
    });
    if (teamId) params.append('teamId', teamId);
    
    return apiGet<PerformanceDashboard>(`/reports/performance?${params}`).catch(() => null);
  },

  // Export report
  async exportReport(
    type: ReportType,
    format: ExportFormat,
    options: {
      dateRange: DateRange;
      teamId?: string;
      range?: DateRangeKey;
    }
  ): Promise<Blob> {
    const { start, end } = options.dateRange;
    const params = new URLSearchParams({
      type,
      format,
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
    });
    if (options.teamId) params.append('teamId', options.teamId);
    if (options.range) params.append('range', options.range);
    
    const res = await apiFetch(`/reports/export?${params}`);
    if (!res.ok) {
      throw new Error('Export failed');
    }
    return res.blob();
  },
};

// ─── Export Utilities (Client-side) ──────────────────────────────────────────

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportUtils = {
  // Export to CSV
  toCSV(data: Record<string, any>[], filename: string): void {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const value = row[h];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}.csv`);
  },

  // Export to Excel
  toExcel(data: Record<string, any>[], filename: string, sheetName = 'Report'): void {
    if (!data.length) return;
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  },

  // Export to JSON
  toJSON(data: any, filename: string): void {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    downloadBlob(blob, `${filename}.json`);
  },

  // Export to PDF - Professional Report Template
  toPDF(
    data: Record<string, any>[],
    filename: string,
    options: {
      title?: string;
      subtitle?: string;
      columns?: { header: string; dataKey: string }[];
      orientation?: 'portrait' | 'landscape';
      reportType?: 'overview' | 'personal' | 'team' | 'performance';
      reportData?: any;
    } = {}
  ): void {
    const doc = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let currentY = 14;

    // ─── Header Section ─────────────────────────────────────────────────────
    // Blue header bar
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Company/Brand name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Team Connect', margin, 15);

    // Report title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(options.title || 'Professional Report', margin, 26);

    // Date on right side
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(9);
    doc.text(`Generated: ${dateStr} ${timeStr}`, pageWidth - margin, 15, { align: 'right' });
    doc.text(`Period: ${options.subtitle || 'Monthly Report'}`, pageWidth - margin, 26, { align: 'right' });

    currentY = 45;

    // ─── Executive Summary Section ───────────────────────────────────────────
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, currentY);
    currentY += 8;

    // Summary box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 50, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 50, 3, 3, 'S');

    // Extract key metrics from data
    const summaryData = data.find(d => d.category === 'Summary' || d.category === 'Personal Report');
    const taskData = data.find(d => d.category === 'Task Completion');
    const collabData = data.filter(d => d.category === 'Collaboration');

    // Key metrics row
    const metrics = [
      { label: 'Tasks Completed', value: summaryData?.value || summaryData?.completedTasks || taskData?.completedTasks || 0, color: [16, 185, 129] },
      { label: 'Meetings Attended', value: summaryData?.meetingsAttended || taskData?.attendedMeetings || 0, color: [59, 130, 246] },
      { label: 'Messages Sent', value: summaryData?.messagesSent || 0, color: [139, 92, 246] },
      { label: 'Productivity Score', value: `${summaryData?.value || summaryData?.productivityScore || 0}%`, color: [245, 158, 11] },
    ];

    const metricWidth = (pageWidth - margin * 2 - 12) / 4;
    metrics.forEach((metric, i) => {
      const x = margin + 6 + i * (metricWidth + 4);
      const y = currentY + 8;

      // Metric icon circle
      doc.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
      doc.circle(x + 8, y + 8, 6, 'F');

      // Metric value
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(String(metric.value), x + 18, y + 10);

      // Metric label
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(metric.label, x + 18, y + 18);
    });

    currentY += 60;

    // ─── Performance Breakdown Section ──────────────────────────────────────
    if (options.reportData?.productivityBreakdown) {
      const breakdown = options.reportData.productivityBreakdown;
      
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Performance Breakdown', margin, currentY);
      currentY += 5;
      
      // Methodology citation
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.text('Based on Balanced Scorecard (Kaplan & Norton, 1996) with Task Difficulty Adjustment', margin, currentY + 3);
      currentY += 10;

      // Breakdown bars - 4 factors
      const barMetrics = [
        { label: 'Adjusted Task Performance', score: breakdown.adjustedTaskPerformance, weight: breakdown.weights?.adjustedTaskPerformance || 45, color: [16, 185, 129] },
        { label: 'Meaningful Engagement', score: breakdown.meaningfulEngagement, weight: breakdown.weights?.meaningfulEngagement || 20, color: [59, 130, 246] },
        { label: 'Communication Effectiveness', score: breakdown.communicationEffectiveness, weight: breakdown.weights?.communicationEffectiveness || 20, color: [139, 92, 246] },
        { label: 'Work Consistency', score: breakdown.workConsistency, weight: breakdown.weights?.workConsistency || 15, color: [245, 158, 11] },
      ];

      barMetrics.forEach((metric, i) => {
        const barY = currentY + i * 14;
        const barWidth = (pageWidth - margin * 2 - 60) * (metric.score / 100);

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${metric.label} (${metric.weight}% weight)`, margin, barY + 3);

        // Background bar
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, barY + 5, pageWidth - margin * 2 - 60, 5, 2, 2, 'F');

        // Progress bar
        if (barWidth > 0) {
          doc.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
          doc.roundedRect(margin, barY + 5, barWidth, 5, 2, 2, 'F');
        }

        // Score text
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`${metric.score}%`, pageWidth - margin - 20, barY + 9);
      });

      currentY += barMetrics.length * 14 + 5;
      
      // Additional info
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(`Active Days: ${breakdown.activeDays}/${breakdown.periodDays} days  •  Difficulty Factor: ${breakdown.difficultyFactor}x`, margin, currentY);
      currentY += 5;
      
      // Anti-gaming warning if applied
      if (breakdown.antiGamingApplied) {
        doc.setTextColor(217, 119, 6);
        doc.setFontSize(7);
        doc.text('⚠ Anti-Gaming Rule Applied: Score capped at 50% due to low task completion', margin, currentY + 3);
        currentY += 8;
      } else {
        currentY += 5;
      }
    }

    // ─── Data Table Section ──────────────────────────────────────────────────
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Report', margin, currentY);
    currentY += 6;

    // Filter and prepare table data
    const tableData = data.filter(d => d.category !== 'Summary' && d.category !== 'Personal Report');
    
    if (tableData.length > 0) {
      // Determine columns
      const columns = options.columns || 
        Object.keys(tableData[0]).map(key => ({ header: formatHeader(key), dataKey: key }));

      autoTable(doc, {
        head: [columns.map(c => c.header)],
        body: tableData.map(row => columns.map(c => String(row[c.dataKey] ?? ''))),
        startY: currentY,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'left',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 35 },
        },
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.1,
      });

      currentY = (doc as any).lastAutoTable?.finalY || currentY + 30;
    }

    // ─── Team Metrics Section (if available) ──────────────────────────────────
    const teamMetrics = data.filter(d => d.category === 'Team');
    if (teamMetrics.length > 0) {
      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
      }

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Team Contributions', margin, currentY);
      currentY += 8;

      teamMetrics.forEach((team, i) => {
        const teamY = currentY + i * 20;
        
        // Team card
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, teamY, pageWidth - margin * 2, 18, 2, 2, 'FD');

        // Team name
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(team.teamName || `Team ${i + 1}`, margin + 5, teamY + 7);

        // Team stats
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tasks: ${team.tasks || 0}  •  Meetings: ${team.meetings || 0}  •  Messages: ${team.messages || 0}`, margin + 5, teamY + 14);
      });

      currentY += teamMetrics.length * 22;
    }

    // ─── Footer on all pages ─────────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Team Connect Report • Confidential - For Internal Use Only',
        margin,
        pageHeight - 8
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: 'right' }
      );
    }

    doc.save(`${filename}.pdf`);
  },

  // Export multiple sheets to Excel
  toExcelMultiSheet(
    sheets: { name: string; data: Record<string, any>[] }[],
    filename: string
  ): void {
    const wb = XLSX.utils.book_new();
    
    sheets.forEach(({ name, data }) => {
      if (data.length) {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31)); // Excel sheet name limit
      }
    });
    
    XLSX.writeFile(wb, `${filename}.xlsx`);
  },
};

// Helper function to download blob
function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Helper to format header
function formatHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// ─── Data Transformation Utilities ──────────────────────────────────────────

export const reportTransformers = {
  // Transform task report for export
  taskReportToRows(report: TaskReport): Record<string, any>[] {
    const rows: Record<string, any>[] = [];
    
    // Summary row
    rows.push({
      category: 'Summary',
      totalTasks: report.summary.totalTasks,
      completed: report.summary.completedTasks,
      inProgress: report.summary.inProgressTasks,
      todo: report.summary.todoTasks,
      overdue: report.summary.overdueTasks,
    });
    
    // Overdue tasks
    report.overdueTasks.forEach(t => {
      rows.push({
        category: 'Overdue Task',
        title: t.title,
        assignee: t.assignee || 'Unassigned',
        team: t.team || '-',
        priority: t.priority,
        dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString('th-TH') : '-',
        daysOverdue: t.daysOverdue,
      });
    });
    
    return rows;
  },

  // Transform meeting report for export
  meetingReportToRows(report: MeetingReport): Record<string, any>[] {
    const rows: Record<string, any>[] = [];
    
    // Summary
    rows.push({
      category: 'Summary',
      totalMeetings: report.summary.totalMeetings,
      completed: report.summary.completedMeetings,
      scheduled: report.summary.scheduledMeetings,
      totalDuration: `${report.summary.totalDuration} min`,
      avgDuration: `${report.summary.avgDuration.toFixed(1)} min`,
      avgParticipants: report.summary.avgParticipants.toFixed(1),
    });
    
    // Meeting list
    report.meetings.forEach(m => {
      rows.push({
        category: 'Meeting',
        title: m.title,
        host: m.host,
        team: m.team || '-',
        startTime: new Date(m.startTime).toLocaleString('th-TH'),
        duration: `${m.duration} min`,
        participants: m.participants,
        status: m.status,
      });
    });
    
    return rows;
  },

  // Transform team productivity for export
  teamProductivityToRows(report: TeamProductivityReport): Record<string, any>[] {
    const rows: Record<string, any>[] = [];
    
    // Team summary
    rows.push({
      category: 'Team Summary',
      teamName: report.team.name,
      members: report.summary.members,
      totalTasks: report.summary.tasks.total,
      completedTasks: report.summary.tasks.completed,
      totalMeetings: report.summary.meetings.total,
      totalDuration: `${report.summary.meetings.totalDuration} min`,
    });
    
    // Member details
    report.members.forEach(m => {
      rows.push({
        category: 'Member',
        name: m.user.name,
        email: m.user.email,
        totalTasks: m.tasks.total,
        completedTasks: m.tasks.completed,
        inProgress: m.tasks.inProgress,
        messagesSent: m.messagesSent,
        meetingsAttended: m.meetingsAttended,
        productivityScore: m.productivityScore?.toFixed(1) || '-',
      });
    });
    
    return rows;
  },

  // Transform performance dashboard for export
  performanceToRows(dashboard: PerformanceDashboard): Record<string, any>[] {
    const rows: Record<string, any>[] = [];
    
    // Summary
    rows.push({
      category: 'Summary',
      avgCompletionRate: `${dashboard.summary.avgTaskCompletionRate.toFixed(1)}%`,
      avgAttendanceRate: `${dashboard.summary.avgMeetingAttendanceRate.toFixed(1)}%`,
      totalInteractions: dashboard.summary.totalInteractions,
      topPerformer: dashboard.summary.topPerformer?.userName || '-',
    });
    
    // Task completion rates
    dashboard.taskCompletionRates.forEach(r => {
      rows.push({
        category: 'Task Completion',
        userName: r.userName,
        totalTasks: r.totalTasks,
        completedTasks: r.completedTasks,
        completionRate: `${r.completionRate.toFixed(1)}%`,
        trend: r.trend || '-',
      });
    });
    
    // Collaboration activity
    dashboard.collaborationActivity.forEach(a => {
      rows.push({
        category: 'Collaboration',
        userName: a.userName,
        completedTasks: a.completedTasks,
        meetingsAttended: a.attendedMeetings,
        messagesSent: a.messagesSent,
        totalInteractions: a.totalInteractions,
        activityScore: a.activityScore?.toFixed(1) || '-',
      });
    });
    
    return rows;
  },

  // Transform workload for export
  workloadToRows(report: TeamWorkloadReport): Record<string, any>[] {
    return report.workload.map(w => ({
      userName: w.userName,
      userEmail: w.userEmail,
      totalTasks: w.totalTasks,
      completed: w.completed,
      inProgress: w.inProgress,
      todo: w.todo,
      overdue: w.overdue,
      workloadPercentage: `${w.workloadPercentage.toFixed(1)}%`,
    }));
  },
};
