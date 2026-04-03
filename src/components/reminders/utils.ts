import type { Reminder, RecurringPattern } from "./types";

export const formatWhen = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const absMins = Math.round(Math.abs(diffMs) / 60000);
  const absHours = Math.round(Math.abs(diffMs) / 3600000);
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();

  if (diffMs < 0 && absMins < 60) return `${absMins}m ago`;
  if (diffMs < 0 && absHours < 24) return `${absHours}h ago`;
  if (sameDay) return `Today · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const isOverdue = (remindAt: string, isSent: boolean) => {
  return new Date(remindAt) < new Date() && !isSent;
};

export const computeRecurringDates = (base: Date, pattern: RecurringPattern, count: number): Date[] => {
  if (pattern === "none") return [new Date(base)];
  const dates: Date[] = [new Date(base)];
  for (let i = 1; i < count; i++) {
    const next = new Date(dates[i - 1]);
    if (pattern === "daily") next.setDate(next.getDate() + 1);
    if (pattern === "weekly") next.setDate(next.getDate() + 7);
    if (pattern === "monthly") next.setMonth(next.getMonth() + 1);
    dates.push(next);
  }
  return dates;
};

export const getInitials = (name: string): string =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
