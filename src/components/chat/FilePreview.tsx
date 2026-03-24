import { Paperclip, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilePreviewProps {
  url: string;
  name: string;
  variant?: "default" | "meeting";
}

export function FilePreview({ url, name, variant = "default" }: FilePreviewProps) {
  const isMeeting = variant === "meeting";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={name}
      className={cn(
        "group flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer no-underline max-w-[320px] relative overflow-hidden",
        isMeeting
          ? "bg-gradient-to-br from-[#1a1a1a] to-[#222222] border-white/10 hover:border-white/20 shadow-sm hover:shadow-lg hover:-translate-y-0.5 ring-1 ring-inset ring-white/5"
          : "bg-gradient-to-br from-background to-muted/30 border-border/40 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
      )}
      title={name}
    >
      {/* Subtle glow effect behind the card */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />
      
      <div className="relative flex items-center gap-3.5 min-w-0 z-10 w-full">
        <div className={cn(
          "w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 shadow-sm border transition-all duration-300 group-hover:scale-105",
          isMeeting 
            ? "bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20 group-hover:border-blue-500/40 group-hover:from-blue-500/30 group-hover:to-indigo-500/20" 
            : "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:from-primary/20 hover:to-primary/10 hover:border-primary/30"
        )}>
          <Paperclip className={cn("w-4.5 h-4.5 transition-colors", isMeeting ? "text-blue-400 group-hover:text-blue-300" : "text-primary group-hover:text-primary")} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className={cn(
            "text-[13px] font-semibold truncate transition-colors",
            isMeeting ? "text-white/90 group-hover:text-white" : "text-foreground group-hover:text-primary"
          )}>{name}</p>
          <p className={cn(
            "text-[11px] mt-0.5 font-medium tracking-wide flex items-center gap-1.5",
            isMeeting ? "text-white/40 group-hover:text-white/60" : "text-muted-foreground/70"
          )}>
            File Attachment
            <span className="w-1 h-1 rounded-full bg-current opacity-30" />
            Click to download
          </p>
        </div>
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 hidden sm:flex",
          isMeeting ? "bg-white/10 text-white" : "bg-primary/10 text-primary"
        )}>
          <Download className="w-3.5 h-3.5" />
        </div>
      </div>
    </a>
  );
}
