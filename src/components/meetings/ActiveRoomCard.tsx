import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Video, Zap, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";
import type { ActiveRoom } from "./types";

interface ActiveRoomCardProps {
  room: ActiveRoom;
  index: number;
}

export function ActiveRoomCard({ room, index }: ActiveRoomCardProps) {
  const navigate = useNavigate();
  const currentUser = auth.getUser();
  const isQuickHuddle = room.roomId.startsWith("quick-huddle");
  const myParticipant = room.participants.find((p) => p.userId === currentUser?.id);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05, duration: 0.3 }}>
      <Card
        className={cn(
          "group border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent hover:from-emerald-500/10 transition-all duration-300 cursor-pointer",
          "hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5",
          "ring-0 hover:ring-1 hover:ring-emerald-500/20"
        )}
        onClick={() => navigate(`/meeting-lobby/${room.roomId}`)}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <div className="relative shrink-0">
              <div
                className={cn(
                  "w-9 h-9 sm:w-10 md:w-12 rounded-lg sm:rounded-xl flex items-center justify-center",
                  isQuickHuddle ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                )}
              >
                {isQuickHuddle ? <Zap className="w-4 h-4 sm:w-5 md:w-6" /> : <Video className="w-4 h-4 sm:w-5 md:w-6" />}
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">{room.name}</h3>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-1.5">
                <div className="flex -space-x-1.5 sm:-space-x-2">
                  {room.participants.slice(0, 4).map((p, i) => (
                    <Avatar key={p.peerId || i} className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-background">
                      <AvatarImage src={(p as any).avatar} alt={p.name || "Avatar"} />
                      <AvatarFallback className="text-[7px] sm:text-[8px] font-semibold bg-muted">{p.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">{room.participants.length} online</span>
              </div>
            </div>
            <Button
              size="sm"
              variant={myParticipant ? "default" : "outline"}
              className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold shrink-0"
              onClick={(e) => { e.stopPropagation(); navigate(`/meeting-lobby/${room.roomId}`); }}
            >
              {myParticipant ? "Return" : "Join"}
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5 sm:ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
