import { useState } from "react";
import { Download, Maximize, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImagePreviewProps {
  url: string;
  name: string;
  variant?: "default" | "meeting" | "task";
}

export function ImagePreview({ url, name, variant = "default" }: ImagePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMeeting = variant === "meeting";
  const isTask = variant === "task";

  if (isTask) {
    return (
      <>
        <div
          onClick={() => setIsOpen(true)}
          className="group flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer no-underline max-w-[320px] relative overflow-hidden bg-gradient-to-br from-background to-muted/30 border-border/40 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
          title={name}
        >
          {/* Subtle glow effect behind the card */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />
          
          <div className="relative flex items-center gap-3.5 min-w-0 z-10 w-full">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 shadow-sm border transition-all duration-300 group-hover:scale-105 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:from-primary/20 hover:to-primary/10 hover:border-primary/30">
              <ImageIcon className="w-4.5 h-4.5 transition-colors text-primary group-hover:text-primary" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-[13px] font-semibold truncate transition-colors text-foreground group-hover:text-primary">{name}</p>
              <p className="text-[11px] mt-0.5 font-medium tracking-wide flex items-center gap-1.5 text-muted-foreground/70">
                Image File
                <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                Click to view
              </p>
            </div>
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 hidden sm:flex bg-primary/10 text-primary">
              <Maximize className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        {isOpen && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 transition-opacity" onClick={() => setIsOpen(false)}>
            <div className="relative max-w-5xl max-h-[90vh] mx-auto flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <img src={url} alt={name} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
              {name && <div className="mt-3 text-center text-sm font-medium text-white/90 truncate max-w-full px-4">{name}</div>}
              <div className="absolute -top-12 right-0 flex items-center gap-3">
                <a href={url} download={name} className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors border border-white/10" title="Download">
                  <Download className="w-4 h-4" />
                </a>
                <button type="button" onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors border border-white/10" title="Close">✕</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div 
        className={cn(
          "relative rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 ring-1 ring-inset ring-white/10",
          isMeeting 
            ? "max-w-[280px] sm:max-w-[320px] shadow-sm hover:shadow-lg hover:ring-white/20 bg-black/40" 
            : "border border-border/20 bg-background/60 max-w-[520px] shadow-sm hover:shadow-md"
        )}
        onClick={() => setIsOpen(true)}
      >
        <div className="relative z-10 flex items-center justify-center overflow-hidden">
          <img
            src={url}
            alt={name}
            className={cn(
              "w-full h-auto object-cover transition-transform duration-500 will-change-transform group-hover:scale-[1.03]",
              isMeeting ? "max-h-[300px]" : "max-h-[480px]"
            )}
            loading="lazy"
          />
        </div>

        {/* Hover Action Pill (Centered) */}
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-md text-white/95 px-3.5 py-2 rounded-full flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-xl border border-white/20">
            <Maximize className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold tracking-wide">Expand</span>
          </div>
        </div>
        
        {/* Modern Glassmorphic Bottom Bar */}
        {isMeeting && (
          <div className="absolute bottom-0 left-0 right-0 z-20 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
            {/* Subtle bottom gradient to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
            <div className="relative mx-1.5 mb-1.5 px-2.5 py-1.5 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center gap-2 shadow-sm">
              <div className="bg-blue-500/20 p-1.5 rounded-lg border border-blue-500/10">
                <ImageIcon className="w-3.5 h-3.5 text-blue-400 drop-shadow-sm" />
              </div>
              <span className="text-white/90 text-xs font-medium truncate flex-1 tracking-wide drop-shadow-sm">
                {name}
              </span>
              <a
                href={url}
                download={name}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors text-white/60 hover:text-white shrink-0"
                title="Download"
              >
                <Download className="w-3.5 h-3.5 mt-[1px]" />
              </a>
            </div>
          </div>
        )}
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 transition-opacity"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] mx-auto flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={url}
              alt={name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            {name && (
              <div className="mt-3 text-center text-sm font-medium text-white/90 truncate max-w-full px-4">
                {name}
              </div>
            )}
            
            <div className="absolute -top-12 right-0 flex items-center gap-3">
              <a
                href={url}
                download={name}
                className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors border border-white/10"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors border border-white/10"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
