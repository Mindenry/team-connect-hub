import { useMemo } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Users, CheckSquare, Clock, AlertCircle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  assignee?: { id: string; name: string; initials?: string; avatar?: string };
  status: string;
  priority: string;
  storyPoints?: number;
  dueDate?: string;
}

interface TeamMember {
  id: string;
  name: string;
  initials?: string;
  avatar?: string;
  email?: string;
}

interface TeamWorkloadViewProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  className?: string;
}

export function TeamWorkloadView({ tasks, teamMembers, className }: TeamWorkloadViewProps) {
  const workloadData = useMemo(() => {
    const memberWorkload = new Map<string, {
      member: TeamMember;
      totalTasks: number;
      completedTasks: number;
      inProgressTasks: number;
      todoTasks: number;
      overdueTasks: number;
      totalStoryPoints: number;
      completedStoryPoints: number;
    }>();

    // Initialize all members
    teamMembers.forEach(member => {
      memberWorkload.set(member.id, {
        member,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        overdueTasks: 0,
        totalStoryPoints: 0,
        completedStoryPoints: 0,
      });
    });

    // Calculate workload
    tasks.forEach(task => {
      if (!task.assignee?.id) return;
      
      const workload = memberWorkload.get(task.assignee.id);
      if (!workload) return;

      workload.totalTasks++;
      workload.totalStoryPoints += task.storyPoints || 0;

      if (task.status === 'done') {
        workload.completedTasks++;
        workload.completedStoryPoints += task.storyPoints || 0;
      } else if (task.status === 'in_progress') {
        workload.inProgressTasks++;
      } else {
        workload.todoTasks++;
      }

      if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done') {
        workload.overdueTasks++;
      }
    });

    return Array.from(memberWorkload.values())
      .filter(w => w.totalTasks > 0)
      .sort((a, b) => b.totalTasks - a.totalTasks);
  }, [tasks, teamMembers]);

  const unassignedTasks = tasks.filter(t => !t.assignee);
  const unassignedStoryPoints = unassignedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  if (workloadData.length === 0 && unassignedTasks.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Team Workload</h3>
          </div>
          <p className="text-xs text-muted-foreground text-center py-4">No tasks assigned</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Team Workload</h3>
        </div>
        <div className="space-y-3">
          {workloadData.map((workload) => {
            const completionRate = workload.totalTasks > 0 
              ? (workload.completedTasks / workload.totalTasks) * 100 
              : 0;
            const hasOverdue = workload.overdueTasks > 0;

            return (
              <motion.div
                key={workload.member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {workload.member.initials || workload.member.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{workload.member.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          {workload.totalTasks} tasks
                        </Badge>
                        {workload.totalStoryPoints > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                            {workload.totalStoryPoints}SP
                          </Badge>
                        )}
                        {hasOverdue && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                            <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                            {workload.overdueTasks}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{Math.round(completionRate)}%</span>
                  </div>
                  <Progress value={completionRate} className="h-1.5" />
                  
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
                        <CheckSquare className="w-3 h-3" />
                        <span className="font-medium text-foreground">{workload.completedTasks}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Done</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
                        <Clock className="w-3 h-3" />
                        <span className="font-medium text-foreground">{workload.inProgressTasks}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">In Progress</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
                        <CheckSquare className="w-3 h-3" />
                        <span className="font-medium text-foreground">{workload.todoTasks}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">To Do</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {unassignedTasks.length > 0 && (
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Unassigned</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        {unassignedTasks.length} tasks
                      </Badge>
                      {unassignedStoryPoints > 0 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                          {unassignedStoryPoints}SP
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
