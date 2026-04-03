import { Users, Settings, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Team } from "./types";

interface TeamDetailHeaderProps {
  team: Team;
  onlineMembersCount: number;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function TeamDetailHeader({ team, onlineMembersCount, canManage, onEdit, onDelete }: TeamDetailHeaderProps) {
  return (
    <Card className="border-border/70 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent">
      <CardContent className="p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/25 via-primary/15 to-primary/5 flex items-center justify-center shadow-md ring-1 ring-primary/20">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-foreground truncate">{team.name}</h2>
              </div>
              <p className="text-xs text-muted-foreground">สร้างเมื่อ {team.createdDate}</p>
              {team.description && <p className="text-xs text-muted-foreground/90 mt-1 line-clamp-2">{team.description}</p>}
            </div>
          </div>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  แก้ไขทีม
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  ลบทีม
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
          <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="w-3 h-3" />
                สมาชิก
              </span>
              {onlineMembersCount > 0 && <span className="text-[10px] text-emerald-500">{onlineMembersCount} ออนไลน์</span>}
            </div>
            <p className="text-base font-semibold text-foreground">{team.members.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
