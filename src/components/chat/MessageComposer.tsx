import { memo } from "react";
import {
  Send, Smile, Paperclip, Plus, X,
  Folder as FolderIcon, Reply,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  sending: boolean;
  disabled: boolean;
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  attachments: Attachment[];
  onRemoveAttachment: (index: number) => void;
  onFileUpload: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  driveTeamId: string | null;
  onAttachFromDrive: () => void;
  showEmojiPicker: boolean;
  onToggleEmojiPicker: (open: boolean) => void;
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
  const hasContent = messageInput.trim().length > 0 || attachments.length > 0;

  return (
    <div className="px-4 md:px-6 pb-4 pt-2">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="mb-2 mx-1 flex items-center gap-2 bg-blue-500/5 border border-blue-500/15 px-3 py-2 rounded-2xl">
          <div className="w-0.5 h-7 rounded-full bg-blue-500/50 shrink-0" />
          <Reply className="w-3 h-3 text-blue-500/50 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-blue-500/80">{replyingTo.sender.name}</span>
            <p className="text-[11px] text-muted-foreground/50 truncate">{replyingTo.text}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/30 transition-all shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="mb-2 mx-1 flex flex-wrap gap-1.5">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-muted/20 border border-border/20 px-2.5 py-1 rounded-xl text-xs"
            >
              <Paperclip className="w-3 h-3 text-muted-foreground/40" />
              <span className="truncate max-w-[120px] text-foreground/70">{att.name}</span>
              <button
                onClick={() => onRemoveAttachment(i)}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Composer pill ── */}
      <div className="relative flex items-center gap-1 bg-muted/20 border border-border/25 rounded-full px-1.5 py-1 focus-within:border-blue-500/30 focus-within:bg-muted/30 transition-all shadow-sm focus-within:shadow-md focus-within:shadow-blue-500/5">
        {/* + button */}
        <button
          onClick={onFileUpload}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/40 transition-all active:scale-90 shrink-0"
          title="Upload file"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={messageInput}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full h-10 bg-transparent text-[13.5px] px-2 outline-none placeholder:text-muted-foreground/30 disabled:opacity-40"
          />

          {/* Mention popup */}
          {showMentionPicker && mentionableUsers.length > 0 && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-card/98 backdrop-blur-2xl border border-border/30 rounded-2xl shadow-xl shadow-black/10 z-50 max-h-44 overflow-y-auto">
              {mentionableUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onInsertMention(user.name)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 text-left transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-blue-500/10 text-blue-500 text-[9px] font-bold">
                      {user.name.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{user.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Emoji picker */}
        <Popover open={showEmojiPicker} onOpenChange={onToggleEmojiPicker}>
          <PopoverTrigger asChild>
            <button className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/40 transition-all shrink-0">
              <Smile className="w-[18px] h-[18px]" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 rounded-2xl border-border/30 shadow-xl" align="end">
            <div className="grid grid-cols-6 gap-0.5">
              {EMOJI_LIST.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => onInsertEmoji(emoji)}
                  className="p-1.5 hover:bg-muted rounded-lg text-lg transition-all hover:scale-125 active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelect} />

        {/* Attach */}
        <button
          onClick={onFileUpload}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/40 transition-all shrink-0"
          title="Attach file"
        >
          <Paperclip className="w-[18px] h-[18px]" />
        </button>

        {/* Drive */}
        <button
          onClick={onAttachFromDrive}
          disabled={!driveTeamId}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/40 transition-all shrink-0 disabled:opacity-20"
          title={driveTeamId ? "Shared Drive" : "Select a team channel first"}
        >
          <FolderIcon className="w-[18px] h-[18px]" />
        </button>

        {/* ── Send button ── */}
        <button
          onClick={onSend}
          disabled={!hasContent || sending || disabled}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
            hasContent && !sending && !disabled
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 active:scale-90"
              : "bg-muted/20 text-muted-foreground/20 cursor-not-allowed"
          )}
          title="Send"
        >
          <Send className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Hints */}
      {!isLoggedIn && (
        <p className="text-[10px] text-red-500/60 text-center mt-1.5">Login required to send messages</p>
      )}
    </div>
  );
}

export default memo(MessageComposer);
