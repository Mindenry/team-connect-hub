import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeamsFilter, ViewMode } from "./types";
import { filterOptions } from "./utils";

interface TeamFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: TeamsFilter;
  onFilterChange: (filter: TeamsFilter) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function TeamFilters({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  viewMode,
  onViewModeChange,
}: TeamFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="relative flex-1 min-w-0 sm:min-w-[220px] md:min-w-[260px]">
        <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาทีมตามชื่อหรือคำอธิบาย..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 sm:pl-9 h-9 sm:h-10 text-sm bg-background/60 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/20"
        />
        {searchQuery && (
          <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8" onClick={() => onSearchChange("")}>
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 rounded-lg sm:rounded-xl border border-border/60 bg-muted/40 px-0.5 sm:px-1 py-0.5 sm:py-1 backdrop-blur-sm overflow-x-auto">
        <span className="hidden md:inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground">
          <Filter className="w-3 h-3" />
          มุมมอง
        </span>
        {filterOptions.map((item) => (
          <button
            key={item.key}
            onClick={() => onFilterChange(item.key as TeamsFilter)}
            className={cn(
              "px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-medium transition-all whitespace-nowrap",
              activeFilter === item.key
                ? "bg-background shadow-sm ring-1 ring-border/60 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-0.5 rounded-lg sm:rounded-xl border border-border/60 bg-background/60 px-0.5 sm:px-1 py-0.5 sm:py-1">
        <button
          onClick={() => onViewModeChange("gallery")}
          className={cn(
            "px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-medium",
            viewMode === "gallery" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Gallery
        </button>
        <button
          onClick={() => onViewModeChange("compact")}
          className={cn(
            "px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-medium",
            viewMode === "compact" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Compact
        </button>
      </div>
    </div>
  );
}
