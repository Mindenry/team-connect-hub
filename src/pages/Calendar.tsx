import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CalendarDays,
  CalendarRange,
  CalendarSearch,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Clock,
  Filter,
  Loader2,
  Users,
  Video,
  Sparkles,
  TrendingUp,
  Zap,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { apiGet, apiPatch } from "@/lib/api";

type ViewMode = "day" | "week" | "month";

interface RawMeeting {
  id: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  status: string;
  team?: { id: string; name: string } | null;
  host?: { id: string; name: string } | null;
  participants?: Array<{
    userId: string;
    user?: { id: string; name: string } | null;
  }>;
}

interface RawTask {
  id: string;
  title: string;
  dueDate?: string | null;
  priority?: string | null;
  status?: string | null;
  team?: { id: string; name: string } | null;
  assignee?: { id: string; name: string } | null;
}

type CalendarEventType = "meeting" | "task" | "holiday";

interface CalendarEvent {
  id: string;
  entityId: string;
  type: CalendarEventType;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  teamName?: string;
  assigneeName?: string;
  status?: string;
  priority?: string;
}

interface TeamOption {
  id: string;
  name: string;
}

// --- Date helpers ---

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function startOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// --- Drag helpers ---

function EventCardBase({
  event,
  className,
  style,
  draggable,
  dragAttributes,
  dragListeners,
  setNodeRef,
  isDragging,
}: {
  event: CalendarEvent;
  className?: string;
  style?: CSSProperties;
  draggable?: boolean;
  dragAttributes?: Record<string, any>;
  dragListeners?: Record<string, any>;
  setNodeRef?: (node: HTMLElement | null) => void;
  isDragging?: boolean;
}) {
  const isMeeting = event.type === "meeting";
  const isHoliday = event.type === "holiday";
  const isTask = event.type === "task";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...(draggable ? dragAttributes : {})}
      {...(draggable ? dragListeners : {})}
      initial={{ opacity: 1, scale: 1 }}
      animate={{ opacity: isDragging ? 0.6 : 1, scale: isDragging ? 0.95 : 1 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "group rounded-md px-2.5 py-1.5 text-xs mb-1 shadow-sm border transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        "ring-0 hover:ring-1 hover:ring-current/20",
        isHoliday
          ? "bg-gradient-to-br from-red-50 via-red-100/70 to-red-50 border-red-200/70 text-red-900 cursor-default shadow-red-100/40"
          : isMeeting
          ? "bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 border-primary/50 text-primary-foreground cursor-grab active:cursor-grabbing shadow-primary/25 ring-primary/10"
          : "bg-gradient-to-br from-amber-50 via-amber-100/60 to-amber-50 border-amber-200/70 text-amber-900 cursor-grab active:cursor-grabbing shadow-amber-100/40",
        isDragging && "opacity-60 ring-2 ring-primary/60 shadow-xl z-50 scale-105",
        className
      )}
    >
      <div className="flex items-start gap-1.5">
        <div className={cn(
          "w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all duration-200",
          "group-hover:scale-110",
          isHoliday ? "bg-red-200/70" : isMeeting ? "bg-primary/25" : "bg-amber-200/70"
        )}>
          {isHoliday ? (
            <Sparkles className="w-2.5 h-2.5 text-red-700" />
          ) : isMeeting ? (
            <Video className="w-2.5 h-2.5 text-primary" />
          ) : (
            <CheckSquare className="w-2.5 h-2.5 text-amber-700" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[10px] leading-tight truncate">
            {event.title}
          </div>
          {!event.allDay && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground/75 mt-0.5">
              <Clock className="w-2 h-2 shrink-0" />
              <span>
                {event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                {event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}
          {event.allDay && (
            <div className="text-[9px] text-muted-foreground/70 font-medium mt-0.5">ทั้งวัน</div>
          )}
          {(event.teamName || event.assigneeName) && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70 mt-0.5">
              {event.teamName && (
                <>
                  <Users className="w-2 h-2 shrink-0" />
                  <span className="truncate">{event.teamName}</span>
                </>
              )}
              {!event.teamName && event.assigneeName && (
                <span className="truncate">{event.assigneeName}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface DraggableEventCardProps {
  event: CalendarEvent;
}

function DraggableEventCard({ event }: DraggableEventCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
  });

  const style: CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <EventCardBase
      event={event}
      style={style}
      draggable
      dragAttributes={attributes}
      dragListeners={listeners}
      setNodeRef={setNodeRef}
      isDragging={isDragging}
    />
  );
}

function StaticEventCard({ event }: { event: CalendarEvent }) {
  return <EventCardBase event={event} />;
}

interface DroppableDayProps {
  date: Date;
  children: React.ReactNode;
  id?: string;
  className?: string;
}

function DroppableDay({ date, children, id, className }: DroppableDayProps) {
  const droppableId = id ?? `day-${dateKey(date)}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col border rounded-md px-1.5 py-1.5 min-h-[60px] bg-gradient-to-br from-background via-muted/20 to-background transition-all duration-200",
        "hover:border-border/80 hover:bg-muted/30",
        isOver && "ring-2 ring-primary/60 bg-primary/15 shadow-xl scale-[1.02] border-primary/40",
        className
      )}
    >
      {children}
    </div>
  );
}

// --- Main Component ---

export default function TeamCalendar() {
  const isMobile = useIsMobile();
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [meetings, setMeetings] = useState<RawMeeting[]>([]);
  const [tasks, setTasks] = useState<RawTask[]>([]);
  const [holidays, setHolidays] = useState<Array<{ id: string; name: string; nameEn?: string; date: string; type: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filterTypes, setFilterTypes] = useState({
    meetings: true,
    tasks: true,
    holidays: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  useEffect(() => {
    let cancelled = false;
    const loadTeams = async () => {
      try {
        const data = await apiGet<any[]>("/teams").catch(() => []);
        if (!cancelled) {
          setTeams(
            (Array.isArray(data) ? data : []).map((t: any) => ({
              id: t.id,
              name: t.name,
            }))
          );
        }
      } catch {
        // ignore
      }
    };
    loadTeams();
    return () => {
      cancelled = true;
    };
  }, []);

  const { rangeStart, rangeEnd, visibleDays } = useMemo(() => {
    if (view === "day") {
      const start = startOfDay(currentDate);
      const end = endOfDay(currentDate);
      return { rangeStart: start, rangeEnd: end, visibleDays: [start] };
    }
    if (view === "week") {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(start, i));
      }
      return { rangeStart: start, rangeEnd: end, visibleDays: days };
    }
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days: Date[] = [];
    let d = new Date(start);
    while (d <= end) {
      days.push(new Date(d));
      d = addDays(d, 1);
    }
    return { rangeStart: start, rangeEnd: end, visibleDays: days };
  }, [currentDate, view]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = teamFilter !== "all" ? `?teamId=${encodeURIComponent(teamFilter)}` : "";
        const [meetingsData, tasksData, holidaysData] = await Promise.all([
          apiGet<RawMeeting[]>(`/meetings${qs}`).catch(() => []),
          apiGet<RawTask[]>(`/tasks${qs}`).catch(() => []),
          apiGet<any[]>(
            `/holidays/range?startDate=${rangeStart.toISOString()}&endDate=${rangeEnd.toISOString()}`
          ).catch(() => []),
        ]);
        if (!cancelled) {
          setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
          setTasks(Array.isArray(tasksData) ? tasksData : []);
          setHolidays(Array.isArray(holidaysData) ? holidaysData : []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message ?? "Failed to load calendar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [teamFilter, rangeStart, rangeEnd]);

  const events: CalendarEvent[] = useMemo(() => {
    // Include refreshKey to force recalculation when tasks are updated
    void refreshKey;
    const mappedMeetings: CalendarEvent[] = meetings
      .filter((m) => m.startTime)
      .map((m) => {
        try {
          const start = new Date(m.startTime);
          if (isNaN(start.getTime())) {
            console.warn("Invalid startTime for meeting:", m.id, m.startTime);
            return null;
          }
          const end = m.endTime ? new Date(m.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
          if (isNaN(end.getTime())) {
            console.warn("Invalid endTime for meeting:", m.id, m.endTime);
            return null;
          }
          return {
            id: `meeting-${m.id}`,
            entityId: m.id,
            type: "meeting" as const,
            title: m.title,
            start,
            end,
            allDay: false,
            teamName: m.team?.name ?? undefined,
            assigneeName: m.host?.name ?? undefined,
            status: m.status,
          };
        } catch (err) {
          console.error("Error mapping meeting:", m.id, err);
          return null;
        }
      })
      .filter((m) => m !== null) as CalendarEvent[];

    const mappedTasks: CalendarEvent[] = tasks
      .filter((t) => t.dueDate)
      .map((t) => {
        try {
          const due = new Date(t.dueDate as string);
          // Validate date
          if (isNaN(due.getTime())) {
            console.warn("Invalid dueDate for task:", t.id, t.dueDate);
            return null;
          }
          const start = startOfDay(due);
          const end = endOfDay(due);
          return {
            id: `task-${t.id}`,
            entityId: t.id,
            type: "task" as const,
            title: t.title,
            start,
            end,
            allDay: true,
            teamName: t.team?.name ?? undefined,
            assigneeName: t.assignee?.name ?? undefined,
            status: t.status ?? undefined,
            priority: t.priority ?? undefined,
          };
        } catch (err) {
          console.error("Error mapping task:", t.id, err);
          return null;
        }
      })
      .filter((t) => t !== null) as CalendarEvent[];

    const mappedHolidays: CalendarEvent[] = holidays.map((h) => {
      const date = new Date(h.date);
      const start = startOfDay(date);
      const end = endOfDay(date);
      return {
        id: `holiday-${h.id}`,
        entityId: h.id,
        type: "holiday",
        title: h.nameEn || h.name,
        start,
        end,
        allDay: true,
        status: h.type,
      };
    });

    return [...mappedMeetings, ...mappedTasks, ...mappedHolidays];
  }, [meetings, tasks, holidays, refreshKey]);

  const eventsInRange = useMemo(() => {
    return events.filter((e) => {
      // Check if event overlaps with the range
      // Event is in range if it starts before range ends and ends after range starts
      const overlaps = e.start <= rangeEnd && e.end >= rangeStart;
      if (!overlaps) return false;
      
      // Apply type filters
      if (e.type === "meeting" && !filterTypes.meetings) return false;
      if (e.type === "task" && !filterTypes.tasks) return false;
      if (e.type === "holiday" && !filterTypes.holidays) return false;
      
      return true;
    });
  }, [events, rangeStart, rangeEnd, filterTypes]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of eventsInRange) {
      try {
        const key = dateKey(ev.start);
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(ev);
      } catch (err) {
        console.error("Error processing event:", ev.id, err);
      }
    }
    // Sort each day's events
    for (const [, list] of map) {
      list.sort((a, b) => {
        // All-day events first, then by time
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return a.start.getTime() - b.start.getTime();
      });
    }
    return map;
  }, [eventsInRange]);

  const handlePrev = () => {
    if (view === "day") {
      setCurrentDate((d) => addDays(d, -1));
    } else if (view === "week") {
      setCurrentDate((d) => addDays(d, -7));
    } else {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (view === "day") {
      setCurrentDate((d) => addDays(d, 1));
    } else if (view === "week") {
      setCurrentDate((d) => addDays(d, 7));
    } else {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const ev = events.find((e) => e.id === id);
    if (ev) setActiveEvent(ev);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Handle both "day-YYYY-MM-DD" and "day-YYYY-MM-DD-all" / "day-YYYY-MM-DD-time" formats
    if (!overId.startsWith("day-")) return;

    const ev = events.find((e) => e.id === activeId);
    if (!ev) return;

    if (ev.type === "holiday") return;

    // Parse date from overId - handle formats like "day-2024-02-16" or "day-2024-02-16-all"
    const parts = overId.split("-");
    if (parts.length < 4) return;
    
    // Extract year, month, day from parts[1], parts[2], parts[3]
    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10);
    const day = parseInt(parts[3], 10);
    
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      console.error("Invalid date parts:", parts);
      return;
    }

    // Create new date with proper timezone handling
    const newStart = new Date(year, month - 1, day);
    const current = ev.start;
    
    // Preserve time for meetings, reset to start of day for tasks
    if (ev.type === "meeting") {
      newStart.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
      const duration = ev.end.getTime() - ev.start.getTime();
      const newEnd = new Date(newStart.getTime() + duration);
      
      // Optimistic update
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === ev.entityId
            ? {
                ...m,
                startTime: newStart.toISOString(),
                endTime: newEnd.toISOString(),
              }
            : m
        )
      );

      // Persist to backend
      try {
        await apiPatch(`/meetings/${ev.entityId}`, {
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        });
      } catch (err) {
        console.error("Failed to update meeting time", err);
        // Revert on error - reload data
        const qs = teamFilter !== "all" ? `?teamId=${encodeURIComponent(teamFilter)}` : "";
        const meetingsData = await apiGet<RawMeeting[]>(`/meetings${qs}`).catch(() => []);
        setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
      }
    } else {
      // For tasks, set to start of day
      newStart.setHours(0, 0, 0, 0);
      const newDueDate = newStart.toISOString();
      
      // Find the original task to preserve all properties
      const originalTask = tasks.find((t) => t.id === ev.entityId);
      if (!originalTask) {
        console.error("Task not found:", ev.entityId);
        return;
      }
      
      // Optimistic update - create completely new object and array to force re-render
      const updatedTasks = tasks.map((t) => {
        if (t.id === ev.entityId) {
          // Create completely new object with updated dueDate
          return {
            ...t,
            dueDate: newDueDate,
          };
        }
        // Return new object reference for all items to ensure React detects change
        return { ...t };
      });
      
      // Update state immediately with new array reference
      setTasks(updatedTasks);
      // Force refresh by updating refresh key to trigger memoization recalculation
      setRefreshKey((k) => k + 1);

      // Persist to backend
      try {
        await apiPatch(`/tasks/${ev.entityId}`, {
          dueDate: newDueDate,
        });
        // After successful update, reload tasks to ensure sync
        // This ensures the UI reflects the backend state correctly
        const qs = teamFilter !== "all" ? `?teamId=${encodeURIComponent(teamFilter)}` : "";
        const tasksData = await apiGet<RawTask[]>(`/tasks${qs}`).catch(() => []);
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        // Force refresh again after reload
        setRefreshKey((k) => k + 1);
      } catch (err) {
        console.error("Failed to update task due date", err);
        // Revert on error - reload data
        const qs = teamFilter !== "all" ? `?teamId=${encodeURIComponent(teamFilter)}` : "";
        const tasksData = await apiGet<RawTask[]>(`/tasks${qs}`).catch(() => []);
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setRefreshKey((k) => k + 1);
      }
    }
  };

  const titleLabel = useMemo(() => {
    if (view === "day") {
      return currentDate.toLocaleDateString("th-TH", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (view === "week") {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      const startLabel = start.toLocaleDateString("th-TH", {
        month: "short",
        day: "numeric",
      });
      const endLabel = end.toLocaleDateString("th-TH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${startLabel} – ${endLabel}`;
    }
    return currentDate.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    });
  }, [currentDate, view]);

  const isToday = (date: Date) => isSameDay(date, new Date());

  const workloadSummary = useMemo(() => {
    const summary = new Map<string, { meetings: number; tasks: number; holidays: number }>();
    for (const ev of eventsInRange) {
      const key = dateKey(ev.start);
      const item = summary.get(key) ?? { meetings: 0, tasks: 0, holidays: 0 };
      if (ev.type === "meeting") item.meetings += 1;
      else if (ev.type === "task") item.tasks += 1;
      else if (ev.type === "holiday") item.holidays += 1;
      summary.set(key, item);
    }
    return summary;
  }, [eventsInRange]);

  const stats = useMemo(() => {
    const totalMeetings = eventsInRange.filter((e) => e.type === "meeting").length;
    const totalTasks = eventsInRange.filter((e) => e.type === "task").length;
    const totalHolidays = eventsInRange.filter((e) => e.type === "holiday").length;
    return { totalMeetings, totalTasks, totalHolidays };
  }, [eventsInRange]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Modern Header */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="h-14 sm:h-16 md:h-20 flex items-center justify-between gap-2 sm:gap-4 md:gap-6">
              {/* Left: Logo & Title */}
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                    <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-background animate-pulse-soft" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground tracking-tight">Team Calendar</h1>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">
                    ดูการประชุม · กำหนดส่งงาน · วันหยุด · จัดการตารางงานของทีม
                  </p>
                </div>
              </div>

              {/* Right: View Toggle & Navigation */}
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
                {/* View Tabs - Hidden on mobile, shown in dropdown */}
                {!isMobile && (
                  <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                    <TabsList className="h-9 md:h-10 bg-muted/40 border border-border/50 p-1">
                      <TabsTrigger
                        value="day"
                        className={cn(
                          "h-7 md:h-8 px-3 md:px-4 text-[10px] md:text-xs font-medium transition-all duration-200",
                          "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50"
                        )}
                      >
                        <CalendarSearch className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" />
                        วัน
                      </TabsTrigger>
                      <TabsTrigger
                        value="week"
                        className={cn(
                          "h-7 md:h-8 px-3 md:px-4 text-[10px] md:text-xs font-medium transition-all duration-200",
                          "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50"
                        )}
                      >
                        <CalendarRange className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" />
                        สัปดาห์
                      </TabsTrigger>
                      <TabsTrigger
                        value="month"
                        className={cn(
                          "h-7 md:h-8 px-3 md:px-4 text-[10px] md:text-xs font-medium transition-all duration-200",
                          "data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50"
                        )}
                      >
                        <CalendarDays className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" />
                        เดือน
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
                
                {/* Mobile View Selector */
                {isMobile && (
                  <Select value={view} onValueChange={(v) => setView(v as ViewMode)}>
                    <SelectTrigger className="h-8 w-[100px] text-xs border-border/50 bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">วัน</SelectItem>
                      <SelectItem value="week">สัปดาห์</SelectItem>
                      <SelectItem value="month">เดือน</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                
                <div className="flex items-center gap-0.5 sm:gap-1 border border-border/50 rounded-lg p-0.5 sm:p-1 bg-muted/30">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-background"
                        onClick={handlePrev}
                      >
                        <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>ก่อนหน้า</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-background"
                        onClick={handleNext}
                      >
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>ถัดไป</TooltipContent>
                  </Tooltip>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 border-border/50 bg-background/50 hover:bg-background hidden sm:inline-flex"
                    onClick={handleToday}
                  >
                    วันนี้
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
          <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 sm:py-3 md:py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 flex-wrap">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-foreground truncate">{titleLabel}</h2>
                  <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 h-4 sm:h-5 bg-primary/10 text-primary border-primary/20">
                      {eventsInRange.length} รายการ
                    </Badge>
                    {stats.totalMeetings > 0 && (
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 h-4 sm:h-5 border-primary/30 text-primary bg-primary/5">
                        <Video className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 sm:mr-1" />
                        {stats.totalMeetings}
                      </Badge>
                    )}
                    {stats.totalTasks > 0 && (
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 h-4 sm:h-5 border-amber-300 text-amber-700 bg-amber-50">
                        <CheckSquare className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 sm:mr-1" />
                        {stats.totalTasks}
                      </Badge>
                    )}
                    {stats.totalHolidays > 0 && (
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 h-4 sm:h-5 border-red-300 text-red-700 bg-red-50">
                        <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 sm:mr-1" />
                        {stats.totalHolidays}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium hidden sm:inline">ทีม</span>
                  <Select value={teamFilter} onValueChange={setTeamFilter}>
                    <SelectTrigger className="h-8 sm:h-9 w-[120px] sm:w-[160px] md:w-[180px] text-[10px] sm:text-xs border-border/50 bg-background/50 hover:bg-background">
                      <SelectValue placeholder="ทุกทีม" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกทีม</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-9 text-xs gap-2 transition-all duration-200",
                        "border-border/60 bg-background hover:bg-muted hover:border-border",
                        "text-foreground hover:text-foreground",
                        "shadow-sm hover:shadow-md",
                        showFilters && "bg-primary/10 border-primary/50 text-primary ring-1 ring-primary/20"
                      )}
                      title="ตัวกรองเพิ่มเติม"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">ตัวกรอง</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4" align="end" sideOffset={8}>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">ตัวกรอง</h4>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="filter-meetings"
                              checked={filterTypes.meetings}
                              onCheckedChange={(checked) =>
                                setFilterTypes((prev) => ({ ...prev, meetings: checked as boolean }))
                              }
                            />
                            <Label
                              htmlFor="filter-meetings"
                              className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"
                            >
                              <Video className="w-4 h-4 text-primary" />
                              การประชุม
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="filter-tasks"
                              checked={filterTypes.tasks}
                              onCheckedChange={(checked) =>
                                setFilterTypes((prev) => ({ ...prev, tasks: checked as boolean }))
                              }
                            />
                            <Label
                              htmlFor="filter-tasks"
                              className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"
                            >
                              <CheckSquare className="w-4 h-4 text-amber-600" />
                              งาน
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="filter-holidays"
                              checked={filterTypes.holidays}
                              onCheckedChange={(checked) =>
                                setFilterTypes((prev) => ({ ...prev, holidays: checked as boolean }))
                              }
                            />
                            <Label
                              htmlFor="filter-holidays"
                              className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"
                            >
                              <Sparkles className="w-4 h-4 text-red-600" />
                              วันหยุด
                            </Label>
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs"
                          onClick={() => {
                            setFilterTypes({ meetings: true, tasks: true, holidays: true });
                          }}
                        >
                          รีเซ็ตทั้งหมด
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 sm:py-3 md:py-4 h-full flex flex-col">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground font-medium">กำลังโหลดปฏิทิน...</span>
                </div>
              </div>
            ) : error ? (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-destructive" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">โหลดปฏิทินไม่สำเร็จ</h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </CardContent>
              </Card>
            ) : (
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <AnimatePresence mode="wait">
                  {view === "month" ? (
                    <motion.div
                      key="month"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 overflow-x-auto"
                    >
                      {/* Weekday headers */}
                      {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
                        <div
                          key={day}
                          className="text-center py-1.5 sm:py-2 md:py-3 text-[9px] sm:text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 rounded sm:rounded-md md:rounded-lg"
                        >
                          {day}
                        </div>
                      ))}
                      {visibleDays.map((day) => {
                        const key = dateKey(day);
                        const dayEvents = eventsByDay.get(key) ?? [];
                        const summary = workloadSummary.get(key) ?? { meetings: 0, tasks: 0, holidays: 0 };
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        // Use events length as part of key to force re-render when events change
                        const eventsKey = `${key}-${dayEvents.length}-${dayEvents.map(e => e.id).join(',')}`;
                        return (
                          <motion.div
                            key={eventsKey}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Card
                              className={cn(
                                "border-border/50 bg-card/70 hover:bg-card hover:border-border/80 transition-all duration-300",
                                "hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1",
                                "ring-0 hover:ring-1 hover:ring-primary/20",
                                isToday(day) && "ring-2 ring-primary/50 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/70 shadow-lg",
                                !isCurrentMonth && "opacity-50"
                              )}
                            >
                              <CardHeader className="py-1.5 sm:py-2.5 md:py-3.5 px-1.5 sm:px-2.5 md:px-3.5 flex flex-row items-center justify-between bg-gradient-to-r from-transparent via-muted/10 to-transparent">
                                <div className="flex items-center gap-1 sm:gap-2 md:gap-2.5">
                                  <span
                                    className={cn(
                                      "text-xs sm:text-sm md:text-base font-bold transition-all duration-200",
                                      isToday(day) && "text-primary scale-110",
                                      !isCurrentMonth && "text-muted-foreground"
                                    )}
                                  >
                                    {day.getDate()}
                                  </span>
                                  {isToday(day) && (
                                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap">
                                  {summary.holidays > 0 && (
                                    <Badge className="bg-gradient-to-r from-red-100 via-red-50 to-red-100 text-red-900 border-0 text-[8px] sm:text-[9px] px-1 sm:px-2 h-3.5 sm:h-4.5 shadow-sm font-semibold">
                                      🎉
                                    </Badge>
                                  )}
                                  {summary.meetings > 0 && (
                                    <Badge className="bg-gradient-to-r from-primary/20 via-primary/15 to-primary/20 text-primary border-0 text-[8px] sm:text-[9px] px-1 sm:px-2 h-3.5 sm:h-4.5 shadow-sm font-semibold">
                                      {summary.meetings}
                                    </Badge>
                                  )}
                                  {summary.tasks > 0 && (
                                    <Badge className="bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 text-amber-900 border-0 text-[8px] sm:text-[9px] px-1 sm:px-2 h-3.5 sm:h-4.5 shadow-sm font-semibold">
                                      {summary.tasks}
                                    </Badge>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="px-1 sm:px-2 md:px-3 pb-1.5 sm:pb-2 md:pb-3">
                                <DroppableDay date={day} className="min-h-[40px] sm:min-h-[50px] md:min-h-[60px]">
                                  {dayEvents.slice(0, isMobile ? 2 : 3).map((ev) => (
                                    <DraggableEventCard key={`${ev.id}-${refreshKey}`} event={ev} />
                                  ))}
                                  {dayEvents.length > (isMobile ? 2 : 3) && (
                                    <div className="text-[8px] sm:text-[10px] text-muted-foreground mt-0.5 sm:mt-1 font-medium px-0.5 sm:px-1">
                                      +{dayEvents.length - (isMobile ? 2 : 3)} เพิ่มเติม
                                    </div>
                                  )}
                                </DroppableDay>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  ) : (
                    <motion.div
                      key={view}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="h-full"
                    >
                      <Card className="flex-1 border-border/50 bg-card/50 shadow-xl flex flex-col min-h-0">
                        <CardContent className="p-1.5 sm:p-3 md:p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                          <div className={cn(
                            "grid flex-1 gap-1 sm:gap-2 md:gap-3 min-h-0",
                            isMobile ? "grid-cols-1" : "grid-cols-[70px_minmax(0,1fr)]"
                          )}>
                            {/* Time column - Hidden on mobile */}
                            {!isMobile && (
                              <div className="flex flex-col text-xs text-muted-foreground pr-3 border-r border-border/60 shrink-0">
                                {Array.from({ length: 12 }).map((_, i) => {
                                  const hour = 8 + i;
                                  return (
                                    <div
                                      key={hour}
                                      className="h-12 flex items-start justify-end pr-2 pt-0.5"
                                    >
                                      <span className="font-medium text-[11px]">{`${hour.toString().padStart(2, "0")}:00`}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {/* Day columns */}
                            <div className="flex flex-col overflow-x-auto overflow-y-hidden min-w-0">
                              <div
                                className={cn(
                                  "grid gap-1 sm:gap-2 flex-1 min-h-0",
                                  view === "day" ? "grid-cols-1" : isMobile ? "grid-cols-1" : "grid-cols-7"
                                )}
                              >
                                {(view === "day" ? [currentDate] : visibleDays.slice(0, 7)).map(
                                  (day) => {
                                    const key = dateKey(day);
                                    const dayEvents = eventsByDay.get(key) ?? [];
                                    const allDayEvents = dayEvents.filter((e) => e.allDay);
                                    const timedEvents = dayEvents.filter((e) => !e.allDay);
                                    const summary =
                                      workloadSummary.get(key) ?? { meetings: 0, tasks: 0, holidays: 0 };
                                    // Use events as part of key to force re-render when events change
                                    const eventsKey = `${key}-${dayEvents.length}-${dayEvents.map(e => e.id).join(',')}`;
                                    return (
                                      <div key={eventsKey} className="flex flex-col min-w-0">
                                        {/* Column header */}
                                        <div className="flex items-center justify-between mb-1 sm:mb-2 px-1 sm:px-2">
                                          <div className="flex items-baseline gap-1 sm:gap-2">
                                            <span
                                              className={cn(
                                                "text-xs sm:text-sm font-bold",
                                                isToday(day) && "text-primary"
                                              )}
                                            >
                                              {day.toLocaleDateString("th-TH", {
                                                weekday: "short",
                                                day: "numeric",
                                              })}
                                            </span>
                                            {isToday(day) && (
                                              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary animate-pulse" />
                                            )}
                                          </div>
                                          <div className="flex items-center gap-0.5 sm:gap-1">
                                            {summary.holidays > 0 && (
                                              <Badge className="bg-red-100 text-red-900 border-0 text-[8px] sm:text-[9px] px-1 sm:px-1.5 h-3.5 sm:h-4">
                                                🎉
                                              </Badge>
                                            )}
                                            {summary.meetings > 0 && (
                                              <Badge className="bg-primary/10 text-primary border-0 text-[8px] sm:text-[9px] px-1 sm:px-1.5 h-3.5 sm:h-4">
                                                {summary.meetings}
                                              </Badge>
                                            )}
                                            {summary.tasks > 0 && (
                                              <Badge className="bg-amber-100 text-amber-900 border-0 text-[8px] sm:text-[9px] px-1 sm:px-1.5 h-3.5 sm:h-4">
                                                {summary.tasks}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>

                                        {/* All-day row */}
                                        <DroppableDay date={day} id={`day-${key}-all`} className="min-h-[30px] sm:min-h-[40px]">
                                          {allDayEvents.map((ev) => (
                                            <DraggableEventCard key={`${ev.id}-${refreshKey}`} event={ev} />
                                          ))}
                                        </DroppableDay>

                                        {/* Timed events grid */}
                                        <div className="mt-1 sm:mt-1.5 relative border border-border/60 rounded-md sm:rounded-lg bg-gradient-to-br from-muted/40 via-muted/25 to-background overflow-hidden shadow-md flex-1 min-h-0">
                                          <div className="absolute inset-0 pointer-events-none">
                                            {Array.from({ length: 12 }).map((_, i) => (
                                              <div
                                                key={i}
                                                className={cn(
                                                  "border-b border-border/40",
                                                  isMobile ? "h-10" : "h-12",
                                                  i === 0 && "border-t"
                                                )}
                                              />
                                            ))}
                                          </div>
                                          <DroppableDay date={day} id={`day-${key}-time`} className="h-full min-h-0">
                                            <div className="relative h-full overflow-y-auto pt-0.5 px-0.5 sm:px-1">
                                              {timedEvents.map((ev) => (
                                                <StaticEventCard key={`${ev.id}-${refreshKey}`} event={ev} />
                                              ))}
                                            </div>
                                          </DroppableDay>
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                <DragOverlay>
                  {activeEvent ? (
                    <div className="opacity-90">
                      <DraggableEventCard event={activeEvent} />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
