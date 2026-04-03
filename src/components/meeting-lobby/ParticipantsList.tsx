import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { RoomParticipant } from "./types";
import { getInitials } from "./utils";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface ParticipantsListProps {
  participants: RoomParticipant[];
}

export function ParticipantsList({ participants }: ParticipantsListProps) {
  if (participants.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
      <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">In this meeting</p>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-0 text-[10px] px-2">{participants.length}</Badge>
          </div>
          <div className="space-y-2">
            {participants.slice(0, 8).map((p, i) => {
              const initials = getInitials(p.name);
              const avatarUrl = p.avatar?.startsWith("/") ? `${API_BASE}${p.avatar}` : p.avatar;
              return (
                <div key={p.peerId || i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
                  <Avatar className="h-8 w-8 ring-1 ring-white/10">
                    <AvatarImage src={avatarUrl} alt={p.name} />
                    <AvatarFallback className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 text-green-400 text-[10px] font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-white/40">In meeting</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
              );
            })}
            {participants.length > 8 && (
              <p className="text-[11px] text-white/30 text-center py-1">+{participants.length - 8} more</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
