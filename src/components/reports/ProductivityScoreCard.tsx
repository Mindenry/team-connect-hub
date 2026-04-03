import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Activity, CheckSquare, Calendar, MessageSquare, Clock, Info, BookOpen, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProductivityColor, getProductivityGradient } from "./utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProductivityScoreCardProps {
  score: number;
  breakdown?: {
    adjustedTaskPerformance: number;
    meaningfulEngagement: number;
    communicationEffectiveness: number;
    workConsistency: number;
    difficultyFactor: number;
    activeDays: number;
    periodDays: number;
    weights: {
      adjustedTaskPerformance: number;
      meaningfulEngagement: number;
      communicationEffectiveness: number;
      workConsistency: number;
    };
    antiGamingApplied: boolean;
    methodology: string;
  };
}

export function ProductivityScoreCard({ score, breakdown }: ProductivityScoreCardProps) {
  return (
    <Card className={cn(
      "border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
      "bg-gradient-to-br from-background via-background to-primary/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            คะแนนประสิทธิภาพ
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs p-3">
                <p className="font-medium mb-2">วิธีคำนวณคะแนน</p>
                <p className="text-muted-foreground mb-2 text-[10px]">อ้างอิง Balanced Scorecard (Kaplan & Norton, 1996)</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      Adjusted Task Performance
                    </span>
                    <span className="font-medium">{breakdown?.weights.adjustedTaskPerformance || 45}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Meaningful Engagement
                    </span>
                    <span className="font-medium">{breakdown?.weights.meaningfulEngagement || 20}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-violet-500" />
                      Communication Effectiveness
                    </span>
                    <span className="font-medium">{breakdown?.weights.communicationEffectiveness || 20}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      Work Consistency
                    </span>
                    <span className="font-medium">{breakdown?.weights.workConsistency || 15}%</span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-border/50 text-[9px] text-muted-foreground">
                  <p>• Task Difficulty Factor: {breakdown?.difficultyFactor || 1}x</p>
                  <p>• Anti-Gaming: Active</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg", getProductivityGradient(score), "shadow-primary/20")}>
            <TrendingUp className="w-4.5 h-4.5 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("text-2xl font-bold", getProductivityColor(score))}>{Math.round(score)}%</div>
          {breakdown?.antiGamingApplied && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[9px]">
                  <AlertTriangle className="w-3 h-3" />
                  Capped
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                <p>Anti-Gaming Rule Applied</p>
                <p className="text-muted-foreground text-[10px]">Score capped at 50% due to low task completion (&lt;30%)</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <Progress value={score} className="h-2" />
        
        {breakdown && (
          <div className="mt-3 space-y-2.5">
            {/* Score breakdown bars */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CheckSquare className="w-3 h-3 text-emerald-500" />
                  Task Performance
                </span>
                <span className="font-medium">{breakdown.adjustedTaskPerformance}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${breakdown.adjustedTaskPerformance}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3 text-blue-500" />
                  Meaningful Engagement
                </span>
                <span className="font-medium">{breakdown.meaningfulEngagement}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full transition-all" style={{ width: `${breakdown.meaningfulEngagement}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MessageSquare className="w-3 h-3 text-violet-500" />
                  Communication
                </span>
                <span className="font-medium">{breakdown.communicationEffectiveness}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="bg-violet-500 h-full transition-all" style={{ width: `${breakdown.communicationEffectiveness}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3 text-amber-500" />
                  Work Consistency
                </span>
                <span className="font-medium">{breakdown.workConsistency}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full transition-all" style={{ width: `${breakdown.workConsistency}%` }} />
              </div>
            </div>

            {/* Active days & difficulty factor */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Active Days
              </span>
              <span className="font-medium">{breakdown.activeDays}/{breakdown.periodDays} days</span>
            </div>
            
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Difficulty Factor
              </span>
              <span className="font-medium">{breakdown.difficultyFactor}x</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
          <BookOpen className="w-3 h-3" />
          <span>Based on Balanced Scorecard methodology</span>
        </div>
      </CardContent>
    </Card>
  );
}
