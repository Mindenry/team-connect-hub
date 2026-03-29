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
    <div className="flex min-h-[34px] items-center gap-2 overflow-x-auto py-1">
      {/* Filter indicator */}
      <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1">
        <Filter className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground">{filters.length}</span>
      </div>

      {/* Filter chips */}
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onRemove(filter.key)}
          className={cn(
            "group flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium",
            "text-foreground hover:bg-muted/40",
            "transition-colors"
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
            "flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium",
            "text-muted-foreground hover:text-foreground hover:bg-muted/40",
            "transition-colors"
          )}
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
}
