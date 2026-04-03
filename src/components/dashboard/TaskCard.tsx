import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckSquare, Plus, Clock, Circle, CheckCircle2, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TaskItem } from "./types";
import { priorityConfig } from "./utils";

interface TaskCardProps {
  tasks: TaskItem[];
  loading: boolean;
  onCreateTask: () => void;
  onTaskClick: (task: TaskItem) => void;
}

export function TaskCard({ tasks, loading, onCreateTask, onTaskClick }: TaskCardProps) {
  return (
    <Card className="border bg-card/80 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="py-3 px-4 border-b border-border/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <CheckSquare className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">My Tasks</CardTitle>
              <CardDescription className="text-[11px]">Active and pending</CardDescription>
            </div>
          </div>
          <Link to="/tasks" className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group">
            View All
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/40 p-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-8 text-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">No tasks assigned</p>
            <p className="text-xs text-muted-foreground mb-4">Create one to track your next actions</p>
            <Button size="sm" variant="outline" onClick={onCreateTask} className="gap-1.5 h-8 text-xs">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        ) : (
          tasks.map((t, i) => {
            const priority = priorityConfig[t.priority] || priorityConfig.low;
            const PriorityIcon = priority.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group flex items-center gap-3 rounded-lg border border-border/50 bg-gradient-to-r from-background to-muted/10 p-3 hover:border-primary/40 hover:shadow-md transition-all duration-300 cursor-pointer"
                onClick={() => onTaskClick(t)}
              >
                <div className={cn("w-5 h-5 rounded shrink-0 transition-colors flex items-center justify-center", t.status === "done" ? "text-green-600" : "text-muted-foreground")}>
                  {t.status === "done" ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    {t.project && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono border-muted-foreground/30">{t.project.key}</Badge>}
                    <p className={cn("text-sm font-semibold truncate", t.status === "done" ? "line-through text-muted-foreground" : "text-foreground")}>{t.title}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <PriorityIcon className="w-3 h-3 text-muted-foreground" />
                      <span>Priority · {priority.label}</span>
                    </div>
                    {t.dueDate && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        </div>
                      </>
                    )}
                    {t.epic && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.epic.color || "#6366f1" }} />
                          <span className="truncate max-w-[120px]">{t.epic.name}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {t.assignee ? (
                  <Avatar className="h-7 w-7 border border-border/50 ring-2 ring-background">
                    <AvatarImage src={t.assignee.avatar} alt={t.assignee.name} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-semibold">{t.assignee.initials || t.assignee.name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-muted-foreground/30" />
                  </div>
                )}
                <Badge variant="outline" className={cn("text-xs px-3 py-1 h-7 font-semibold border-2", priority.color)}>{priority.label}</Badge>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
