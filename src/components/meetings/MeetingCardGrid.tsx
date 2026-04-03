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

interface MeetingCardGridProps {
  meeting: Meeting;
  index: number;
  activeRooms?: ActiveRoom[];
  onEdit?: (meetingId: string) => void;
  onMinutes?: (meetingId: string, meetingTitle: string) => void;
}

export function MeetingCardGrid({ meeting, index, activeRooms = [], onEdit, onMinutes }: MeetingCardGridProps) {
  const navigate = useNavigate();
  const currentUser = auth.getUser();
  const { statusLabel, statusTone, isEnded, isActuallyLive, isOnlyMe } = getMeetingStatus(meeting, activeRooms, currentUser?.id);
  
  const room = activeRooms.find((r) => r.roomId === meeting.id || r.roomId === meeting.meetingCode);
  const roomParticipants = room?.participants || [];

  return (
    <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, duration: 0.1 }}>
      <Card
        className={cn(
          "group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-300 cursor-pointer overflow-hidden",
          "hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1 sm:hover:-translate-y-1.5",
          "ring-0 hover:ring-1 hover:ring-primary/10"
        )}
        onClick={() => !isEnded && navigate(`/meeting-lobby/${meeting.meetingCode || meeting.id}`)}
      >
        <CardContent className="p-3 sm:p-4 md:p-5">
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div
                className={cn(
                  "w-10 h-10 sm:w-12 md:w-14 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm",
                  "bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10",
                  "group-hover:scale-110 group-hover:shadow-md",
                  statusTone === "live" && "from-emerald-500/15 to-emerald-500/5",
                  statusTone === "ended" && "from-muted/60 to-muted/40"
                )}
              >
                {statusTone === "live" ? (
                  <Play className="w-5 h-5 sm:w-6 md:w-7 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Video className={cn("w-5 h-5 sm:w-6 md:w-7", statusTone === "ended" ? "text-muted-foreground" : "text-primary")} />
                )}
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full",
                    statusTone === "live" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                    statusTone === "ended" && "bg-muted/60 text-muted-foreground",
                    statusTone === "waiting" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    statusTone === "upcoming" && "bg-primary/10 text-primary"
                  )}
                >
                  {statusLabel}
                </span>
                {onEdit && !isEnded && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 rounded-full hover:bg-muted/80" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
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
              </div>
            </div>

            <h3 className="font-semibold text-xs sm:text-sm text-foreground mb-2 sm:mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-200">
              {meeting.title}
            </h3>
            <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>{meeting.date} · {meeting.time}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>{meeting.duration}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">{meeting.team}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {roomParticipants.length > 0 ? (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex -space-x-1 sm:-space-x-1.5">
                      {roomParticipants.slice(0, 3).map((p, i) => (
                        <Avatar key={p.peerId || i} className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-background">
                          <AvatarImage src={(p as any).avatar} alt={p.name || "Avatar"} />
                          <AvatarFallback className="text-[7px] sm:text-[8px] font-semibold bg-muted">
                            {p.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {roomParticipants.length > 3 && (
                        <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                          <span className="text-[7px] sm:text-[8px] font-semibold text-muted-foreground">+{roomParticipants.length - 3}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                      {roomParticipants.length} {roomParticipants.length === 1 ? "person" : "people"}
                    </span>
                  </div>
                ) : (
                  <>
                    <Avatar className="h-5 w-5 sm:h-6 sm:w-6 border border-border/50">
                      <AvatarImage src={(meeting.host as any).avatar} alt={meeting.host.name || "Avatar"} />
                      <AvatarFallback className="text-[9px] sm:text-[10px] font-semibold bg-muted">{meeting.host.initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate max-w-[80px] sm:max-w-[100px]">{meeting.host.name}</span>
                  </>
                )}
              </div>
              {isEnded ? (
                <div className="flex gap-1">
                  {onMinutes && (
                    <Button size="sm" variant="outline" className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-medium" onClick={(e) => { e.stopPropagation(); onMinutes(meeting.id, meeting.title); }}>
                      <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                      Minutes
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-medium text-muted-foreground cursor-default">
                    Ended
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant={isActuallyLive || isOnlyMe ? "default" : "outline"}
                  className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold rounded-lg"
                  onClick={(e) => { e.stopPropagation(); navigate(`/meeting-lobby/${meeting.meetingCode || meeting.id}`); }}
                >
                  {isActuallyLive || isOnlyMe ? "Join" : "Open"}
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5 sm:ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
