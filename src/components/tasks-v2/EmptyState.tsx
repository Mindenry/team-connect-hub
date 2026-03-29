import {
  SearchX, Inbox, Plus, Sparkles, FolderOpen, ArrowRight,
  Kanban, Target, Users, Rocket, Layers, CheckCircle2,
  Zap, ArrowUp, Filter, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <div className="flex flex-col items-center justify-center h-full py-16 px-6">
        <div className="relative">
          {/* Animated background rings */}
          <div className="absolute inset-0 -m-8">
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/10 animate-spin" style={{ animationDuration: "20s" }} />
          </div>
          <div className="absolute inset-0 -m-4">
            <div className="w-24 h-24 rounded-full border border-muted-foreground/15 animate-spin" style={{ animationDuration: "15s", animationDirection: "reverse" }} />
          </div>
          
          {/* Main icon container */}
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/50 dark:to-slate-900/50 flex items-center justify-center shadow-lg ring-1 ring-border/30">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent" />
            <SearchX className="w-9 h-9 text-slate-400 dark:text-slate-500" />
          </div>
        </div>
        
        <div className="mt-8 text-center max-w-sm">
          <h3 className="text-xl font-bold text-foreground tracking-tight">
            No matching results
          </h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            We couldn't find any tasks matching your current filters. Try adjusting your search criteria or clearing filters.
          </p>
        </div>
        
        {onClearFilters && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              variant="default"
              onClick={onClearFilters}
              className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              <X className="w-4 h-4" />
              Clear all filters
            </Button>
          </div>
        )}
        
        {/* Quick filter suggestions */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {["All tasks", "In Progress", "High Priority", "Due this week"].map((label) => (
            <button
              key={label}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-muted/30 hover:bg-muted/50 hover:text-foreground border border-border/20 hover:border-border/40 transition-all duration-200"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-6">
      {/* Hero illustration */}
      <div className="relative">
        {/* Animated glow */}
        <div className="absolute inset-0 -m-12">
          <div className="w-40 h-40 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        </div>
        
        {/* Floating elements */}
        <div className="absolute -top-4 -left-8 animate-bounce" style={{ animationDelay: "0s", animationDuration: "3s" }}>
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shadow-lg border border-blue-200/50 dark:border-blue-800/50">
            <Target className="w-5 h-5 text-blue-500" />
          </div>
        </div>
        <div className="absolute -top-2 -right-10 animate-bounce" style={{ animationDelay: "0.5s", animationDuration: "3s" }}>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-lg border border-emerald-200/50 dark:border-emerald-800/50">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 animate-bounce" style={{ animationDelay: "1s", animationDuration: "3s" }}>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shadow-lg border border-amber-200/50 dark:border-amber-800/50">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
        </div>
        <div className="absolute -bottom-4 -left-10 animate-bounce" style={{ animationDelay: "1.5s", animationDuration: "3s" }}>
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shadow-lg border border-violet-200/50 dark:border-violet-800/50">
            <Layers className="w-5 h-5 text-violet-500" />
          </div>
        </div>
        
        {/* Main icon container */}
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-2xl shadow-primary/30 ring-4 ring-primary/20">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-white/20 to-transparent" />
          <Rocket className="w-11 h-11 text-primary-foreground" />
        </div>
      </div>
      
      <div className="mt-10 text-center max-w-md">
        <h3 className="text-2xl font-bold text-foreground tracking-tight">
          Start your project
        </h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Create your first task and begin organizing your team's work. Track progress, assign owners, and meet deadlines with ease.
        </p>
      </div>
      
      {onCreateTask && (
        <div className="mt-8">
          <Button
            size="lg"
            onClick={onCreateTask}
            className="gap-2.5 px-6 h-11 text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
          >
            <Plus className="w-4.5 h-4.5" />
            Create your first task
          </Button>
        </div>
      )}
      
      {/* Feature highlights */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {[
          {
            icon: Kanban,
            title: "Kanban Boards",
            description: "Visual workflow management",
            color: "blue",
            bg: "bg-blue-50 dark:bg-blue-950/30",
            border: "border-blue-100 dark:border-blue-900/50",
            iconBg: "bg-blue-100 dark:bg-blue-900/50",
            iconColor: "text-blue-600 dark:text-blue-400",
          },
          {
            icon: Users,
            title: "Team Collaboration",
            description: "Assign and track together",
            color: "emerald",
            bg: "bg-emerald-50 dark:bg-emerald-950/30",
            border: "border-emerald-100 dark:border-emerald-900/50",
            iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
            iconColor: "text-emerald-600 dark:text-emerald-400",
          },
          {
            icon: Target,
            title: "Goal Tracking",
            description: "Meet every deadline",
            color: "amber",
            bg: "bg-amber-50 dark:bg-amber-950/30",
            border: "border-amber-100 dark:border-amber-900/50",
            iconBg: "bg-amber-100 dark:bg-amber-900/50",
            iconColor: "text-amber-600 dark:text-amber-400",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className={cn(
              "group relative rounded-2xl border p-5 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
              feature.bg,
              feature.border
            )}
          >
            <div className={cn("w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center transition-transform duration-300 group-hover:scale-110", feature.iconBg)}>
              <feature.icon className={cn("w-6 h-6", feature.iconColor)} />
            </div>
            <h4 className="text-sm font-semibold text-foreground">{feature.title}</h4>
            <p className="mt-1 text-xs text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
      
      {/* Keyboard shortcut hint */}
      <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground/60">
        <span>Press</span>
        <kbd className="px-2 py-1 rounded-md bg-muted/50 border border-border/40 font-mono text-[10px] font-semibold">N</kbd>
        <span>to create a new task</span>
      </div>
    </div>
  );
}
