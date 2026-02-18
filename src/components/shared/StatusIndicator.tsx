import { cn } from "@/lib/utils";

type Status = "online" | "busy" | "away" | "offline" | "dnd";

interface StatusIndicatorProps {
  status: Status;
  className?: string;
  size?: "sm" | "md";
}

const statusColors: Record<Status, string> = {
  online: "bg-status-online",
  busy: "bg-status-busy",
  away: "bg-status-away",
  offline: "bg-status-offline",
  dnd: "bg-status-busy", // Reuse busy color for Do Not Disturb / Focus mode
};

export default function StatusIndicator({ status, className, size = "sm" }: StatusIndicatorProps) {
  return (
    <span
      className={cn(
        "rounded-full border-2 border-sidebar block",
        size === "sm" ? "w-3 h-3" : "w-4 h-4",
        statusColors[status],
        status === "online" && "animate-pulse-soft",
        className
      )}
    />
  );
}
