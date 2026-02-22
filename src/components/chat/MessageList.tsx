import { memo, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, MessageCircle } from "lucide-react";
import MessageBubble from "./MessageBubble";

const formatDateHeader = (date: string) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const isSameDay = (a: string, b: string) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
};

const shouldGroup = (prev: any, curr: any) => {
  if (!prev || prev.isSystem || curr.isSystem) return false;
  if (prev.senderId !== curr.senderId) return false;
  return new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime() < 2 * 60 * 1000;
};

/* ── Types ── */

interface Message {
  id: string;
  text: string;
  senderId: string;
  sender: { id: string; name: string; email: string };
  channelId: string;
  isPinned: boolean;
  isSystem: boolean;
  createdAt: string;
  replyTo?: { id: string; text: string; sender: { name: string } };
  attachments?: Array<{ url: string; name: string; type: string }>;
  mentions?: string[];
}

interface Reaction {
  emoji: string;
  count: number;
  users: Array<{ id: string; name: string }>;
}

interface MessageListProps {
  messages: Message[];
  reactions: Record<string, Reaction[]>;
  currentUserId: string | undefined;
  loading: boolean;
  emptyText: string;
  activeDm: string | null;
  currentDmContactName?: string;
  typingNames: string[];
  onReply: (msg: Message) => void;
  onPin: (msg: Message) => void;
  onDelete: (msg: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onThread: (messageId: string) => void;
}

/* ────────────────────────────────────────── */

function MessageList({
  messages,
  reactions,
  currentUserId,
  loading,
  emptyText,
  activeDm,
  currentDmContactName,
  typingNames,
  onReply,
  onPin,
  onDelete,
  onReact,
  onThread,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120);
  };

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-end p-6 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
            <div className="w-8 h-8 rounded-full bg-muted/30 animate-pulse shrink-0" />
            <div className={`space-y-1.5 ${i % 2 === 0 ? "" : "items-end"}`}>
              <div className={`h-10 rounded-[20px] bg-muted/20 animate-pulse ${i % 2 === 0 ? "w-52 rounded-bl-md" : "w-40 rounded-br-md"}`} />
              <div className="h-3 w-12 rounded bg-muted/10 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* Empty state */
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mb-4">
          <MessageCircle className="w-9 h-9 text-blue-500/40" />
        </div>
        <h3 className="text-base font-semibold text-foreground/70 mb-1">
          {activeDm ? `Chat with ${currentDmContactName || "user"}` : "Start a conversation"}
        </h3>
        <p className="text-xs text-muted-foreground/40 max-w-[260px] text-center leading-relaxed">
          {emptyText}
        </p>
      </div>
    );
  }

  /* Messages */
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin pb-4"
      >
        {/* Top spacer */}
        <div className="h-4" />

        {messages.map((msg, i) => {
          const prev = i > 0 ? messages[i - 1] : null;
          const showDate = !prev || !isSameDay(prev.createdAt, msg.createdAt);
          const isGrouped = !showDate && shouldGroup(prev, msg);
          const isOwn = msg.senderId === currentUserId;

          /* System msg */
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex justify-center py-3 px-4">
                <span className="text-[11px] text-muted-foreground/40 bg-muted/15 px-3 py-1 rounded-full border border-border/10">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex justify-center py-4">
                  <span className="text-[11px] font-medium bg-muted/25 text-muted-foreground/50 px-4 py-1 rounded-full border border-border/15">
                    {formatDateHeader(msg.createdAt)}
                  </span>
                </div>
              )}
              <MessageBubble
                msg={msg}
                isOwn={isOwn}
                isGrouped={isGrouped}
                reactions={reactions[msg.id] || []}
                currentUserId={currentUserId}
                animDelay={Math.min(i * 0.01, 0.15)}
                onReply={onReply}
                onPin={onPin}
                onDelete={onDelete}
                onReact={onReact}
                onThread={onThread}
              />
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <div className="flex gap-2.5 px-6 py-2 mt-2 items-end">
            <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
              <div className="typing-dots flex gap-[3px]">
                <span /><span /><span />
              </div>
            </div>
            <div className="bg-card border border-border/20 rounded-[20px] rounded-bl-md px-4 py-2.5">
              <div className="typing-dots flex gap-[3px]">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Scroll to bottom */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/25 flex items-center justify-center hover:bg-blue-600 transition-colors z-20"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(MessageList);
