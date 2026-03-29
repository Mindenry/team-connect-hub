import {
  SearchX, Plus, Kanban, Users, CheckCircle2, Filter, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: "no-tasks" | "no-results";
  onCreateTask?: () => void;
  onClearFilters?: () => void;
}

/* ════════════════════════════════════════════════════════════════════════════
   EMPTY STATE - Premium professional illustrations with animations
   ════════════════════════════════════════════════════════════════════════════ */
export default function EmptyState({ type, onCreateTask, onClearFilters }: EmptyStateProps) {
  if (type === "no-results") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg rounded-xl border border-border bg-card px-6 py-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-muted/40">
            <SearchX className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No matching tasks</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Current filters returned no results. Adjust your criteria or clear all active filters.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            {onClearFilters && (
              <Button variant="outline" onClick={onClearFilters} className="gap-2 rounded-md">
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-md">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-muted/40">
              <Kanban className="h-6 w-6 text-foreground" />
            </div>
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">Build your first task flow</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with one task, assign ownership, and track delivery through board or list views.
            </p>
            {onCreateTask && (
              <Button size="lg" onClick={onCreateTask} className="mt-6 h-10 gap-2 rounded-md px-5 text-sm">
                <Plus className="h-4 w-4" />
                Create first task
              </Button>
            )}
          </div>

          <div className="grid min-w-[220px] gap-2">
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                Team collaboration
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Assign tasks and keep ownership clear.</p>
            </div>
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                Delivery visibility
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Track progress, priorities, and deadlines.</p>
            </div>
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4 text-muted-foreground" />
                Powerful filtering
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Focus instantly on the work that matters.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
