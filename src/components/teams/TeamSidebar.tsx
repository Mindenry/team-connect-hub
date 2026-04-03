import { motion } from "framer-motion";
import { Users, Hash, CheckSquare, Star, StarOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Team, ViewMode } from "./types";

interface TeamSidebarProps {
  teams: Team[];
  filteredTeams: Team[];
  selectedTeamId: string | null;
  favoriteTeamIds: string[];
  loading: boolean;
  viewMode: ViewMode;
  currentUserId?: string;
  onSelectTeam: (teamId: string) => void;
  onToggleFavorite: (teamId: string) => void;
  onCreateTeam: () => void;
}

export function TeamSidebar({
  teams,
  filteredTeams,
  selectedTeamId,
  favoriteTeamIds,
  loading,
  viewMode,
  currentUserId,
  onSelectTeam,
  onToggleFavorite,
  onCreateTeam,
}: TeamSidebarProps) {
  return (
    <div className="shrink-0 flex flex-col rounded-xl sm:rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden w-[260px]">
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border/60 flex items-center justify-between">
        <div>
          <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Teams index
          </p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground/80">
            {filteredTeams.length} จาก {teams.length} ทีม
          </p>
        </div>
        {favoriteTeamIds.length > 0 && (
          <Badge variant="outline" className="h-5 sm:h-6 px-1.5 sm:px-2 text-[9px] sm:text-[10px]">
            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 text-amber-500" />
            {favoriteTeamIds.length}
          </Badge>
        )}
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg sm:rounded-xl border border-border/40 bg-muted/40 px-2.5 sm:px-3 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3">
                <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-2.5 sm:h-3 w-4/5" />
                  <Skeleton className="h-2 sm:h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="px-3 sm:px-4 py-6 sm:py-8 text-center text-[10px] sm:text-xs text-muted-foreground space-y-2 sm:space-y-3">
            <div className="flex justify-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted/50 flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              </div>
            </div>
            <p className="font-medium">ยังไม่มีทีมในมุมมองนี้</p>
            <Button variant="outline" size="sm" onClick={onCreateTeam} className="h-7 sm:h-8 text-[10px] sm:text-xs">
              สร้างทีมแรกของคุณ
            </Button>
          </div>
        ) : (
          <div className="p-2 sm:p-3 space-y-1 sm:space-y-1.5">
            {filteredTeams.map((team) => {
              const isSelected = team.id === selectedTeamId;
              const isFavorite = favoriteTeamIds.includes(team.id);
              const isMyTeam = !!currentUserId && team.members.some((m) => m.userId === currentUserId);
              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => onSelectTeam(team.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectTeam(team.id);
                    }
                  }}
                  className={cn(
                    "w-full text-left rounded-lg sm:rounded-xl border transition-all flex items-center cursor-pointer select-none",
                    "hover:border-primary/40 hover:bg-primary/5",
                    isSelected ? "border-primary/60 bg-primary/10 shadow-sm" : "border-border/40 bg-background/40",
                    viewMode === "gallery" ? "px-2.5 sm:px-3 py-2 sm:py-2.5 gap-2 sm:gap-3" : "px-2 sm:px-2.5 py-1.5 gap-2 text-[10px] sm:text-[11px]"
                  )}
                >
                  <div className="relative">
                    <div className={cn("rounded-md sm:rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center", viewMode === "gallery" ? "w-8 h-8 sm:w-9 sm:h-9" : "w-6 h-6 sm:w-7 sm:h-7")}>
                      <Users className={cn("text-primary", viewMode === "gallery" ? "w-3.5 h-3.5 sm:w-4 sm:h-4" : "w-3 h-3.5 sm:w-3.5 sm:h-3.5")} />
                    </div>
                    {isFavorite && <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500 absolute -top-0.5 -right-0.5 drop-shadow-sm" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-foreground truncate", viewMode === "gallery" ? "text-[11px] sm:text-xs" : "text-[10px] sm:text-[11px]")}>{team.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5"><Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{team.members.length}</span>
                      <span className="inline-flex items-center gap-0.5"><Hash className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{team.channels.length}</span>
                      {team.activeTasks > 0 && <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400"><CheckSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{team.activeTasks}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 sm:gap-1">
                    {isMyTeam && <Badge variant="outline" className="h-3.5 sm:h-4 px-1 sm:px-1.5 text-[8px] sm:text-[9px] border-primary/40 text-primary">My</Badge>}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onToggleFavorite(team.id); }}
                          className="inline-flex items-center justify-center rounded-full h-5 w-5 sm:h-6 sm:w-6 hover:bg-background/80"
                        >
                          {isFavorite ? <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500" /> : <StarOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{isFavorite ? "เอาออกจากที่ปักหมุด" : "ปักหมุดทีมนี้"}</TooltipContent>
                    </Tooltip>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
