import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import StatusIndicator from "@/components/shared/StatusIndicator";
import { MoreHorizontal, Crown, Trash2, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamMember } from "./types";
import { getRoleLabel } from "./utils";

interface TeamMembersListProps {
  members: TeamMember[];
  currentUserId?: string;
  canManage: boolean;
  onRemoveMember: (userId: string) => void;
  onChangeRole: (userId: string, role: "lead" | "member") => void;
}

export function TeamMembersList({ members, currentUserId, canManage, onRemoveMember, onChangeRole }: TeamMembersListProps) {
  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isSelf = member.userId === currentUserId;
        const roleLabel = getRoleLabel(member.role);
        const isLead = member.role?.toLowerCase() === "lead";

        return (
          <div
            key={member.userId || member.email}
            className={cn(
              "group flex items-center gap-3 rounded-lg border border-border/50 bg-gradient-to-r from-background to-muted/10 p-3 hover:border-primary/40 hover:shadow-md transition-all duration-300",
              isSelf && "ring-1 ring-primary/30 bg-primary/5"
            )}
          >
            <div className="relative">
              <Avatar className="h-9 w-9 ring-2 ring-background">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-bold">
                  {member.initials}
                </AvatarFallback>
              </Avatar>
              <StatusIndicator status={member.status} className="absolute -bottom-0.5 -right-0.5 border-2 border-background" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                {isLead && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                {isSelf && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-primary/40 text-primary">
                    You
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-2.5",
                  isLead ? "border-amber-500/40 text-amber-600 bg-amber-500/10" : "border-border/60"
                )}
              >
                {roleLabel}
              </Badge>

              {canManage && !isSelf && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onChangeRole(member.userId!, isLead ? "member" : "lead")}>
                      <UserCog className="w-4 h-4 mr-2" />
                      {isLead ? "ทำให้เป็นสมาชิก" : "ทำให้เป็น Lead"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => onRemoveMember(member.userId!)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      ลบออกจากทีม
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
