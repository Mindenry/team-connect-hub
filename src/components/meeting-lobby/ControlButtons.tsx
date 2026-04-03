import { motion } from "framer-motion";
import { Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ControlButtonsProps {
  isMuted: boolean;
  isCameraOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

export function ControlButtons({ isMuted, isCameraOn, onToggleMute, onToggleCamera }: ControlButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="flex items-center justify-center gap-4"
    >
      <Button
        onClick={onToggleMute}
        size="lg"
        className={cn(
          "px-8 py-6 rounded-xl border-2 transition-all duration-300 shadow-xl font-semibold text-base hover:scale-105 active:scale-95",
          isMuted
            ? "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-400 hover:shadow-red-500/20"
            : "bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30 hover:border-green-400 hover:shadow-green-500/20"
        )}
      >
        {isMuted ? <MicOff className="w-5 h-5 mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
        {isMuted ? "Unmute" : "Mute"}
      </Button>
      <Button
        onClick={onToggleCamera}
        size="lg"
        className={cn(
          "px-8 py-6 rounded-xl border-2 transition-all duration-300 shadow-xl font-semibold text-base hover:scale-105 active:scale-95",
          !isCameraOn
            ? "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-400 hover:shadow-red-500/20"
            : "bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30 hover:border-green-400 hover:shadow-green-500/20"
        )}
      >
        {isCameraOn ? <VideoIcon className="w-5 h-5 mr-2" /> : <VideoOff className="w-5 h-5 mr-2" />}
        {isCameraOn ? "Stop Video" : "Start Video"}
      </Button>
    </motion.div>
  );
}
