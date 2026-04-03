import { cn } from "@/lib/utils";

interface StatusBarRowProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

export function StatusBarRow({ label, count, total, color }: StatusBarRowProps) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-2.5 h-2.5 rounded-full", color)} />
      <span className="text-xs text-muted-foreground w-20 truncate">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground font-medium w-12 text-right">{count} ({pct.toFixed(0)}%)</span>
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string | number;
}

export function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div className="text-center p-2 rounded-lg bg-muted/30">
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
