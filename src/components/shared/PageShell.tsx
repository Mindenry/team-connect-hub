import { ReactNode } from "react";
import PageTransition from "@/components/shared/PageTransition";
import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <PageTransition className={cn("mx-auto w-full max-w-[1400px] 3xl:max-w-[1800px] 4xl:max-w-[2200px] p-3 xs:p-4 sm:p-6 md:p-8 3xl:p-10 4xl:p-12 space-y-4 sm:space-y-5 md:space-y-7", className)}>
      {children}
    </PageTransition>
  );
}

export function PageHero({
  title,
  description,
  meta,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl sm:rounded-2xl border bg-card/70 p-4 sm:p-5 md:p-6 shadow-sm", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-20 h-48 bg-gradient-to-b from-primary/10 via-primary/0 to-transparent blur-2xl" />
      <div className="relative flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {meta}
          </div>
          {description && <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

