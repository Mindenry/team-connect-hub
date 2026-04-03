import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Video, Clock, Users, Zap, PlayCircle, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MeetingItem } from "./types";

interface MeetingCardProps {
  meetings: MeetingItem[];
  loading: boolean;
  onCreateMeeting: () => void;
  onQuickHuddle: () => void;
}

export function MeetingCard({ meetings, loading, onCreateMeeting, onQuickHuddle }: MeetingCardProps) {
  return (
    <Card className="border bg-card/80 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="py-3 px-4 border-b border-border/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Video className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Today's Meetings</CardTitle>
              <CardDescription className="text-[11px]">Upcoming and live</CardDescription>
            </div>
          </div>
          <Link to="/meetings" className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group">
            View Schedule
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((k) => (
              <div key={k} className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/40 p-3">
                <Skeleton className="h-14 w-14 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-8 text-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">No upcoming meetings today</p>
            <p className="text-xs text-muted-foreground mb-4">Schedule one, or start a quick meeting</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="outline" onClick={onCreateMeeting} className="gap-1.5 h-8 text-xs">
                <Calendar className="h-4 w-4" />
                Schedule
              </Button>
              <Button size="sm" className="gap-1.5 h-8 text-xs bg-gradient-to-r from-primary to-blue-600" onClick={onQuickHuddle}>
                <Video className="h-4 w-4" />
                Start Meeting
              </Button>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {meetings.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.1 }}
                className="group flex items-center gap-3 rounded-lg border border-border/50 bg-gradient-to-r from-background to-muted/10 p-3 hover:border-primary/40 hover:shadow-md transition-all duration-300"
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105",
                  m.isLive ? "bg-gradient-to-br from-red-500/20 to-red-500/10 border-red-500/30" : "bg-gradient-to-br from-blue-500/20 to-blue-500/10 border-blue-500/30"
                )}>
                  <Video className={cn("w-4 h-4", m.isLive ? "text-red-600" : "text-blue-600")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-foreground truncate">{m.title}</p>
                    {m.isLive && (
                      <Badge className="h-6 bg-gradient-to-r from-red-500 to-red-600 text-white border-0 text-xs px-2.5 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
                        LIVE
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{new Date(m.startTime).toLocaleTimeString("th-TH", { hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                    <span>·</span>
                    <span>{m.team}</span>
                    <span>·</span>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{m.participants} participants</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant={m.isLive ? "default" : "outline"} className={cn("h-8 gap-1.5 text-xs min-w-[80px]", m.isLive && "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg")} asChild>
                  <Link to={`/meeting-lobby/${m.id}`}>
                    {m.isLive ? <><Zap className="w-4 h-4" /> Join</> : <><PlayCircle className="w-4 h-4" /> Lobby</>}
                  </Link>
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}
