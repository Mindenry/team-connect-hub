import { AlertCircle, Circle, CheckCircle2 } from "lucide-react";

export const priorityConfig: Record<string, { color: string; icon: typeof AlertCircle; label: string }> = {
  urgent: {
    color: "bg-gradient-to-br from-red-600/25 via-red-500/15 to-red-500/5 text-red-700 border-red-600/40",
    icon: AlertCircle,
    label: "Urgent",
  },
  high: {
    color: "bg-gradient-to-br from-red-500/20 via-red-500/10 to-red-500/5 text-red-600 border-red-500/30",
    icon: AlertCircle,
    label: "High",
  },
  medium: {
    color: "bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-amber-500/5 text-amber-600 border-amber-500/30",
    icon: Circle,
    label: "Medium",
  },
  low: {
    color: "bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-blue-500/5 text-blue-600 border-blue-500/30",
    icon: CheckCircle2,
    label: "Low",
  },
};

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 20,
    },
  },
};

export const roomNames: Record<string, string> = {
  workspace: "Workspace",
  "meeting-1": "Meeting A",
  "meeting-2": "Meeting B",
  huddle: "Huddle",
  lounge: "Lounge",
  phone: "Phone",
  "quick-huddle": "Quick huddle",
};

export const statusLabels: Record<"online" | "busy" | "away" | "offline" | "dnd", string> = {
  online: "Online",
  busy: "Busy",
  away: "Away",
  offline: "Offline",
  dnd: "Do Not Disturb",
};

export const statusColors: Record<"online" | "busy" | "away" | "offline" | "dnd", string> = {
  online: "bg-green-500/10 text-green-600 border-green-500/30",
  busy: "bg-red-500/10 text-red-600 border-red-500/30",
  away: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  offline: "bg-muted/40 text-muted-foreground border-border/60",
  dnd: "bg-purple-500/10 text-purple-600 border-purple-500/30",
};
