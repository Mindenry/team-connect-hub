import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task } from "./types";
import { PRIORITY_CONFIG } from "./types";
import { isOverdue, isSameDay } from "./utils";

interface TaskCalendarViewProps {
  tasks: Task[];
  onTaskClick: (t: Task) => void;
}

export function TaskCalendarView({ tasks, onTaskClick }: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={prev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-sm font-semibold min-w-[160px] text-center">{monthName}</h3>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={next}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={goToday}>Today</Button>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1.5">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden border border-border/50">
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="bg-card/30 min-h-[90px] sm:min-h-[110px]" />;
          }
          const dateObj = new Date(year, month, day);
          const key = `${year}-${month}-${day}`;
          const dayTasks = tasksByDate[key] || [];
          const isTodayDate = isSameDay(dateObj, today);
          const isPast = dateObj < today && !isTodayDate;

          return (
            <div key={key} className={cn("bg-card/60 min-h-[90px] sm:min-h-[110px] p-1 sm:p-1.5 transition-colors hover:bg-card/80", isTodayDate && "bg-primary/5 ring-1 ring-inset ring-primary/20")}>
              <div className={cn("text-[11px] font-medium mb-1", isTodayDate ? "text-primary font-bold" : isPast ? "text-muted-foreground/50" : "text-foreground")}>{day}</div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((t) => {
                  const pCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <button
                      key={t.id}
                      onClick={() => onTaskClick(t)}
                      className={cn(
                        "w-full text-left text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded truncate leading-tight transition-colors hover:bg-primary/10",
                        t.status === "done" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 line-through" :
                        isOverdue(t) ? "bg-red-500/15 text-red-700 dark:text-red-400" :
                        "bg-muted/40 text-foreground/80"
                      )}
                    >
                      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle", pCfg.dotColor)} />
                      {t.title}
                    </button>
                  );
                })}
                {dayTasks.length > 3 && <span className="text-[9px] text-muted-foreground px-1">+{dayTasks.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}