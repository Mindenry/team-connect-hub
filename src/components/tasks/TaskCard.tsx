import { memo } from "react";
import {
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
  User,
  AlertCircle,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Task } from "./types";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20", dot: "bg-red-500" },
  high: { label: "High", color: "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20", dot: "bg-orange-500" },
  medium: { label: "Medium", color: "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20", dot: "bg-yellow-500" },
  low: { label: "Low", color: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20", dot: "bg-blue-500" },
};

const STATUS_ICONS = {
  todo: Circle,
  in_progress: Clock,
  review: AlertCircle,
  done: CheckCircle2,
};

function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const StatusIcon = STATUS_ICONS[task.status] || Circle;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
  const dueDateFormatted = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
      })
    : null;

  const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative bg-card border border-border/60 rounded-lg p-3 cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-primary/40 hover:bg-accent/30",
        "border-l-4",
        priorityConfig.color,
        isDragging && "shadow-xl rotate-2 scale-105"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <StatusIcon
          className={cn(
            "w-4 h-4 mt-0.5 shrink-0",
            task.status === "done" && "text-green-500",
            task.status === "in_progress" && "text-blue-500",
            task.status === "review" && "text-amber-500",
            task.status === "todo" && "text-muted-foreground"
          )}
        />
        <h4 className="text-sm font-medium text-foreground line-clamp-2 flex-1">
          {task.title}
        </h4>
      </div>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 pl-6">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 pl-6">
          {task.tags.slice(0, 3).map((tag, index) => (
            <Badge
              key={index}
              variant="outline"
              className="h-4 px-1.5 text-[9px] font-normal border-border/60"
            >
              {tag}
            </Badge>
          ))}
          {task.tags.length > 3 && (
            <Badge
              variant="outline"
              className="h-4 px-1.5 text-[9px] font-normal border-border/60"
            >
              +{task.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pl-6">
        <div className="flex items-center gap-2">
          {/* Due date */}
          {dueDateFormatted && (
            <div
              className={cn(
                "flex items-center gap-1 text-[10px]",
                isOverdue ? "text-red-500" : "text-muted-foreground"
              )}
            >
              <Calendar className="w-3 h-3" />
              <span>{dueDateFormatted}</span>
            </div>
          )}

          {/* Subtasks */}
          {totalSubtasks > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <CheckCircle2 className="w-3 h-3" />
              <span>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </div>
          )}

          {/* Comments */}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              <span>{task.comments.length}</span>
            </div>
          )}

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Paperclip className="w-3 h-3" />
              <span>{task.attachments.length}</span>
            </div>
          )}
        </div>

        {/* Assignees */}
        <div className="flex items-center">
          {task.assignees && task.assignees.length > 0 ? (
            <div className="flex -space-x-1.5">
              {task.assignees.slice(0, 2).map((assignee, index) => (
                <Avatar
                  key={assignee.id}
                  className={cn(
                    "w-5 h-5 border-2 border-background",
                    index > 0 && "opacity-90"
                  )}
                >
                  <AvatarImage src={assignee.avatar} />
                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                    {assignee.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.assignees.length > 2 && (
                <div className="w-5 h-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-[8px] font-medium text-muted-foreground">
                    +{task.assignees.length - 2}
                  </span>
                </div>
              )}
            </div>
          ) : task.assignee ? (
            <Avatar className="w-5 h-5 border-2 border-background">
              <AvatarImage src={task.assignee.avatar} />
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                {task.assignee.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-5 h-5 rounded-full border border-dashed border-border flex items-center justify-center">
              <User className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Progress bar for subtasks */}
      {totalSubtasks > 0 && (
        <div className="mt-2 pl-6">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${subtaskProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TaskCard);
