import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Send,
  Paperclip,
  FileText,
  Loader2,
  Volume2,
  Video as VideoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImagePreview } from "@/components/chat/ImagePreview";
import { PDFViewer } from "@/components/chat/PDFViewer";
import { FilePreview } from "@/components/chat/FilePreview";
import { getMimeFromExtension, isImageMime } from "./utils";
import type { ChatMessage } from "./types";

interface MeetingChatProps {
  messages: ChatMessage[];
  currentUserId?: string;
  onSendMessage: (text: string, attachments: Array<{ url: string; name: string; type: string }>) => void;
  onFileUpload: (file: File) => Promise<{ url: string; name: string; type: string } | null>;
}

export function MeetingChat({
  messages,
  currentUserId,
  onSendMessage,
  onFileUpload,
}: MeetingChatProps) {
  const [chatInput, setChatInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    Array<{ file: File; url: string; name: string; type: string }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await onFileUpload(file);
      if (result) {
        setPendingAttachments((prev) => [...prev, { file, ...result }]);
      }
    } catch (err) {
      console.error("Failed to upload file:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePendingAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSend = useCallback(() => {
    const hasText = chatInput.trim().length > 0;
    const hasAttachments = pendingAttachments.length > 0;
    if (!hasText && !hasAttachments) return;

    const attachments = pendingAttachments.map((pa) => ({
      url: pa.url,
      name: pa.name,
      type: pa.type,
    }));

    onSendMessage(chatInput.trim(), attachments);
    setChatInput("");
    setPendingAttachments([]);
  }, [chatInput, pendingAttachments, onSendMessage]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#1a1a1a] to-[#1e1e1e]">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            Meeting Chat
          </h3>
          <span className="text-white/40 text-xs">
            {messages.length} messages
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-white/60 text-sm font-medium">No messages yet</p>
            <p className="text-white/40 text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} currentUserId={currentUserId} />
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-2 sm:p-3 border-t border-white/10 bg-gradient-to-r from-[#1a1a1a] to-[#1e1e1e]">
        {/* Pending Attachments Preview */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mb-3 px-1">
            {pendingAttachments.map((pa, idx) => {
              const isImg = pa.type.startsWith("image/");
              return (
                <div
                  key={idx}
                  className="relative group w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-white/10 transition-all duration-300 hover:shadow-md hover:border-white/20"
                >
                  {isImg ? (
                    <img
                      src={pa.url}
                      alt={pa.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md">
                      <FileText className="w-6 h-6 text-white/70" />
                      <span className="text-[9px] font-medium text-white/70 truncate w-full text-center tracking-wider">
                        {pa.name.split(".").pop()?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePendingAttachment(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-600 hover:scale-110 shadow-sm z-10"
                    title="Remove"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-1.5 pt-4 pb-1">
                    <span className="text-[9px] font-medium text-white/90 truncate block tracking-wide drop-shadow-md">
                      {pa.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Uploading Indicator */}
        {uploading && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            <span className="text-white/50 text-[11px]">Uploading file...</span>
          </div>
        )}
        
        <div className="flex gap-2 items-end">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 sm:h-10 sm:w-10 text-white/50 hover:text-white hover:bg-white/10 rounded-xl flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          <div className="flex-1 relative">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={
                pendingAttachments.length > 0
                  ? "Add a message (optional)..."
                  : "Type a message..."
              }
              className="bg-[#2a2a2a] border border-white/10 text-white placeholder:text-white/30 h-9 sm:h-10 rounded-xl text-sm focus:border-blue-500/50 focus:ring-blue-500/20"
            />
          </div>
          <Button
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl flex-shrink-0 shadow-lg shadow-blue-500/20"
            onClick={handleSend}
            disabled={!chatInput.trim() && pendingAttachments.length === 0}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-white/20 text-[9px] mt-1 text-center hidden sm:block">
          Press Enter to send • Attach files with 📎
        </p>
      </div>
    </div>
  );
}

// Separate component for individual chat message
function ChatMessageItem({
  message,
  currentUserId,
}: {
  message: ChatMessage;
  currentUserId?: string;
}) {
  const isMe = message.senderId === currentUserId;
  const initials = message.sender
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasText =
    message.text &&
    !message.attachments?.some((a) => a.name === message.text);
  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <div className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        <Avatar className="w-7 h-7 ring-1 ring-white/10">
          {message.senderAvatar ? (
            <AvatarImage src={message.senderAvatar} />
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-blue-600/80 to-purple-600/80 text-white text-[9px] uppercase font-bold">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      {/* Message Content */}
      <div className={`flex flex-col max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
        {/* Sender Name & Time */}
        <div className={`flex items-center gap-2 mb-0.5 px-0.5 ${isMe ? "flex-row-reverse" : ""}`}>
          <span className={`text-[10px] font-semibold ${isMe ? "text-blue-400" : "text-white/50"}`}>
            {message.sender}
          </span>
          <span className="text-white/20 text-[9px]">{message.time}</span>
        </div>

        {/* Text Bubble */}
        {hasText && (
          <div
            className={`rounded-2xl px-3.5 py-2 shadow-sm mb-1.5 backdrop-blur-md transition-all duration-300 ${
              isMe
                ? "bg-gradient-to-br from-[#0E71EB] to-[#0556BF] text-white rounded-tr-sm ring-1 ring-inset ring-white/10"
                : "bg-gradient-to-br from-[#222222] to-[#1a1a1a] text-white/95 rounded-tl-sm border border-white/10"
            }`}
          >
            <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap font-medium tracking-wide">
              {message.text}
            </p>
          </div>
        )}

        {/* File Attachments */}
        {hasAttachments && (
          <div className={`flex flex-col gap-2 w-full ${isMe ? "items-end" : "items-start"}`}>
            {message.attachments!.map((file, i) => {
              const fileType = file.type || getMimeFromExtension(file.name || "");
              const isImage = fileType.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(file.name || "");
              const isVideo = fileType.startsWith("video/") || /\.(mp4|webm|ogg|mov|avi)$/i.test(file.name || "");
              const isAudio = fileType.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac)$/i.test(file.name || "");
              const isPDF = fileType === "application/pdf" || /\.pdf$/i.test(file.name || "");

              if (isImage) {
                return <ImagePreview key={i} url={file.url} name={file.name} variant="meeting" />;
              }
              if (isPDF) {
                return <PDFViewer key={i} url={file.url} name={file.name} variant="meeting" />;
              }
              if (isVideo) {
                return (
                  <div
                    key={i}
                    className="rounded-2xl overflow-hidden border border-white/10 bg-[#1a1a1a] shadow-sm max-w-[280px] sm:max-w-[320px] transition-all hover:border-white/20"
                  >
                    <video src={file.url} className="w-full h-auto max-h-[250px] bg-black/50" controls preload="metadata" />
                    <div className="px-3 py-2 flex items-center gap-2 bg-gradient-to-r from-black/80 to-black/60 backdrop-blur-md">
                      <VideoIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-white/80 font-medium text-[11px] truncate flex-1 tracking-wide">
                        {file.name}
                      </span>
                    </div>
                  </div>
                );
              }
              if (isAudio) {
                return (
                  <div key={i} className="rounded-xl border border-white/10 bg-[#1a1a1a] p-3 max-w-[280px]">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span className="text-white/60 text-[10px] truncate">{file.name}</span>
                    </div>
                    <audio src={file.url} className="w-full h-8" controls preload="metadata" />
                  </div>
                );
              }
              return <FilePreview key={i} url={file.url} name={file.name} variant="meeting" />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
