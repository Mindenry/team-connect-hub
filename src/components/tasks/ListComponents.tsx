import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarIcon, CheckSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Task } from "./types";
import { PRIORITY_CONFIG, STATUS_CONFIG, ALL_STATUSES } from "./types";
import { getInitials, isOverdue, formatShortDate, containerVariants, itemVariants } from "./utils";

interface TaskListRowProps {
  task: Task;
  index: number;
  onClick: () => void;
}

export function TaskListRow({ task, index, onClick }: TaskListRowProps) {
  const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const sCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const overdue = isOverdue(task);
  const subtasks = task.subtasks || [];
  const completedSubs = subtasks.filter((s) => s.isCompleted).length;

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.02, duration: 0.25 }}>
      <Card
        className={cn(
          "group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-200 cursor-pointer",
          "hover:shadow-md hover:shadow-black/5 ring-0 hover:ring-1 hover:ring-primary/10",
          overdue && "border-red-500/20"
        )}
        onClick={onClick}
      >
        <CardContent className="p-3 sm:p-3.5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={cn("w-2 h-2 rounded-full shrink-0", pCfg.dotColor)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">{task.title}</h4>
                {overdue && <Badge variant="outline" className="text-[9px] px-1 py-0 border-red-500/40 text-red-500 shrink-0">Overdue</Badge>}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Badge className={cn("text-[9px] px-1.5 py-0 h-4 font-medium border", sCfg.bgColor, sCfg.color)}>{sCfg.label}</Badge>
                {task.team && <span>{task.team.name}</span>}
                {task.tags?.slice(0, 2).map((tag) => <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 h-4">{tag}</Badge>)}
              </div>
            </div>
            {subtasks.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <CheckSquare className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{completedSubs}/{subtasks.length}</span>
              </div>
            )}
            {task.dueDate && (
              <span className={cn("text-[10px] flex items-center gap-1 shrink-0", overdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                <CalendarIcon className="w-3 h-3" />
                {formatShortDate(task.dueDate)}
              </span>
            )}
            <Badge className={cn("text-[9px] px-1.5 py-0 h-5 font-medium border shrink-0 hidden sm:flex", pCfg.color)}>{pCfg.label}</Badge>
            {task.assignee ? (
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-6 w-6 border border-border/50 shrink-0">
                    <AvatarImage src={task.assignee.avatar || undefined} />
                    <AvatarFallback className="text-[8px]">{getInitials(task.assignee.name)}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">{task.assignee.name}</TooltipContent>
              </Tooltip>
            ) : (
              <div className="w-6 h-6 rounded-full border border-dashed border-border/60 flex items-center justify-center shrink-0">
                <span className="text-[8px] text-muted-foreground">?</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick: (t: Task) => void;
  groupBy: string;
}

export function TaskListView({ tasks, onTaskClick, groupBy }: TaskListViewProps) {
  const grouped: [string, Task[]][] = useMemo(() => {
    if (groupBy === "status") {
      const groups: Record<string, Task[]> = {};
      ALL_STATUSES.forEach((s) => (groups[s] = []));
      tasks.forEach((t) => {
        const key = ALL_STATUSES.includes(t.status as any) ? t.status : "todo";
        groups[key].push(t);
      });
      return Object.entries(groups).filter(([, v]) => v.length > 0);
    }
    if (groupBy === "priority") {
      const order = ["urgent", "high", "medium", "low"];
      const groups: Record<string, Task[]> = {};
      order.forEach((p) => (groups[p] = []));
      tasks.forEach((t) => {
        const key = order.includes(t.priority) ? t.priority : "medium";
        groups[key].push(t);
      });
      return Object.entries(groups).filter(([, v]) => v.length > 0);
    }
    if (groupBy === "team") {
      const groups: Record<string, Task[]> = {};
      tasks.forEach((t) => {
        const key = t.team?.name || "No Team";
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }
    if (groupBy === "assignee") {
      const groups: Record<string, Task[]> = {};
      tasks.forEach((t) => {
        const key = t.assignee?.name || "Unassigned";
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }
    return [["All Tasks", tasks]];
  }, [tasks, groupBy]);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      {grouped.map(([groupName, groupTasks]) => (
        <motion.div key={groupName} variants={itemVariants}>
          <div className="flex items-center gap-2 mb-2">
            {groupBy === "status" && <div className={cn("w-2.5 h-2.5 rounded-full", STATUS_CONFIG[groupName]?.dotColor || "bg-slate-400")} />}
            {groupBy === "priority" && <div className={cn("w-2.5 h-2.5 rounded-full", PRIORITY_CONFIG[groupName as keyof typeof PRIORITY_CONFIG]?.dotColor || "bg-gray-400")} />}
            <h3 className="text-sm font-semibold">
              {groupBy === "status" ? STATUS_CONFIG[groupName]?.label || groupName : groupBy === "priority" ? PRIORITY_CONFIG[groupName as keyof typeof PRIORITY_CONFIG]?.label || groupName : groupName}
            </h3>
            <Badge variant="secondary" className="text-[10px] px-1.5 h-5">{(groupTasks as Task[]).length}</Badge>
          </div>
          <div className="space-y-1.5">
            {(groupTasks as Task[]).map((task, i) => <TaskListRow key={task.id} task={task} index={i} onClick={() => onTaskClick(task)} />)}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
