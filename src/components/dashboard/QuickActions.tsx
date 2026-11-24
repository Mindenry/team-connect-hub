import { Calendar, CheckSquare, Hash, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  onJoinByCode: () => void;
  onNewTask: () => void;
  onSchedule: () => void;
  onStartMeeting: () => void;
  startingMeeting?: boolean;
}

const secondaryActionClass =
  "group inline-flex h-9 items-center gap-2 rounded-xl px-2 text-xs font-medium text-slate-300 outline-none transition-[background-color,color,transform] duration-150 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/20 active:scale-[0.98]";

const iconTileClass =
  "flex h-6 w-6 items-center justify-center rounded-lg transition-colors";

export default function QuickActions({
  onJoinByCode,
  onNewTask,
  onSchedule,
  onStartMeeting,
  startingMeeting = false,
}: QuickActionsProps) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
      <div className="flex items-center gap-0.5 rounded-2xl bg-[#0B1220] p-1 shadow-[0_14px_40px_-16px_rgba(2,6,23,0.7)]">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onJoinByCode}
              aria-label="Join a meeting by code"
              className={secondaryActionClass}
            >
              <span className={cn(iconTileClass, "bg-sky-500/15 text-sky-400 group-hover:bg-sky-500/20")}>
                <Hash className="h-3.5 w-3.5" />
              </span>
              <span className="hidden sm:inline">Join by code</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>เข้าร่วมการประชุมด้วยรหัส</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onNewTask}
              aria-label="Create a new task"
              className={secondaryActionClass}
            >
              <span className={cn(iconTileClass, "bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/20")}>
                <CheckSquare className="h-3.5 w-3.5" />
              </span>
              <span className="hidden sm:inline">New task</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>สร้างงานใหม่</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onSchedule}
              aria-label="Schedule a meeting"
              className={secondaryActionClass}
            >
              <span className={cn(iconTileClass, "bg-indigo-500/15 text-indigo-400 group-hover:bg-indigo-500/20")}>
                <Calendar className="h-3.5 w-3.5" />
              </span>
              <span className="hidden sm:inline">Schedule</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>กำหนดการประชุม</TooltipContent>
        </Tooltip>
      </div>

      <Button
        type="button"
        size="sm"
        onClick={onStartMeeting}
        disabled={startingMeeting}
        className="h-11 gap-2 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 px-4 text-xs font-semibold text-white shadow-[0_12px_40px_-12px_rgba(56,189,248,0.65)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
      >
        {startingMeeting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Video className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{startingMeeting ? "Starting…" : "Start meeting"}</span>
        <span className="sm:hidden">{startingMeeting ? "…" : "Start"}</span>
      </Button>
    </div>
  );
}
