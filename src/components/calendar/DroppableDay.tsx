import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { dateKey } from "./utils";

interface DroppableDayProps {
  date: Date;
  children: React.ReactNode;
  id?: string;
  className?: string;
}

export function DroppableDay({ date, children, id, className }: DroppableDayProps) {
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