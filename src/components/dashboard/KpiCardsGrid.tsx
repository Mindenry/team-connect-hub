import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { KpiCardConfig } from "./types";
import { cardHoverVariants } from "./utils";

interface KpiCardsGridProps {
  cards: KpiCardConfig[];
  loading: boolean;
  onCardClick: (label: string) => void;
}

export function KpiCardsGrid({ cards, loading, onCardClick }: KpiCardsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {cards.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <motion.div
            key={kpi.label}
            variants={cardHoverVariants}
            initial="rest"
            whileHover="hover"
            custom={index}
          >
            <Card
              className="group relative h-full border bg-card/80 backdrop-blur-xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => onCardClick(kpi.label)}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", kpi.gradient)} />
              <CardContent className="relative p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      {kpi.label}
                    </p>
                    {loading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <p className="text-2xl font-bold tracking-tight text-foreground">
                        {kpi.value}
                      </p>
                    )}
                  </div>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110",
                    kpi.iconBg,
                    kpi.borderColor,
                    kpi.iconColor
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
