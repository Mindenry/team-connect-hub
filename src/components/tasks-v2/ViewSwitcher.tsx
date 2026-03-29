import { LayoutGrid, List, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type ViewMode = "board" | "backlog" | "list";

interface ViewSwitcherProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  orientation?: "vertical" | "horizontal";
}

const views: { key: ViewMode; label: string; icon: React.ElementType }[] = [
  { key: "board", label: "Board", icon: LayoutGrid },
  { key: "backlog", label: "Backlog", icon: Rows3 },
  { key: "list", label: "List", icon: List },
];

export default function ViewSwitcher({ activeView, onViewChange, orientation = "vertical" }: ViewSwitcherProps) {
  if (orientation === "horizontal") {
    return (
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
        {views.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onViewChange(key)}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
              activeView === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-2">
      {views.map(({ key, label, icon: Icon }) => (
        <Tooltip key={key} delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onViewChange(key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeView === key
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {label} view
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
