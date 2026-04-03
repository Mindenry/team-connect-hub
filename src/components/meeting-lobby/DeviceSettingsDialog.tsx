import { motion } from "framer-motion";
import { Settings, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { MediaDevice } from "./types";

interface DeviceSettingsDialogProps {
  audioInputs: MediaDevice[];
  audioOutputs: MediaDevice[];
  videoInputs: MediaDevice[];
  selectedMic: string;
  selectedSpeaker: string;
  selectedCamera: string;
  onSelectMic: (id: string) => void;
  onSelectSpeaker: (id: string) => void;
  onSelectCamera: (id: string) => void;
}

export function DeviceSettingsDialog({
  audioInputs,
  audioOutputs,
  videoInputs,
  selectedMic,
  selectedSpeaker,
  selectedCamera,
  onSelectMic,
  onSelectSpeaker,
  onSelectCamera,
}: DeviceSettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full p-1.5 hover:bg-white/5 text-white/40 hover:text-white/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0E71EB]/60"
        >
          <Settings className="w-4 h-4" />
          <span className="sr-only">Open device settings</span>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[#111111] border border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Device settings</DialogTitle>
          <DialogDescription className="text-white/60">Choose your microphone, speaker, and camera before joining.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <DeviceSection title="Microphone" devices={audioInputs} selected={selectedMic} onSelect={onSelectMic} />
          <DeviceSection title="Speaker" devices={audioOutputs} selected={selectedSpeaker} onSelect={onSelectSpeaker} />
          <DeviceSection title="Camera" devices={videoInputs} selected={selectedCamera} onSelect={onSelectCamera} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeviceSection({ title, devices, selected, onSelect }: { title: string; devices: MediaDevice[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{title}</p>
      <div className="space-y-1">
        {devices.length ? (
          devices.map((d) => (
            <button
              key={d.deviceId}
              type="button"
              onClick={() => onSelect(d.deviceId)}
              className={cn(
                "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm bg-white/5 hover:bg-white/10 transition-colors",
                selected === d.deviceId && "ring-1 ring-[#0E71EB] bg-white/10"
              )}
            >
              <span className="truncate">{d.label}</span>
              {selected === d.deviceId && <Check className="w-4 h-4 text-[#0E71EB] ml-2 flex-shrink-0" />}
            </button>
          ))
        ) : (
          <p className="text-xs text-white/40">No {title.toLowerCase()}s detected</p>
        )}
      </div>
    </div>
  );
}
