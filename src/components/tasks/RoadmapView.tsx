import { useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Target, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status?: string;
  dueDate?: string;
  epic?: { id: string; name: string; color?: string };
  sprint?: { id: string; name: string };
}

interface Epic {
  id: string;
  name: string;
  color?: string;
  status: string;
}

interface RoadmapViewProps {
  epics: Epic[];
  tasks: Task[];
  className?: string;
}

export default function RoadmapView({ epics, tasks, className }: RoadmapViewProps) {
  const { startDate, endDate, timeline } = useMemo(() => {
    const dates = tasks
      .filter((t) => t.dueDate)
      .map((t) => new Date(t.dueDate!).getTime());
    const start = dates.length ? Math.min(...dates) : Date.now();
    const end = dates.length ? Math.max(...dates) : Date.now() + 30 * 24 * 60 * 60 * 1000;
    const range = end - start || 1;

    const epicTasks = epics.map((epic) => {
      const epicTasksList = tasks.filter((t) => t.epic?.id === epic.id && t.dueDate);
      return {
        ...epic,
        tasks: epicTasksList,
      };
    });

    const getX = (date: Date) => ((date.getTime() - start) / range) * 100;

    return {
      startDate: new Date(start),
      endDate: new Date(end),
      timeline: epicTasks.filter((e) => e.tasks.length > 0),
      getX,
    };
  }, [epics, tasks]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Roadmap
          </h3>
          <div className="text-xs text-muted-foreground">
            {startDate.toLocaleDateString()} – {endDate.toLocaleDateString()}
          </div>
        </div>

        {timeline.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Add due dates to tasks in epics to see the roadmap
          </div>
        ) : (
          <div className="space-y-4">
            {timeline.map((epic) => (
              <motion.div
                key={epic.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: epic.color || "#6366f1" }}
                  />
                  <span className="font-medium text-sm">{epic.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {epic.tasks.length} tasks
                  </Badge>
                </div>
                <div className="relative h-8 bg-muted/20 rounded-lg overflow-hidden">
                  {epic.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="absolute top-1 h-6 min-w-[80px] max-w-[120px] rounded px-2 flex items-center gap-1 bg-primary/20 border border-primary/30 text-xs font-medium truncate"
                      style={{
                        left: `${((new Date(task.dueDate!).getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100}%`,
                      }}
                      title={`${task.title} - ${new Date(task.dueDate!).toLocaleDateString()}`}
                    >
                      <span className="truncate">{task.title}</span>
                      <ChevronRight className="w-3 h-3 shrink-0" />
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
