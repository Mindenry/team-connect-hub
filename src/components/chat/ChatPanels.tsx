import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import StatusIndicator from "@/components/shared/StatusIndicator";

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const slideIn = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: "spring", damping: 28, stiffness: 300 } },
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
            className="w-[280px] border-l border-border/20 flex flex-col shrink-0 bg-card/40 backdrop-blur-md"
          >
            <div className="px-4 py-4 border-b border-border/15">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Pin className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Pinned</h3>
                  <p className="text-[10px] text-muted-foreground/40">
                    {pinnedMessages.length} {pinnedMessages.length === 1 ? "message" : "messages"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
              {pinnedMessages.length === 0 ? (
                <div className="text-center py-12">
                  <Pin className="w-8 h-8 text-muted-foreground/15 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground/30">No pinned messages</p>
                </div>
              ) : (
                pinnedMessages.map((pm, i) => (
                  <motion.div
                    key={pm.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-3 rounded-2xl border border-border/15 bg-muted/10 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs font-semibold text-foreground/70">{pm.sender.name}</span>
                      <span className="text-[10px] text-muted-foreground/30 ml-auto">{formatTime(pm.createdAt)}</span>
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
            className="w-[280px] border-l border-border/20 flex flex-col shrink-0 bg-card/40 backdrop-blur-md"
          >
            <div className="px-4 py-4 border-b border-border/15">
              <h3 className="text-sm font-semibold">Members</h3>
              <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                {membersOnline.length} online · {membersOffline.length} offline
              </p>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-0.5">
              {/* Online */}
              {membersOnline.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/50 px-2 block mb-2">
                  Online — {membersOnline.length}
                </span>
              )}
              {membersOnline.map((m, i) => {
                const status = (["online", "busy", "away", "offline", "dnd"] as const).includes(
                  (m.status as string) as any
                ) && m.status ? (m.status as any) : "online";
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8 shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500/15 to-violet-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                          {getInitials(m.name)}
                        </AvatarFallback>
                      </Avatar>
                      <StatusIndicator
                        status={status}
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-card"
                      />
                    </div>
                    <span className="text-[13px] text-foreground/80 font-medium">{m.name}</span>
                  </motion.div>
                );
              })}

              {/* Offline */}
              {membersOffline.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 px-2 block mb-2 mt-4">
                  Offline — {membersOffline.length}
                </span>
              )}
              {membersOffline.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.02 }}
                  className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8 opacity-40">
                      <AvatarFallback className="bg-muted/30 text-muted-foreground text-[10px] font-bold">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <StatusIndicator
                      status="offline"
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-card"
                    />
                  </div>
                  <span className="text-[13px] text-muted-foreground/40">{m.name}</span>
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
