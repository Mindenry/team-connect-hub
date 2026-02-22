import { memo } from "react";
import { motion } from "framer-motion";
import {
  Smile, Pin, Reply, MessageSquare, Trash2, Paperclip,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const QUICK_EMOJI = ["👍", "❤️", "😂", "🔥", "🎉", "😮"];
const ALL_EMOJI = [
  "😀", "😂", "🤣", "😍", "👍", "🙏", "👏", "🔥", "✨", "🙌",
  "✅", "❌", "💯", "❤️", "🎉", "🎊", "😊", "😎", "🤔", "😴",
  "😢", "😡", "🤯", "🥳", "🤝", "💪", "👀", "🎯", "🚀", "⭐",
];

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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

interface MessageBubbleProps {
  msg: Message;
  isOwn: boolean;
  isGrouped: boolean;
  reactions: Reaction[];
  currentUserId: string | undefined;
  animDelay: number;
  onReply: (msg: Message) => void;
  onPin: (msg: Message) => void;
  onDelete: (msg: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onThread: (messageId: string) => void;
}

/* ────────────────────────────────────────── */

function MessageBubble({
  msg,
  isOwn,
  isGrouped,
  reactions,
  currentUserId,
  animDelay,
  onReply,
  onPin,
  onDelete,
  onReact,
  onThread,
}: MessageBubbleProps) {
  const hasReactions = reactions && reactions.length > 0;
  const replyCount = (msg as any)._count?.replies;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: animDelay, duration: 0.2, ease: "easeOut" }}
      className={cn(
        "group flex gap-2.5 px-4 md:px-6",
        isOwn ? "flex-row-reverse" : "flex-row",
        isGrouped ? "mt-0.5" : "mt-4"
      )}
    >
      {/* Avatar */}
      {!isOwn && !isGrouped ? (
        <Avatar className="h-8 w-8 mt-1 shrink-0 shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-blue-500/15 to-violet-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
            {getInitials(msg.sender.name)}
          </AvatarFallback>
        </Avatar>
      ) : !isOwn ? (
        <div className="w-8 shrink-0" />
      ) : null}

      {/* Content column */}
      <div className={cn("max-w-[70%] md:max-w-[55%] min-w-0 relative", isOwn && "items-end")}>
        {/* Sender name */}
        {!isOwn && !isGrouped && (
          <p className="text-[11px] font-semibold text-foreground/60 mb-1 ml-1">
            {msg.sender.name}
          </p>
        )}

        {/* Reply quote */}
        {msg.replyTo && (
          <div
            className={cn(
              "flex items-center gap-1.5 text-[11px] mb-1.5 py-1.5 px-3 rounded-2xl max-w-[90%]",
              isOwn
                ? "bg-white/10 border border-white/10 ml-auto"
                : "bg-muted/40 border border-border/20"
            )}
          >
            <Reply className="w-3 h-3 shrink-0 text-primary/50" />
            <span className="font-semibold text-primary/70">{msg.replyTo.sender.name}</span>
            <span className="truncate text-muted-foreground/50">{msg.replyTo.text}</span>
          </div>
        )}

        {/* ── Bubble ── */}
        <div
          className={cn(
            "relative rounded-[20px] px-4 py-2.5 shadow-sm transition-shadow",
            isOwn
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md shadow-blue-500/10"
              : "bg-card border border-border/30 text-foreground rounded-bl-md",
            "group-hover:shadow-md"
          )}
        >
          {/* Text */}
          {msg.text && (
            <p className={cn("text-[13.5px] leading-relaxed whitespace-pre-line", isOwn ? "text-white/95" : "text-foreground/90")}>
              {msg.text.split(/(@\w+)/g).map((part, idx) => {
                if (part.startsWith("@")) {
                  return (
                    <span
                      key={idx}
                      className={cn(
                        "font-semibold px-0.5 rounded",
                        isOwn ? "text-white underline underline-offset-2" : "text-blue-500 bg-blue-500/10"
                      )}
                    >
                      {part}
                    </span>
                  );
                }
                return part;
              })}
            </p>
          )}

          {/* Attachments */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className={cn("space-y-1.5", msg.text && "mt-2")}>
              {msg.attachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-2xl transition-all group/att",
                    isOwn
                      ? "bg-white/10 hover:bg-white/20"
                      : "bg-muted/30 border border-border/20 hover:bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      isOwn ? "bg-white/15" : "bg-primary/10"
                    )}
                  >
                    <Paperclip className={cn("w-3.5 h-3.5", isOwn ? "text-white/70" : "text-primary/70")} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "text-xs font-medium truncate block",
                      isOwn ? "text-white/80" : "text-foreground/70"
                    )}>
                      {att.name}
                    </span>
                    <span className={cn("text-[10px] uppercase", isOwn ? "text-white/40" : "text-muted-foreground/40")}>
                      {att.type.split("/")[1] || "file"}
                    </span>
                  </div>
                  <Download className={cn("w-3.5 h-3.5 opacity-0 group-hover/att:opacity-100 transition-opacity",
                    isOwn ? "text-white/60" : "text-muted-foreground/40"
                  )} />
                </a>
              ))}
            </div>
          )}

          {/* Pinned indicator */}
          {msg.isPinned && (
            <Pin className={cn(
              "w-3 h-3 absolute top-2 right-2",
              isOwn ? "text-white/40" : "text-amber-500/50"
            )} />
          )}
        </div>

        {/* Time */}
        <p className={cn(
          "text-[10px] text-muted-foreground/35 mt-1 px-1",
          isOwn ? "text-right" : "text-left"
        )}>
          {formatTime(msg.createdAt)}
        </p>

        {/* Reactions row */}
        {hasReactions && (
          <div className={cn("flex flex-wrap gap-1 mt-0.5 px-1", isOwn && "justify-end")}>
            {reactions.map((r, idx) => {
              const hasReacted = r.users.some((u) => u.id === currentUserId);
              return (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onReact(msg.id, r.emoji)}
                  className={cn(
                    "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all border",
                    hasReacted
                      ? "bg-blue-500/15 text-blue-500 border-blue-500/30"
                      : "bg-card/80 hover:bg-muted/40 text-muted-foreground border-border/30"
                  )}
                >
                  <span className="text-[13px]">{r.emoji}</span>
                  <span className="text-[10px] font-semibold">{r.count}</span>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Thread indicator */}
        {replyCount > 0 && (
          <button
            onClick={() => onThread(msg.id)}
            className="flex items-center gap-1 mt-1 px-2 text-[11px] text-blue-500 hover:text-blue-600 hover:underline transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            <span className="font-medium">
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>
          </button>
        )}
      </div>

      {/* ── Floating Actions (on hover) ── */}
      <div
        className={cn(
          "opacity-0 group-hover:opacity-100 transition-all duration-150 self-start mt-1 shrink-0",
          "flex items-center gap-0.5 bg-card/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-lg shadow-black/5 p-0.5"
        )}
      >
        {/* Quick emoji */}
        {QUICK_EMOJI.slice(0, 3).map((e) => (
          <button
            key={e}
            onClick={() => onReact(msg.id, e)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm hover:bg-muted/40 active:scale-90 transition-all"
          >
            {e}
          </button>
        ))}

        <div className="w-px h-4 bg-border/30 mx-0.5" />

        <Popover>
          <PopoverTrigger asChild>
            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/40 transition-all" title="More reactions">
              <Smile className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 rounded-2xl border-border/30 shadow-xl" align="center">
            <div className="grid grid-cols-6 gap-0.5">
              {ALL_EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onReact(msg.id, emoji)}
                  className="p-1.5 hover:bg-muted rounded-lg text-lg transition-all hover:scale-125 active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <button
          onClick={() => onReply(msg)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-blue-500 hover:bg-blue-500/10 transition-all"
          title="Reply"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onThread(msg.id)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-blue-500 hover:bg-blue-500/10 transition-all"
          title="Thread"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onPin(msg)}
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
            msg.isPinned
              ? "text-amber-500 hover:bg-amber-500/10"
              : "text-muted-foreground/50 hover:text-amber-500 hover:bg-amber-500/10"
          )}
          title={msg.isPinned ? "Unpin" : "Pin"}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>

        {msg.senderId === currentUserId && (
          <button
            onClick={() => onDelete(msg)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-all"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default memo(MessageBubble);
