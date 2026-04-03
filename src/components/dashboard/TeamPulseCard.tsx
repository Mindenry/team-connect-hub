import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StatusIndicator from "@/components/shared/StatusIndicator";
import { cn } from "@/lib/utils";
import type { MemberItem } from "./types";
import { roomNames, statusLabels, statusColors } from "./utils";

interface TeamPulseCardProps {
  members: Array<MemberItem & { isOnline: boolean }>;
  loading: boolean;
}

export function TeamPulseCard({ members, loading }: TeamPulseCardProps) {
  return (
    <Card className="border bg-card/80 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="py-3 px-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center border border-green-500/20">
            <Eye className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Team Pulse</CardTitle>
            <CardDescription className="text-[11px]">Who's online</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No team members online</p>
        ) : (
          members.slice(0, 6).map((m, i) => {
            const presenceStatus = m.status as "online" | "busy" | "away" | "offline" | "dnd";
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group flex items-center gap-3 rounded-lg border border-border/50 bg-gradient-to-r from-background to-muted/10 p-2.5 hover:border-primary/40 hover:shadow-md transition-all duration-300"
              >
                <div className="relative">
                  <Avatar className={cn("h-9 w-9 ring-2 transition-all duration-300", m.isOnline ? "ring-green-500/30" : "ring-background")}>
                    <AvatarImage src={m.avatar} alt={m.name || "Avatar"} />
                    <AvatarFallback className={cn("bg-gradient-to-br text-foreground text-xs font-bold transition-colors", m.isOnline ? "from-green-500/20 to-green-500/10" : "from-muted/80 to-muted/60")}>{m.initials}</AvatarFallback>
                  </Avatar>
                  <StatusIndicator status={presenceStatus} className="absolute -bottom-0.5 -right-0.5 border-2 border-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{m.activity && presenceStatus !== "offline" ? m.activity : statusLabels[presenceStatus]}</p>
                </div>
                <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 h-5 font-semibold border", statusColors[presenceStatus])}>
                  {m.room ? roomNames[m.room] || m.room : statusLabels[presenceStatus]}
                </Badge>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
