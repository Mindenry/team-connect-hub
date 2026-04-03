import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProductivityColor, getProductivityGradient } from "./utils";

interface ProductivityScoreCardProps {
  score: number;
}

export function ProductivityScoreCard({ score }: ProductivityScoreCardProps) {
  return (
    <Card className={cn(
      "border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
      "bg-gradient-to-br from-background via-background to-primary/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">คะแนนประสิทธิภาพ</CardTitle>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg", getProductivityGradient(score), "shadow-primary/20")}>
            <TrendingUp className="w-4.5 h-4.5 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold mb-2", getProductivityColor(score))}>{Math.round(score)}%</div>
        <Progress value={score} className="h-2" />
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
          <Activity className="w-3 h-3" />
          <span>ยิ่งเข้าใกล้ 100% แสดงว่าทำงานได้คุ้มค่ามากขึ้น</span>
        </div>
      </CardContent>
    </Card>
  );
}
