import { SearchX, Inbox, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  type: "no-tasks" | "no-results";
  onCreateTask?: () => void;
  onClearFilters?: () => void;
}

export default function EmptyState({ type, onCreateTask, onClearFilters }: EmptyStateProps) {
  if (type === "no-results") {
    return (
      <Card className="border-border/50 border-dashed bg-card/40 mx-6 my-10">
        <CardContent className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/40 flex items-center justify-center mb-5 shadow-sm">
            <SearchX className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">No matching tasks</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed mb-6">
            Try adjusting your filters or search query to find what you're looking for.
          </p>
          {onClearFilters && (
            <Button variant="outline" onClick={onClearFilters} className="gap-2">
              Clear all filters
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 border-dashed bg-card/40 mx-6 my-10">
      <CardContent className="flex flex-col items-center justify-center py-20 px-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center mb-5 shadow-sm ring-1 ring-primary/10">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">No tasks yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed mb-6">
          Get started by creating your first task. Track and organize your team's work in one place.
        </p>
        {onCreateTask && (
          <Button onClick={onCreateTask} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Task
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
