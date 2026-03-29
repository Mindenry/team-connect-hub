import { useState } from "react";
import {
  Plus, Search, Filter, MoreHorizontal, Rocket, Package, Layers, Target, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ViewSwitcher, { type ViewMode } from "./ViewSwitcher";
import { cn } from "@/lib/utils";

interface CommandBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  activeView: ViewMode;
  onViewChange: (v: ViewMode) => void;
  onCreateTask: () => void;
  onOpenFilters: () => void;
  onManageSprints: () => void;
  onManageEpics?: () => void;
  onManageComponents?: () => void;
  onManageVersions?: () => void;
  activeFilterCount: number;
  projectName?: string;
  isCompact?: boolean;
}

export default function CommandBar({
  search,
  onSearchChange,
  activeView,
  onViewChange,
  onCreateTask,
  onOpenFilters,
  onManageSprints,
  onManageEpics,
  onManageComponents,
  onManageVersions,
  activeFilterCount,
  projectName,
  isCompact = false,
}: CommandBarProps) {
  const [searchExpanded, setSearchExpanded] = useState(false);

  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/70 bg-background px-4 py-2 lg:px-5">
      {/* Left section: breadcrumb / project context */}
      <div className="flex items-center gap-2 shrink-0">
        {projectName && (
          <span className="text-sm font-semibold text-foreground hidden sm:inline truncate max-w-[160px]">
            {projectName}
          </span>
        )}
        {!projectName && (
          <span className="text-sm font-semibold text-foreground">Tasks</span>
        )}
      </div>

      {/* View switcher (horizontal, for the command bar) */}
      {!isCompact && (
        <div className="hidden md:flex ml-2">
          <ViewSwitcher activeView={activeView} onViewChange={onViewChange} orientation="horizontal" />
        </div>
      )}
      {isCompact && (
        <div className="flex ml-1">
          <ViewSwitcher activeView={activeView} onViewChange={onViewChange} orientation="horizontal" />
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className={cn(
        "transition-all duration-200",
        searchExpanded || search
          ? "w-48 sm:w-56 lg:w-64"
          : "w-9"
      )}>
        {searchExpanded || search ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tasks…"
              className="h-8 rounded-md border-border pl-8 pr-8 text-sm"
              autoFocus
              onBlur={() => {
                if (!search) setSearchExpanded(false);
              }}
            />
            {search && (
              <button
                onClick={() => { onSearchChange(""); setSearchExpanded(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <span className="text-xs">✕</span>
              </button>
            )}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md border border-border"
            onClick={() => setSearchExpanded(true)}
            title="Search tasks"
          >
            <Search className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Filter button */}
      <Button
        variant={activeFilterCount > 0 ? "default" : "outline"}
        size="sm"
        className="h-8 gap-1.5 rounded-md text-xs"
        onClick={onOpenFilters}
      >
        <Filter className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Filters</span>
        {activeFilterCount > 0 && (
          <span className="ml-0.5 bg-primary-foreground/20 text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
            {activeFilterCount}
          </span>
        )}
      </Button>

      {/* Sprint management */}
      <Button variant="outline" size="sm" className="hidden h-8 gap-1.5 rounded-md text-xs lg:flex" onClick={onManageSprints}>
        <Rocket className="w-3.5 h-3.5" />
        Sprints
      </Button>

      {/* Create task */}
      <Button size="sm" className="h-8 gap-1.5 rounded-md text-xs" onClick={onCreateTask}>
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">New Task</span>
      </Button>

      {/* Overflow menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-md border border-border">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onManageSprints} className="lg:hidden">
            <Rocket className="w-4 h-4 mr-2" />
            Manage Sprints
          </DropdownMenuItem>
          {onManageEpics && (
            <DropdownMenuItem onClick={onManageEpics}>
              <Target className="w-4 h-4 mr-2" />
              Manage Epics
            </DropdownMenuItem>
          )}
          {onManageComponents && (
            <DropdownMenuItem onClick={onManageComponents}>
              <Package className="w-4 h-4 mr-2" />
              Manage Components
            </DropdownMenuItem>
          )}
          {onManageVersions && (
            <DropdownMenuItem onClick={onManageVersions}>
              <Tag className="w-4 h-4 mr-2" />
              Manage Versions
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenFilters}>
            <Filter className="w-4 h-4 mr-2" />
            Advanced Filters
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
