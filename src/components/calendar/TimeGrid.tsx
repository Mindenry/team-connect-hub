import { useEffect, useRef, useState } from "react";
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

// ── column layout (interval graph coloring) ───────────────
interface PositionedEvent extends CalendarEvent {
  col: number;
  colCount: number;
}

function overlaps(a: CalendarEvent, b: CalendarEvent) {
  return a.start < b.end && a.end > b.start;
}

function layoutEvents(events: CalendarEvent[]): PositionedEvent[] {
  if (events.length === 0) return [];

  // Sort by start time, then by duration desc (longest first for better packing)
  const sorted = [...events].sort((a, b) => {
    const dt = a.start.getTime() - b.start.getTime();
    if (dt !== 0) return dt;
    return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
  });

  // Assign column indices with greedy interval coloring
  const colOf = new Map<string, number>();
  const colEnds: number[] = []; // tracks the end-time of the last event in each column

  for (const ev of sorted) {
    let placed = -1;
    for (let c = 0; c < colEnds.length; c++) {
      if (colEnds[c] <= ev.start.getTime()) {
        placed = c;
        break;
      }
    }
    if (placed === -1) {
      placed = colEnds.length;
      colEnds.push(0);
    }
    colOf.set(ev.id, placed);
    colEnds[placed] = ev.end.getTime();
  }

  // Build clique groups: for each event, find the max number of simultaneous overlaps
  // This gives us the true colCount for that event's clique
  const result: PositionedEvent[] = sorted.map((ev) => ({ ...ev, col: colOf.get(ev.id)!, colCount: 1 }));

  // For every pair, if they overlap, both need colCount >= max(col)+1 within their clique
  // We compute connected components of the overlap graph, then colCount = width of that component
  const idToResult = new Map(result.map((ev) => [ev.id, ev]));

  for (const ev of result) {
    let maxCol = ev.col;
    for (const other of result) {
      if (other.id !== ev.id && overlaps(ev, other)) {
        if (other.col > maxCol) maxCol = other.col;
      }
    }
    ev.colCount = maxCol + 1;
  }

  return result;
}

// ── Timed event card ───────────────────────────────────────
const MIN_SLOT_PX = 48; // below this slot width → ultra-compact dot mode

function TimedEventCard({ event, columnWidthPx = 120, refreshKey }: {
  event: PositionedEvent; columnWidthPx?: number; refreshKey?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.id });
  const h = heightPx(event.start, event.end);
  const isMeeting = event.type === "meeting";
  const slotPx = columnWidthPx / event.colCount;
  const isUltraCompact = slotPx < MIN_SLOT_PX;

  const style: CSSProperties = {
    position: "absolute",
    top: `${topPx(event.start)}px`,
    height: `${h}px`,
    left: `calc(${(100 / event.colCount) * event.col}% + 2px)`,
    width: `calc(${100 / event.colCount}% - 4px)`,
    zIndex: isDragging ? 50 : event.col + 2,
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
  };

  const tooltip = [
    event.title,
    `${event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    event.teamName ?? event.assigneeName,
  ].filter(Boolean).join("\n");

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      title={tooltip}
      animate={{ opacity: isDragging ? 0.4 : 1 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "rounded-md border overflow-hidden select-none",
        "cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md hover:ring-1 transition-all duration-150",
        isMeeting
          ? "bg-gradient-to-b from-primary/30 to-primary/15 border-primary/50 text-primary hover:ring-primary/30"
          : "bg-gradient-to-b from-amber-200/70 to-amber-100/50 border-amber-300/70 text-amber-900 hover:ring-amber-300/50",
        isDragging && "ring-2 ring-primary/60 shadow-xl"
      )}
    >
      {isUltraCompact || h < 24 ? (
        <div className="flex items-center justify-center h-full px-0.5">
          <div className={cn("w-1.5 h-1.5 rounded-full", isMeeting ? "bg-primary" : "bg-amber-500")} />
        </div>
      ) : (
        <div className="px-1.5 py-1 flex items-start gap-1 h-full overflow-hidden">
          <div className={cn("w-3 h-3 rounded flex items-center justify-center shrink-0 mt-0.5",
            isMeeting ? "bg-primary/30" : "bg-amber-300/60")}>
            {isMeeting ? <Video className="w-2 h-2" /> : <CheckSquare className="w-2 h-2 text-amber-700" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[10px] leading-tight truncate">{event.title}</div>
            {h >= 38 && (
              <div className="flex items-center gap-0.5 text-[9px] opacity-70 mt-0.5">
                <Clock className="w-2 h-2 shrink-0" />
                <span className="truncate">
                  {event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
            {h >= 56 && (event.teamName || event.assigneeName) && (
              <div className="flex items-center gap-0.5 text-[9px] opacity-60 mt-0.5">
                <Users className="w-2 h-2 shrink-0" />
                <span className="truncate">{event.teamName ?? event.assigneeName}</span>
              </div>
            )}
          </div>
        </div>
      )}
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

// ── Droppable time column with width measurement ───────────
function makeDayId(date: Date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function DayTimeColumn({ date, positioned, isCurrentDay, refreshKey }: {
  date: Date;
  positioned: PositionedEvent[];
  isCurrentDay: boolean;
  refreshKey: number;
}) {
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: `day-${makeDayId(date)}-time` });
  const colRef = useRef<HTMLDivElement>(null);
  const [colWidth, setColWidth] = useState(120);

  useEffect(() => {
    if (!colRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setColWidth(e.contentRect.width);
    });
    ro.observe(colRef.current);
    setColWidth(colRef.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={(el) => {
        dropRef(el);
        (colRef as any).current = el;
      }}
      style={{ height: `${GRID_HEIGHT}px`, position: "relative", width: "100%" }}
      className={cn("transition-colors duration-150", isOver && "bg-primary/5", isCurrentDay && "bg-primary/[0.02]")}
    >
      <HourLines />
      {isCurrentDay && <NowIndicator />}
      {positioned.map((ev) => (
        <TimedEventCard key={`${ev.id}-${refreshKey}`} event={ev} columnWidthPx={colWidth} refreshKey={refreshKey} />
      ))}
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
              <div key={key} className="border-r border-border/25 last:border-r-0 min-w-0">
                <DayTimeColumn
                  date={day}
                  positioned={positioned}
                  isCurrentDay={isCurrentDay}
                  refreshKey={refreshKey}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}