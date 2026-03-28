import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, List as ListIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import TaskCard, { type TaskCardData } from "./TaskCard";
import EmptyState from "./EmptyState";

type SortKey = "title" | "status" | "priority" | "assignee" | "dueDate";
type SortDir = "asc" | "desc";

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const statusOrder: Record<string, number> = {
  todo: 0,
  in_progress: 1,
  in_review: 2,
  done: 3,
  canceled: 4,
};

interface TaskListProps {
  tasks: TaskCardData[];
  onTaskClick: (task: TaskCardData) => void;
  onCreateTask: () => void;
}

export default function TaskList({ tasks, onTaskClick, onCreateTask }: TaskListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortedTasks = useMemo(() => {
    const m = sortDir === "asc" ? 1 : -1;
    return [...tasks].sort((a, b) => {
      switch (sortKey) {
        case "title": return m * a.title.localeCompare(b.title);
        case "status": return m * ((statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));
        case "priority": return m * ((priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99));
        case "assignee": return m * (a.assignee?.name || "zzz").localeCompare(b.assignee?.name || "zzz");
        case "dueDate": {
          const aD = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bD = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return m * (aD - bD);
        }
        default: return 0;
      }
    });
  }, [tasks, sortKey, sortDir]);

  if (tasks.length === 0) return <EmptyState type="no-tasks" onCreateTask={onCreateTask} />;

  const SortIcon = sortDir === "asc" ? ArrowUp : ArrowDown;

  const columns: { key: SortKey; label: string }[] = [
    { key: "priority", label: "Priority" },
    { key: "title", label: "Title" },
    { key: "status", label: "Status" },
    { key: "assignee", label: "Assignee" },
    { key: "dueDate", label: "Due" },
  ];

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 sm:p-6">
        {/* Column sort header */}
        <div className="flex flex-wrap items-center gap-1 mb-3 px-3 py-2 rounded-xl bg-card/95 border border-border/60 shadow-sm">
          <ListIcon className="w-3.5 h-3.5 text-muted-foreground mr-1" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-3">
            {tasks.length} tasks
          </span>
          <div className="flex-1" />
          <span className="text-[10px] text-muted-foreground mr-1">Sort:</span>
          {columns.map(col => (
            <button
              key={col.key}
              onClick={() => handleSort(col.key)}
              className={cn(
                "text-[11px] px-2 py-1 rounded transition-colors",
                sortKey === col.key
                  ? "bg-background text-foreground font-semibold shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {col.label}
              {sortKey === col.key && <SortIcon className="w-3 h-3 inline ml-0.5" />}
            </button>
          ))}
        </div>

        {/* Task rows */}
        <div className="rounded-2xl border border-border/60 bg-card/95 divide-y divide-border/20 overflow-hidden shadow-sm">
          {sortedTasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} variant="backlog" />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
