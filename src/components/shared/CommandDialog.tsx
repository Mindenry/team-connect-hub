import type { ComponentPropsWithoutRef } from "react";
import {
  AnimatedDialogContent,
} from "@/components/shared/AnimatedDialog";
import { cn } from "@/lib/utils";

export type CommandAccent = "sky" | "amber" | "indigo";

const accentGlow: Record<CommandAccent, string> = {
  sky: "bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,0.20),transparent_55%),radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.14),transparent_50%)]",
  amber:
    "bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.18),transparent_55%),radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.10),transparent_50%)]",
  indigo:
    "bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.20),transparent_55%),radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.12),transparent_50%)]",
};

interface CommandDialogContentProps
  extends ComponentPropsWithoutRef<typeof AnimatedDialogContent> {
  accent?: CommandAccent;
}

export function CommandDialogContent({
  accent = "sky",
  className,
  children,
  ...props
}: CommandDialogContentProps) {
  return (
    <AnimatedDialogContent
      {...props}
      className={cn(
        "w-[calc(100%-1rem)] gap-0 border-0 bg-transparent p-0 shadow-none sm:w-full [color-scheme:dark] [&>button]:text-slate-500 [&>button:hover]:text-white",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-[28px] bg-[#0A1120] text-slate-100 shadow-[0_40px_120px_-24px_rgba(2,6,23,0.95)]">
        <div
          className={cn("pointer-events-none absolute inset-x-0 top-0 h-60", accentGlow[accent])}
        />
        <div className="relative">{children}</div>
      </div>
    </AnimatedDialogContent>
  );
}

/** Shared field styling for the dark action dialogs. */
export const commandInputClass =
  "h-11 rounded-xl border-0 bg-white/[0.05] text-slate-100 placeholder:text-slate-500 transition-shadow focus-visible:ring-2 focus-visible:ring-sky-400/30 focus-visible:ring-offset-0";

export const commandSelectContentClass =
  "border border-white/[0.06] bg-[#0E1728] text-slate-100 shadow-2xl";
