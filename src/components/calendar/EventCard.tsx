import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { Clock, Users, Video, CheckSquare, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { CalendarEvent } from "./types";

interface EventCardBaseProps {
  event: CalendarEvent;
  className?: string;
  style?: CSSProperties;
  draggable?: boolean;
  dragAttributes?: Record<string, any>;
  dragListeners?: Record<string, any>;
  setNodeRef?: (node: HTMLElement | null) => void;
  isDragging?: boolean;
}

export function EventCardBase({ event, className, style, draggable, dragAttributes, dragListeners, setNodeRef, isDragging }: EventCardBaseProps) {
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
        "group rounded-md px-2 py-1.5 text-xs mb-1 shadow-sm border transition-all duration-200 overflow-hidden",
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
        <div className={cn("w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110", isHoliday ? "bg-red-200/70" : isMeeting ? "bg-primary/25" : "bg-amber-200/70")}>
          {isHoliday ? <Sparkles className="w-2.5 h-2.5 text-red-700" /> : isMeeting ? <Video className="w-2.5 h-2.5 text-primary" /> : <CheckSquare className="w-2.5 h-2.5 text-amber-700" />}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="font-semibold text-[11px] leading-tight line-clamp-2 break-words">{event.title}</div>
          {!event.allDay && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 mt-0.5 whitespace-nowrap">
              <Clock className="w-2.5 h-2.5 shrink-0" />
              <span>{event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}
          {event.allDay && <div className="text-[10px] text-muted-foreground/75 font-medium mt-0.5">ทั้งวัน</div>}
          {(event.teamName || event.assigneeName) && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/75 mt-0.5 min-w-0">
              {event.teamName && <><Users className="w-2.5 h-2.5 shrink-0" /><span className="truncate">{event.teamName}</span></>}
              {!event.teamName && event.assigneeName && <span className="truncate">{event.assigneeName}</span>}
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

export function DraggableEventCard({ event }: DraggableEventCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.id });
  const style: CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return <EventCardBase event={event} style={style} draggable dragAttributes={attributes} dragListeners={listeners} setNodeRef={setNodeRef} isDragging={isDragging} />;
}

export function StaticEventCard({ event, hourHeight = 48, startHour = 7, column = 0, totalColumns = 1 }: { event: CalendarEvent; hourHeight?: number; startHour?: number; column?: number; totalColumns?: number }) {
  const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
  const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();
  const startOffsetMinutes = startHour * 60;
  
  const top = Math.max(0, ((startMinutes - startOffsetMinutes) / 60) * hourHeight);
  const durationMinutes = Math.max(30, endMinutes - startMinutes);
  const height = (durationMinutes / 60) * hourHeight;
  const isCompact = height < 50;
  
  // Calculate width and position for overlapping events
  const columnWidth = 100 / totalColumns;
  const leftPercent = column * columnWidth;
  const width = totalColumns > 1 ? columnWidth - 1 : 100;
  
  const style: CSSProperties = {
    position: "absolute",
    top: `${top}px`,
    height: `${Math.max(height, 32)}px`,
    left: `${leftPercent}%`,
    width: `${width}%`,
    zIndex: 10 + column,
  };
  
  return <EventCardBase event={event} style={style} className={cn("mb-0", isCompact && "py-1")} />;
}

// Detect overlapping events and group them
function detectOverlaps(events: CalendarEvent[]): Map<string, { column: number; totalColumns: number }> {
  const assignments = new Map<string, { column: number; totalColumns: number }>();
  
  if (events.length === 0) return assignments;
  
  // Sort by start time
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  
  // Track columns with their end times
  const columns: { endTime: Date; events: string[] }[] = [];
  
  for (const event of sorted) {
    // Find first available column
    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      if (columns[i].endTime <= event.start) {
        columns[i].endTime = event.end;
        columns[i].events.push(event.id);
        placed = true;
        break;
      }
    }
    
    if (!placed) {
      columns.push({ endTime: event.end, events: [event.id] });
    }
  }
  
  const totalColumns = columns.length;
  
  // Assign column positions
  for (let colIndex = 0; colIndex < columns.length; colIndex++) {
    for (const eventId of columns[colIndex].events) {
      assignments.set(eventId, { column: colIndex, totalColumns });
    }
  }
  
  return assignments;
}

// Component to render overlapping events properly
export function OverlappingEventGrid({ events, hourHeight = 48, startHour = 7 }: { events: CalendarEvent[]; hourHeight?: number; startHour?: number }) {
  const overlapAssignments = useMemo(() => detectOverlaps(events), [events]);
  
  return (
    <>
      {events.map((event) => {
        const assignment = overlapAssignments.get(event.id) ?? { column: 0, totalColumns: 1 };
        return (
          <StaticEventCard
            key={event.id}
            event={event}
            hourHeight={hourHeight}
            startHour={startHour}
            column={assignment.column}
            totalColumns={assignment.totalColumns}
          />
        );
      })}
    </>
  );
}

// Time period categorization for overflow events
function getTimePeriod(hour: number): { label: string; icon: string; color: string } {
  if (hour < 6) return { label: "Late Night", icon: "🌙", color: "text-indigo-600 bg-indigo-50" };
  if (hour < 9) return { label: "Early Morning", icon: "🌅", color: "text-orange-600 bg-orange-50" };
  if (hour < 12) return { label: "Morning", icon: "☀️", color: "text-yellow-600 bg-yellow-50" };
  if (hour < 15) return { label: "Afternoon", icon: "🌤️", color: "text-blue-600 bg-blue-50" };
  if (hour < 18) return { label: "Late Afternoon", icon: "🌥️", color: "text-cyan-600 bg-cyan-50" };
  if (hour < 21) return { label: "Evening", icon: "🌆", color: "text-purple-600 bg-purple-50" };
  return { label: "Night", icon: "🌙", color: "text-slate-600 bg-slate-50" };
}

// Group events by time period
function groupEventsByPeriod(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>();
  
  for (const event of events) {
    const hour = event.start.getHours();
    const period = getTimePeriod(hour);
    if (!groups.has(period.label)) groups.set(period.label, []);
    groups.get(period.label)!.push(event);
  }
  
  return groups;
}

// Interactive overflow button with time context
export function OverflowIndicator({ 
  hiddenEvents, 
  date 
}: { 
  hiddenEvents: CalendarEvent[]; 
  date: Date;
}) {
  const [open, setOpen] = useState(false);
  const groupedEvents = useMemo(() => groupEventsByPeriod(hiddenEvents), [hiddenEvents]);
  
  if (hiddenEvents.length === 0) return null;
  
  // Calculate density color based on event count
  const densityColor = hiddenEvents.length >= 8 
    ? "bg-red-100 text-red-700 border-red-300 hover:bg-red-200" 
    : hiddenEvents.length >= 5 
      ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200" 
      : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20";
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-md border transition-all duration-200 flex items-center justify-center gap-1",
            densityColor
          )}
        >
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            +{hiddenEvents.length} more
          </span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="center" sideOffset={4}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground">
              {hiddenEvents.length} Hidden Events
            </h4>
            <Badge variant="secondary" className="text-[10px]">
              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Badge>
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-3">
            {Array.from(groupedEvents.entries()).map(([period, events]) => {
              const periodInfo = getTimePeriod(events[0].start.getHours());
              return (
                <div key={period}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-sm">{periodInfo.icon}</span>
                    <span className="text-[11px] font-semibold text-muted-foreground">{period}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">{events.length}</Badge>
                  </div>
                  <div className="space-y-1 pl-5">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded text-[11px] border",
                          event.type === "meeting" 
                            ? "bg-primary/10 border-primary/30 text-primary" 
                            : event.type === "task"
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-red-50 border-red-200 text-red-700"
                        )}
                      >
                        <span className="font-medium truncate flex-1">{event.title}</span>
                        {!event.allDay && (
                          <span className="text-[10px] opacity-75">
                            {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
