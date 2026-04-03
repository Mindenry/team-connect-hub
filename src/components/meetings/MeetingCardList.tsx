import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Video, Calendar, Clock, Building2, ArrowRight, Play, MoreVertical, Pencil, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";
import type { Meeting, ActiveRoom } from "./types";
import { getMeetingStatus } from "./utils";

interface MeetingCardListProps {
  meeting: Meeting;
  index: number;
  activeRooms?: ActiveRoom[];
  onEdit?: (meetingId: string) => void;
  onMinutes?: (meetingId: string, meetingTitle: string) => void;
}

export function MeetingCardList({ meeting, index, activeRooms = [], onEdit, onMinutes }: MeetingCardListProps) {
  const navigate = useNavigate();
  const currentUser = auth.getUser();
  const { statusLabel, statusTone, isEnded, isActuallyLive, isOnlyMe } = getMeetingStatus(meeting, activeRooms, currentUser?.id);
  
  const room = activeRooms.find((r) => r.roomId === meeting.id || r.roomId === meeting.meetingCode);
  const roomParticipants = room?.participants || [];

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03, duration: 0.3 }}>
      <Card
        className={cn(
          "group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-300 cursor-pointer",
          "hover:shadow-lg hover:shadow-black/8 ring-0 hover:ring-1 hover:ring-primary/10"
        )}
        onClick={() => !isEnded && navigate(`/meeting-lobby/${meeting.id}`)}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <div
              className={cn(
                "w-9 h-9 sm:w-10 md:w-12 rounded-md sm:rounded-lg flex items-center justify-center transition-all duration-300 shrink-0",
                "bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10",
                statusTone === "live" && "from-emerald-500/15 to-emerald-500/5",
                statusTone === "ended" && "from-muted/60 to-muted/40"
              )}
            >
              {statusTone === "live" ? (
                <Play className="w-4 h-4 sm:w-5 md:w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Video className={cn("w-4 h-4 sm:w-5 md:w-6", statusTone === "ended" ? "text-muted-foreground" : "text-primary")} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">{meeting.title}</h3>
                <span
                  className={cn(
                    "text-[9px] font-semibold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full shrink-0",
                    statusTone === "live" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                    statusTone === "ended" && "bg-muted/60 text-muted-foreground",
                    statusTone === "waiting" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    statusTone === "upcoming" && "bg-primary/10 text-primary"
                  )}
                >
                  {statusLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {meeting.date} · {meeting.time}
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {meeting.duration}
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {meeting.team}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {roomParticipants.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1">
                    {roomParticipants.slice(0, 3).map((p, i) => (
                      <Avatar key={p.peerId || i} className="h-5 w-5 border-2 border-background">
                        <AvatarImage src={(p as any).avatar} alt={p.name || "Avatar"} />
                        <AvatarFallback className="text-[8px] font-semibold bg-muted">{p.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{roomParticipants.length}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-6 w-6 border border-border/50">
                    <AvatarImage src={(meeting.host as any).avatar} alt={meeting.host.name || "Avatar"} />
                    <AvatarFallback className="text-[10px] font-semibold bg-muted">{meeting.host.initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline truncate max-w-[80px]">{meeting.host.name}</span>
                </div>
              )}
              {isEnded ? (
                <div className="flex gap-1">
                  {onMinutes && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] font-medium" onClick={(e) => { e.stopPropagation(); onMinutes(meeting.id, meeting.title); }}>
                      <FileText className="w-3 h-3 mr-1" />
                      Minutes
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] font-medium text-muted-foreground cursor-default">
                    Ended
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted/80" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(meeting.id); }}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit Meeting
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button
                    size="sm"
                    variant={isActuallyLive || isOnlyMe ? "default" : "outline"}
                    className="h-7 px-2 text-[10px] font-semibold"
                    onClick={(e) => { e.stopPropagation(); navigate(`/meeting-lobby/${meeting.id}`); }}
                  >
                    {isActuallyLive || isOnlyMe ? "Join" : "Open"}
                    <ArrowRight className="w-3 h-3 ml-0.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
