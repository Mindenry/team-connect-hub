/**
 * MeetingPiP — Picture-in-Picture floating overlay
 *
 * Appears as a draggable mini-window when the user navigates away from
 * the meeting room while still connected to a meeting.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  useMeetingPiP,
  meetingPiPHideOverlay,
} from "@/hooks/useMeetingPiP";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Users,
  Maximize2,
  GripHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MeetingPiP() {
  const pip = useMeetingPiP();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Don't show PiP if we're on the meeting room page
  const isOnMeetingPage = location.pathname.startsWith("/meeting-room");

  // When user navigates back to meeting, hide PiP
  useEffect(() => {
    if (isOnMeetingPage && pip.showPiP) {
      meetingPiPHideOverlay();
    }
  }, [isOnMeetingPage, pip.showPiP]);

  if (!pip.showPiP || !pip.isInMeeting || isOnMeetingPage) {
    return null;
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleReturnToMeeting = () => {
    meetingPiPHideOverlay();
    navigate(`/meeting-room/${pip.meetingId}`);
  };

  return (
    <>
      {/* Invisible constraints container (full viewport) */}
      <div
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none z-[9998]"
      />

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          drag
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          dragMomentum={false}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
          className="fixed bottom-6 right-6 z-[9999] pointer-events-auto"
          style={{ touchAction: "none" }}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          <div
            className={cn(
              "w-[300px] rounded-2xl overflow-hidden shadow-2xl shadow-black/50",
              "bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]",
              "border border-white/10",
              "transition-shadow duration-300",
              showControls && "shadow-2xl shadow-blue-500/20 border-blue-500/30",
            )}
          >
            {/* Drag handle */}
            <div className="flex items-center justify-between px-3 py-2 bg-black/40 cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-white/80 text-[11px] font-semibold truncate max-w-[120px]">
                  {pip.meetingTitle}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-[10px] font-mono tabular-nums">
                  {formatTime(pip.elapsedSeconds)}
                </span>
                <GripHorizontal className="w-3.5 h-3.5 text-white/30" />
              </div>
            </div>

            {/* Mini video preview area */}
            <div
              className="relative h-[140px] bg-[#0a0a0a] flex items-center justify-center cursor-pointer group"
              onClick={() => {
                if (!isDragging) handleReturnToMeeting();
              }}
            >
              {/* Dark overlay with meeting info */}
              <div className="flex flex-col items-center justify-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center ring-1 ring-white/10">
                  <VideoIcon className="w-7 h-7 text-blue-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-white/50 text-xs">
                    {pip.participantCount} participant{pip.participantCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* "Return to meeting" overlay on hover */}
              <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                <div className="flex items-center gap-2 bg-blue-500 px-4 py-2 rounded-xl shadow-lg">
                  <Maximize2 className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-semibold">Return to Meeting</span>
                </div>
              </div>
            </div>

            {/* Controls bar */}
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-black/60 border-t border-white/5">
                    {/* Mute indicator */}
                    <div
                      className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-full transition-colors",
                        pip.isMuted
                          ? "bg-red-500/20 text-red-400"
                          : "bg-white/10 text-white/70",
                      )}
                    >
                      {pip.isMuted ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </div>

                    {/* Camera indicator */}
                    <div
                      className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-full transition-colors",
                        !pip.isCameraOn
                          ? "bg-red-500/20 text-red-400"
                          : "bg-white/10 text-white/70",
                      )}
                    >
                      {pip.isCameraOn ? (
                        <VideoIcon className="w-4 h-4" />
                      ) : (
                        <VideoOff className="w-4 h-4" />
                      )}
                    </div>

                    <div className="w-px h-6 bg-white/10 mx-1" />

                    {/* Return to meeting */}
                    <button
                      onClick={handleReturnToMeeting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs font-medium"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Open</span>
                    </button>

                    {/* Leave */}
                    <button
                      onClick={() => {
                        // Navigate to meeting room first, then the leave logic there handles cleanup
                        meetingPiPHideOverlay();
                        navigate(`/meeting-room/${pip.meetingId}`, { state: { autoLeave: true } });
                      }}
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      <PhoneOff className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
