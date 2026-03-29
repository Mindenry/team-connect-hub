import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  User,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  AlertCircle,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Task } from "./types";

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, data: Partial<Task>) => void;
}

const STATUS_CONFIG = {
  todo: { label: "To Do", color: "text-slate-600 bg-slate-100 dark:bg-slate-800" },
  in_progress: { label: "In Progress", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  review: { label: "Review", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
  done: { label: "Done", color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
};

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "text-red-600 bg-red-100 dark:bg-red-900/30" },
  high: { label: "High", color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30" },
  medium: { label: "Medium", color: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30" },
  low: { label: "Low", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
};

type SortField = "title" | "status" | "priority" | "dueDate" | "createdAt";
type SortDirection = "asc" | "desc";

export default function TaskList({
  tasks,
  onTaskClick,
  onTaskUpdate,
}: TaskListProps) {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "dueDate" || sortField === "createdAt") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (sortField === "priority") {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        aVal = priorityOrder[a.priority] || 2;
        bVal = priorityOrder[b.priority] || 2;
      }

      if (sortField === "status") {
        const statusOrder = { todo: 0, in_progress: 1, review: 2, done: 3 };
        aVal = statusOrder[a.status] || 0;
        bVal = statusOrder[b.status] || 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [tasks, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5" />
    );
  };

  const isOverdue = (task: Task) =>
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <ScrollArea className="h-full">
      <div className="rounded-lg border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-8"></TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => handleSort("title")}
                >
                  ชื่องาน
                  <SortIcon field="title" />
                </button>
              </TableHead>
              <TableHead className="w-32">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => handleSort("status")}
                >
                  สถานะ
                  <SortIcon field="status" />
                </button>
              </TableHead>
              <TableHead className="w-28">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => handleSort("priority")}
                >
                  ความสำคัญ
                  <SortIcon field="priority" />
                </button>
              </TableHead>
              <TableHead className="w-32">
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => handleSort("dueDate")}
                >
                  กำหนดส่ง
                  <SortIcon field="dueDate" />
                </button>
              </TableHead>
              <TableHead className="w-36">ผู้รับผิดชอบ</TableHead>
              <TableHead className="w-24">ทีม</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => {
              const statusConfig = STATUS_CONFIG[task.status];
              const priorityConfig = PRIORITY_CONFIG[task.priority];
              const overdue = isOverdue(task);

              return (
                <TableRow
                  key={task.id}
                  className="group cursor-pointer hover:bg-muted/50"
                  onClick={() => onTaskClick(task)}
                >
                  <TableCell className="w-8">
                    <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
                  </TableCell>
                  <TableCell className="w-8">
                    <Checkbox
                      checked={task.status === "done"}
                      onCheckedChange={(checked) => {
                        onTaskUpdate(task.id, {
                          status: checked ? "done" : "todo",
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span
                        className={cn(
                          "font-medium text-sm line-clamp-1",
                          task.status === "done" && "text-muted-foreground line-through"
                        )}
                      >
                        {task.title}
                      </span>
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {task.tags.slice(0, 2).map((tag, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="h-4 px-1 text-[9px]"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] font-medium", statusConfig.color)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] font-medium", priorityConfig.color)}
                    >
                      {priorityConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.dueDate ? (
                      <div
                        className={cn(
                          "flex items-center gap-1.5 text-xs",
                          overdue ? "text-red-500" : "text-muted-foreground"
                        )}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(task.dueDate).toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {task.assignees && task.assignees.length > 0 ? (
                        <>
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={task.assignees[0].avatar} />
                            <AvatarFallback className="text-[8px]">
                              {task.assignees[0].name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs line-clamp-1">
                            {task.assignees[0].name}
                          </span>
                          {task.assignees.length > 1 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{task.assignees.length - 1}
                            </span>
                          )}
                        </>
                      ) : task.assignee ? (
                        <>
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={task.assignee.avatar} />
                            <AvatarFallback className="text-[8px]">
                              {task.assignee.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs line-clamp-1">
                            {task.assignee.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.team ? (
                      <Badge variant="outline" className="text-[10px]">
                        {task.team.name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick(task);
                          }}
                        >
                          ดูรายละเอียด
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskUpdate(task.id, { status: "done" });
                          }}
                        >
                          ทำเสร็จแล้ว
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}
