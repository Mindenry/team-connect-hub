import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Rocket, Calendar, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import TaskCard, { type TaskCardData } from "./TaskCard";
import EmptyState from "./EmptyState";

interface Sprint {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
}

interface TaskBacklogProps {
  tasks: TaskCardData[];
  sprints: Sprint[];
  onTaskClick: (task: TaskCardData) => void;
  onCreateTask: () => void;
}

export default function TaskBacklog({ tasks, sprints, onTaskClick, onCreateTask }: TaskBacklogProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const groupedTasks = useMemo(() => {
    const activeSprint = sprints.find((s) => s.status === "active");
    const futureSprints = sprints.filter((s) => s.status === "planned" || s.status === "future");
    const sprintIds = new Set(sprints.map((s) => s.id));

    // One pass to group tasks by sprint id (or backlog).
    const tasksBySprintId = new Map<string, TaskCardData[]>();
    const backlogTasks: TaskCardData[] = [];
    for (const t of tasks) {
      const sprintId = t.sprint?.id;
      if (sprintId && sprintIds.has(sprintId)) {
        const arr = tasksBySprintId.get(sprintId) || [];
        arr.push(t);
        tasksBySprintId.set(sprintId, arr);
      } else {
        backlogTasks.push(t);
      }
    }

    const computeGroupMetrics = (groupTasks: TaskCardData[]) => {
      let todo = 0;
      let inProgress = 0;
      let inReview = 0;
      let done = 0;
      for (const t of groupTasks) {
        switch (t.status) {
          case "todo":
            todo++;
            break;
          case "in_progress":
            inProgress++;
            break;
          case "in_review":
            inReview++;
            break;
          case "done":
            done++;
            break;
          default:
            break;
        }
      }
      const total = groupTasks.length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      return { todo, inProgress, inReview, done, progress };
    };

    const groups: Array<{
      key: string;
      label: string;
      sprint?: Sprint;
      tasks: TaskCardData[];
      isActive?: boolean;
      todo: number;
      inProgress: number;
      inReview: number;
      done: number;
      progress: number;
    }> = [];

    if (activeSprint) {
      const groupTasks = tasksBySprintId.get(activeSprint.id) || [];
      const metrics = computeGroupMetrics(groupTasks);
      groups.push({
        key: `sprint-${activeSprint.id}`,
        label: activeSprint.name,
        sprint: activeSprint,
        tasks: groupTasks,
        isActive: true,
        ...metrics,
      });
    }

    for (const sprint of futureSprints) {
      const groupTasks = tasksBySprintId.get(sprint.id) || [];
      const metrics = computeGroupMetrics(groupTasks);
      groups.push({
        key: `sprint-${sprint.id}`,
        label: sprint.name,
        sprint,
        tasks: groupTasks,
        ...metrics,
      });
    }

    const backlogMetrics = computeGroupMetrics(backlogTasks);
    groups.push({
      key: "backlog",
      label: "Backlog",
      tasks: backlogTasks,
      ...backlogMetrics,
    });

    return groups;
  }, [tasks, sprints]);

  if (tasks.length === 0) {
    return <EmptyState type="no-tasks" onCreateTask={onCreateTask} />;
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 sm:p-6 space-y-4">
        {groupedTasks.map((group) => {
          const isCollapsed = collapsedSections.has(group.key);

          return (
            <div
              key={group.key}
              className={cn(
                "rounded-2xl overflow-hidden border shadow-sm",
                group.isActive
                  ? "border-primary/70 bg-primary/[0.03] shadow-primary/10"
                  : "border-border/60 bg-card/95"
              )}
            >
              {/* Section header */}
              <button
                onClick={() => toggleSection(group.key)}
                className="w-full px-4 py-3 text-left hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {/* Chevron */}
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}

                  {/* Icon */}
                  {group.sprint ? (
                    <Rocket
                      className={cn(
                        "w-4 h-4 shrink-0",
                        group.isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  ) : (
                    <Inbox className="w-4 h-4 shrink-0 text-muted-foreground" />
                  )}

                  {/* Name + meta */}
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "text-sm font-semibold truncate text-foreground",
                          group.isActive && "text-primary"
                        )}
                      >
                        {group.label}
                      </span>
                      {group.isActive && (
                        <Badge
                          variant="default"
                          className="h-[18px] px-2 text-[10px] font-semibold tracking-wide"
                        >
                          ACTIVE
                        </Badge>
                      )}
                      <span className="ml-auto text-[11px] font-semibold text-muted-foreground tabular-nums">
                        {group.tasks.length} issues
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      {/* Dates */}
                      {group.sprint?.startDate && group.sprint?.endDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(group.sprint.startDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {" – "}
                          {new Date(group.sprint.endDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}

                      {/* Status mini summary */}
                      {group.tasks.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {group.todo > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                              <span className="tabular-nums text-foreground/80">{group.todo}</span>
                            </div>
                          )}
                          {group.inProgress > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              <span className="tabular-nums text-foreground/80">{group.inProgress}</span>
                            </div>
                          )}
                          {group.inReview > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              <span className="tabular-nums text-foreground/80">{group.inReview}</span>
                            </div>
                          )}
                          {group.done > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span className="tabular-nums text-foreground/80">{group.done}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Progress */}
                      {group.tasks.length > 0 && (
                        <div className="ml-auto hidden items-center gap-1.5 md:flex">
                          <Progress value={group.progress} className="h-1 flex-1 w-20" />
                          <span className="w-8 text-right text-[10px] font-semibold tabular-nums">
                            {group.progress}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Tasks */}
              {!isCollapsed && group.tasks.length > 0 && (
                <div className="border-t border-border/30 divide-y divide-border/20">
                  {group.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} onClick={onTaskClick} variant="backlog" />
                  ))}
                </div>
              )}

              {!isCollapsed && group.tasks.length === 0 && (
                <div className="border-t border-border/30 py-8 text-center">
                  <p className="text-xs text-muted-foreground/40">
                    No issues in this {group.sprint ? "sprint" : "backlog"}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
