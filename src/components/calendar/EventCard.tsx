import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { Clock, Users, Video, CheckSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";
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
        <div className={cn("w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110", isHoliday ? "bg-red-200/70" : isMeeting ? "bg-primary/25" : "bg-amber-200/70")}>
          {isHoliday ? <Sparkles className="w-2.5 h-2.5 text-red-700" /> : isMeeting ? <Video className="w-2.5 h-2.5 text-primary" /> : <CheckSquare className="w-2.5 h-2.5 text-amber-700" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[10px] leading-tight truncate">{event.title}</div>
          {!event.allDay && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground/75 mt-0.5">
              <Clock className="w-2 h-2 shrink-0" />
              <span>{event.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {event.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}
          {event.allDay && <div className="text-[9px] text-muted-foreground/70 font-medium mt-0.5">ทั้งวัน</div>}
          {(event.teamName || event.assigneeName) && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70 mt-0.5">
              {event.teamName && <><Users className="w-2 h-2 shrink-0" /><span className="truncate">{event.teamName}</span></>}
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

export function StaticEventCard({ event }: { event: CalendarEvent }) {
  return <EventCardBase event={event} />;
}