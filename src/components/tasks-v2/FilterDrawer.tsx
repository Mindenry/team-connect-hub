import {
  Filter, Calendar, X, Sparkles, RotateCcw,
  ArrowUp, ChevronUp, Minus, ChevronDown,
  CircleDot, Clock, Eye, CheckCircle2, CircleSlash,
  User, SlidersHorizontal, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface FilterValues {
  priority: string;
  assigneeId: string;
  status: string;
  dueDateFrom: string;
  dueDateTo: string;
}

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterValues;
  onFilterChange: (key: keyof FilterValues, value: string) => void;
  onClearAll: () => void;
  users: any[];
}

/* ─── PRIORITY CONFIG WITH ICONS ─────────────────────────────────── */
const priorities = [
  { value: "urgent", label: "Urgent", icon: ArrowUp, color: "#ef4444", bg: "bg-red-50 dark:bg-red-950/30" },
  { value: "high", label: "High", icon: ChevronUp, color: "#f97316", bg: "bg-orange-50 dark:bg-orange-950/30" },
  { value: "medium", label: "Medium", icon: Minus, color: "#eab308", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  { value: "low", label: "Low", icon: ChevronDown, color: "#64748b", bg: "bg-slate-50 dark:bg-slate-950/30" },
];

/* ─── STATUS CONFIG WITH ICONS ───────────────────────────────────── */
const statuses = [
  { value: "todo", label: "To Do", icon: CircleDot, color: "#64748b", bg: "bg-slate-50 dark:bg-slate-950/30" },
  { value: "in_progress", label: "In Progress", icon: Clock, color: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { value: "in_review", label: "In Review", icon: Eye, color: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { value: "done", label: "Done", icon: CheckCircle2, color: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { value: "canceled", label: "Canceled", icon: CircleSlash, color: "#94a3b8", bg: "bg-slate-50 dark:bg-slate-950/30" },
];

/* ─── PREMIUM FILTER SELECT ─────────────────────────────────────── */
function FilterSelect({
  label,
  value,
  onValueChange,
  placeholder,
  items,
  icon: LabelIcon,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  items: { value: string; label: string; icon?: any; color?: string; bg?: string }[];
  icon?: any;
}) {
  const selectedItem = items.find((i) => i.value === value);
  const SelectedIcon = selectedItem?.icon;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
        {LabelIcon && <LabelIcon className="w-3.5 h-3.5" />}
        {label}
      </Label>
      <Select value={value || "all"} onValueChange={(v) => onValueChange(v === "all" ? "" : v)}>
        <SelectTrigger className={cn(
          "h-10 text-sm font-medium rounded-xl border-border/40 bg-background/50",
          "hover:border-border/60 hover:bg-background/80 transition-all duration-200",
          "focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        )}>
          <SelectValue placeholder={placeholder}>
            {selectedItem && SelectedIcon ? (
              <span className="flex items-center gap-2">
                <span
                  className={cn("w-5 h-5 rounded-md flex items-center justify-center", selectedItem.bg || "bg-muted/50")}
                >
                  <SelectedIcon className="w-3 h-3" style={{ color: selectedItem.color }} />
                </span>
                {selectedItem.label}
              </span>
            ) : (
              placeholder
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/40 bg-background/95 backdrop-blur-xl shadow-xl">
          <SelectItem value="all" className="text-sm rounded-lg focus:bg-primary/5">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="w-5 h-5 rounded-md bg-muted/30 flex items-center justify-center">
                <Sparkles className="w-3 h-3" />
              </span>
              All
            </span>
          </SelectItem>
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <SelectItem
                key={item.value}
                value={item.value}
                className="text-sm rounded-lg focus:bg-primary/5"
              >
                <span className="flex items-center gap-2">
                  {ItemIcon && (
                    <span
                      className={cn("w-5 h-5 rounded-md flex items-center justify-center", item.bg || "bg-muted/50")}
                    >
                      <ItemIcon className="w-3 h-3" style={{ color: item.color }} />
                    </span>
                  )}
                  {item.label}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ─── QUICK FILTER BUTTON ───────────────────────────────────────── */
function QuickFilterButton({
  label,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  label: string;
  icon: any;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
        "border border-border/30",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
          : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-border/50"
      )}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: active ? "currentColor" : color }} />
      {label}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FILTER DRAWER - Premium Professional Design
   ════════════════════════════════════════════════════════════════════════════ */
export default function FilterDrawer({
  open,
  onOpenChange,
  filters,
  onFilterChange,
  onClearAll,
  users,
}: FilterDrawerProps) {
  const hasActiveFilters = Object.values(filters).some((v) => v !== "");
  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:w-[400px] max-w-[100vw] p-0",
          "bg-gradient-to-b from-background via-background to-muted/10"
        )}
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-5 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold tracking-tight">Filters</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  Refine your task view
                </SheetDescription>
              </div>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5 rounded-lg"
                onClick={onClearAll}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Quick filters */}
        <div className="px-6 py-4 border-b border-border/20 bg-muted/5">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Filters</p>
          <div className="flex flex-wrap gap-2">
            <QuickFilterButton
              label="High Priority"
              icon={ArrowUp}
              color="#ef4444"
              active={filters.priority === "urgent" || filters.priority === "high"}
              onClick={() => onFilterChange("priority", filters.priority === "high" ? "" : "high")}
            />
            <QuickFilterButton
              label="In Progress"
              icon={Clock}
              color="#3b82f6"
              active={filters.status === "in_progress"}
              onClick={() => onFilterChange("status", filters.status === "in_progress" ? "" : "in_progress")}
            />
            <QuickFilterButton
              label="Overdue"
              icon={Calendar}
              color="#ef4444"
              active={false}
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                onFilterChange("dueDateTo", today);
              }}
            />
            <QuickFilterButton
              label="Done"
              icon={CheckCircle2}
              color="#10b981"
              active={filters.status === "done"}
              onClick={() => onFilterChange("status", filters.status === "done" ? "" : "done")}
            />
          </div>
        </div>

        {/* Filter sections */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[calc(100vh-280px)]">
          {/* Status */}
          <FilterSelect
            label="Status"
            value={filters.status}
            onValueChange={(v) => onFilterChange("status", v)}
            placeholder="All statuses"
            items={statuses}
            icon={CircleDot}
          />

          {/* Priority */}
          <FilterSelect
            label="Priority"
            value={filters.priority}
            onValueChange={(v) => onFilterChange("priority", v)}
            placeholder="All priorities"
            items={priorities}
            icon={Zap}
          />

          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <User className="w-3.5 h-3.5" />
              Assignee
            </Label>
            <Select
              value={filters.assigneeId || "all"}
              onValueChange={(v) => onFilterChange("assigneeId", v === "all" ? "" : v)}
            >
              <SelectTrigger className={cn(
                "h-10 text-sm font-medium rounded-xl border-border/40 bg-background/50",
                "hover:border-border/60 hover:bg-background/80 transition-all duration-200",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              )}>
                <SelectValue placeholder="Anyone" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/40 bg-background/95 backdrop-blur-xl shadow-xl">
                <SelectItem value="all" className="text-sm rounded-lg focus:bg-primary/5">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-6 h-6 rounded-full bg-muted/30 flex items-center justify-center">
                      <Sparkles className="w-3 h-3" />
                    </span>
                    Anyone
                  </span>
                </SelectItem>
                {users.map((user) => (
                  <SelectItem
                    key={user.id}
                    value={user.id}
                    className="text-sm rounded-lg focus:bg-primary/5"
                  >
                    <span className="flex items-center gap-2">
                      <Avatar className="w-6 h-6 border border-border/30">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                          {user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {user.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date Range */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <Calendar className="w-3.5 h-3.5" />
              Due Date Range
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground font-medium">From</Label>
                <Input
                  type="date"
                  value={filters.dueDateFrom || ""}
                  onChange={(e) => onFilterChange("dueDateFrom", e.target.value)}
                  className={cn(
                    "h-10 text-sm rounded-xl border-border/40 bg-background/50",
                    "hover:border-border/60 transition-all duration-200",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground font-medium">To</Label>
                <Input
                  type="date"
                  value={filters.dueDateTo || ""}
                  onChange={(e) => onFilterChange("dueDateTo", e.target.value)}
                  className={cn(
                    "h-10 text-sm rounded-xl border-border/40 bg-background/50",
                    "hover:border-border/60 transition-all duration-200",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer with apply button */}
        <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-border/30 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {activeFilterCount > 0 ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                    {activeFilterCount}
                  </span>
                  filter{activeFilterCount > 1 ? "s" : ""} active
                </span>
              ) : (
                "No filters applied"
              )}
            </div>
            <Button
              className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
              onClick={() => onOpenChange(false)}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
