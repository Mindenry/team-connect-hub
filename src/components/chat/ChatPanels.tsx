import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, MessageSquare, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatusIndicator from "@/components/shared/StatusIndicator";

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const slideIn = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: "spring", damping: 30, stiffness: 300 } },
  exit: { x: "100%", opacity: 0, transition: { duration: 0.2 } },
};

/* ── Types ── */

interface Message {
  id: string;
  text: string;
  senderId: string;
  sender: { id: string; name: string; email: string };
  isPinned: boolean;
  isSystem: boolean;
  createdAt: string;
}

interface MemberUser {
  id: string;
  name: string;
  status?: string;
}

interface ChatPanelsProps {
  showPinned: boolean;
  pinnedMessages: Message[];
  showMembers: boolean;
  membersOnline: MemberUser[];
  membersOffline: MemberUser[];
  isUserOnline: (id: string) => boolean;
}

/* ────────────────────────────────────────── */

function ChatPanels({
  showPinned,
  pinnedMessages,
  showMembers,
  membersOnline,
  membersOffline,
}: ChatPanelsProps) {
  return (
    <>
      {/* ── Pinned ── */}
      <AnimatePresence>
        {showPinned && (
          <motion.div
            key="pinned"
            {...slideIn}
            className="w-[280px] border-l border-border/40 flex flex-col shrink-0 bg-muted/30 backdrop-blur-xl shadow-lg"
          >
            <div className="px-4 py-4 border-b border-border/30 bg-background/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-sm">
                  <Pin className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground/90">Pinned Messages</h3>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    {pinnedMessages.length} {pinnedMessages.length === 1 ? "message" : "messages"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
              {pinnedMessages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-2xl bg-foreground/[0.02] flex items-center justify-center mx-auto mb-3 border border-border/10">
                    <Pin className="w-5 h-5 text-muted-foreground/30" />
                  </div>
                  <p className="text-xs text-muted-foreground/50">No pinned messages</p>
                </div>
              ) : (
                pinnedMessages.map((pm, i) => (
                  <motion.div
                    key={pm.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-3 rounded-xl border border-amber-500/10 bg-amber-500/5 hover:bg-amber-500/10 transition-colors backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs font-semibold text-foreground/70">{pm.sender.name}</span>
                      <span className="text-[10px] text-muted-foreground/40 ml-auto">{formatTime(pm.createdAt)}</span>
                    </div>
                    <p className="text-xs text-foreground/60 leading-relaxed">{pm.text}</p>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Members ── */}
      <AnimatePresence>
        {showMembers && (
          <motion.div
            key="members"
            {...slideIn}
            className="w-[280px] border-l border-border/40 flex flex-col shrink-0 bg-muted/30 backdrop-blur-xl shadow-lg"
          >
            <div className="px-4 py-4 border-b border-border/30 bg-background/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground/90">Members</h3>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    {membersOnline.length} online · {membersOffline.length} offline
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-0.5">
              {/* Online */}
              {membersOnline.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary px-2 block mb-2">
                  Online — {membersOnline.length}
                </span>
              )}
              {membersOnline.map((m, i) => {
                const validStatuses = ["online", "busy", "away", "offline", "dnd"] as const;
                const hasValidStatus = m.status && validStatuses.includes(m.status as any);
                const status = hasValidStatus ? (m.status as any) : "online";
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-foreground/[0.02] transition-colors cursor-pointer border border-transparent hover:border-border/10"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8 shadow-sm border border-border/10">
                        <AvatarImage src={(m as any).avatar} alt={m.name || "Avatar"} />
                        <AvatarFallback className="bg-foreground/[0.04] text-foreground/70 text-[10px] font-bold backdrop-blur-sm">
                          {getInitials(m.name)}
                        </AvatarFallback>
                      </Avatar>
                      <StatusIndicator
                        status={status}
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-background"
                      />
                    </div>
                    <span className="text-[12.5px] text-foreground/80 font-medium">{m.name}</span>
                  </motion.div>
                );
              })}

              {/* Offline */}
              {membersOffline.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 px-2 block mb-2 mt-4">
                  Offline — {membersOffline.length}
                </span>
              )}
              {membersOffline.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.02 }}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-foreground/[0.02] transition-colors cursor-pointer border border-transparent hover:border-border/10"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8 opacity-40 border border-border/10">
                      <AvatarImage src={(m as any).avatar} alt={m.name || "Avatar"} />
                      <AvatarFallback className="bg-foreground/[0.02] text-muted-foreground/40 text-[10px] font-bold backdrop-blur-sm">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <StatusIndicator
                      status="offline"
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-background"
                    />
                  </div>
                  <span className="text-[12.5px] text-muted-foreground/50">{m.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(ChatPanels);
