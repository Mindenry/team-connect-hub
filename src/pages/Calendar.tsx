import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
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

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
  id: string; // prefixed with type
  entityId: string; // underlying ID
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
  const day = d.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // make Monday = 0
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
  // IMPORTANT: use local date parts (NOT toISOString / UTC), otherwise the day shifts in non-UTC timezones.
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`; // YYYY-MM-DD (local)
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? dragAttributes : {})}
      {...(draggable ? dragListeners : {})}
      className={cn(
        "rounded-md px-2 py-1.5 text-xs mb-1 shadow-sm border",
        isHoliday
          ? "bg-red-50 border-red-200 text-red-900 cursor-default"
          : isMeeting
          ? "bg-primary/10 border-primary/30 text-primary-foreground cursor-grab active:cursor-grabbing"
          : "bg-amber-50 border-amber-200 text-amber-900 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-60 ring-2 ring-primary/40",
        className
      )}
    >
      <div className="flex items-center gap-1 mb-0.5">
        {isHoliday ? (
          <CalendarDays className="w-3 h-3 text-red-700" />
        ) : isMeeting ? (
          <Video className="w-3 h-3 text-primary" />
        ) : (
          <CheckSquare className="w-3 h-3 text-amber-700" />
        )}
        <span className="truncate font-medium">{event.title}</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {!event.allDay && (
          <>
            <Clock className="w-3 h-3" />
            <span>
              {event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
              {event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </>
        )}
        {event.allDay && <span>All day</span>}
      </div>
      {(event.teamName || event.assigneeName) && (
        <div className="flex items-center gap-1 text-[10px] mt-0.5">
          {event.teamName && (
            <>
              <Users className="w-3 h-3" />
              <span className="truncate">{event.teamName}</span>
            </>
          )}
          {!event.teamName && event.assigneeName && <span className="truncate">{event.assigneeName}</span>}
        </div>
      )}
    </div>
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
}

function DroppableDay({ date, children, id }: DroppableDayProps) {
  const droppableId = id ?? `day-${dateKey(date)}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col border rounded-md px-1.5 py-1.5 min-h-[90px] bg-background/80",
        isOver && "ring-2 ring-primary/40 bg-primary/5"
      )}
    >
      {children}
    </div>
  );
}

// --- Main Component ---

export default function TeamCalendar() {
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Load teams once
  useEffect(() => {
    let cancelled = false;
    const loadTeams = async () => {
      try {
        const res = await fetch(`${API_BASE}/teams`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setTeams(
            data.map((t: any) => ({
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

  // Visible date range based on view (calculate first)
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
    // month
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

  // Load meetings + tasks + holidays (filtered by team)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = teamFilter !== "all" ? `?teamId=${encodeURIComponent(teamFilter)}` : "";
        const [meetingsRes, tasksRes, holidaysRes] = await Promise.all([
          fetch(`${API_BASE}/meetings${qs}`),
          fetch(`${API_BASE}/tasks${qs}`),
          fetch(`${API_BASE}/holidays/range?startDate=${rangeStart.toISOString()}&endDate=${rangeEnd.toISOString()}`),
        ]);
        if (!meetingsRes.ok || !tasksRes.ok) {
          throw new Error("Failed to load calendar data");
        }
        const meetingsData = await meetingsRes.json();
        const tasksData = await tasksRes.json();
        const holidaysData = holidaysRes.ok ? await holidaysRes.json() : [];
        if (!cancelled) {
          setMeetings(meetingsData);
          setTasks(tasksData);
          setHolidays(holidaysData);
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

  // Map to unified events
  const events: CalendarEvent[] = useMemo(() => {
    const mappedMeetings: CalendarEvent[] = meetings
      .filter((m) => m.startTime)
      .map((m) => {
        const start = new Date(m.startTime);
        const end = m.endTime ? new Date(m.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
        return {
          id: `meeting-${m.id}`,
          entityId: m.id,
          type: "meeting",
          title: m.title,
          start,
          end,
          allDay: false,
          teamName: m.team?.name ?? undefined,
          assigneeName: m.host?.name ?? undefined,
          status: m.status,
        };
      });

    const mappedTasks: CalendarEvent[] = tasks
      .filter((t) => t.dueDate)
      .map((t) => {
        const due = new Date(t.dueDate as string);
        // Treat task deadlines as all-day events on that date
        const start = startOfDay(due);
        const end = endOfDay(due);
        return {
          id: `task-${t.id}`,
          entityId: t.id,
          type: "task",
          title: t.title,
          start,
          end,
          allDay: true,
          teamName: t.team?.name ?? undefined,
          assigneeName: t.assignee?.name ?? undefined,
          status: t.status ?? undefined,
          priority: t.priority ?? undefined,
        };
      });

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
  }, [meetings, tasks, holidays]);


  const eventsInRange = useMemo(
    () =>
      events.filter(
        (e) =>
          e.end >= rangeStart &&
          e.start <= rangeEnd
      ),
    [events, rangeStart, rangeEnd]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of eventsInRange) {
      const key = dateKey(ev.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    // sort each day by time + type
    for (const [, list] of map) {
      list.sort((a, b) => a.start.getTime() - b.start.getTime());
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
    if (!overId.startsWith("day-")) return;

    const ev = events.find((e) => e.id === activeId);
    if (!ev) return;

    // Don't allow dragging holidays
    if (ev.type === "holiday") return;

    const parts = overId.split("-");
    if (parts.length < 4) return;
    const [year, month, day] = parts.slice(1, 4).map((v) => parseInt(v, 10));
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return;

    const current = ev.start;
    const newStart = new Date(current);
    newStart.setFullYear(year, month - 1, day);

    let newEnd = new Date(ev.end);
    const duration = ev.end.getTime() - ev.start.getTime();
    if (ev.type === "meeting") {
      newEnd = new Date(newStart.getTime() + duration);
    } else {
      // tasks remain all-day on the new date
      newStart.setHours(0, 0, 0, 0);
      newEnd = endOfDay(newStart);
    }

    // Optimistic UI update
    if (ev.type === "meeting") {
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
    } else {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === ev.entityId
            ? {
                ...t,
                dueDate: newStart.toISOString(),
              }
            : t
        )
      );
    }

    // Persist to backend
    try {
      if (ev.type === "meeting") {
        await fetch(`${API_BASE}/meetings/${ev.entityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startTime: newStart.toISOString(),
            endTime: newEnd.toISOString(),
          }),
        });
      } else {
        await fetch(`${API_BASE}/tasks/${ev.entityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dueDate: newStart.toISOString(),
          }),
        });
      }
    } catch (err) {
      console.error("Failed to update event time", err);
      // Silently ignore for now; WebSocket updates from server will correct state if implemented
    }
  };

  const titleLabel = useMemo(() => {
    if (view === "day") {
      return currentDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (view === "week") {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      const startLabel = start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const endLabel = end.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${startLabel} – ${endLabel}`;
    }
    return currentDate.toLocaleDateString(undefined, {
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

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Team Calendar</h1>
            <p className="text-xs text-muted-foreground">
              View meetings, task deadlines, and team workload in one place
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="h-7 px-3 text-xs">
                <CalendarSearch className="w-3.5 h-3.5 mr-1" />
                Day
              </TabsTrigger>
              <TabsTrigger value="week" className="h-7 px-3 text-xs">
                <CalendarRange className="w-3.5 h-3.5 mr-1" />
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="h-7 px-3 text-xs">
                <CalendarDays className="w-3.5 h-3.5 mr-1" />
                Month
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleToday}>
              Today
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">{titleLabel}</h2>
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
            {eventsInRange.length} items
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Team</span>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Filter className="w-4 h-4 mr-1" />
            Filters
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading calendar...</span>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              Failed to load calendar: {error}
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {view === "month" ? (
              <div className="grid grid-cols-7 gap-2">
                {visibleDays.map((day) => {
                  const key = dateKey(day);
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const summary = workloadSummary.get(key) ?? { meetings: 0, tasks: 0 };
                  return (
                    <Card
                      key={key}
                      className={cn(
                        "border-muted bg-card/80",
                        isToday(day) && "border-primary/60 shadow-sm"
                      )}
                    >
                      <CardHeader className="py-2 px-2.5 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              isToday(day) && "text-primary"
                            )}
                          >
                            {day.getDate()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {summary.holidays > 0 && (
                            <Badge className="bg-red-100 text-red-900 border-0 text-[9px] px-1.5">
                              🎉
                            </Badge>
                          )}
                          {summary.meetings > 0 && (
                            <Badge className="bg-primary/10 text-primary border-0 text-[9px] px-1.5">
                              {summary.meetings} mtg
                            </Badge>
                          )}
                          {summary.tasks > 0 && (
                            <Badge className="bg-amber-100 text-amber-900 border-0 text-[9px] px-1.5">
                              {summary.tasks} task
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="px-2.5 pb-2">
                        <DroppableDay date={day}>
                          {dayEvents.slice(0, 4).map((ev) => (
                            <DraggableEventCard key={ev.id} event={ev} />
                          ))}
                          {dayEvents.length > 4 && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              +{dayEvents.length - 4} more
                            </p>
                          )}
                        </DroppableDay>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="h-full">
                <CardContent className="p-3 h-full">
                  <div className="grid grid-cols-[64px_minmax(0,1fr)] h-full">
                    {/* Time column */}
                    <div className="flex flex-col text-[10px] text-muted-foreground pr-2 border-r">
                      {Array.from({ length: 12 }).map((_, i) => {
                        const hour = 8 + i; // 8:00 - 19:00
                        return (
                          <div
                            key={hour}
                            className="h-10 flex items-start justify-end pr-1"
                          >
                            <span>{`${hour.toString().padStart(2, "0")}:00`}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Day columns */}
                    <div className="flex flex-col overflow-x-auto">
                      <div
                        className={cn(
                          "grid gap-2",
                          view === "day" ? "grid-cols-1" : "grid-cols-7"
                        )}
                      >
                        {(view === "day" ? [currentDate] : visibleDays.slice(0, 7)).map(
                          (day) => {
                            const key = dateKey(day);
                            const dayEvents = eventsByDay.get(key) ?? [];
                            const allDayEvents = dayEvents.filter((e) => e.allDay);
                            const timedEvents = dayEvents.filter((e) => !e.allDay);
                            const summary =
                              workloadSummary.get(key) ?? { meetings: 0, tasks: 0 };
                            return (
                              <div key={key} className="flex flex-col">
                                {/* Column header */}
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-baseline gap-1.5">
                                    <span
                                      className={cn(
                                        "text-xs font-medium",
                                        isToday(day) && "text-primary"
                                      )}
                                    >
                                      {day.toLocaleDateString(undefined, {
                                        weekday: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {summary.holidays > 0 && (
                                      <Badge className="bg-red-100 text-red-900 border-0 text-[9px] px-1.5">
                                        🎉
                                      </Badge>
                                    )}
                                    {summary.meetings > 0 && (
                                      <Badge className="bg-primary/10 text-primary border-0 text-[9px] px-1.5">
                                        {summary.meetings} mtg
                                      </Badge>
                                    )}
                                    {summary.tasks > 0 && (
                                      <Badge className="bg-amber-100 text-amber-900 border-0 text-[9px] px-1.5">
                                        {summary.tasks} task
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* All-day row */}
                                <DroppableDay date={day} id={`day-${key}-all`}>
                                  {allDayEvents.map((ev) => (
                                    <DraggableEventCard key={ev.id} event={ev} />
                                  ))}
                                </DroppableDay>

                                {/* Timed events grid */}
                                <div className="mt-1 relative border rounded-md bg-muted/40 overflow-hidden">
                                  <div className="absolute inset-0 pointer-events-none">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                      <div
                                        key={i}
                                        className={cn(
                                          "border-b border-border/40 h-10",
                                          i === 0 && "border-t"
                                        )}
                                      />
                                    ))}
                                  </div>
                                  <DroppableDay date={day} id={`day-${key}-time`}>
                                    <div className="relative h-[120px] overflow-y-auto pt-1">
                                      {timedEvents.map((ev) => (
                                        <StaticEventCard key={ev.id} event={ev} />
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
            )}

            <DragOverlay>
              {activeEvent ? <DraggableEventCard event={activeEvent} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

