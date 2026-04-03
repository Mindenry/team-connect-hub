import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { ChartColors, TrendType } from "./types";

export const CHART_COLORS: ChartColors = {
  emerald: "#10b981",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  red: "#ef4444",
  cyan: "#06b6d4",
  pink: "#ec4899",
  orange: "#f97316",
  teal: "#14b8a6",
  indigo: "#6366f1",
};

export const STATUS_COLORS: Record<string, string> = {
  done: CHART_COLORS.emerald,
  in_progress: CHART_COLORS.blue,
  review: CHART_COLORS.amber,
  todo: "#94a3b8",
};

export const PRIORITY_COLORS: Record<string, string> = {
  urgent: CHART_COLORS.red,
  high: CHART_COLORS.orange,
  medium: CHART_COLORS.blue,
  low: "#94a3b8",
};

export const priorityColor: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-blue-500",
  low: "bg-slate-400",
};

export const priorityLabel: Record<string, string> = {
  urgent: "เร่งด่วน",
  high: "สูง",
  medium: "ปานกลาง",
  low: "ต่ำ",
};

export const statusColor: Record<string, string> = {
  done: "bg-emerald-500",
  in_progress: "bg-blue-500",
  review: "bg-amber-500",
  todo: "bg-slate-400",
};

export const statusLabel: Record<string, string> = {
  done: "เสร็จแล้ว",
  in_progress: "กำลังทำ",
  review: "รอรีวิว",
  todo: "ยังไม่เริ่ม",
};

export function getProductivityColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 50) return "text-blue-500";
  if (score >= 30) return "text-amber-500";
  return "text-red-500";
}

export function getProductivityGradient(score: number): string {
  if (score >= 80) return "from-emerald-500 to-teal-500";
  if (score >= 50) return "from-blue-500 to-cyan-500";
  if (score >= 30) return "from-amber-500 to-yellow-500";
  return "from-red-500 to-rose-500";
}

export function getTrendIcon(trend?: TrendType) {
  if (trend === 'up') return ArrowUpRight;
  if (trend === 'down') return ArrowDownRight;
  return Minus;
}

export function getTrendColor(trend?: TrendType): string {
  if (trend === 'up') return "text-emerald-500";
  if (trend === 'down') return "text-red-500";
  return "text-muted-foreground";
}
