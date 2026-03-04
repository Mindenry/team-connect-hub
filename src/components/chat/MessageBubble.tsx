import { memo, useState } from "react";
import {
  Smile, Pin, Reply, MessageSquare, Trash2,
  Paperclip, Download, CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

const QUICK_EMOJIS = [
  "👍", "❤️", "😂", "🎉", "🔥", "✅", "👀", "🚀",
];

const getInitials = (name: string) =>
  name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
  onCreateTask?: (msg: Message) => void;
}

/* ────────────────────────────────────────── */

function MessageBubble({
  msg,
  isOwn,
  isGrouped,
  reactions,
  currentUserId,
  onReply,
  onPin,
  onDelete,
  onReact,
  onThread,
  onCreateTask,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name?: string } | null>(null);

  // System message
  if (msg.isSystem) {
    return (
      <div className="flex items-center gap-3 px-5 py-1.5">
        <div className="flex-1 h-px bg-border/30" />
        <span className="text-[11px] text-muted-foreground/50 italic shrink-0">{msg.text}</span>
        <div className="flex-1 h-px bg-border/30" />
      </div>
    );
  }

  const senderName = msg.sender?.name || "Unknown";
  const initials = getInitials(senderName);
  const hasAttachments = msg.attachments && msg.attachments.length > 0;
  const hasReactions = reactions && reactions.length > 0;

  return (
    <div
      className={cn(
        "group relative px-5 transition-colors duration-100",
        isGrouped ? "py-0.5" : "pt-4 pb-2 border-t border-border/[0.06]",
        "hover:bg-muted/40 dark:hover:bg-white/[0.03]"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
    >
      {/* Floating action toolbar */}
      {showActions && (
        <div className="absolute -top-3 right-5 flex items-center gap-0.5 rounded-lg border border-border/60 bg-background shadow-lg px-1 py-0.5 z-10 animate-in fade-in-0 zoom-in-95 duration-150">
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <button className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Smile className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-auto p-2">
              <div className="flex gap-1 flex-wrap max-w-[200px]">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { onReact(msg.id, emoji); setShowEmojiPicker(false); }}
                    className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-base transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <button onClick={() => onReply(msg)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onThread(msg.id)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onPin(msg)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Pin className={cn("w-3.5 h-3.5", msg.isPinned && "text-amber-500")} />
          </button>
          {onCreateTask && (
            <button onClick={() => onCreateTask(msg)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
          )}
          {isOwn && (
            <button onClick={() => onDelete(msg)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar column (40px) */}
        <div className="w-9 shrink-0">
          {!isGrouped && (
            <Avatar className="w-9 h-9 mt-0.5">
              {msg.sender?.avatar && (
                <AvatarImage src={msg.sender.avatar} alt={senderName} />
              )}
              <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {!isGrouped && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[13px] font-semibold text-foreground leading-none">
                {senderName}
              </span>
              <span className="text-[11px] text-muted-foreground/50 leading-none">
                {formatTime(msg.createdAt)}
              </span>
              {msg.isPinned && (
                <Pin className="w-3 h-3 text-amber-500 inline-block" />
              )}
            </div>
          )}

          {/* Reply reference */}
          {msg.replyTo && (
            <div className="flex items-center gap-1.5 mb-1.5 pl-3 border-l-2 border-primary/30">
              <span className="text-[11px] font-medium text-primary/70">{msg.replyTo.sender?.name}</span>
              <span className="text-[11px] text-muted-foreground/50 truncate max-w-[300px]">{msg.replyTo.text}</span>
            </div>
          )}

          {/* Message text */}
          {msg.text && (
            <div className="text-[13.5px] text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
              {msg.text}
            </div>
          )}

          {/* Attachments */}
          {hasAttachments && (
            <div className="flex flex-col gap-2 mt-2">
              {msg.attachments!.map((att, i) => {
                const isImage = att.type?.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(att.name || "");
                if (isImage) {
                  return (
                    <div
                      key={i}
                      className="rounded-xl overflow-hidden max-w-[520px] border border-border/20 bg-background/60"
                    >
                      <img
                        src={att.url}
                        alt={att.name}
                        className="w-full max-h-[480px] object-cover cursor-pointer hover:opacity-95 transition-opacity bg-black/5"
                        loading="lazy"
                        onClick={() => setPreviewImage({ url: att.url, name: att.name })}
                      />
                    </div>
                  );
                }
                return (
                  <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-colors max-w-[280px]">
                    <Paperclip className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                    <span className="text-xs font-medium truncate flex-1">{att.name}</span>
                    <Download className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Reactions */}
          {hasReactions && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {reactions.map((r) => {
                const hasReacted = r.users?.some((u) => u.id === currentUserId);
                return (
                  <button
                    key={r.emoji}
                    onClick={() => onReact(msg.id, r.emoji)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                      hasReacted
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/40 border-border/30 text-muted-foreground hover:bg-muted/60"
                    )}
                  >
                    <span>{r.emoji}</span>
                    <span className="text-[10px] font-medium">{r.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage.url}
              alt={previewImage.name || ""}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            {previewImage.name && (
              <div className="mt-3 text-center text-xs text-muted-foreground/80 truncate">
                {previewImage.name}
              </div>
            )}
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center text-xs hover:bg-black/90"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MessageBubble);
