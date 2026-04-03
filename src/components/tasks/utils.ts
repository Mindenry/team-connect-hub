/* ─── helpers ─── */
export function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function isOverdue(task: { dueDate?: string | null; status: string }) {
  return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
}

export function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ─── animation variants ─── */
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 120, damping: 16 } },
};
