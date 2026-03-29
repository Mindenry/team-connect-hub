import { useMemo } from "react";
import { X, Check, User as UserIcon, Users, Calendar, Flag, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FilterState, User, Team } from "./types";

interface TaskFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  teams: Team[];
  users: User[];
}

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do", color: "bg-slate-500" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { value: "review", label: "Review", color: "bg-amber-500" },
  { value: "done", label: "Done", color: "bg-green-500" },
];

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", color: "bg-red-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "low", label: "Low", color: "bg-blue-500" },
];

export default function TaskFilters({
  filters,
  onFiltersChange,
  teams,
  users,
}: TaskFiltersProps) {
  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const togglePriority = (priority: string) => {
    const newPriority = filters.priority.includes(priority)
      ? filters.priority.filter((p) => p !== priority)
      : [...filters.priority, priority];
    onFiltersChange({ ...filters, priority: newPriority });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border/40 mt-4">
      {/* Status Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Circle className="w-3.5 h-3.5" />
          สถานะ
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((option) => {
            const isSelected = filters.status.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => toggleStatus(option.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border",
                  isSelected
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-background border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <div className={cn("w-2 h-2 rounded-sm", option.color)} />
                {option.label}
                {isSelected && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Flag className="w-3.5 h-3.5" />
          ความสำคัญ
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITY_OPTIONS.map((option) => {
            const isSelected = filters.priority.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => togglePriority(option.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border",
                  isSelected
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-background border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <div className={cn("w-2 h-2 rounded-sm", option.color)} />
                {option.label}
                {isSelected && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Assignee Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <UserIcon className="w-3.5 h-3.5" />
          ผู้รับผิดชอบ
        </Label>
        <Select
          value={filters.assigneeId || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, assigneeId: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="ทุกคน" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกคน</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-[8px]">
                      {user.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {user.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Team Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          ทีม
        </Label>
        <Select
          value={filters.teamId || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, teamId: value === "all" ? null : value })
          }
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="ทุกทีม" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกทีม</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Due Date Range */}
      <div className="space-y-2 sm:col-span-2">
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          ช่วงวันที่กำหนดส่ง
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.dueDateFrom || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, dueDateFrom: e.target.value || null })
            }
            className="h-9 text-xs"
            placeholder="จาก"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={filters.dueDateTo || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, dueDateTo: e.target.value || null })
            }
            className="h-9 text-xs"
            placeholder="ถึง"
          />
        </div>
      </div>
    </div>
  );
}
