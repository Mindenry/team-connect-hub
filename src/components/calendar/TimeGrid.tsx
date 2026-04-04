import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Clock, Users, Video, CheckSquare, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { CalendarEvent } from "./types";
import { dateKey, isSameDay } from "./utils";
import type { CSSProperties } from "react";

// ---- constants ----
const HOUR_START = 0;   // grid starts at 00:00
const HOUR_END = 24;    // grid ends at 24:00
const TOTAL_HOURS = HOUR_END - HOUR_START;
const HOUR_HEIGHT = 64; // px per hour
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT; // 1536px total

// ---- helpers ----
function minutesFromMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function topPx(date: Date) {
  return ((minutesFromMidnight(date) - HOUR_START * 60) / 60) * HOUR_HEIGHT;
}

function heightPx(start: Date, end: Date) {
  const mins = (end.getTime() - start.getTime()) / 60000;
  return Math.max((mins / 60) * HOUR_HEIGHT, 24); // min 24px
}

// ---- column layout to avoid overlap ----
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
      const col = columns[c];
      const last = col[col.length - 1];
      if (last.end.getTime() <= ev.start.getTime()) {
        col.push(ev);
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

  // assign colCount
  for (const ev of result) {
    // find max column index of overlapping events
    let maxCol = ev.col;
    for (const other of result) {
      if (other.id === ev.id) continue;
      const overlaps = ev.start < other.end && ev.end > other.start;
      if (overlaps && other.col > maxCol) maxCol = other.col;
    }
    ev.colCount = maxCol + 1;
  }

  return result;
}

// ---- Timed Event Card ----
interface TimedEventProps {
  event: PositionedEvent;
  refreshKey?: number;
}

function TimedEventCard({ event }: TimedEventProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.id });

  const top = topPx(event.start);
  const height = heightPx(event.start, event.end);
  const colW = 100 / event.colCount;
  const left = colW * event.col;

  const style: CSSProperties = {
    position: "absolute",
    top: `${top}px`,
    height: `${height}px`,
    left: `calc(${left}% + 2px)`,
    width: `calc(${colW}% - 4px)`,
    zIndex: isDragging ? 50 : event.col + 1,
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
  };

  const isMeeting = event.type === "meeting";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.97 : 1 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "rounded-md px-2 py-1 text-xs border cursor-grab active:cursor-grabbing shadow-sm overflow-hidden",
        "hover:shadow-md hover:z-10 transition-shadow duration-150",
        isMeeting
          ? "bg-gradient-to-br from-primary/25 via-primary/15 to-primary/10 border-primary/40 text-primary-foreground"
          : "bg-gradient-to-br from-amber-50 via-amber-100/70 to-amber-50 border-amber-300/60 text-amber-900",
        isDragging && "ring-2 ring-primary/60 shadow-xl"
      )}
    >
      <div className="flex items-start gap-1.5 h-full">
        <div className={cn("w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 mt-0.5", isMeeting ? "bg-primary/25" : "bg-amber-200/70")}>
          {isMeeting ? <Video className="w-2 h-2 text-primary" /> : <CheckSquare className="w-2 h-2 text-amber-700" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[10px] leading-tight truncate">{event.title}</div>
          {height >= 36 && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground/80 mt-0.5">
              <Clock className="w-2 h-2 shrink-0" />
              <span>{event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}
          {height >= 52 && (event.teamName || event.assigneeName) && (
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

// ---- All-Day Event row ----
function AllDayEventChip({ event, refreshKey }: { event: CalendarEvent; refreshKey?: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.id });
  const style: CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {};
  const isHoliday = event.type === "holiday";
  const isTask = event.type === "task";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...(isHoliday ? {} : attributes)}
      {...(isHoliday ? {} : listeners)}
      animate={{ opacity: isDragging ? 0.5 : 1 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "rounded px-2 py-0.5 text-[10px] font-semibold mb-0.5 flex items-center gap-1 truncate border",
        "shadow-sm",
        isHoliday
          ? "bg-gradient-to-r from-red-100 to-red-50 border-red-200/70 text-red-800 cursor-default"
          : isTask
            ? "bg-gradient-to-r from-amber-100 to-amber-50 border-amber-200/70 text-amber-900 cursor-grab active:cursor-grabbing"
            : "bg-gradient-to-r from-primary/20 to-primary/10 border-primary/30 text-primary cursor-grab active:cursor-grabbing",
        isDragging && "ring-2 ring-primary/50 opacity-50"
      )}
    >
      {isHoliday && <Sparkles className="w-2.5 h-2.5 shrink-0 text-red-600" />}
      {isTask && <CheckSquare className="w-2.5 h-2.5 shrink-0 text-amber-700" />}
      {!isHoliday && !isTask && <Video className="w-2.5 h-2.5 shrink-0 text-primary" />}
      <span className="truncate">{event.title}</span>
    </motion.div>
  );
}

// ---- Droppable time column ----
function DroppableTimeColumn({ date, children }: { date: Date; children: React.ReactNode }) {
  const id = `day-${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}-time`;
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ height: `${GRID_HEIGHT}px` }}
      className={cn(
        "relative w-full transition-colors duration-150",
        isOver && "bg-primary/5"
      )}
    >
      {children}
    </div>
  );
}

// ---- DroppableAllDay ----
function DroppableAllDay({ date, children }: { date: Date; children: React.ReactNode }) {
  const id = `day-${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[28px] px-1 py-0.5 rounded transition-colors duration-150 border border-transparent",
        isOver && "bg-primary/10 border-primary/30"
      )}
    >
      {children}
    </div>
  );
}

// ---- Hour grid lines ----
function HourLines() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-border/30"
          style={{ top: `${i * HOUR_HEIGHT}px` }}
        />
      ))}
    </div>
  );
}

// ---- Now indicator ----
function NowIndicator() {
  const now = new Date();
  const top = topPx(now);
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: `${top}px` }}>
      <div className="w-2 h-2 rounded-full bg-primary shadow-md shrink-0" />
      <div className="flex-1 border-t-2 border-primary border-dashed opacity-70" />
    </div>
  );
}

// ---- Time gutter ----
function TimeGutter() {
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);
  return (
    <div className="relative shrink-0 w-14 pr-2 select-none" style={{ height: `${GRID_HEIGHT}px` }}>
      {hours.map((h) => (
        <div
          key={h}
          className="absolute right-2 text-[10px] font-medium text-muted-foreground/60 -translate-y-2"
          style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT}px` }}
        >
          {`${h.toString().padStart(2, "0")}:00`}
        </div>
      ))}
    </div>
  );
}

// ---- Day column header ----
interface DayHeaderProps {
  date: Date;
  isToday: boolean;
  allDayEvents: CalendarEvent[];
  meetings: number;
  tasks: number;
  holidays: number;
  refreshKey?: number;
}

function DayColumnHeader({ date, isToday, allDayEvents, meetings, tasks, holidays, refreshKey }: DayHeaderProps) {
  return (
    <div className="flex flex-col border-r border-border/40 last:border-r-0">
      {/* date label */}
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1.5 border-b border-border/40",
        isToday && "bg-primary/5"
      )}>
        <span className={cn(
          "text-xs font-bold",
          isToday ? "text-primary" : "text-foreground"
        )}>
          {date.toLocaleDateString("th-TH", { weekday: "short", day: "numeric" })}
        </span>
        {isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
        <div className="flex items-center gap-0.5 ml-auto">
          {holidays > 0 && <span className="text-[9px] bg-red-100 text-red-800 rounded px-1 border border-red-200/50">🎉{holidays}</span>}
          {meetings > 0 && <span className="text-[9px] bg-primary/10 text-primary rounded px-1 border border-primary/20">{meetings}</span>}
          {tasks > 0 && <span className="text-[9px] bg-amber-100 text-amber-800 rounded px-1 border border-amber-200/50">{tasks}</span>}
        </div>
      </div>
      {/* all-day row */}
      <div className="px-1 py-0.5 border-b border-border/30 min-h-[28px] bg-muted/20">
        <DroppableAllDay date={date}>
          {allDayEvents.map((ev) => (
            <AllDayEventChip key={`${ev.id}-${refreshKey}`} event={ev} refreshKey={refreshKey} />
          ))}
        </DroppableAllDay>
      </div>
    </div>
  );
}

// ---- Main TimeGrid ----
export interface TimeGridProps {
  days: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  refreshKey?: number;
  isToday: (d: Date) => boolean;
}

export function TimeGrid({ days, eventsByDay, refreshKey = 0, isToday }: TimeGridProps) {
  const today = new Date();

  return (
    <div className="flex flex-col flex-1 overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg">
      {/* Header row */}
      <div className={cn(
        "grid border-b border-border/50 bg-card/80",
        days.length === 1 ? "grid-cols-[56px_1fr]" : `grid-cols-[56px_repeat(${days.length},minmax(0,1fr))]`
      )}>
        {/* gutter corner */}
        <div className="border-r border-border/40 bg-muted/20" />
        {days.map((day) => {
          const key = dateKey(day);
          const allEvents = eventsByDay.get(key) ?? [];
          const allDayEv = allEvents.filter((e) => e.allDay);
          const meetings = allEvents.filter((e) => e.type === "meeting").length;
          const tasks = allEvents.filter((e) => e.type === "task").length;
          const holidays = allEvents.filter((e) => e.type === "holiday").length;
          return (
            <DayColumnHeader
              key={key}
              date={day}
              isToday={isToday(day)}
              allDayEvents={allDayEv}
              meetings={meetings}
              tasks={tasks}
              holidays={holidays}
              refreshKey={refreshKey}
            />
          );
        })}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <div className={cn(
          "grid",
          days.length === 1 ? "grid-cols-[56px_1fr]" : `grid-cols-[56px_repeat(${days.length},minmax(0,1fr))]`
        )}>
          {/* Time gutter */}
          <div className="border-r border-border/40 bg-muted/10 sticky left-0">
            <TimeGutter />
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const key = dateKey(day);
            const allEvents = eventsByDay.get(key) ?? [];
            const timedEvents = allEvents.filter((e) => !e.allDay && e.type !== "holiday");
            const positioned = layoutEvents(timedEvents);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={key}
                className={cn(
                  "border-r border-border/30 last:border-r-0 relative",
                  isCurrentDay && "bg-primary/[0.02]"
                )}
              >
                <DroppableTimeColumn date={day}>
                  <HourLines />
                  {isCurrentDay && isSameDay(day, today) && <NowIndicator />}
                  {positioned.map((ev) => (
                    <TimedEventCard key={`${ev.id}-${refreshKey}`} event={ev} />
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