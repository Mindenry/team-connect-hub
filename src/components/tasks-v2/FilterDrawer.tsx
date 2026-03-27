import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export interface FilterValues {
  priority: string;
  assigneeId: string;
  status: string;
}

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterValues;
  onFilterChange: (key: keyof FilterValues, value: string) => void;
  onClearAll: () => void;
  users: any[];
}

const priorities = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const statuses = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
  { value: "canceled", label: "Canceled" },
];

function FilterSelect({
  label,
  value,
  onValueChange,
  placeholder,
  items,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  items: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Select value={value || "all"} onValueChange={(v) => onValueChange(v === "all" ? "" : v)}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function FilterDrawer({
  open,
  onOpenChange,
  filters,
  onFilterChange,
  onClearAll,
  users,
}: FilterDrawerProps) {
  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[360px] max-w-[100vw] p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              Filters
            </SheetTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={onClearAll}>
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[calc(100vh-80px)]">
          <FilterSelect
            label="Status"
            value={filters.status}
            onValueChange={(v) => onFilterChange("status", v)}
            placeholder="All statuses"
            items={statuses}
          />

          <FilterSelect
            label="Priority"
            value={filters.priority}
            onValueChange={(v) => onFilterChange("priority", v)}
            placeholder="All priorities"
            items={priorities}
          />

          <FilterSelect
            label="Assignee"
            value={filters.assigneeId}
            onValueChange={(v) => onFilterChange("assigneeId", v)}
            placeholder="Anyone"
            items={users.map((u) => ({ value: u.id, label: u.name }))}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
