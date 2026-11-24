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
  "group inline-flex h-9 items-center gap-2 rounded-xl px-2.5 text-xs font-medium text-muted-foreground outline-none transition-[background-color,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.98]";

export default function QuickActions({
  onJoinByCode,
  onNewTask,
  onSchedule,
  onStartMeeting,
  startingMeeting = false,
}: QuickActionsProps) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
      <div className="flex items-center gap-0.5 rounded-2xl border border-border/60 bg-card/70 p-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onJoinByCode}
              aria-label="Join a meeting by code"
              className={cn(
                secondaryActionClass,
                "hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300",
              )}
            >
              <Hash className="h-3.5 w-3.5 text-sky-500 transition-transform duration-150 group-hover:rotate-6" />
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
              className={cn(
                secondaryActionClass,
                "hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300",
              )}
            >
              <CheckSquare className="h-3.5 w-3.5 text-amber-500 transition-transform duration-150 group-hover:-rotate-3" />
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
              className={cn(
                secondaryActionClass,
                "hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300",
              )}
            >
              <Calendar className="h-3.5 w-3.5 text-violet-500 transition-transform duration-150 group-hover:-translate-y-0.5" />
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
        className="h-10 gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-4 text-xs font-semibold shadow-md shadow-primary/20 transition-all duration-200 hover:from-primary/95 hover:to-blue-500 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
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
