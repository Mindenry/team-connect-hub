import { Track } from "livekit-client";
import { VideoTrack } from "@livekit/components-react";
import { VideoOff, Mic, Volume2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MicLevelVisualizer } from "./MicLevelVisualizer";
import type { MediaDevice, CameraQualityMode } from "./types";

const CAMERA_QUALITY_PRESETS = {
  balanced: {
    resolution: { width: 1280, height: 720 },
    label: "Balanced (720p)",
  },
  sharp: {
    resolution: { width: 1920, height: 1080 },
    label: "Sharp (1080p)",
  },
} as const;

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settingsTab: "audio" | "video";
  onSettingsTabChange: (tab: "audio" | "video") => void;
  // Audio settings
  audioInputs: MediaDevice[];
  audioOutputs: MediaDevice[];
  selectedMic: string;
  selectedSpeaker: string;
  speakerVolume: number[];
  isMuted: boolean;
  tracks: any[];
  onSwitchMic: (deviceId: string) => void;
  onSwitchSpeaker: (deviceId: string) => void;
  onSetSpeakerVolume: (volume: number[]) => void;
  onTestSpeaker: () => void;
  // Video settings
  videoInputs: MediaDevice[];
  selectedCamera: string;
  cameraQuality: CameraQualityMode;
  mirrorVideo: boolean;
  isCameraOn: boolean;
  onSwitchCamera: (deviceId: string) => void;
  onSetCameraQuality: (quality: CameraQualityMode) => void;
  onSetMirrorVideo: (mirror: boolean) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  settingsTab,
  onSettingsTabChange,
  audioInputs,
  audioOutputs,
  selectedMic,
  selectedSpeaker,
  speakerVolume,
  isMuted,
  tracks,
  onSwitchMic,
  onSwitchSpeaker,
  onSetSpeakerVolume,
  onTestSpeaker,
  videoInputs,
  selectedCamera,
  cameraQuality,
  mirrorVideo,
  isCameraOn,
  onSwitchCamera,
  onSetCameraQuality,
  onSetMirrorVideo,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e1e1e] border-[#333] text-white max-w-2xl p-0 overflow-hidden shadow-2xl rounded-xl">
        <div className="flex h-[450px]">
          {/* Sidebar */}
          <div className="w-48 bg-[#151515] border-r border-[#333] p-4 flex flex-col gap-2">
            <h3 className="text-xl font-bold mb-4 px-2 text-white/90">
              Settings
            </h3>
            <button
              onClick={() => onSettingsTabChange("audio")}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                settingsTab === "audio"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-white/60 hover:bg-white/5 hover:text-white/90",
              )}
            >
              <Mic className="w-4 h-4" />
              Audio
            </button>
            <button
              onClick={() => onSettingsTabChange("video")}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                settingsTab === "video"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-white/60 hover:bg-white/5 hover:text-white/90",
              )}
            >
              <VideoOff className="w-4 h-4" />
              Video
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-8 overflow-y-auto w-full">
            {settingsTab === "audio" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <h4 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2">
                  Audio Settings
                </h4>

                {/* Speaker Section */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-white/70">
                    Speaker
                  </Label>
                  <div className="flex items-center gap-4">
                    <Select value={selectedSpeaker} onValueChange={onSwitchSpeaker}>
                      <SelectTrigger className="flex-1 bg-[#2a2a2a] border-white/10 text-white hover:border-white/20 transition-colors h-10 rounded-lg">
                        <SelectValue placeholder="Select speaker" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2a2a] border-[#3dd] text-white">
                        {audioOutputs.map((d) => (
                          <SelectItem
                            key={d.deviceId}
                            value={d.deviceId}
                            className="hover:bg-white/10"
                          >
                            {d.label || "Default Speaker"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={onTestSpeaker}
                      className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white shrink-0"
                    >
                      <Volume2 className="w-4 h-4 mr-2" /> Test Speaker
                    </Button>
                  </div>

                  <div className="space-y-2 mt-4 bg-[#2a2a2a] p-4 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-white/50">
                        Output Volume
                      </Label>
                      <span className="text-xs text-white/50 tabular-nums">
                        {speakerVolume[0]}%
                      </span>
                    </div>
                    <Slider
                      value={speakerVolume}
                      onValueChange={onSetSpeakerVolume}
                      max={100}
                      step={1}
                      className="py-2 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Microphone Section */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-white/70 mt-4">
                    Microphone
                  </Label>
                  <div className="flex items-center gap-4">
                    <Select value={selectedMic} onValueChange={onSwitchMic}>
                      <SelectTrigger className="flex-1 bg-[#2a2a2a] border-white/10 text-white hover:border-white/20 transition-colors h-10 rounded-lg">
                        <SelectValue placeholder="Select microphone" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2a2a] border-[#3dd] text-white">
                        {audioInputs.map((d) => (
                          <SelectItem
                            key={d.deviceId}
                            value={d.deviceId}
                            className="hover:bg-white/10"
                          >
                            {d.label || "Default Microphone"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Input Level visualizer */}
                  <MicLevelVisualizer tracks={tracks} isMuted={isMuted} />
                </div>
              </div>
            )}

            {settingsTab === "video" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h4 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2">
                  Video Settings
                </h4>

                <div className="space-y-4">
                  <Label className="text-sm font-semibold text-white/70">
                    Camera
                  </Label>
                  <Select value={selectedCamera} onValueChange={onSwitchCamera}>
                    <SelectTrigger className="w-full bg-[#2a2a2a] border-white/10 text-white hover:border-white/20 transition-colors h-10 rounded-lg">
                      <SelectValue placeholder="Select camera" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2a2a] border-[#3dd] text-white">
                      {videoInputs.map((d) => (
                        <SelectItem
                          key={d.deviceId}
                          value={d.deviceId}
                          className="hover:bg-white/10"
                        >
                          {d.label || "Default Camera"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Camera Preview Box */}
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/60 border-2 border-white/10 shadow-inner flex items-center justify-center relative">
                  {(() => {
                    const localVideoTrack = tracks.find(
                      (t) =>
                        t.participant.isLocal &&
                        t.source === Track.Source.Camera,
                    );
                    if (localVideoTrack && isCameraOn) {
                      return (
                        <VideoTrack
                          trackRef={localVideoTrack}
                          className={cn(
                            "w-full h-full object-contain",
                            mirrorVideo && "scale-x-[-1]",
                          )}
                        />
                      );
                    }
                    return (
                      <div className="flex flex-col items-center justify-center text-white/30 gap-3">
                        <VideoOff className="w-10 h-10" />
                        <span className="text-sm font-medium">
                          Camera is off
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-[#2a2a2a] border border-white/5 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-white/70">
                      Camera quality
                    </Label>
                    <span className="text-xs text-white/50">
                      {CAMERA_QUALITY_PRESETS[cameraQuality].label}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => onSetCameraQuality("balanced")}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left text-sm transition",
                        cameraQuality === "balanced"
                          ? "border-blue-400/70 bg-blue-500/10 text-blue-200"
                          : "border-white/10 bg-white/5 text-white/60 hover:border-white/30",
                      )}
                    >
                      Balanced (720p) · lower latency
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetCameraQuality("sharp")}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left text-sm transition",
                        cameraQuality === "sharp"
                          ? "border-blue-400/70 bg-blue-500/10 text-blue-200"
                          : "border-white/10 bg-white/5 text-white/60 hover:border-white/30",
                      )}
                    >
                      Sharp (1080p) · best clarity
                    </button>
                  </div>
                  <p className="text-xs text-white/40">
                    เลือกให้เหมาะกับเน็ตเพื่อคมชัดและลด latency
                  </p>
                </div>

                <div className="bg-[#2a2a2a] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-white/90">
                      Mirror my video
                    </Label>
                    <p className="text-xs text-white/40 mt-1">
                      Useful for seeing yourself naturally
                    </p>
                  </div>
                  <Switch
                    checked={mirrorVideo}
                    onCheckedChange={onSetMirrorVideo}
                    className="data-[state=checked]:bg-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
