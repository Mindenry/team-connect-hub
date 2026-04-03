import { Lock, Circle, Minimize, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime, formatRecordingTime } from "./utils";
import type { MeetingRecordingStatus } from "./types";

interface MeetingHeaderProps {
  meetingTitle: string;
  meetingCode: string;
  elapsedSeconds: number;
  isFullscreen: boolean;
  activeRecorder: MeetingRecordingStatus | null;
  peerId: string;
  recordingTime: number;
  onToggleFullscreen: () => void;
}

export function MeetingHeader({
  meetingTitle,
  meetingCode,
  elapsedSeconds,
  isFullscreen,
  activeRecorder,
  peerId,
  recordingTime,
  onToggleFullscreen,
}: MeetingHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 h-14 bg-gradient-to-r from-[#1a1a1a] to-[#232323] border-b border-[#333]/50 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-green-500" />
          <span className="text-white font-semibold text-sm">
            {meetingTitle}
          </span>
        </div>
        {activeRecorder?.isRecording && (
          <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-md border border-red-500/30">
            <Circle className="w-2.5 h-2.5 fill-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-semibold">
              {activeRecorder.peerId === peerId
                ? "REC"
                : `${activeRecorder.userName} is recording`}
            </span>
            {activeRecorder.peerId === peerId && (
              <span className="text-red-300 text-xs font-mono">
                {formatRecordingTime(recordingTime)}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-5 text-white/70 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium">{formatTime(elapsedSeconds)}</span>
        </div>
        <span className="hidden md:inline text-white/30">|</span>
        <span className="hidden md:inline text-white/50">
          ID: {meetingCode.slice(0, 11)}
        </span>
        <div className="w-px h-4 bg-white/20 mx-1 hidden sm:block" />
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
