import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  icon: LucideIcon;
  gradient: string;
  shadowColor: string;
}

export function KpiCard({ title, value, suffix, icon: Icon, gradient, shadowColor }: KpiCardProps) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg", gradient, shadowColor)}>
            <Icon className="w-4.5 h-4.5 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground flex items-baseline gap-1">
          <span>{value}</span>
          {suffix && <span className="text-xs text-muted-foreground font-normal">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
