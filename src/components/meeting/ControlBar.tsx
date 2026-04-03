import { useState } from "react";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  MonitorOff,
  Hand,
  Video,
  Square,
  Users,
  MessageSquare,
  Settings,
  ChevronUp,
  Check,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatRecordingTime } from "./utils";
import type { MediaDevice } from "./types";

interface ControlBarProps {
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isRecording: boolean;
  recordingTime: number;
  hasAudioDevice: boolean;
  showParticipants: boolean;
  showChat: boolean;
  chatMessagesCount: number;
  totalParticipants: number;
  audioInputs: MediaDevice[];
  videoInputs: MediaDevice[];
  selectedMic: string;
  selectedCamera: string;
  copied: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleHand: () => void;
  onToggleRecording: () => void;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onOpenSettings: () => void;
  onSwitchMic: (deviceId: string) => void;
  onSwitchCamera: (deviceId: string) => void;
  onCopyInvite: () => void;
  onLeave: () => void;
  endingMeeting?: boolean;
}

export function ControlBar({
  isMuted,
  isCameraOn,
  isScreenSharing,
  isHandRaised,
  isRecording,
  recordingTime,
  hasAudioDevice,
  showParticipants,
  showChat,
  chatMessagesCount,
  totalParticipants,
  audioInputs,
  videoInputs,
  selectedMic,
  selectedCamera,
  copied,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onToggleHand,
  onToggleRecording,
  onToggleParticipants,
  onToggleChat,
  onOpenSettings,
  onSwitchMic,
  onSwitchCamera,
  onCopyInvite,
  onLeave,
  endingMeeting = false,
}: ControlBarProps) {
  return (
    <div className="h-20 bg-gradient-to-t from-[#1a1a1a] to-[#232323] flex items-center justify-between px-6 border-t border-[#333]/50 shadow-lg">
      {/* Left side - Invite button */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="text-white/70 hover:text-white hover:bg-white/10 gap-2 h-10"
          onClick={onCopyInvite}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          <span className="text-sm hidden sm:inline">
            {copied ? "Copied!" : "Invite"}
          </span>
        </Button>
      </div>

      {/* Center - Main controls */}
      <div className="flex items-center gap-2">
        {/* Microphone Toggle */}
        <DropdownMenu>
          <div className="flex">
            <Button
              className={cn(
                "rounded-r-none h-12 px-4 gap-2 transition-all duration-200",
                isMuted
                  ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
                  : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
              )}
              onClick={onToggleMute}
              disabled={!hasAudioDevice}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
              <span className="text-sm font-medium hidden md:inline">
                {isMuted ? "Unmute" : "Mute"}
              </span>
            </Button>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn(
                  "rounded-l-none h-12 px-2 border-l border-white/20",
                  isMuted
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
                )}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white w-56">
            <div className="px-3 py-1.5 text-xs text-white/50">
              Select Microphone
            </div>
            {audioInputs.map((d) => (
              <DropdownMenuItem
                key={d.deviceId}
                className="hover:bg-white/10 text-sm"
                onClick={() => onSwitchMic(d.deviceId)}
              >
                {selectedMic === d.deviceId && (
                  <Check className="w-3 h-3 mr-2" />
                )}
                {d.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-[#3d3d3d]" />
            <DropdownMenuItem
              className="hover:bg-white/10"
              onClick={onOpenSettings}
            >
              <Settings className="w-4 h-4 mr-2" /> Audio Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Camera Toggle */}
        <DropdownMenu>
          <div className="flex">
            <Button
              className={cn(
                "rounded-r-none h-12 px-4 gap-2 transition-all duration-200",
                !isCameraOn
                  ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
                  : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
              )}
              onClick={onToggleCamera}
            >
              {isCameraOn ? (
                <VideoIcon className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
              <span className="text-sm font-medium hidden md:inline">
                {isCameraOn ? "Stop Video" : "Start Video"}
              </span>
            </Button>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn(
                  "rounded-l-none h-12 px-2 border-l border-white/20",
                  !isCameraOn
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
                )}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white w-56">
            <div className="px-3 py-1.5 text-xs text-white/50">
              Select Camera
            </div>
            {videoInputs.map((d) => (
              <DropdownMenuItem
                key={d.deviceId}
                className="hover:bg-white/10 text-sm"
                onClick={() => onSwitchCamera(d.deviceId)}
              >
                {selectedCamera === d.deviceId && (
                  <Check className="w-3 h-3 mr-2" />
                )}
                {d.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-[#3d3d3d]" />
            <DropdownMenuItem
              className="hover:bg-white/10"
              onClick={onOpenSettings}
            >
              <Settings className="w-4 h-4 mr-2" /> Video Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Screen Share Toggle */}
        <Button
          className={cn(
            "h-12 px-4 gap-2 transition-all duration-200",
            isScreenSharing
              ? "bg-[#0E71EB] hover:bg-[#0D65D0] shadow-lg shadow-blue-500/20"
              : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
          )}
          onClick={onToggleScreenShare}
        >
          {isScreenSharing ? (
            <MonitorOff className="w-5 h-5" />
          ) : (
            <Monitor className="w-5 h-5" />
          )}
          <span className="text-sm font-medium hidden md:inline">Share</span>
        </Button>

        {/* Hand Raise Toggle */}
        <Button
          className={cn(
            "h-12 px-4 gap-2 transition-all duration-200",
            isHandRaised
              ? "bg-yellow-500 hover:bg-yellow-600 shadow-lg shadow-yellow-500/20"
              : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
          )}
          onClick={onToggleHand}
        >
          <Hand className="w-5 h-5" />
          <span className="text-sm font-medium hidden md:inline">
            Raise Hand
          </span>
        </Button>

        {/* Recording Toggle */}
        <Button
          className={cn(
            "h-12 px-4 gap-2 transition-all duration-200",
            isRecording
              ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 ring-2 ring-red-400/60"
              : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
          )}
          onClick={onToggleRecording}
        >
          {isRecording ? (
            <>
              <Square className="w-5 h-5" />
              <span className="text-sm font-medium">
                {formatRecordingTime(recordingTime)}
              </span>
            </>
          ) : (
            <>
              <Video className="w-5 h-5" />
              <span className="text-sm font-medium hidden md:inline">
                Record
              </span>
            </>
          )}
        </Button>

        {/* Participants Toggle */}
        <Button
          className={cn(
            "h-12 px-4 gap-2 relative transition-all duration-200",
            showParticipants
              ? "bg-[#0E71EB] hover:bg-[#0D65D0] shadow-lg shadow-blue-500/20"
              : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
          )}
          onClick={onToggleParticipants}
        >
          <Users className="w-5 h-5" />
          <span className="text-sm font-medium">{totalParticipants}</span>
        </Button>

        {/* Chat Toggle */}
        <Button
          className={cn(
            "h-12 px-4 gap-2 relative transition-all duration-200",
            showChat
              ? "bg-[#0E71EB] hover:bg-[#0D65D0] shadow-lg shadow-blue-500/20"
              : "bg-[#3d3d3d] hover:bg-[#4d4d4d]",
          )}
          onClick={onToggleChat}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-medium hidden md:inline">Chat</span>
          {chatMessagesCount > 0 && !showChat && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] font-semibold flex items-center justify-center shadow-lg">
              {chatMessagesCount > 9 ? "9+" : chatMessagesCount}
            </span>
          )}
        </Button>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-12 px-4 gap-2 bg-[#3d3d3d] hover:bg-[#4d4d4d] hover:shadow-md transition-all duration-200">
              <span className="text-sm font-medium">More</span>
              <ChevronUp className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#2d2d2d] border-[#3d3d3d] text-white w-44">
            <DropdownMenuItem
              className="hover:bg-white/10"
              onClick={onOpenSettings}
            >
              <Settings className="w-4 h-4 mr-2" /> Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right side - Leave button */}
      <Button
        className="h-12 px-6 bg-red-500 hover:bg-red-600 text-sm font-semibold shadow-lg shadow-red-500/20 transition-all duration-200 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
        onClick={onLeave}
        disabled={endingMeeting}
      >
        {endingMeeting ? "Ending..." : "Leave"}
      </Button>
    </div>
  );
}
