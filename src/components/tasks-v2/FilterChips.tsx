import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  displayValue: string;
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
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onRemove(filter.key)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
            "bg-primary/8 text-primary border border-primary/15",
            "hover:bg-primary/12 hover:border-primary/25 transition-colors",
            "group"
          )}
        >
          <span className="text-muted-foreground/70">{filter.label}:</span>
          <span>{filter.displayValue}</span>
          <X className="w-3 h-3 text-primary/50 group-hover:text-primary transition-colors" />
        </button>
      ))}
      {filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 px-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
