import type { AuditLog } from "./types";

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 120, damping: 16 } },
};

export const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.03, y: -6, transition: { type: "spring" as const, stiffness: 300, damping: 20 } },
};

export function getActionColor(action: string): string {
  switch (action.toLowerCase()) {
    case "create": return "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-500/30";
    case "update": return "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30";
    case "delete": return "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30";
    case "upload": return "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-500/30";
    case "login": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30";
    case "logout": return "bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400 border-gray-200 dark:border-gray-500/30";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400 border-gray-200 dark:border-gray-500/30";
  }
}

export function getEntityIcon(entity: string): string {
  switch (entity.toLowerCase()) {
    case "user": return "👤";
    case "task": return "📋";
    case "meeting": return "📹";
    case "message": return "💬";
    case "team": return "👥";
    case "file": return "📁";
    default: return "📄";
  }
}

export function getEntityLabel(entity: string): string {
  switch (entity.toLowerCase()) {
    case "user": return "User";
    case "task": return "Task";
    case "meeting": return "Meeting";
    case "message": return "Message";
    case "team": return "Team";
    case "file":
    case "document": return "File / Document";
    default: return entity || "Unknown";
  }
}

export function formatAuditDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function exportLogsToCSV(logs: AuditLog[]): void {
  const csv = [
    ["Action", "Entity", "Entity ID", "User", "IP Address", "Date", "Details"].join(","),
    ...logs.map((log) =>
      [
        log.action,
        log.entity,
        log.entityId,
        log.userName || "System",
        log.ipAddress || "N/A",
        formatAuditDate(log.createdAt),
        JSON.stringify(log.details || {}).replace(/,/g, "，"),
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}
