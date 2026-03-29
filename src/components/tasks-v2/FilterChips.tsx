import { X, Filter } from "lucide-react";
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

export default function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 min-h-[32px] overflow-x-auto no-scrollbar py-1">
      {/* Filter indicator */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/30 border border-border/30 shrink-0">
        <Filter className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground">{filters.length}</span>
      </div>

      {/* Filter chips */}
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onRemove(filter.key)}
          className={cn(
            "group flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium shrink-0",
            "bg-muted/30 border border-border/40",
            "text-foreground hover:bg-muted/50 hover:border-border/60",
            "transition-all duration-150"
          )}
        >
          <span className="text-muted-foreground">{filter.label}:</span>
          <span>{filter.displayValue}</span>
          <X className="w-3 h-3 text-muted-foreground/50 group-hover:text-foreground" />
        </button>
      ))}

      {/* Clear all button */}
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium shrink-0",
            "text-muted-foreground hover:text-destructive",
            "bg-transparent hover:bg-destructive/5 border border-transparent hover:border-destructive/20",
            "transition-all duration-150"
          )}
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
}
