import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Video, ArrowRight, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/usePresence";
import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function resolveAvatar(avatar?: string | null): string | undefined {
  if (!avatar) return undefined;
  if (avatar.startsWith("/")) return `${API_BASE}${avatar}`;
  return avatar;
}

export default function ActiveMeetingBanner() {
  const navigate = useNavigate();
  const { activeRooms } = usePresence();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Filter out dismissed rooms and rooms with no participants
  const visibleRooms = activeRooms.filter(
    (r) => r.participants.length > 0 && !dismissed.has(r.roomId)
  );

  if (visibleRooms.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <AnimatePresence mode="sync">
        <motion.div
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -12, height: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="shrink-0"
        >
          <div className="border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.04] via-emerald-500/[0.06] to-emerald-500/[0.04] backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-2 py-2.5">
                {visibleRooms.map((room) => (
                  <motion.div
                    key={room.roomId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 group"
                  >
                    {/* Live indicator */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                          <Video className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    </div>

                    {/* Meeting info */}
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate leading-tight">
                          {room.name}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Live · {room.participants.length}{" "}
                          {room.participants.length === 1
                            ? "participant"
                            : "participants"}
                        </p>
                      </div>

                      {/* Participant avatars */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1.5">
                          {room.participants.slice(0, 5).map((p, i) => {
                            const initials = p.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase();
                            return (
                              <Tooltip key={p.peerId || i}>
                                <TooltipTrigger asChild>
                                  <Avatar className="h-6 w-6 border-2 border-background ring-1 ring-emerald-500/20">
                                    <AvatarImage
                                      src={resolveAvatar(p.avatar)}
                                      alt={p.name}
                                    />
                                    <AvatarFallback className="text-[8px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  className="text-xs"
                                >
                                  {p.name}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                        {room.participants.length > 5 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                                +{room.participants.length - 5}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="text-xs max-w-[200px]"
                            >
                              {room.participants
                                .slice(5)
                                .map((p) => p.name)
                                .join(", ")}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="h-7 px-3 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1"
                        onClick={() =>
                          navigate(`/meeting-lobby/${room.roomId}`)
                        }
                      >
                        Join
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                      <button
                        className="p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/40 transition-colors"
                        onClick={() =>
                          setDismissed((prev) => {
                            const next = new Set(prev);
                            next.add(room.roomId);
                            return next;
                          })
                        }
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </TooltipProvider>
  );
}
