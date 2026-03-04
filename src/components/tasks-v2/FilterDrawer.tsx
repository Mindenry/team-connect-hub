import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export interface FilterValues {
  projectId: string;
  issueType: string;
  priority: string;
  assigneeId: string;
  sprintId: string;
  epicId: string;
  componentId: string;
  versionId: string;
  status: string;
}

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterValues;
  onFilterChange: (key: keyof FilterValues, value: string) => void;
  onClearAll: () => void;
  projects: any[];
  users: any[];
  sprints: any[];
  epics: any[];
  components: any[];
  versions: any[];
}

const issueTypes = [
  { value: "task", label: "📋 Task" },
  { value: "bug", label: "🐛 Bug" },
  { value: "story", label: "📖 Story" },
  { value: "epic", label: "🎯 Epic" },
  { value: "subtask", label: "📝 Subtask" },
];

const priorities = [
  { value: "urgent", label: "🔴 Urgent" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🟢 Low" },
];

const statuses = [
  { value: "todo", valueLabel: "To Do" },
  { value: "in_progress", valueLabel: "In Progress" },
  { value: "in_review", valueLabel: "In Review" },
  { value: "done", valueLabel: "Done" },
  { value: "canceled", valueLabel: "Canceled" },
].map((s) => ({ value: s.value, label: s.valueLabel }));

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
  projects,
  users,
  sprints,
  epics,
  components,
  versions,
}: FilterDrawerProps) {
  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[360px] max-w-[100vw] p-0"
      >
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
            label="Project"
            value={filters.projectId}
            onValueChange={(v) => onFilterChange("projectId", v)}
            placeholder="All projects"
            items={projects.map((p) => ({
              value: p.id,
              label: `${p.key ? p.key + " · " : ""}${p.name}`,
            }))}
          />

          <Separator />

          <FilterSelect
            label="Issue Type"
            value={filters.issueType}
            onValueChange={(v) => onFilterChange("issueType", v)}
            placeholder="All types"
            items={issueTypes}
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

          <Separator />

          <FilterSelect
            label="Sprint"
            value={filters.sprintId}
            onValueChange={(v) => onFilterChange("sprintId", v)}
            placeholder="All sprints"
            items={sprints.map((s) => ({ value: s.id, label: s.name }))}
          />

          <FilterSelect
            label="Epic"
            value={filters.epicId}
            onValueChange={(v) => onFilterChange("epicId", v)}
            placeholder="All epics"
            items={epics.map((e) => ({ value: e.id, label: e.name }))}
          />

          <FilterSelect
            label="Component"
            value={filters.componentId}
            onValueChange={(v) => onFilterChange("componentId", v)}
            placeholder="All components"
            items={components.map((c) => ({ value: c.id, label: c.name }))}
          />

          <FilterSelect
            label="Version"
            value={filters.versionId}
            onValueChange={(v) => onFilterChange("versionId", v)}
            placeholder="All versions"
            items={versions.map((v) => ({ value: v.id, label: v.name }))}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
