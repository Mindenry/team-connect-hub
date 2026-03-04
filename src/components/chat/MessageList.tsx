import { memo, useRef, useEffect, useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import MessageBubble from "./MessageBubble";

const formatDateHeader = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (msgDate.getTime() === today.getTime()) return "Today";
  if (msgDate.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

const isSameDay = (a: string, b: string) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

const shouldGroup = (prev: any, curr: any) => {
  if (!prev || !curr) return false;
  if (prev.senderId !== curr.senderId) return false;
  const diff = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return diff < 5 * 60 * 1000; // 5 minutes
};

/* ── Types ── */

interface Message {
  id: string;
  text: string;
  senderId: string;
  sender: { id: string; name: string; email: string; avatar?: string };
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
  onCreateTaskFromMessage?: (msg: Message) => void;
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
  onCreateTaskFromMessage,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [scrollShadowTop, setScrollShadowTop] = useState(false);
  const autoScroll = useRef(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    autoScroll.current = distFromBottom < 80;
    setShowJumpToBottom(distFromBottom > 300);
    setScrollShadowTop(el.scrollTop > 10);
  };

  useEffect(() => {
    if (autoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex-1 flex flex-col gap-6 px-5 py-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-muted/60 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="h-3.5 w-24 bg-muted/60 rounded" />
                <div className="h-3 w-12 bg-muted/40 rounded" />
              </div>
              <div className="h-4 w-3/4 bg-muted/40 rounded" />
              {i % 2 === 0 && <div className="h-4 w-1/2 bg-muted/30 rounded" />}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center">
          <MessageCircle className="w-7 h-7 text-primary/30" />
        </div>
        <div className="text-center max-w-[280px]">
          <p className="text-sm font-medium text-muted-foreground/70">No messages yet</p>
          <p className="text-xs text-muted-foreground/40 mt-1">{emptyText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-0">
      {/* Scroll shadow top */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none transition-opacity duration-200",
        scrollShadowTop ? "opacity-100" : "opacity-0"
      )} />

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin"
      >
        <div className="py-4">
          {messages.map((msg, i) => {
            const prev = i > 0 ? messages[i - 1] : null;
            const isGrouped = shouldGroup(prev, msg);
            const showDateSep = i === 0 || (prev && !isSameDay(prev.createdAt, msg.createdAt));

            return (
              <div key={msg.id}>
                {/* Date separator */}
                {showDateSep && (
                  <div className="flex items-center gap-3 px-5 my-4">
                    <div className="flex-1 h-px bg-border/30" />
                    <span className="text-[11px] font-medium text-muted-foreground/50 shrink-0 px-2 py-0.5 rounded-full bg-muted/30 border border-border/20">
                      {formatDateHeader(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-border/30" />
                  </div>
                )}

                <MessageBubble
                  msg={msg}
                  isOwn={msg.senderId === currentUserId}
                  isGrouped={isGrouped && !showDateSep}
                  reactions={reactions[msg.id] || []}
                  currentUserId={currentUserId}
                  animDelay={0}
                  onReply={onReply}
                  onPin={onPin}
                  onDelete={onDelete}
                  onReact={onReact}
                  onThread={onThread}
                  onCreateTask={onCreateTaskFromMessage}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Jump to latest */}
      {showJumpToBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all z-20 animate-in slide-in-from-bottom-2 fade-in-0 duration-200"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Jump to latest
        </button>
      )}

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 px-5 py-1.5 bg-background/95 z-10">
          <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
            </span>
            <span>{typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(MessageList);
