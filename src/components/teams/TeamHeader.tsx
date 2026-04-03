import { Users, Hash, CheckSquare, Sparkles } from "lucide-react";
import type { OrgStats } from "./types";

interface TeamHeaderProps {
  orgStats: OrgStats;
  onRefresh: () => void;
  refreshing: boolean;
  onInviteUser: () => void;
  onCreateTeam: () => void;
  canSeeEmployees: boolean;
}

export function TeamHeader({ orgStats, onRefresh, refreshing, onInviteUser, onCreateTeam, canSeeEmployees }: TeamHeaderProps) {
  return (
    <div className="border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="h-auto py-3 sm:py-0 sm:h-16 md:h-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 md:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 w-full sm:w-auto">
            <div className="relative shrink-0">
              <div className="w-9 h-9 sm:w-10 md:w-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 flex items-center justify-center shadow-md shadow-primary/10 ring-1 ring-primary/20">
                <Users className="w-5 h-5 sm:w-5 md:w-6 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[9px] text-primary-foreground border border-background shadow-sm">
                <Sparkles className="w-3 h-3" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">Teams OS</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">มุมมองรวมของทีม · คน · ช่องทางสื่อสาร · งานที่ยังเดินอยู่</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex sm:hidden items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-0.5"><Users className="w-3 h-3" /><span>{orgStats.totalTeams}</span></span>
              <span className="text-muted-foreground/50">·</span>
              <span className="inline-flex items-center gap-0.5"><Hash className="w-3 h-3" /><span>{orgStats.totalChannels}</span></span>
              <span className="text-muted-foreground/50">·</span>
              <span className="inline-flex items-center gap-0.5"><CheckSquare className="w-3 h-3" /><span>{orgStats.totalActiveTasks}</span></span>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] text-muted-foreground/90">
              <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /><span>{orgStats.totalTeams} ทีม</span></span>
              <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" /><span>{orgStats.totalChannels} ช่อง</span></span>
              <span className="inline-flex items-center gap-1"><CheckSquare className="w-3 h-3" /><span>{orgStats.totalActiveTasks} งานเปิดอยู่</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
