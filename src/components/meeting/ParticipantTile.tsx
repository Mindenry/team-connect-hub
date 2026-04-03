import { Track } from "livekit-client";
import { VideoTrack } from "@livekit/components-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MicOff, VideoOff, Hand, Pin, PinOff, Monitor, ScreenShare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UIMappedParticipant } from "./types";

interface ParticipantTileProps {
  participant: UIMappedParticipant;
  tracks: any[];
  mirrorVideo: boolean;
  isPinned?: boolean;
  isSpotlight?: boolean;
  isSidebar?: boolean;
  hostUserId?: string | null;
  onClick?: () => void;
}

export function ParticipantTile({
  participant,
  tracks,
  mirrorVideo,
  isPinned = false,
  isSpotlight = false,
  isSidebar = false,
  hostUserId,
  onClick,
}: ParticipantTileProps) {
  const videoTrack = tracks.find(
    (t) =>
      t.participant.identity === participant.identity &&
      t.source === Track.Source.Camera,
  );

  const initials = participant.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const canRenderCamera = (trackRef: any) => {
    if (!trackRef?.publication?.track) return false;
    if (trackRef.publication?.isMuted) return false;
    const mediaTrack = trackRef.publication.track.mediaStreamTrack as
      | MediaStreamTrack
      | undefined;
    if (!mediaTrack) return false;
    return mediaTrack.readyState === "live" && mediaTrack.enabled;
  };

  const hasCameraTrack = tracks.some(
    (t) =>
      t.participant.identity === participant.identity &&
      t.source === Track.Source.Camera &&
      !!t.publication?.track,
  );

  const cameraOn = canRenderCamera(videoTrack) || (!videoTrack && hasCameraTrack);
  const isHost = hostUserId && participant.userId === hostUserId;

  // Spotlight mode (main view)
  if (isSpotlight) {
    return (
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden bg-[#202124] transition-all duration-300 cursor-pointer",
          participant.isSpeaking
            ? "ring-4 ring-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] m-1"
            : "ring-1 ring-white/10 m-1 hover:ring-white/30",
        )}
        style={{ height: "calc(100% - 8px)" }}
        onClick={onClick}
        title={onClick ? "Click to return to grid view" : undefined}
      >
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#202124]">
          {cameraOn ? (
            <VideoTrack
              trackRef={videoTrack}
              className={cn(
                "w-full h-full object-contain",
                participant.isLocal && mirrorVideo && "scale-x-[-1]",
              )}
            />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <Avatar className="w-32 h-32 bg-[#3c4043] ring-1 ring-white/10 shadow-xl">
                <AvatarImage src={participant.avatar} />
                <AvatarFallback className="text-5xl text-white font-medium bg-[#3c4043]">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Hand Raise Badge */}
          {participant.isHandRaised && (
            <div className="absolute top-4 right-4 bg-[#fbbc04] text-black p-2.5 rounded-full shadow-[0_0_20px_rgba(251,188,4,0.4)] animate-pulse z-20">
              <Hand className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Participant Name Bar */}
        <div className="absolute bottom-6 left-6 flex items-center gap-2 z-20">
          <div className="bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-xl flex items-center gap-3 border border-white/10 shadow-lg">
            <span className="text-white text-[15px] font-medium tracking-wide">
              {participant.name}
              {participant.isLocal && " (You)"}
            </span>
            {isHost && (
              <Badge className="h-5 px-1.5 bg-blue-500/20 text-blue-300 border-0 text-[10px]">
                Host
              </Badge>
            )}
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-1.5">
            {!participant.microphoneEnabled && (
              <div className="bg-[#ea4335]/90 backdrop-blur-md rounded-full p-2.5 shadow-lg border border-red-500/30">
                <MicOff className="w-4 h-4 text-white" />
              </div>
            )}
            {!cameraOn && (
              <div className="bg-[#ea4335]/90 backdrop-blur-md rounded-full p-2.5 shadow-lg border border-red-500/30">
                <VideoOff className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Sidebar tile (smaller)
  if (isSidebar) {
    return (
      <div
        className={cn(
          "relative rounded-xl overflow-hidden bg-[#202124] transition-all duration-300 cursor-pointer group m-0.5",
          participant.isSpeaking
            ? "ring-2 ring-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            : "ring-1 ring-white/10 hover:ring-white/30",
        )}
        style={{ aspectRatio: "16 / 9" }}
        onClick={onClick}
        title={`Click to focus ${participant.name}`}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-[#202124]">
          {cameraOn ? (
            <VideoTrack
              trackRef={videoTrack}
              className={cn(
                "w-full h-full object-contain",
                participant.isLocal && mirrorVideo && "scale-x-[-1]",
              )}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-white">
              <Avatar className="w-12 h-12 bg-[#3c4043] ring-1 ring-white/10 shadow-md">
                <AvatarImage src={participant.avatar} />
                <AvatarFallback className="text-[14px] bg-[#3c4043] text-[#e8eaed]">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>

        {/* Hand Raise Badge */}
        {participant.isHandRaised && (
          <div className="absolute top-2 right-2 bg-[#fbbc04] text-black p-1.5 rounded-full shadow-[0_0_10px_rgba(251,188,4,0.4)] z-20">
            <Hand className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-200 z-10" />

        {/* Name and Indicators Pill */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-20">
          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md border border-white/10 max-w-[120px]">
            <span className="text-white text-[11px] font-medium truncate">
              {participant.name.split(" ")[0]}
              {participant.isLocal && " (You)"}
            </span>
            {isHost && (
              <Badge className="h-4 px-1 bg-blue-500/20 text-blue-300 border-0 text-[8px]">
                Host
              </Badge>
            )}
          </div>
          {!participant.microphoneEnabled && (
            <div className="bg-[#ea4335]/90 backdrop-blur-md rounded-full p-1.5 shadow-md border border-red-500/30">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Focus hint on hover */}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 border border-white/10">
          <Pin className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
    );
  }

  // Grid tile (default)
  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden bg-[#202124] transition-all duration-300 group m-1",
        onClick && "cursor-pointer",
        participant.isSpeaking
          ? "ring-4 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
          : onClick
            ? "ring-1 ring-white/10 hover:ring-white/30"
            : "ring-1 ring-white/10",
      )}
      style={{
        aspectRatio: "16 / 9",
        width: "calc(100% - 8px)",
        height: "calc(100% - 8px)",
      }}
      onClick={onClick}
      title={onClick ? `Click to focus ${participant.name}` : undefined}
    >
      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#202124]">
        {cameraOn ? (
          <VideoTrack
            trackRef={videoTrack}
            className={cn(
              "w-full h-full object-contain",
              participant.isLocal && mirrorVideo && "scale-x-[-1]",
            )}
          />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <Avatar className="w-24 h-24 bg-[#3c4043] ring-1 ring-white/10 shadow-lg">
              <AvatarImage src={participant.avatar} />
              <AvatarFallback className="text-3xl font-medium text-[#e8eaed] bg-[#3c4043]">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-200 z-10" />

      {/* Name and Indicators Pill */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-md border border-white/10 max-w-[200px]">
          <span className="text-white text-sm font-medium truncate">
            {participant.name}
            {participant.isLocal && " (You)"}
          </span>
          {isHost && (
            <Badge className="h-5 px-1.5 bg-blue-500/20 text-blue-300 border-0 text-[10px]">
              Host
            </Badge>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-1.5">
          {!participant.microphoneEnabled && (
            <div className="bg-[#ea4335]/90 backdrop-blur-md rounded-full p-2 shadow-md border border-red-500/30">
              <MicOff className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          {!cameraOn && (
            <div className="bg-[#ea4335]/90 backdrop-blur-md rounded-full p-2 shadow-md border border-red-500/30">
              <VideoOff className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Focus hint on hover */}
      {onClick && (
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 border border-white/10">
          <Pin className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Hand Raise Badge */}
      {participant.isHandRaised && (
        <div className="absolute top-3 right-3 bg-[#fbbc04] text-black p-2 rounded-full shadow-[0_0_15px_rgba(251,188,4,0.4)] animate-pulse z-20">
          <Hand className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

// Screen share tile component
export function ScreenShareTile({
  participant,
  tracks,
  isPinned = false,
  isSidebar = false,
  onClick,
  onUnpin,
}: {
  participant: UIMappedParticipant;
  tracks: any[];
  isPinned?: boolean;
  isSidebar?: boolean;
  onClick?: () => void;
  onUnpin?: () => void;
}) {
  const screenTrack = tracks.find(
    (t) =>
      t.participant.identity === participant.screenShareIdentity &&
      t.source === Track.Source.ScreenShare,
  );

  if (!screenTrack) return null;

  if (isSidebar) {
    return (
      <div
        className="relative rounded-lg overflow-hidden bg-[#1a1a1a] border-2 border-blue-500/50 cursor-pointer transition-all duration-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20 group"
        style={{ aspectRatio: "16 / 9" }}
        onClick={onClick}
        title="Click to focus screen share"
      >
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
          <VideoTrack trackRef={screenTrack} className="w-full h-full object-contain" />
        </div>
        <div className="absolute inset-0 bg-transparent group-hover:bg-white/5 transition-colors duration-200 z-10" />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 z-20">
          <div className="flex items-center gap-1">
            <ScreenShare className="w-2.5 h-2.5 text-blue-400" />
            <span className="text-white text-[10px] font-medium truncate">
              {participant.name}
            </span>
          </div>
        </div>
        <div className="absolute top-1 right-1 bg-blue-500/80 backdrop-blur-sm rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
          <Pin className="w-2.5 h-2.5 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-[#1a1a1a] border-2 border-[#2d2d2d] h-full cursor-pointer"
      onClick={onClick}
    >
      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#0a0a0a]">
        <VideoTrack trackRef={screenTrack} className="w-full h-full object-contain" />
      </div>
      <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg z-20">
        <Monitor className="w-3.5 h-3.5" />
        <span>{participant.name}</span>
      </div>
      {isPinned && onUnpin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnpin();
          }}
          className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg z-20 transition-all duration-200 hover:scale-105"
        >
          <PinOff className="w-3.5 h-3.5" />
          <span>Unpin</span>
        </button>
      )}
    </div>
  );
}
