import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Clock, Users, Video, CheckSquare, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { CalendarEvent } from "./types";
import { dateKey, isSameDay } from "./utils";
import type { CSSProperties } from "react";

// ── constants ──────────────────────────────────────────────
const HOUR_START = 0;
const HOUR_END = 24;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const HOUR_HEIGHT = 64; // px per hour
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const GUTTER_WIDTH = 56; // px

// ── helpers ────────────────────────────────────────────────
function topPx(date: Date) {
  const mins = date.getHours() * 60 + date.getMinutes() - HOUR_START * 60;
  return (mins / 60) * HOUR_HEIGHT;
}

function heightPx(start: Date, end: Date) {
  const mins = (end.getTime() - start.getTime()) / 60000;
  return Math.max((mins / 60) * HOUR_HEIGHT, 22);
}

// ── column layout (prevent overlap) ───────────────────────
interface PositionedEvent extends CalendarEvent {
  col: number;
  colCount: number;
}

function layoutEvents(events: CalendarEvent[]): PositionedEvent[] {
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  const columns: CalendarEvent[][] = [];
  const result: PositionedEvent[] = [];

  for (const ev of sorted) {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const last = columns[c][columns[c].length - 1];
      if (last.end.getTime() <= ev.start.getTime()) {
        columns[c].push(ev);
        result.push({ ...ev, col: c, colCount: 0 });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([ev]);
      result.push({ ...ev, col: columns.length - 1, colCount: 0 });
    }
  }

  for (const ev of result) {
    let maxCol = ev.col;
    for (const other of result) {
      if (other.id === ev.id) continue;
      if (ev.start < other.end && ev.end > other.start && other.col > maxCol) {
        maxCol = other.col;
      }
    }
    ev.colCount = maxCol + 1;
  }

  return result;
}

// ── Timed event card ───────────────────────────────────────
function TimedEventCard({ event, refreshKey }: { event: PositionedEvent; refreshKey?: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.id });
  const colW = 100 / event.colCount;
  const h = heightPx(event.start, event.end);
  const isMeeting = event.type === "meeting";

  const style: CSSProperties = {
    position: "absolute",
    top: `${topPx(event.start)}px`,
    height: `${h}px`,
    left: `calc(${colW * event.col}% + 2px)`,
    width: `calc(${colW}% - 4px)`,
    zIndex: isDragging ? 50 : event.col + 1,
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      animate={{ opacity: isDragging ? 0.5 : 1 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "rounded-md px-2 py-1 text-xs border overflow-hidden select-none",
        "cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow duration-150",
        isMeeting
          ? "bg-gradient-to-br from-primary/25 via-primary/15 to-primary/10 border-primary/40"
          : "bg-gradient-to-br from-amber-50 via-amber-100/70 to-amber-50 border-amber-300/60 text-amber-900",
        isDragging && "ring-2 ring-primary/60 shadow-xl opacity-50"
      )}
    >
      <div className="flex items-start gap-1.5 h-full">
        <div className={cn("w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 mt-0.5", isMeeting ? "bg-primary/25" : "bg-amber-200/70")}>
          {isMeeting ? <Video className="w-2 h-2 text-primary" /> : <CheckSquare className="w-2 h-2 text-amber-700" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[10px] leading-tight truncate">{event.title}</div>
          {h >= 36 && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground/80 mt-0.5">
              <Clock className="w-2 h-2 shrink-0" />
              <span>{event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}
          {h >= 52 && (event.teamName || event.assigneeName) && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70 mt-0.5">
              <Users className="w-2 h-2 shrink-0" />
              <span className="truncate">{event.teamName ?? event.assigneeName}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── All-day chip ───────────────────────────────────────────
function AllDayChip({ event }: { event: CalendarEvent }) {
  const isHoliday = event.type === "holiday";
  const isTask = event.type === "task";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.id });
  const style: CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {};

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...(isHoliday ? {} : attributes)}
      {...(isHoliday ? {} : listeners)}
      animate={{ opacity: isDragging ? 0.5 : 1 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold mb-0.5 flex items-center gap-1 truncate border shadow-sm",
        isHoliday ? "bg-gradient-to-r from-red-100 to-red-50 border-red-200/70 text-red-800 cursor-default"
          : isTask ? "bg-gradient-to-r from-amber-100 to-amber-50 border-amber-200/70 text-amber-900 cursor-grab active:cursor-grabbing"
            : "bg-gradient-to-r from-primary/20 to-primary/10 border-primary/30 text-primary cursor-grab active:cursor-grabbing",
        isDragging && "ring-2 ring-primary/50"
      )}
    >
      {isHoliday && <Sparkles className="w-2.5 h-2.5 shrink-0 text-red-600" />}
      {isTask && <CheckSquare className="w-2.5 h-2.5 shrink-0 text-amber-700" />}
      {!isHoliday && !isTask && <Video className="w-2.5 h-2.5 shrink-0 text-primary" />}
      <span className="truncate">{event.title}</span>
    </motion.div>
  );
}

// ── Droppable zones ────────────────────────────────────────
function makeDayId(date: Date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function DroppableTimeColumn({ date, children }: { date: Date; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${makeDayId(date)}-time` });
  return (
    <div
      ref={setNodeRef}
      style={{ height: `${GRID_HEIGHT}px`, position: "relative", width: "100%" }}
      className={cn("transition-colors duration-150", isOver && "bg-primary/5")}
    >
      {children}
    </div>
  );
}

function DroppableAllDay({ date, children }: { date: Date; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${makeDayId(date)}` });
  return (
    <div
      ref={setNodeRef}
      className={cn("min-h-[28px] px-1 py-0.5 rounded transition-colors duration-150 border border-transparent", isOver && "bg-primary/10 border-primary/30")}
    >
      {children}
    </div>
  );
}

// ── Hour grid lines ────────────────────────────────────────
function HourLines() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => (
        <div key={i} className="absolute left-0 right-0 border-t border-border/25" style={{ top: `${i * HOUR_HEIGHT}px` }} />
      ))}
    </div>
  );
}

// ── Now indicator ──────────────────────────────────────────
function NowIndicator() {
  const top = topPx(new Date());
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: `${top}px` }}>
      <div className="w-2 h-2 rounded-full bg-primary shadow-md shrink-0 -ml-1" />
      <div className="flex-1 border-t-2 border-primary opacity-60" />
    </div>
  );
}

// ── Time gutter ────────────────────────────────────────────
function TimeGutter() {
  return (
    <div
      className="relative bg-muted/10 border-r border-border/40 select-none shrink-0"
      style={{ width: `${GUTTER_WIDTH}px`, height: `${GRID_HEIGHT}px` }}
    >
      {Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i).map((h) => (
        <div
          key={h}
          className="absolute right-2 text-[10px] font-medium text-muted-foreground/50 -translate-y-2.5"
          style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT}px` }}
        >
          {`${h.toString().padStart(2, "0")}:00`}
        </div>
      ))}
    </div>
  );
}

// ── Day column header ──────────────────────────────────────
function DayColumnHeader({ date, isToday, allDayEvents, meetings, tasks, holidays }: {
  date: Date; isToday: boolean; allDayEvents: CalendarEvent[];
  meetings: number; tasks: number; holidays: number;
}) {
  return (
    <div className="flex flex-col border-r border-border/30 last:border-r-0 min-w-0">
      <div className={cn("flex items-center gap-1.5 px-2 py-1.5 border-b border-border/40 flex-wrap", isToday && "bg-primary/5")}>
        <span className={cn("text-xs font-bold truncate", isToday ? "text-primary" : "text-foreground")}>
          {date.toLocaleDateString("th-TH", { weekday: "short", day: "numeric" })}
        </span>
        {isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
        <div className="flex items-center gap-0.5 ml-auto shrink-0">
          {holidays > 0 && <span className="text-[9px] bg-red-100 text-red-800 rounded px-1 border border-red-200/50">🎉{holidays}</span>}
          {meetings > 0 && <span className="text-[9px] bg-primary/10 text-primary rounded px-1 border border-primary/20">{meetings}</span>}
          {tasks > 0 && <span className="text-[9px] bg-amber-100 text-amber-800 rounded px-1 border border-amber-200/50">{tasks}</span>}
        </div>
      </div>
      <div className="px-1 py-0.5 border-b border-border/30 min-h-[28px] bg-muted/20">
        <DroppableAllDay date={date}>
          {allDayEvents.map((ev) => <AllDayChip key={ev.id} event={ev} />)}
        </DroppableAllDay>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────
export interface TimeGridProps {
  days: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  refreshKey?: number;
  isToday: (d: Date) => boolean;
}

export function TimeGrid({ days, eventsByDay, refreshKey = 0, isToday }: TimeGridProps) {
  const today = new Date();
  // ⚠️  Use inline style for dynamic grid — Tailwind cannot purge dynamic class strings
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${days.length}, minmax(0, 1fr))`,
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg">

      {/* sticky header */}
      <div className="border-b border-border/50 bg-card/90 shrink-0" style={gridStyle}>
        <div className="border-r border-border/40 bg-muted/20" style={{ width: `${GUTTER_WIDTH}px` }} />
        {days.map((day) => {
          const key = dateKey(day);
          const all = eventsByDay.get(key) ?? [];
          return (
            <DayColumnHeader
              key={key}
              date={day}
              isToday={isToday(day)}
              allDayEvents={all.filter((e) => e.allDay)}
              meetings={all.filter((e) => e.type === "meeting").length}
              tasks={all.filter((e) => e.type === "task").length}
              holidays={all.filter((e) => e.type === "holiday").length}
            />
          );
        })}
      </div>

      {/* scrollable body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <div style={gridStyle}>
          <TimeGutter />
          {days.map((day) => {
            const key = dateKey(day);
            const all = eventsByDay.get(key) ?? [];
            const timed = all.filter((e) => !e.allDay && e.type !== "holiday");
            const positioned = layoutEvents(timed);
            const isCurrentDay = isToday(day) && isSameDay(day, today);

            return (
              <div
                key={key}
                className={cn("border-r border-border/25 last:border-r-0 relative min-w-0", isCurrentDay && "bg-primary/[0.02]")}
              >
                <DroppableTimeColumn date={day}>
                  <HourLines />
                  {isCurrentDay && <NowIndicator />}
                  {positioned.map((ev) => (
                    <TimedEventCard key={`${ev.id}-${refreshKey}`} event={ev} refreshKey={refreshKey} />
                  ))}
                </DroppableTimeColumn>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}