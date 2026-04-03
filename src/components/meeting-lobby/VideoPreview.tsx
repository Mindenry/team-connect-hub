import { motion, AnimatePresence } from "framer-motion";
import { Shield, VideoOff, MicOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VideoPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isCameraOn: boolean;
  isMuted: boolean;
  userName: string;
  userInitials: string;
  userAvatar?: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function VideoPreview({
  videoRef,
  isCameraOn,
  isMuted,
  userName,
  userInitials,
  userAvatar,
}: VideoPreviewProps) {
  const avatarUrl = userAvatar?.startsWith("/") ? `${API_BASE}${userAvatar}` : userAvatar;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/10 shadow-2xl group"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-500",
          isCameraOn ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        )}
      />

      <AnimatePresence>
        {!isCameraOn && (
          <motion.div
            key="avatar"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] z-20"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative"
            >
              <Avatar className="w-40 h-40 ring-4 ring-white/10 shadow-2xl">
                <AvatarImage src={avatarUrl} alt={userName} />
                <AvatarFallback className="bg-gradient-to-br from-[#0E71EB] via-blue-600 to-indigo-700 text-white text-5xl font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -bottom-3 -right-3 p-3 bg-red-500 rounded-full border-4 border-[#0d0d0d] shadow-lg"
              >
                <VideoOff className="w-6 h-6 text-white" />
              </motion.div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 text-center">
              <h3 className="text-2xl font-bold text-white mb-2">{userName}</h3>
              <p className="text-white/50 text-sm">Your camera is turned off</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <Badge className="bg-black/60 backdrop-blur-md text-white/90 border-white/20 py-1.5 px-3 rounded-full text-xs">
            <Shield className="w-3 h-3 mr-1.5 text-green-400" /> Encrypted
          </Badge>
        </motion.div>
        {isMuted && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
            <Badge className="bg-red-500/90 backdrop-blur-md text-white border-none py-1.5 px-3 rounded-full text-xs">
              <MicOff className="w-3 h-3 mr-1.5" /> Muted
            </Badge>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
