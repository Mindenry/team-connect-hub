import { useState, useRef, KeyboardEvent } from "react";
import {
  AlertCircle, ArrowUp, ArrowDown, Minus, ChevronUp, ChevronDown,
  Calendar, MessageSquare, Paperclip, CheckSquare,
  Plus, SquareCheck, Bug, BookOpen, Zap, FileText, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ═══════ ISSUE TYPE ICONS (proper SVG, no emojis) ═══════ */
const issueTypeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  task:    { icon: SquareCheck, color: "text-blue-600",   bg: "bg-blue-500/10" },
  bug:     { icon: Bug,        color: "text-red-500",     bg: "bg-red-500/10" },
  story:   { icon: BookOpen,   color: "text-green-600",   bg: "bg-green-500/10" },
  epic:    { icon: Zap,        color: "text-purple-600",  bg: "bg-purple-500/10" },
  subtask: { icon: Layers,     color: "text-cyan-600",    bg: "bg-cyan-500/10" },
};

/* ═══════ PRIORITY (Jira-style arrows) ═══════ */
const priorityConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  urgent: { icon: ChevronUp,  color: "text-red-600",    bg: "bg-red-500/10",    label: "Urgent" },
  high:   { icon: ArrowUp,    color: "text-orange-500", bg: "bg-orange-500/10", label: "High" },
  medium: { icon: Minus,      color: "text-amber-500",  bg: "bg-amber-500/10",  label: "Medium" },
  low:    { icon: ArrowDown,  color: "text-blue-500",   bg: "bg-blue-500/10",   label: "Low" },
};

/* ═══════ STATUS ═══════ */
const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  todo:        { label: "TO DO",        color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800/60", dot: "bg-slate-400" },
  in_progress: { label: "IN PROGRESS",  color: "text-blue-600 dark:text-blue-400",  bg: "bg-blue-50 dark:bg-blue-900/30",    dot: "bg-blue-500" },
  in_review:   { label: "IN REVIEW",    color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30",  dot: "bg-amber-500" },
  done:        { label: "DONE",         color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30", dot: "bg-emerald-500" },
};

/* ═══════ TYPES ═══════ */
export interface TaskCardData {
  id: string;
  title: string;
  status: string;
  priority: string;
  issueType?: string;
  assignee?: { id?: string; name: string; initials?: string; avatar?: string };
  dueDate?: string;
  tags?: string[];
  storyPoints?: number;
  project?: { id: string; key: string; name: string; color?: string };
  sprint?: { id: string; name: string };
  epic?: { id: string; name: string; color?: string };
  _count?: { comments?: number; attachments?: number; subtasks?: number; childTasks?: number };
  subtasks?: any[];
  comments?: any[];
  attachments?: any[];
  createdAt?: string;
  updatedAt?: string;
}

interface TaskCardProps {
  task: TaskCardData;
  onClick: (task: TaskCardData) => void;
  variant?: "board" | "backlog";
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, task: TaskCardData) => void;
}

/* ═══════ INLINE CREATE ═══════ */
export function InlineCreateCard({ onSubmit }: { onSubmit: (title: string) => void }) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (trimmed) { onSubmit(trimmed); setTitle(""); }
    setActive(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") { setTitle(""); setActive(false); }
  };

  if (!active) {
    return (
      <button
        onClick={() => { setActive(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Create issue
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-background/95 overflow-hidden">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSubmit}
        placeholder="What needs to be done?"
        className="border-0 h-9 text-[13px] focus-visible:ring-0 rounded-none px-3"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BOARD CARD — Professional Jira-style vertical card
   ═══════════════════════════════════════════════════════════ */
function BoardCard({ task, onClick, draggable, onDragStart }: TaskCardProps) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const PriorityIcon = priority.icon;
  const issueType = issueTypeConfig[task.issueType || "task"] || issueTypeConfig.task;
  const IssueIcon = issueType.icon;
  const initials = task.assignee?.initials || task.assignee?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "";
  const hasDraggedRef = useRef(false);

  const commentCount = task._count?.comments ?? task.comments?.length ?? 0;
  const attachmentCount = task._count?.attachments ?? task.attachments?.length ?? 0;
  const subtaskCount = task._count?.subtasks ?? task.subtasks?.length ?? 0;
  const completedSubtasks = task.subtasks?.filter((s: any) => s.isCompleted)?.length ?? 0;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <div
      className={cn(
        "group relative bg-card/95 border border-border/60 rounded-xl cursor-pointer shadow-sm",
        "transition-all duration-200 ease-out",
        "hover:border-primary/60 hover:bg-primary/[0.02]"
      )}
      onClick={() => {
        if (hasDraggedRef.current) {
          hasDraggedRef.current = false;
          return;
        }
        onClick(task);
      }}
      draggable={draggable}
      onDragStart={(e) => {
        hasDraggedRef.current = true;
        onDragStart?.(e, task);
      }}
    >
      <div className="p-4 space-y-3">
        {/* ── Header: project key + issue type + epic ── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Issue Type Icon */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0", issueType.bg)}>
                  <IssueIcon className={cn("w-3 h-3", issueType.color)} />
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs capitalize">{task.issueType || "Task"}</TooltipContent>
            </Tooltip>

            {/* Project key */}
            {task.project?.key && (
              <span className="text-[11px] font-semibold text-muted-foreground font-mono tracking-wide">
                {task.project.key}
              </span>
            )}
          </div>

          {/* Epic label */}
          {task.epic?.name && (
            <span
              className="text-[10px] font-medium text-muted-foreground/70 truncate max-w-[100px] px-1.5 py-0.5 rounded bg-muted/40"
              title={task.epic.name}
            >
              {task.epic.name}
            </span>
          )}
        </div>

        {/* ── Title ── */}
        <p className="text-sm font-semibold text-foreground leading-[1.4] line-clamp-3">
          {task.title}
        </p>

        {/* ── Tags ── */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="inline-flex text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-[1px] rounded-sm border border-border/30"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground/50 pl-0.5">+{task.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* ── Footer row ── */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Left: priority + metadata */}
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Priority with bg */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0", priority.bg)}>
                  <PriorityIcon className={cn("w-3.5 h-3.5", priority.color)} />
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{priority.label}</TooltipContent>
            </Tooltip>

            {/* Story points */}
            {task.storyPoints != null && task.storyPoints > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 min-w-[20px] h-5 inline-flex items-center justify-center rounded-sm font-mono border border-border/20">
                    {task.storyPoints}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Story Points</TooltipContent>
              </Tooltip>
            )}

            {/* Subtask progress */}
            {subtaskCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-[2px] text-[10px] text-muted-foreground">
                    <CheckSquare className="w-3 h-3" />
                    <span className="font-medium">{completedSubtasks}/{subtaskCount}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{completedSubtasks} of {subtaskCount} done</TooltipContent>
              </Tooltip>
            )}

            {/* Comments */}
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-[2px] text-[10px] text-muted-foreground">
                <MessageSquare className="w-3 h-3" /> {commentCount}
              </span>
            )}

            {/* Attachments */}
            {attachmentCount > 0 && (
              <span className="inline-flex items-center gap-[2px] text-[10px] text-muted-foreground">
                <Paperclip className="w-3 h-3" /> {attachmentCount}
              </span>
            )}
          </div>

          {/* Right: due date + assignee */}
          <div className="flex items-center gap-1.5 shrink-0">
            {task.dueDate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] px-1.5 py-[1px] rounded-sm",
                      isOverdue
                        ? "text-red-600 bg-red-50 dark:bg-red-900/20 font-semibold"
                        : "text-muted-foreground bg-muted/40"
                    )}
                  >
                    <Calendar className="w-3 h-3" />
                    {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{isOverdue ? "Overdue!" : "Due date"}</TooltipContent>
              </Tooltip>
            )}

            {task.assignee ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="w-6 h-6 border-2 border-background shadow-sm">
                    <AvatarImage src={task.assignee.avatar} alt={task.assignee.name || "Avatar"} />
                    <AvatarFallback className="text-[9px] font-bold bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{task.assignee.name}</TooltipContent>
              </Tooltip>
            ) : (
              <div
                className={cn(
                  "w-6 h-6 rounded-full border-2 border-dashed border-border/30",
                  "opacity-0 group-hover:opacity-60 transition-opacity"
                )}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BACKLOG / LIST ROW — compact horizontal row
   ═══════════════════════════════════════════════════════════ */
function BacklogRow({ task, onClick }: TaskCardProps) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const PriorityIcon = priority.icon;
  const issueType = issueTypeConfig[task.issueType || "task"] || issueTypeConfig.task;
  const IssueIcon = issueType.icon;
  const initials = task.assignee?.initials || task.assignee?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "";

  const subtaskCount = task._count?.subtasks ?? task.subtasks?.length ?? 0;
  const completedSubtasks = task.subtasks?.filter((s: any) => s.isCompleted)?.length ?? 0;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
  const s = statusConfig[task.status] || statusConfig.todo;

  return (
    <div
      className={cn(
        "group flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 cursor-pointer transition-colors duration-150",
        "hover:bg-accent/50"
      )}
      onClick={() => onClick(task)}
    >
      {/* Issue type */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0", issueType.bg)}>
            <IssueIcon className={cn("w-3 h-3", issueType.color)} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs capitalize">{task.issueType || "Task"}</TooltipContent>
      </Tooltip>

      {/* Project key */}
      {task.project?.key && (
        <span className="text-[11px] font-semibold text-muted-foreground font-mono shrink-0 hidden sm:inline">
          {task.project.key}
        </span>
      )}

      {/* Title */}
      <p className="text-[13px] font-medium text-foreground truncate flex-1 min-w-0 group-hover:text-primary transition-colors">
        {task.title}
      </p>

      {/* Epic (medium screens) */}
      {task.epic?.name && (
        <span className="text-[10px] text-muted-foreground/60 truncate max-w-[90px] hidden lg:inline">
          {task.epic.name}
        </span>
      )}

      {/* Status badge */}
      <span className={cn(
        "text-[9px] font-bold tracking-wider uppercase px-2 py-[3px] rounded shrink-0",
        s.bg, s.color
      )}>
        {s.label}
      </span>

      {/* Priority icon */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0", priority.bg)}>
            <PriorityIcon className={cn("w-3.5 h-3.5", priority.color)} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{priority.label}</TooltipContent>
      </Tooltip>

      {/* Story points */}
      {task.storyPoints != null && task.storyPoints > 0 && (
        <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 min-w-[20px] h-5 inline-flex items-center justify-center rounded-sm font-mono shrink-0 hidden md:inline-flex">
          {task.storyPoints}
        </span>
      )}

      {/* Subtasks */}
      {subtaskCount > 0 && (
        <span className="items-center gap-[2px] text-[10px] text-muted-foreground shrink-0 hidden md:inline-flex">
          <CheckSquare className="w-3 h-3" /> {completedSubtasks}/{subtaskCount}
        </span>
      )}

      {/* Due */}
      {task.dueDate && (
        <span className={cn(
          "text-[10px] shrink-0 hidden sm:inline",
          isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"
        )}>
          {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}

      {/* Assignee */}
      {task.assignee ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="w-6 h-6 shrink-0 border-2 border-background shadow-sm">
              <AvatarImage src={task.assignee.avatar} alt={task.assignee.name || "Avatar"} />
              <AvatarFallback className="text-[9px] font-bold bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{task.assignee.name}</TooltipContent>
        </Tooltip>
      ) : (
        <div className="w-6 h-6 shrink-0" />
      )}
    </div>
  );
}

/* ═══════ EXPORT ═══════ */
export default function TaskCard(props: TaskCardProps) {
  if (props.variant === "backlog") return <BacklogRow {...props} />;
  return <BoardCard {...props} />;
}
