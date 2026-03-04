import { memo } from "react";
import { Hash, AtSign, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Tab = "channels" | "dms";

interface WorkspaceRailProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  currentUser: { id: string; name: string; email?: string; avatar?: string } | null;
  unreadChannels: number;
  unreadDms: number;
}

const railItems: { key: Tab; icon: any; label: string }[] = [
  { key: "channels", icon: Hash, label: "Channels" },
  { key: "dms", icon: AtSign, label: "Direct Messages" },
];

function WorkspaceRail({ activeTab, onTabChange, unreadChannels, unreadDms }: WorkspaceRailProps) {
  const unreadMap: Record<Tab, number> = { channels: unreadChannels, dms: unreadDms };

  return (
    <div className="flex flex-col items-center w-[52px] bg-muted/50 dark:bg-neutral-950 border-r border-border/40 py-3 gap-1 shrink-0">
      {/* Logo */}
      <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center mb-4 shadow-sm">
        <MessageSquare className="w-4 h-4 text-primary-foreground" />
      </div>

      {/* Separator */}
      <div className="w-6 h-px bg-border/50 mb-2" />

      {/* Nav items */}
      <div className="flex flex-col items-center gap-1">
        {railItems.map(({ key, icon: Icon, label }) => {
          const isActive = activeTab === key;
          const unread = unreadMap[key];
          return (
            <Tooltip key={key} delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onTabChange(key)}
                  className={cn(
                    "relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:hover:bg-white/5"
                  )}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
                  )}
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

export default memo(WorkspaceRail);
