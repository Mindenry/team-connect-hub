import { memo, useRef, useEffect } from "react";
import {
  Send, Smile, Paperclip, Plus, X,
  Folder as FolderIcon, Reply,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

const EMOJI_LIST = [
  "😀", "😂", "🤣", "😍", "👍", "🙏", "👏", "🔥", "✨", "🙌",
  "✅", "❌", "💯", "❤️", "🎉", "🎊", "😊", "😎", "🤔", "😴",
  "😢", "😡", "🤯", "🥳", "🤝", "💪", "👀", "🎯", "🚀", "⭐",
];

/* ── Types ── */

interface Attachment {
  url: string;
  name: string;
  type: string;
}

interface MentionableUser {
  id: string;
  name: string;
}

interface ReplyTo {
  id: string;
  text: string;
  sender: { name: string };
}

interface MessageComposerProps {
  messageInput: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  sending: boolean;
  disabled: boolean;
  placeholder: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  attachments: Attachment[];
  onRemoveAttachment: (i: number) => void;
  onFileUpload: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  driveTeamId: string | null;
  onAttachFromDrive: () => void;
  showEmojiPicker: boolean;
  onToggleEmojiPicker: (show: boolean) => void;
  onInsertEmoji: (emoji: string) => void;
  showMentionPicker: boolean;
  mentionableUsers: MentionableUser[];
  onInsertMention: (name: string) => void;
  replyingTo: ReplyTo | null;
  onCancelReply: () => void;
  isLoggedIn: boolean;
}

/* ────────────────────────────────────────── */

function MessageComposer({
  messageInput,
  onInputChange,
  onKeyDown,
  onSend,
  sending,
  disabled,
  placeholder,
  inputRef,
  attachments,
  onRemoveAttachment,
  onFileUpload,
  fileInputRef,
  onFileSelect,
  driveTeamId,
  onAttachFromDrive,
  showEmojiPicker,
  onToggleEmojiPicker,
  onInsertEmoji,
  showMentionPicker,
  mentionableUsers,
  onInsertMention,
  replyingTo,
  onCancelReply,
  isLoggedIn,
}: MessageComposerProps) {
  const textareaRef = inputRef as React.RefObject<HTMLTextAreaElement | null>;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef?.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, [messageInput, textareaRef]);

  if (!isLoggedIn) {
    return (
      <div className="px-5 py-4 border-t border-border/20">
        <div className="rounded-xl bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground/60">
          Sign in to send messages
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-4 pt-2">
      {/* Reply indicator */}
      {replyingTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
          <Reply className="w-3 h-3 text-primary/60 shrink-0" />
          <span className="text-[11px] text-primary/70 font-medium shrink-0">
            Replying to {replyingTo.sender?.name}
          </span>
          <span className="text-[11px] text-muted-foreground/50 truncate flex-1">
            {replyingTo.text}
          </span>
          <button onClick={onCancelReply} className="text-muted-foreground/40 hover:text-muted-foreground shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, i) => {
            const isImage = att.type?.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(att.name || "");
            if (isImage) {
              return (
                <div key={i} className="relative group/att">
                  <img
                    src={att.url}
                    alt={att.name}
                    className="h-16 w-16 rounded-lg object-cover border border-border/40"
                  />
                  <button
                    onClick={() => onRemoveAttachment(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            }
            return (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border/30 text-xs">
                <Paperclip className="w-3 h-3 text-muted-foreground/60" />
                <span className="truncate max-w-[120px]">{att.name}</span>
                <button onClick={() => onRemoveAttachment(i)} className="text-muted-foreground/40 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Main composer container */}
      <div className={cn(
        "relative rounded-xl border bg-background transition-all duration-200",
        disabled
          ? "opacity-50 cursor-not-allowed border-border/20"
          : "border-border/40 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 focus-within:shadow-lg focus-within:shadow-primary/5"
      )}>
        {/* Mention picker */}
        {showMentionPicker && mentionableUsers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-56 bg-background border border-border/60 rounded-lg shadow-xl overflow-hidden z-20 animate-in slide-in-from-bottom-2 fade-in-0 duration-150">
            {mentionableUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => onInsertMention(u.name)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-primary/5 transition-colors"
              >
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-[8px] font-bold bg-primary/10 text-primary">
                    {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{u.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Textarea + actions row */}
        <div className="flex items-end gap-1 px-3 py-2">
          {/* Left actions */}
          <div className="flex items-center gap-0.5 pb-0.5 shrink-0">
            <button
              onClick={onFileUpload}
              disabled={disabled}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-30"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {driveTeamId && (
              <button
                onClick={onAttachFromDrive}
                disabled={disabled}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-30"
              >
                <FolderIcon className="w-4 h-4" />
              </button>
            )}

            <Popover open={showEmojiPicker} onOpenChange={onToggleEmojiPicker}>
              <PopoverTrigger asChild>
                <button
                  disabled={disabled}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-30"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-auto p-2">
                <div className="grid grid-cols-10 gap-0.5">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onInsertEmoji(emoji)}
                      className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-base transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={messageInput}
            onChange={onInputChange as any}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent text-[13.5px] placeholder:text-muted-foreground/40 leading-relaxed focus:outline-none py-0.5 min-h-[24px] max-h-[160px]",
              disabled && "cursor-not-allowed"
            )}
          />

          {/* Send button */}
          <button
            onClick={onSend}
            disabled={disabled || sending || (!messageInput.trim() && attachments.length === 0)}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mb-0.5 transition-all duration-200",
              messageInput.trim() || attachments.length > 0
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : "text-muted-foreground/30"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={onFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}

export default memo(MessageComposer);
