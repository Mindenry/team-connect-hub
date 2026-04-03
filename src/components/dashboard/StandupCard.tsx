import { motion } from "framer-motion";
import { Hash } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { StandupEntryItem } from "./types";

interface TeamOption {
  id: string;
  name: string;
}

interface StandupCardProps {
  entries: StandupEntryItem[];
  teams: TeamOption[];
  selectedTeamId: string | null;
  loading: boolean;
  onTeamChange: (teamId: string | null) => void;
}

export function StandupCard({ entries, teams, selectedTeamId, loading, onTeamChange }: StandupCardProps) {
  return (
    <Card className="border bg-card/80 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="py-3 px-4 border-b border-border/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Hash className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Daily Standup</CardTitle>
              <CardDescription className="text-[11px]">Updates & blockers</CardDescription>
            </div>
          </div>
          {teams.length > 0 && (
            <select
              className="text-[11px] px-2 py-1 border border-border/60 rounded-md bg-background text-foreground hover:bg-muted transition-colors font-medium"
              value={selectedTeamId ?? ""}
              onChange={(e) => onTeamChange(e.target.value || null)}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((k) => (
              <div key={k} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        ) : !selectedTeamId || teams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-6 text-center">
            <p className="text-xs text-muted-foreground">No teams configured yet. Create a team and a #standup channel to start.</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mx-auto mb-3">
              <Hash className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">No updates yet</p>
            <p className="text-xs text-muted-foreground">Post updates in <span className="font-bold">#standup</span></p>
          </div>
        ) : (
          entries.slice(0, 4).map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-lg border border-border/50 bg-gradient-to-r from-background to-muted/10 p-3 hover:border-primary/40 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 ring-2 ring-background shrink-0">
                  <AvatarImage src={entry.user.avatar || undefined} alt={entry.user.name || "Avatar"} />
                  <AvatarFallback className="bg-gradient-to-br from-muted/80 to-muted/60 text-foreground text-[10px] font-bold">
                    {(entry.user.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-foreground truncate">{entry.user.name}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-green-500/10 text-green-600 border-green-500/30 font-semibold">{entry.yesterday.length} done</Badge>
                      <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/30 font-semibold">{entry.today.length} today</Badge>
                      {entry.blockers.length > 0 && <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-red-500/10 text-red-600 border-red-500/30 font-semibold">{entry.blockers.length} blocked</Badge>}
                    </div>
                  </div>
                  {entry.today.length > 0 && <p className="text-[11px] text-muted-foreground truncate">📝 {entry.today[0]}{entry.today.length > 1 ? " +" + (entry.today.length - 1) + " more" : ""}</p>}
                  {entry.blockers.length > 0 && <p className="text-[11px] text-red-600/80 truncate">⚠️ {entry.blockers[0]}{entry.blockers.length > 1 ? " +" + (entry.blockers.length - 1) + " more" : ""}</p>}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
