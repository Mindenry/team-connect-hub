import { X, Filter, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  displayValue: string;
  color?: string;
}

interface FilterChipsProps {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

/* ════════════════════════════════════════════════════════════════════════════
   FILTER CHIPS - Premium active filter display with animations
   ════════════════════════════════════════════════════════════════════════════ */
export default function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 min-h-[36px] overflow-x-auto no-scrollbar py-1.5">
      {/* Filter indicator */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/30 border border-border/20 shrink-0">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold text-muted-foreground">{filters.length}</span>
      </div>

      {/* Filter chips */}
      {filters.map((filter, index) => (
        <button
          key={filter.key}
          onClick={() => onRemove(filter.key)}
          className={cn(
            "group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0",
            "bg-gradient-to-r from-primary/8 to-primary/4",
            "text-primary border border-primary/15",
            "hover:from-primary/12 hover:to-primary/6 hover:border-primary/30",
            "hover:shadow-md hover:shadow-primary/10",
            "transition-all duration-200",
            "animate-in fade-in slide-in-from-right-2",
            "focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <span className="text-muted-foreground/80 font-medium">{filter.label}:</span>
          <span className="text-primary">{filter.displayValue}</span>
          <X className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary group-hover:rotate-90 transition-all duration-200" />
        </button>
      ))}

      {/* Clear all button */}
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0",
            "text-muted-foreground hover:text-red-500 dark:hover:text-red-400",
            "bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30",
            "border border-transparent hover:border-red-200 dark:hover:border-red-800/50",
            "transition-all duration-200"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Clear all
        </button>
      )}
    </div>
  );
}
