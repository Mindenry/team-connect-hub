import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Calendar, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  storyPoints?: number;
  status?: string;
  sprint?: { id: string };
}

interface BurndownChartProps {
  sprint: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    goal?: string;
    status: string;
  };
  tasks: Task[];
  className?: string;
}

export default function BurndownChart({ sprint, tasks, className }: BurndownChartProps) {
  const { idealLine, actualLine, totalPoints, completedPoints, daysTotal, daysRemaining } = useMemo(() => {
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    const now = new Date();

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, totalDays - elapsedDays);

    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = tasks
      .filter((t) => t.status === "done")
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const inProgressPoints = tasks
      .filter((t) => t.status === "in_progress" || t.status === "review")
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    const idealLine: { day: number; points: number }[] = [];
    for (let d = 0; d <= totalDays; d++) {
      idealLine.push({
        day: d,
        points: Math.max(0, totalPoints - (totalPoints / totalDays) * d),
      });
    }

    const actualLine: { day: number; points: number }[] = [];
    for (let d = 0; d <= elapsedDays; d++) {
      const progressRatio = d / totalDays;
      const expectedDone = totalPoints * progressRatio;
      actualLine.push({
        day: d,
        points: Math.max(0, totalPoints - (d <= elapsedDays - 1 ? totalPoints * (d / totalDays) : completedPoints + inProgressPoints * 0.5)),
      });
    }
    actualLine.push({ day: elapsedDays, points: totalPoints - completedPoints - inProgressPoints * 0.3 });

    return {
      idealLine,
      actualLine,
      totalPoints,
      completedPoints,
      daysTotal: totalDays,
      daysRemaining: remainingDays,
    };
  }, [sprint, tasks]);

  const maxPoints = totalPoints;
  const chartHeight = 120;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingDown className="w-4 h-4 text-primary" />
          Burndown Chart
        </CardTitle>
        <p className="text-xs text-muted-foreground">{sprint.name}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="font-semibold">{totalPoints} SP</span>
              <span className="text-muted-foreground">total</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-semibold text-green-600">{completedPoints} SP</span>
              <span className="text-muted-foreground">done</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{daysRemaining} days left</span>
            </div>
          </div>
        </div>

        <div className="relative h-[140px]">
          <svg viewBox={`0 0 300 ${chartHeight + 20}`} className="w-full h-full" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
              <line
                key={i}
                x1={0}
                y1={chartHeight - pct * chartHeight}
                x2={300}
                y2={chartHeight - pct * chartHeight}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="4 4"
              />
            ))}

            {/* Ideal line */}
            <polyline
              points={idealLine
                .map((p, i) => {
                  const x = (i / (idealLine.length - 1)) * 280 + 10;
                  const y = chartHeight - (maxPoints ? (p.points / maxPoints) * chartHeight : 0);
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.3}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />

            {/* Actual line */}
            <polyline
              points={actualLine
                .map((p, i) => {
                  const x = (i / Math.max(actualLine.length - 1, 1)) * 280 + 10;
                  const y = chartHeight - (maxPoints ? (p.points / maxPoints) * chartHeight : 0);
                  return `${x},${Math.max(0, y)}`;
                })
                .join(" ")}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
            />
          </svg>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground">
            <span>Start</span>
            <span>End</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-primary" />
            <span>Actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-muted-foreground/50" />
            <span>Ideal</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
