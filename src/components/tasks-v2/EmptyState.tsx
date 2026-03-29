import { SearchX, Inbox, Plus, Sparkles, FolderOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: "no-tasks" | "no-results";
  onCreateTask?: () => void;
  onClearFilters?: () => void;
}

export default function EmptyState({ type, onCreateTask, onClearFilters }: EmptyStateProps) {
  if (type === "no-results") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
          <SearchX className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No matching results</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
          We couldn't find any tasks matching your current filters. Try adjusting your search criteria.
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters} className="gap-2">
            <SearchX className="w-4 h-4" />
            Clear all filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Start your project</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        Create your first task and begin organizing your team's work. Track progress, assign owners, and meet deadlines.
      </p>
      {onCreateTask && (
        <Button onClick={onCreateTask} className="gap-2">
          <Plus className="w-4 h-4" />
          Create your first task
        </Button>
      )}
      
      {/* Quick tips */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center">
          <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center mx-auto mb-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Organize with boards</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center">
          <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center mx-auto mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Track progress</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center">
          <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center mx-auto mb-1.5">
            <Inbox className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Collaborate easily</p>
        </div>
      </div>
    </div>
  );
}
