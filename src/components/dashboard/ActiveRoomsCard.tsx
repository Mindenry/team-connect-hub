import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Video, Users, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ActiveRoom {
  roomId: string;
  name: string;
  participants: Array<{ peerId: string; name: string; userId?: string; avatar?: string }>;
}

interface ActiveRoomsCardProps {
  rooms: ActiveRoom[];
  onQuickHuddle: () => void;
}

export function ActiveRoomsCard({ rooms, onQuickHuddle }: ActiveRoomsCardProps) {
  return (
    <Card className="border bg-card/80 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="py-3 px-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
            <Video className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Active Rooms</CardTitle>
            <CardDescription className="text-[11px]">Live meetings</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mx-auto mb-3">
              <Video className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">No live rooms</p>
            <p className="text-xs text-muted-foreground mb-3">Start a quick meeting</p>
            <Button size="sm" className="gap-1.5 h-8 text-xs bg-gradient-to-r from-primary to-blue-600" onClick={onQuickHuddle}>
              <Video className="h-3.5 w-3.5" />
              Start Meeting
            </Button>
          </div>
        ) : (
          rooms.slice(0, 4).map((room, i) => (
            <motion.div
              key={room.roomId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group flex items-center gap-3 rounded-lg border border-border/50 bg-gradient-to-r from-background to-muted/10 p-3 hover:border-primary/40 hover:shadow-md transition-all duration-300"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                <Video className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{room.name}</p>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{room.participants?.length || 0}</span>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px] px-2" asChild>
                <Link to={`/meeting-lobby/${room.roomId}`}>
                  <Zap className="w-3 h-3" />
                  Join
                </Link>
              </Button>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
