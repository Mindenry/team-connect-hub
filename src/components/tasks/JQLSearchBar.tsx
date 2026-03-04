import { useState, useCallback } from "react";
import { Search, X, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Basic JQL-style search parser
 * Supports: project = X, status = X, assignee = X, priority = X, type = X, text search
 * Example: project = ABC AND status = "In Progress"
 */
export function parseJQL(query: string): {
  project?: string;
  status?: string;
  assignee?: string;
  priority?: string;
  type?: string;
  sprint?: string;
  epic?: string;
  search?: string;
} {
  const result: Record<string, string> = {};
  const lower = query.toLowerCase().trim();

  const patterns = [
    { key: "project", regex: /project\s*=\s*["']?([a-zA-Z0-9_-]+)["']?/i },
    { key: "status", regex: /status\s*=\s*["']?([a-zA-Z0-9_\s-]+)["']?/i },
    { key: "assignee", regex: /assignee\s*=\s*["']?([a-zA-Z0-9@._-]+)["']?/i },
    { key: "priority", regex: /priority\s*=\s*["']?([a-zA-Z0-9]+)["']?/i },
    { key: "type", regex: /type\s*=\s*["']?([a-zA-Z0-9]+)["']?/i },
    { key: "sprint", regex: /sprint\s*=\s*["']?([a-zA-Z0-9_\s-]+)["']?/i },
    { key: "epic", regex: /epic\s*=\s*["']?([a-zA-Z0-9_\s-]+)["']?/i },
  ];

  let remaining = query;
  for (const { key, regex } of patterns) {
    const match = remaining.match(regex);
    if (match) {
      result[key] = match[1].trim();
      remaining = remaining.replace(match[0], "").trim();
    }
  }

  const andRemoved = remaining.replace(/\bAND\b/gi, " ").trim();
  if (andRemoved.length > 0) {
    result.search = andRemoved;
  }

  return result as any;
}

interface JQLSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (parsed: ReturnType<typeof parseJQL>) => void;
  placeholder?: string;
  className?: string;
}

const JQL_EXAMPLES = [
  'status = "In Progress"',
  'priority = high',
  'assignee = me',
  'type = bug',
  'project = ABC',
];

export default function JQLSearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "JQL: project = ABC AND status = \"In Progress\"",
  className,
}: JQLSearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        const parsed = parseJQL(value);
        onSearch?.(parsed);
      }
    },
    [value, onSearch]
  );

  const parsed = value.trim() ? parseJQL(value) : null;
  const hasFilters = parsed && Object.keys(parsed).length > 0;

  return (
    <TooltipProvider>
      <div className={cn("relative", className)}>
        <div
          className={cn(
            "flex items-center rounded-lg border-2 bg-background transition-colors",
            focused ? "border-primary/50 ring-2 ring-primary/20" : "border-border/50"
          )}
        >
          <Search className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
          />
          {value && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                onChange("");
                onSearch?.({});
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setShowExamples(!showExamples)}
              >
                <Zap className="w-4 h-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>JQL Examples</TooltipContent>
          </Tooltip>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(parsed!).map(([k, v]) => (
              <Badge key={k} variant="secondary" className="text-[10px]">
                {k}: {v}
              </Badge>
            ))}
          </div>
        )}

        {showExamples && (
          <div className="absolute top-full left-0 right-0 mt-1 p-2 rounded-lg border bg-popover shadow-lg z-50">
            <p className="text-xs font-semibold mb-2">JQL Examples</p>
            <div className="space-y-1">
              {JQL_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  className="block w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted"
                  onClick={() => {
                    onChange(ex);
                    setShowExamples(false);
                    onSearch?.(parseJQL(ex));
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
