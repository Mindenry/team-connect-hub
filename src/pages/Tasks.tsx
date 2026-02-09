import { useState } from "react";
import {
  Plus,
  Filter,
  Search,
  MoreHorizontal,
  Calendar,
  User,
  Tag,
  CheckSquare,
  Clock,
  AlertCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  assignee: { name: string; initials: string };
  dueDate: string;
  tags: string[];
  linkedMeeting?: string;
}

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

const initialColumns: Column[] = [
  {
    id: "todo",
    title: "To Do",
    color: "bg-muted-foreground",
    tasks: [
      { id: "t1", title: "Update API documentation", priority: "medium", assignee: { name: "อริสา P.", initials: "AP" }, dueDate: "Feb 12", tags: ["docs"], linkedMeeting: "Sprint Planning" },
      { id: "t2", title: "Fix Safari upload bug", priority: "high", assignee: { name: "จิรวัฒน์ W.", initials: "JW" }, dueDate: "Feb 10", tags: ["bug", "browser"] },
      { id: "t3", title: "Design new onboarding flow", priority: "medium", assignee: { name: "พิมพ์ L.", initials: "PL" }, dueDate: "Feb 15", tags: ["design", "ux"] },
    ],
  },
  {
    id: "in_progress",
    title: "In Progress",
    color: "bg-primary",
    tasks: [
      { id: "t4", title: "Implement user profile page", priority: "high", assignee: { name: "สมชาย K.", initials: "SK" }, dueDate: "Feb 11", tags: ["frontend"] },
      { id: "t5", title: "Database migration v2.3", priority: "high", assignee: { name: "ธนา S.", initials: "TS" }, dueDate: "Feb 10", tags: ["backend", "db"] },
    ],
  },
  {
    id: "review",
    title: "In Review",
    color: "bg-warning",
    tasks: [
      { id: "t6", title: "PR #142 - Mobile responsive fix", priority: "medium", assignee: { name: "พิมพ์ L.", initials: "PL" }, dueDate: "Feb 9", tags: ["frontend", "mobile"] },
    ],
  },
  {
    id: "done",
    title: "Done",
    color: "bg-success",
    tasks: [
      { id: "t7", title: "Setup CI/CD pipeline", priority: "low", assignee: { name: "ธนา S.", initials: "TS" }, dueDate: "Feb 8", tags: ["devops"] },
      { id: "t8", title: "Write unit tests for auth module", priority: "medium", assignee: { name: "จิรวัฒน์ W.", initials: "JW" }, dueDate: "Feb 7", tags: ["testing"] },
    ],
  },
];

const priorityIcons: Record<string, { icon: React.ElementType; color: string }> = {
  high: { icon: ArrowUp, color: "text-destructive" },
  medium: { icon: ArrowRight, color: "text-warning" },
  low: { icon: ArrowDown, color: "text-muted-foreground" },
};

export default function Tasks() {
  const [columns] = useState(initialColumns);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
          <Badge variant="secondary" className="text-xs">
            {columns.reduce((acc, col) => acc + col.tasks.length, 0)} total
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 w-48 text-sm"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map((column) => (
            <div key={column.id} className="w-72 flex flex-col shrink-0">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", column.color)} />
                  <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {column.tasks.length}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Tasks */}
              <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin">
                {column.tasks.map((task) => {
                  const PriorityIcon = priorityIcons[task.priority].icon;
                  return (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow group">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-foreground leading-tight flex-1">
                            {task.title}
                          </h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {task.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        {/* Meeting Link */}
                        {task.linkedMeeting && (
                          <div className="flex items-center gap-1 mb-2 text-xs text-primary">
                            <CheckSquare className="w-3 h-3" />
                            <span>From: {task.linkedMeeting}</span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                                {task.assignee.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {task.dueDate}
                            </div>
                          </div>
                          <PriorityIcon className={cn("w-4 h-4", priorityIcons[task.priority].color)} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
