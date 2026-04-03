import { Mic, MicOff, VideoOff, Hand, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { UIMappedParticipant } from "./types";

interface ParticipantsPanelProps {
  participants: UIMappedParticipant[];
  hostUserId?: string | null;
  currentUserId?: string;
}

export function ParticipantsPanel({
  participants,
  hostUserId,
  currentUserId,
}: ParticipantsPanelProps) {
  // Sort participants: host first, then hand raised, then local user, then alphabetically
  const sortedParticipants = [...participants].sort((a, b) => {
    const aIsHost = hostUserId ? a.userId === hostUserId : false;
    const bIsHost = hostUserId ? b.userId === hostUserId : false;
    if (aIsHost !== bIsHost) return aIsHost ? -1 : 1;

    const aRaised = !!a.isHandRaised;
    const bRaised = !!b.isHandRaised;
    if (aRaised !== bRaised) return aRaised ? -1 : 1;

    if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="p-3 space-y-1">
      {/* Participants List Header */}
      <div className="mb-2">
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Users className="w-3.5 h-3.5" />
          In Meeting ({participants.length})
        </h3>
      </div>
      
      {sortedParticipants.map((p) => {
        const initials = p.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        
        const isHost = hostUserId === p.userId;

        return (
          <div
            key={p.identity}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
          >
            <div className="relative">
              <Avatar className="w-8 h-8">
                <AvatarImage src={p.avatar || undefined} />
                <AvatarFallback className="bg-[#3d3d3d] text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm truncate">
                {p.name}
                {p.isLocal && " (You)"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {!p.microphoneEnabled ? (
                <MicOff className="w-4 h-4 text-red-500" />
              ) : (
                <Mic className="w-4 h-4 text-white/50" />
              )}
              {!p.cameraEnabled && (
                <VideoOff className="w-4 h-4 text-red-500" />
              )}
              {p.isHandRaised && (
                <Hand className="w-4 h-4 text-yellow-400" />
              )}
              {isHost && (
                <Badge className="h-5 px-1.5 bg-blue-500/20 text-blue-300 border-0 text-[10px]">
                  Host
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
