import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Task } from "./types";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "./types";
import { getInitials, isOverdue, formatShortDate } from "./utils";

interface KanbanCardProps {
  task: Task;
  index: number;
  onDropIndexChange: (index: number | null) => void;
  onClick: () => void;
}

export function KanbanCard({ task, index, onDropIndexChange, onClick }: KanbanCardProps) {
  const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const overdue = isOverdue(task);
  const subtasks = task.subtasks || [];
  const completedSubs = subtasks.filter((s) => s.isCompleted).length;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer?.setData("taskId", task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDropIndexChange(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    onDropIndexChange(null);
  };

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="cursor-grab active:cursor-grabbing">
      <div draggable onDragStart={handleDragStart} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className="contents">
        <Card
          className={cn(
            "group border-border/50 bg-card/80 hover:bg-card hover:border-border/80 transition-all duration-200 cursor-pointer",
            "hover:shadow-md hover:shadow-black/5 hover:-translate-y-0.5",
            overdue && "border-red-500/30 bg-red-500/5"
          )}
          onClick={onClick}
        >
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className={cn("text-[10px] px-1.5 py-0 h-5 font-medium border", pCfg.color)}>{pCfg.label}</Badge>
              {task.tags?.slice(0, 2).map((tag) => <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-5">{tag}</Badge>)}
              {(task.tags?.length || 0) > 2 && <span className="text-[10px] text-muted-foreground">+{task.tags!.length - 2}</span>}
            </div>
            <h4 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">{task.title}</h4>
            {subtasks.length > 0 && (
              <div className="flex items-center gap-2">
                <Progress value={(completedSubs / subtasks.length) * 100} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground shrink-0">{completedSubs}/{subtasks.length}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                {task.assignee ? (
                  <Tooltip>
                    <TooltipTrigger>
                      <Avatar className="h-5 w-5 border border-border/50">
                        <AvatarImage src={task.assignee.avatar || undefined} />
                        <AvatarFallback className="text-[8px]">{getInitials(task.assignee.name)}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">{task.assignee.name}</TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-dashed border-border/60 flex items-center justify-center">
                    <span className="text-[8px] text-muted-foreground">?</span>
                  </div>
                )}
              </div>
              {task.dueDate && (
                <span className={cn("text-[10px] flex items-center gap-1", overdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                  <CalendarIcon className="w-3 h-3" />
                  {formatShortDate(task.dueDate)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

interface KanbanColumnProps {
  status: string;
  tasks: Task[];
  onTaskClick: (t: Task) => void;
  onDrop: (taskId: string, newStatus: string, newPosition?: number) => void;
}

export function KanbanColumn({ status, tasks, onTaskClick, onDrop }: KanbanColumnProps) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
  const [dragOver, setDragOver] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => { setDragOver(false); setDropIndex(null); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setDropIndex(null);
    const id = e.dataTransfer.getData("taskId");
    if (id) {
      const position = dropIndex !== null ? dropIndex : tasks.length;
      onDrop(id, status, position);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col min-w-[260px] sm:min-w-[280px] md:max-w-[340px] w-[85vw] sm:w-full rounded-xl border bg-card/40 transition-all",
        dragOver ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10" : "border-border/50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="px-3 py-2.5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full", cfg.dotColor)} />
          <span className="text-xs font-semibold">{cfg.label}</span>
          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-340px)]">
        <AnimatePresence mode="popLayout">
          {tasks.map((task, index) => (
            <KanbanCard key={task.id} task={task} index={index} onDropIndexChange={setDropIndex} onClick={() => onTaskClick(task)} />
          ))}
        </AnimatePresence>
        {tasks.length === 0 && <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">No tasks</div>}
      </div>
    </div>
  );
}
