import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Clock, Users, Video, CheckSquare, Sparkles, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CalendarEvent } from "./types";
import { dateKey, isSameDay } from "./utils";
import type { CSSProperties } from "react";
import { useState } from "react";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const HOUR_HEIGHT       = 64;
const TOTAL_HOURS       = 24;
const GRID_HEIGHT       = TOTAL_HOURS * HOUR_HEIGHT;
const GUTTER_WIDTH      = 56;
const MAX_VISIBLE_COLS  = 3;   // max side-by-side columns before overflow kicks in
const MIN_EVENT_HEIGHT  = 22;

// ─────────────────────────────────────────────────────────────
// Pixel helpers
// ─────────────────────────────────────────────────────────────
function topPx(date: Date) {
  return (date.getHours() * 60 + date.getMinutes()) / 60 * HOUR_HEIGHT;
}
function heightPx(start: Date, end: Date) {
  const mins = (end.getTime() - start.getTime()) / 60_000;
  return Math.max((mins / 60) * HOUR_HEIGHT, MIN_EVENT_HEIGHT);
}
function makeDayId(date: Date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─────────────────────────────────────────────────────────────
// Layout: greedy interval coloring capped at MAX_VISIBLE_COLS
// ─────────────────────────────────────────────────────────────
interface PositionedEvent extends CalendarEvent {
  col: number;
  colCount: number;
}
interface LayoutResult {
  visible: PositionedEvent[];
  overflow: Map<string, CalendarEvent[]>; // slotKey -> hidden events
}

function overlaps(a: CalendarEvent, b: CalendarEvent) {
  return a.start < b.end && a.end > b.start;
}

function layoutEvents(events: CalendarEvent[]): LayoutResult {
  if (events.length === 0) return { visible: [], overflow: new Map() };

  const sorted = [...events].sort((a, b) => {
    const dt = a.start.getTime() - b.start.getTime();
    if (dt !== 0) return dt;
    return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
  });

  const colOf  = new Map<string, number>();
  const colEnds: number[] = [];

  for (const ev of sorted) {
    let placed = -1;
    for (let c = 0; c < colEnds.length && c < MAX_VISIBLE_COLS; c++) {
      if (colEnds[c] <= ev.start.getTime()) { placed = c; break; }
    }
    if (placed === -1 && colEnds.length < MAX_VISIBLE_COLS) {
      placed = colEnds.length;
      colEnds.push(0);
    }
    colOf.set(ev.id, placed);
    if (placed >= 0) colEnds[placed] = ev.end.getTime();
  }

  const positioned: PositionedEvent[] = [];
  const overflowed: CalendarEvent[]   = [];

  for (const ev of sorted) {
    const col = colOf.get(ev.id) ?? -1;
    if (col === -1) overflowed.push(ev);
    else positioned.push({ ...ev, col, colCount: 1 });
  }

  // true colCount per event = max col index in its overlap group + 1
  for (const ev of positioned) {
    let maxCol = ev.col;
    for (const other of positioned) {
      if (other.id !== ev.id && overlaps(ev, other) && other.col > maxCol) maxCol = other.col;
    }
    ev.colCount = maxCol + 1;
  }

  // group overflow by start minute so we render one pill per burst
  const overflow = new Map<string, CalendarEvent[]>();
  for (const ev of overflowed) {
    const key = `${ev.start.getHours()}:${ev.start.getMinutes()}`;
    if (!overflow.has(key)) overflow.set(key, []);
    overflow.get(key)!.push(ev);
  }

  return { visible: positioned, overflow };
}

// ─────────────────────────────────────────────────────────────
// Overflow pill — click to see hidden events
// ─────────────────────────────────────────────────────────────
function OverflowPill({ events, top }: { events: CalendarEvent[]; top: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "absolute", top: `${top + 2}px`, right: "3px", zIndex: 30 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="flex items-center gap-1 rounded-full bg-background border border-border/70 shadow-sm px-2 py-0.5 text-[9px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <MoreHorizontal className="w-2.5 h-2.5" />
        +{events.length}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-7 z-50 w-56 rounded-xl border border-border/60 bg-popover/95 backdrop-blur shadow-2xl p-2 space-y-1.5"
            >
              <p className="text-[10px] font-semibold text-muted-foreground px-1 pb-1 border-b border-border/40">
                {events.length} รายการซ่อนอยู่
              </p>
              {events.map((ev) => (
                <div key={ev.id} className={cn(
                  "rounded-lg px-2 py-1.5 text-[10px] border flex items-start gap-1.5",
                  ev.type === "meeting"
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-amber-50 border-amber-200/70 text-amber-900"
                )}>
                  {ev.type === "meeting"
                    ? <Video className="w-2.5 h-2.5 mt-0.5 shrink-0" />
                    : <CheckSquare className="w-2.5 h-2.5 mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <div className="font-semibold truncate leading-tight">{ev.title}</div>
                    <div className="text-[9px] opacity-60 flex items-center gap-0.5 mt-0.5">
                      <Clock className="w-2 h-2" />
                      {ev.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {ev.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {ev.teamName && (
                      <div className="text-[9px] opacity-50 flex items-center gap-0.5 mt-0.5">
                        <Users className="w-2 h-2" />{ev.teamName}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Timed event card (draggable, absolute)
// ─────────────────────────────────────────────────────────────
function TimedEventCard({ event, refreshKey }: { event: PositionedEvent; refreshKey?: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.id });
  const h     = heightPx(event.start, event.end);
  const isMtg = event.type === "meeting";

  const style: CSSProperties = {
    position : "absolute",
    top      : `${topPx(event.start)}px`,
    height   : `${h}px`,
    left     : `calc(${(100 / event.colCount) * event.col}% + 2px)`,
    width    : `calc(${100 / event.colCount}% - 4px)`,
    zIndex   : isDragging ? 50 : event.col + 2,
    ...(transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` } : {}),
  };

  const tooltip = [
    event.title,
    `${event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    event.teamName ?? event.assigneeName,
  ].filter(Boolean).join("\n");

  return (
    <motion.div
      ref={setNodeRef} style={style}
      {...attributes} {...listeners}
      title={tooltip}
      animate={{ opacity: isDragging ? 0.3 : 1 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "rounded-md border overflow-hidden select-none",
        "cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md hover:ring-1 transition-all duration-150",
        isMtg
          ? "bg-gradient-to-b from-primary/30 to-primary/15 border-primary/50 text-primary hover:ring-primary/40"
          : "bg-gradient-to-b from-amber-200/80 to-amber-100/60 border-amber-300/80 text-amber-900 hover:ring-amber-300/60",
        isDragging && "ring-2 ring-primary/60 shadow-2xl"
      )}
    >
      {h < 28 ? (
        // micro — title only, no icon
        <div className="px-1.5 h-full flex items-center overflow-hidden">
          <span className="text-[9px] font-semibold truncate leading-none">{event.title}</span>
        </div>
      ) : (
        <div className="px-1.5 py-1 flex items-start gap-1 h-full overflow-hidden">
          <div className={cn("w-3 h-3 rounded flex items-center justify-center shrink-0 mt-0.5",
            isMtg ? "bg-primary/30" : "bg-amber-300/60")}>
            {isMtg ? <Video className="w-2 h-2" /> : <CheckSquare className="w-2 h-2 text-amber-700" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[10px] leading-tight truncate">{event.title}</div>
            {h >= 44 && (
              <div className="flex items-center gap-0.5 text-[9px] opacity-70 mt-0.5">
                <Clock className="w-2 h-2 shrink-0" />
                <span className="truncate">
                  {event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}
            {h >= 62 && (event.teamName || event.assigneeName) && (
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

// ─────────────────────────────────────────────────────────────
// All-day chip
// ─────────────────────────────────────────────────────────────
function AllDayChip({ event }: { event: CalendarEvent }) {
  const isHoliday = event.type === "holiday";
  const isTask    = event.type === "task";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.id });
  const style: CSSProperties = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` } : {};

  return (
    <motion.div
      ref={setNodeRef} style={style}
      {...(isHoliday ? {} : attributes)}
      {...(isHoliday ? {} : listeners)}
      animate={{ opacity: isDragging ? 0.5 : 1 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold mb-0.5 flex items-center gap-1 truncate border shadow-sm",
        isHoliday
          ? "bg-gradient-to-r from-red-100 to-red-50 border-red-200/70 text-red-800 cursor-default"
          : isTask
            ? "bg-gradient-to-r from-amber-100 to-amber-50 border-amber-200/70 text-amber-900 cursor-grab active:cursor-grabbing"
            : "bg-gradient-to-r from-primary/20 to-primary/10 border-primary/30 text-primary cursor-grab active:cursor-grabbing",
        isDragging && "ring-2 ring-primary/50"
      )}
    >
      {isHoliday && <Sparkles    className="w-2.5 h-2.5 shrink-0 text-red-600" />}
      {isTask     && <CheckSquare className="w-2.5 h-2.5 shrink-0 text-amber-700" />}
      {!isHoliday && !isTask && <Video className="w-2.5 h-2.5 shrink-0 text-primary" />}
      <span className="truncate">{event.title}</span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Droppable all-day zone
// ─────────────────────────────────────────────────────────────
function DroppableAllDay({ date, children }: { date: Date; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${makeDayId(date)}` });
  return (
    <div ref={setNodeRef} className={cn(
      "min-h-[28px] px-1 py-0.5 rounded border border-transparent transition-colors duration-150",
      isOver && "bg-primary/10 border-primary/30"
    )}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Grid lines
// ─────────────────────────────────────────────────────────────
function HourLines() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
        <div key={i} className="absolute left-0 right-0 border-t border-border/20"
          style={{ top: `${i * HOUR_HEIGHT}px` }} />
      ))}
      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
        <div key={`h${i}`} className="absolute left-3 right-0 border-t border-border/10 border-dashed"
          style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }} />
      ))}
    </div>
  );
}

function NowIndicator() {
  const top = topPx(new Date());
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
      style={{ top: `${top}px` }}>
      <div className="w-2 h-2 rounded-full bg-destructive shadow shrink-0 -ml-1" />
      <div className="flex-1 border-t-2 border-destructive/70" />
    </div>
  );
}

function TimeGutter() {
  return (
    <div className="relative bg-muted/10 border-r border-border/40 select-none shrink-0"
      style={{ width: `${GUTTER_WIDTH}px`, height: `${GRID_HEIGHT}px` }}>
      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
        <div key={i}
          className="absolute right-2 text-[10px] font-medium text-muted-foreground/50 -translate-y-2.5"
          style={{ top: `${i * HOUR_HEIGHT}px` }}>
          {`${i.toString().padStart(2, "0")}:00`}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Day column header
// ─────────────────────────────────────────────────────────────
function DayColumnHeader({ date, isToday, allDayEvents, meetings, tasks, holidays }: {
  date: Date; isToday: boolean; allDayEvents: CalendarEvent[];
  meetings: number; tasks: number; holidays: number;
}) {
  return (
    <div className="flex flex-col border-r border-border/30 last:border-r-0 min-w-0">
      <div className={cn("flex items-center gap-1 px-2 py-1.5 border-b border-border/40 flex-wrap", isToday && "bg-primary/5")}>
        <span className={cn("text-xs font-bold truncate", isToday ? "text-primary" : "text-foreground")}>
          {date.toLocaleDateString("th-TH", { weekday: "short", day: "numeric" })}
        </span>
        {isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
        <div className="flex items-center gap-0.5 ml-auto shrink-0">
          {holidays > 0 && <span className="text-[9px] bg-red-100 text-red-700 rounded px-1 border border-red-200/50">🎉{holidays}</span>}
          {meetings > 0 && <span className="text-[9px] bg-primary/10 text-primary rounded px-1 border border-primary/20">{meetings}</span>}
          {tasks    > 0 && <span className="text-[9px] bg-amber-100 text-amber-700 rounded px-1 border border-amber-200/50">{tasks}</span>}
        </div>
      </div>
      <div className="px-1 py-0.5 border-b border-border/30 min-h-[28px] bg-muted/10">
        <DroppableAllDay date={date}>
          {allDayEvents.map((ev) => <AllDayChip key={ev.id} event={ev} />)}
        </DroppableAllDay>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Day time body — droppable, events, overflow pills
// ─────────────────────────────────────────────────────────────
function DayTimeBody({ date, allEvents, isCurrentDay, refreshKey }: {
  date: Date; allEvents: CalendarEvent[]; isCurrentDay: boolean; refreshKey: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${makeDayId(date)}-time` });
  const timed = allEvents.filter((e) => !e.allDay && e.type !== "holiday");
  const { visible, overflow } = layoutEvents(timed);

  return (
    <div
      ref={setNodeRef}
      style={{ height: `${GRID_HEIGHT}px`, position: "relative", width: "100%" }}
      className={cn(
        "transition-colors duration-200",
        isOver       && "bg-primary/5",
        isCurrentDay && "bg-primary/[0.025]"
      )}
    >
      <HourLines />
      {isCurrentDay && <NowIndicator />}

      {visible.map((ev) => (
        <TimedEventCard key={`${ev.id}-${refreshKey}`} event={ev} refreshKey={refreshKey} />
      ))}

      {Array.from(overflow.entries()).map(([slotKey, evs]) => (
        <OverflowPill key={slotKey} events={evs} top={topPx(evs[0].start)} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────
export interface TimeGridProps {
  days: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  refreshKey?: number;
  isToday: (d: Date) => boolean;
}

export function TimeGrid({ days, eventsByDay, refreshKey = 0, isToday }: TimeGridProps) {
  const today = new Date();
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${days.length}, minmax(0, 1fr))`,
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg">

      {/* sticky header */}
      <div className="border-b border-border/50 bg-card/95 shrink-0" style={gridStyle}>
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
      <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth">
        <div style={gridStyle}>
          <TimeGutter />
          {days.map((day) => {
            const key = dateKey(day);
            const all = eventsByDay.get(key) ?? [];
            return (
              <div key={key} className="border-r border-border/20 last:border-r-0 min-w-0">
                <DayTimeBody
                  date={day}
                  allEvents={all}
                  isCurrentDay={isToday(day) && isSameDay(day, today)}
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