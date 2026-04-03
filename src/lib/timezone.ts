import { format, parseISO } from "date-fns";
import { utcToZonedTime, zonedTimeToUtc } from "date-fns-tz";
import { th, enUS } from "date-fns/locale";
import { loadTimezone } from "@/components/settings/utils";
import i18n from "./i18n";

const locales: Record<string, typeof enUS> = {
  en: enUS,
  th: th,
};

/**
 * Get the current timezone from settings
 */
export function getTimezone(): string {
  return loadTimezone();
}

/**
 * Convert a UTC date string to the user's local timezone
 */
export function toLocalTime(utcDateString: string | Date): Date {
  const timezone = getTimezone();
  const date = typeof utcDateString === "string" ? parseISO(utcDateString) : utcDateString;
  return utcToZonedTime(date, timezone);
}

/**
 * Convert a local date to UTC
 */
export function toUtc(localDate: Date): Date {
  const timezone = getTimezone();
  return zonedTimeToUtc(localDate, timezone);
}

/**
 * Format a date in the user's timezone and locale
 */
export function formatInTimezone(
  date: string | Date,
  formatStr: string = "PPP p"
): string {
  const localDate = toLocalTime(date);
  const locale = locales[i18n.language] || enUS;
  return format(localDate, formatStr, { locale });
}

/**
 * Format a date for display (short format)
 */
export function formatDateTime(date: string | Date): string {
  return formatInTimezone(date, "MMM d, yyyy h:mm a");
}

/**
 * Format a date for display (date only)
 */
export function formatDate(date: string | Date): string;
export function formatDate(date: string | Date, options: Intl.DateTimeFormatOptions): string;
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  if (options) {
    const localDate = toLocalTime(date);
    const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';
    return localDate.toLocaleDateString(locale, options);
  }
  return formatInTimezone(date, "MMM d, yyyy");
}

/**
 * Format a date for display (time only)
 */
export function formatTime(date: string | Date): string;
export function formatTime(date: string | Date, options: Intl.DateTimeFormatOptions): string;
export function formatTime(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  if (options) {
    const localDate = toLocalTime(date);
    const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';
    return localDate.toLocaleTimeString(locale, options);
  }
  return formatInTimezone(date, "h:mm a");
}

/**
 * Format a date relative to now (e.g., "in 5 minutes", "2 hours ago")
 */
export function formatRelative(date: string | Date): string {
  const localDate = toLocalTime(date);
  const now = new Date();
  const diffMs = localDate.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  const locale = i18n.language;

  if (Math.abs(diffMins) < 1) {
    return locale === "th" ? "ตอนนี้" : "now";
  } else if (diffMins > 0 && diffMins < 60) {
    return locale === "th" ? `ใน ${diffMins} นาที` : `in ${diffMins} min`;
  } else if (diffMins < 0 && diffMins > -60) {
    return locale === "th" ? `${Math.abs(diffMins)} นาทีที่แล้ว` : `${Math.abs(diffMins)} min ago`;
  } else if (diffHours > 0 && diffHours < 24) {
    return locale === "th" ? `ใน ${diffHours} ชั่วโมง` : `in ${diffHours} hr`;
  } else if (diffHours < 0 && diffHours > -24) {
    return locale === "th" ? `${Math.abs(diffHours)} ชั่วโมงที่แล้ว` : `${Math.abs(diffHours)} hr ago`;
  } else if (diffDays > 0) {
    return locale === "th" ? `ใน ${diffDays} วัน` : `in ${diffDays} days`;
  } else {
    return locale === "th" ? `${Math.abs(diffDays)} วันที่แล้ว` : `${Math.abs(diffDays)} days ago`;
  }
}

/**
 * Get current time in user's timezone
 */
export function nowInTimezone(): Date {
  const timezone = getTimezone();
  return utcToZonedTime(new Date(), timezone);
}

/**
 * Create a hook for timezone-aware formatting
 */
export function useTimezone() {
  return {
    timezone: getTimezone(),
    toLocalTime,
    toUtc,
    formatInTimezone,
    formatDateTime,
    formatDate,
    formatTime,
    formatRelative,
    nowInTimezone,
  };
}
