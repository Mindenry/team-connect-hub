import { useMemo } from "react";
import { motion } from "framer-motion";
import { Target, ChevronRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status?: string;
  storyPoints?: number;
  epic?: { id: string; name: string; color?: string };
}

interface Epic {
  id: string;
  name: string;
  color?: string;
  status: string;
  _count?: { tasks: number };
}

interface EpicProgressPanelProps {
  epics: Epic[];
  tasks: Task[];
  onEpicClick?: (epic: Epic) => void;
  className?: string;
}

export default function EpicProgressPanel({
  epics,
  tasks,
  onEpicClick,
  className,
}: EpicProgressPanelProps) {
  const epicProgress = useMemo(() => {
    return epics.map((epic) => {
      const epicTasks = tasks.filter((t) => t.epic?.id === epic.id);
      const total = epicTasks.length;
      const done = epicTasks.filter((t) => t.status === "done").length;
      const totalSP = epicTasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
      const doneSP = epicTasks
        .filter((t) => t.status === "done")
        .reduce((s, t) => s + (t.storyPoints || 0), 0);
      const progress = totalSP > 0 ? (doneSP / totalSP) * 100 : total > 0 ? (done / total) * 100 : 0;

      return {
        ...epic,
        total,
        done,
        totalSP,
        doneSP,
        progress,
      };
    });
  }, [epics, tasks]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-4 h-4 text-primary" />
          Epic Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {epicProgress.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No epics yet</p>
        ) : (
          epicProgress.map((epic) => (
            <motion.div
              key={epic.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/30",
                onEpicClick && "hover:border-primary/30"
              )}
              onClick={() => onEpicClick?.(epic)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: epic.color || "#6366f1" }}
                  />
                  <span className="font-medium text-sm truncate">{epic.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">
                    {epic.done}/{epic.total}
                  </Badge>
                  {epic.totalSP > 0 && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {epic.doneSP}/{epic.totalSP} SP
                    </Badge>
                  )}
                  {onEpicClick && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
              <div className="space-y-1">
                <Progress value={epic.progress} className="h-2" />
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span>{Math.round(epic.progress)}% complete</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
