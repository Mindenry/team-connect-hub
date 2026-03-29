import { useState, useRef, KeyboardEvent } from "react";
import {
  AlertCircle, ChevronUp, ChevronDown, Minus,
  Calendar, MessageSquare, Paperclip, CheckSquare,
  Plus, SquareCheck, Bug, BookOpen, Zap, Layers,
  User, ArrowUp, Sparkles, Clock, MoreHorizontal,
  GripVertical, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ─── ISSUE TYPE CONFIG (simplified) ─────────────────────────────────────────── */
const issueTypeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  task:    { icon: SquareCheck, color: "hsl(var(--primary))", bg: "bg-primary/10" },
  bug:     { icon: Bug,         color: "hsl(var(--destructive))", bg: "bg-destructive/10" },
  subtask: { icon: Layers,      color: "hsl(var(--primary))", bg: "bg-primary/10" },
};

/* ─── PRIORITY CONFIG (simplified) ───────────────────────────────────────────── */
const priorityConfig: Record<string, {
  icon: any; color: string; bg: string; label: string;
}> = {
  urgent: {
    icon: ArrowUp,
    color: "hsl(var(--destructive))",
    bg: "bg-destructive/10",
    label: "Urgent",
  },
  high: {
    icon: ChevronUp,
    color: "hsl(var(--primary))",
    bg: "bg-primary/10",
    label: "High",
  },
  medium: {
    icon: Minus,
    color: "hsl(var(--muted-foreground))",
    bg: "bg-muted/50",
    label: "Medium",
  },
  low: {
    icon: ChevronDown,
    color: "hsl(var(--muted-foreground))",
    bg: "bg-muted/30",
    label: "Low",
  },
};

/* ─── STATUS CONFIG (simplified) ─────────────────────────────────────────────── */
const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  todo:        { label: "To Do",       color: "text-muted-foreground",     bg: "bg-muted/50",    dot: "bg-muted-foreground/50" },
  in_progress: { label: "In Progress", color: "text-primary",             bg: "bg-primary/10", dot: "bg-primary" },
  in_review:   { label: "In Review",   color: "text-primary",             bg: "bg-primary/10", dot: "bg-primary" },
  done:        { label: "Done",        color: "text-primary",             bg: "bg-primary/10", dot: "bg-primary" },
  canceled:    { label: "Canceled",    color: "text-muted-foreground",     bg: "bg-muted/30",    dot: "bg-muted-foreground/30" },
};

/* ─── TYPES ─────────────────────────────────────────────────────── */
export interface TaskCardData {
  id: string;
  title: string;
  status: string;
  priority: string;
  issueType?: string;
  assignee?: { id?: string; name: string; initials?: string; avatar?: string };
  dueDate?: string;
  tags?: string[];
  project?: { id: string; key: string; name: string; color?: string };
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
  selected?: boolean;
  onSelect?: (id: string) => void;
}

/* ════════════════════════════════════════════════════════════════════════════
   INLINE CREATE - Premium quick task creation with keyboard shortcuts
   ════════════════════════════════════════════════════════════════════════════ */
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
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-md border border-transparent px-3 py-2.5",
          "text-xs text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground",
          "transition-colors"
        )}
        aria-label="Create task in this column"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-background">
          <Plus className="w-3.5 h-3.5" />
        </div>
        <span className="font-medium">Add task</span>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background shadow-sm transition-colors">
      <div className="p-2">
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          placeholder="Task title..."
          className="border-0 h-8 text-xs bg-transparent focus-visible:ring-0 px-2"
          autoFocus
        />
      </div>
      <div className="flex items-center gap-1.5 px-2.5 pb-2 border-t border-border/20 pt-1.5">
        <kbd className="text-[9px] text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded font-mono">Enter</kbd>
        <span className="text-[9px] text-muted-foreground/40">save</span>
        <span className="text-[9px] text-muted-foreground/20 mx-0.5">|</span>
        <kbd className="text-[9px] text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded font-mono">Esc</kbd>
        <span className="text-[9px] text-muted-foreground/40">cancel</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   BOARD CARD - Premium glass-morphism card with priority accent
   ════════════════════════════════════════════════════════════════════════════ */
function BoardCard({ task, onClick, draggable, onDragStart }: TaskCardProps) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const PriorityIcon = priority.icon;
  const issueType = issueTypeConfig[task.issueType || "task"] || issueTypeConfig.task;
  const IssueIcon = issueType.icon;
  const initials = task.assignee?.initials
    || task.assignee?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    || "";
  const hasDraggedRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);

  const commentCount   = task._count?.comments    ?? task.comments?.length    ?? 0;
  const attachmentCount = task._count?.attachments ?? task.attachments?.length ?? 0;
  const subtaskCount   = task._count?.subtasks     ?? task.subtasks?.length    ?? 0;
  const completedSubtasks = task.subtasks?.filter((s: any) => s.isCompleted)?.length ?? 0;
  const subtaskPct = subtaskCount > 0 ? Math.round((completedSubtasks / subtaskCount) * 100) : 0;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <div
      className={cn(
        "group relative cursor-pointer select-none overflow-hidden rounded-md border border-border bg-card",
        "shadow-sm transition-all duration-150 hover:border-border/90 hover:shadow-md active:scale-[0.99]"
      )}
      onClick={() => {
        if (hasDraggedRef.current) { hasDraggedRef.current = false; return; }
        onClick(task);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={draggable}
      onDragStart={(e) => { hasDraggedRef.current = true; onDragStart?.(e, task); }}
    >
      <div className="relative space-y-2.5 p-3">
        {/* Row 1: Type + project key + priority */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0", issueType.bg)}
                >
                  <IssueIcon className="w-3 h-3" style={{ color: issueType.color }} />
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs capitalize">{task.issueType || "Task"}</TooltipContent>
            </Tooltip>
            {task.project?.key && (
              <span className="text-[10px] font-mono text-muted-foreground/50 font-semibold tracking-wide uppercase">
                {task.project.key}
              </span>
            )}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0", priority.bg)}
              >
                <PriorityIcon className="w-3 h-3" style={{ color: priority.color }} />
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{priority.label} priority</TooltipContent>
          </Tooltip>
        </div>

        {/* Row 2: Title */}
        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 break-words">
          {task.title}
        </p>

        {/* Row 3: Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded leading-tight font-medium"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground/50 font-semibold">+{task.tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Row 4: Subtask progress bar */}
        {subtaskCount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                <CheckSquare className="w-3 h-3" />
                {completedSubtasks}/{subtaskCount}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">{subtaskPct}%</span>
            </div>
            <div className="h-1 bg-muted/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${subtaskPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer: meta + due + assignee */}
        <div className="flex items-center justify-between pt-2 border-t border-border/20 gap-2">
          {/* Left meta */}
          <div className="flex items-center gap-2 text-muted-foreground/60 min-w-0">
            {commentCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-medium">
                <MessageSquare className="w-3 h-3" />
                {commentCount}
              </span>
            )}
            {attachmentCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-medium">
                <Paperclip className="w-3 h-3" />
                {attachmentCount}
              </span>
            )}
          </div>

          {/* Right: due date + assignee */}
          <div className="flex items-center gap-2 shrink-0">
            {task.dueDate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium",
                      isOverdue
                        ? "text-destructive bg-destructive/10"
                        : "text-muted-foreground bg-muted/40"
                    )}
                  >
                    <Calendar className="w-3 h-3" />
                    {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {isOverdue ? "Overdue!" : "Due date"}
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="w-5 h-5 border border-background shrink-0">
                  {task.assignee ? (
                    <>
                      <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
                      <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-muted/40 border border-dashed border-border/50">
                      <User className="w-2.5 h-2.5 text-muted-foreground/30" />
                    </AvatarFallback>
                  )}
                </Avatar>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {task.assignee?.name || "Unassigned"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   LIST ROW - Premium table row with hover effects
   ════════════════════════════════════════════════════════════════════════════ */
function BacklogRow({ task, onClick, selected, onSelect }: TaskCardProps) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const PriorityIcon = priority.icon;
  const issueType = issueTypeConfig[task.issueType || "task"] || issueTypeConfig.task;
  const IssueIcon = issueType.icon;
  const initials = task.assignee?.initials
    || task.assignee?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    || "";
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
  const s = statusConfig[task.status] || statusConfig.todo;
  const subtaskCount = task._count?.subtasks ?? task.subtasks?.length ?? 0;
  const completedSubtasks = task.subtasks?.filter((s: any) => s.isCompleted)?.length ?? 0;

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-3 border-b border-border/40 px-4 py-3 transition-colors last:border-0",
        "hover:bg-muted/30",
        selected && "border-l-2 border-l-foreground/50 bg-muted/40"
      )}
      onClick={() => onClick(task)}
    >
      {/* Checkbox */}
      <div
        role="checkbox"
        aria-checked={selected}
        className={cn(
          "shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 cursor-pointer",
          selected
            ? "scale-110 border-foreground bg-foreground text-background"
            : "border-border/40 bg-transparent hover:border-foreground/40",
          "opacity-0 group-hover:opacity-100",
          selected && "opacity-100"
        )}
        onClick={(e) => { e.stopPropagation(); onSelect?.(task.id); }}
      >
        {selected && (
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Issue type */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn("w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110", issueType.bg)}
          >
            <IssueIcon className="w-3 h-3" style={{ color: issueType.color }} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs capitalize">{task.issueType || "Task"}</TooltipContent>
      </Tooltip>

      {/* Priority */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn("w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110", priority.bg)}
          >
            <PriorityIcon className="w-3 h-3" style={{ color: priority.color }} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{priority.label}</TooltipContent>
      </Tooltip>

      {/* Title */}
      <p className="text-[13px] font-medium text-foreground truncate flex-1 min-w-0 group-hover:text-primary transition-colors duration-200">
        {task.title}
      </p>

      {/* Subtasks count */}
      {subtaskCount > 0 && (
        <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 bg-muted/40 px-2 py-0.5 rounded-full font-medium">
          <CheckSquare className="w-3 h-3" />
          {completedSubtasks}/{subtaskCount}
        </span>
      )}

      {/* Status badge */}
      <span
        className={cn(
          "hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0",
          s.bg, s.color
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} />
        {s.label}
      </span>

      {/* Due date */}
      {task.dueDate && (
        <span
          className={cn(
            "hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full shrink-0 font-semibold",
            isOverdue ? "text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400" : "text-muted-foreground bg-muted/40"
          )}
        >
          <Calendar className="w-3 h-3" />
          {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}

      {/* Assignee */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className="w-6 h-6 shrink-0 border-2 border-background shadow-sm ring-1 ring-border/20 transition-transform duration-200 group-hover:scale-110">
            {task.assignee ? (
              <>
                <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
                <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </>
            ) : (
              <AvatarFallback className="bg-muted/40">
                <User className="w-3 h-3 text-muted-foreground/40" />
              </AvatarFallback>
            )}
          </Avatar>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{task.assignee?.name || "Unassigned"}</TooltipContent>
      </Tooltip>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   EXPORT
   ════════════════════════════════════════════════════════════════════════════ */
export default function TaskCard(props: TaskCardProps) {
  if (props.variant === "backlog") return <BacklogRow {...props} />;
  return <BoardCard {...props} />;
}
