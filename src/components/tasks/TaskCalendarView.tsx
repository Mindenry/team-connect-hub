import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Task } from "./types";

interface TaskCalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, data: Partial<Task>) => void;
}

const PRIORITY_COLORS = {
  urgent: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
  high: "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20",
  medium: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
  low: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
};

const DAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function TaskCalendarView({
  tasks,
  onTaskClick,
  onTaskUpdate,
}: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");

  // Get calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from Sunday of the first week
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // End on Saturday of last week
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      currentWeek.push(new Date(current));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      current.setDate(current.getDate() + 1);
    }

    return { weeks, year, month };
  }, [currentDate]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    tasks.forEach((task) => {
      if (task.dueDate) {
        const dateKey = new Date(task.dueDate).toDateString();
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const navigateMonth = (direction: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === calendarData.month;
  };

  const isOverdue = (task: Task) =>
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">
            {MONTHS_TH[calendarData.month]} {calendarData.year + 543}
          </h3>
          <Button variant="outline" size="sm" onClick={goToToday}>
            วันนี้
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-border/40 rounded-lg overflow-hidden h-full">
          {/* Day headers */}
          {DAYS_TH.map((day, i) => (
            <div
              key={i}
              className="bg-muted/50 px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarData.weeks.flat().map((date, index) => {
            const dateKey = date.toDateString();
            const dayTasks = tasksByDate[dateKey] || [];
            const today = isToday(date);
            const currentMonth = isCurrentMonth(date);

            return (
              <div
                key={index}
                className={cn(
                  "bg-background p-1.5 min-h-[100px] flex flex-col",
                  !currentMonth && "bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                    today && "bg-primary text-primary-foreground"
                  )}
                >
                  {date.getDate()}
                </div>

                {/* Tasks for this day */}
                <ScrollArea className="flex-1">
                  <div className="space-y-1">
                    {dayTasks.slice(0, 4).map((task) => {
                      const priorityColor = PRIORITY_COLORS[task.priority];
                      const overdue = isOverdue(task);

                      return (
                        <div
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] cursor-pointer border-l-2 truncate",
                            priorityColor,
                            "hover:shadow-sm transition-shadow"
                          )}
                        >
                          <div className="flex items-center gap-1">
                            {task.status === "done" ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                            ) : (
                              <Clock className={cn("w-3 h-3 shrink-0", overdue && "text-red-500")} />
                            )}
                            <span className={cn("line-clamp-1", task.status === "done" && "line-through text-muted-foreground")}>
                              {task.title}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {dayTasks.length > 4 && (
                      <div className="text-[10px] text-muted-foreground px-1.5">
                        +{dayTasks.length - 4} งาน
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 border-l-2 border-red-500 bg-red-50 dark:bg-red-950/20 rounded-sm" />
          <span>Urgent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 border-l-2 border-orange-500 bg-orange-50 dark:bg-orange-950/20 rounded-sm" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 border-l-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 rounded-sm" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 border-l-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20 rounded-sm" />
          <span>Low</span>
        </div>
      </div>
    </div>
  );
}
