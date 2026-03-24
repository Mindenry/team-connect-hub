import { useState } from "react";
import { FileText, ExternalLink, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface PDFViewerProps {
  url: string;
  name: string;
  variant?: "default" | "meeting";
}

export function PDFViewer({ url, name, variant = "default" }: PDFViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMeeting = variant === "meeting";

  const handleOpenPdf = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(true);
  };

  return (
    <>
      <a
        href={url}
        onClick={handleOpenPdf}
        className={cn(
          "group flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer no-underline max-w-[320px] relative overflow-hidden",
          isMeeting
            ? "bg-gradient-to-br from-[#1a1a1a] to-[#222222] border-white/10 hover:border-white/20 shadow-sm hover:shadow-lg hover:-translate-y-0.5 ring-1 ring-inset ring-white/5"
            : "bg-gradient-to-br from-background to-muted/30 border-border/40 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
        )}
        title={name}
      >
        {/* Subtle glow effect behind the card */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-red-500/0 group-hover:from-red-500/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />
        
        <div className="relative flex items-center gap-3.5 min-w-0 z-10 w-full">
          <div className={cn(
            "w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 shadow-sm border transition-all duration-300 group-hover:scale-105",
            isMeeting 
              ? "bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/20 group-hover:border-red-500/40 group-hover:from-red-500/30 group-hover:to-red-600/20" 
              : "bg-gradient-to-br from-red-100 to-red-50 border-red-200 dark:from-red-900/30 dark:to-red-900/10 dark:border-red-800/50"
          )}>
            <FileText className={cn("w-4.5 h-4.5 transition-colors", isMeeting ? "text-red-400 group-hover:text-red-300" : "text-red-600 dark:text-red-400")} />
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
              PDF Document
              <span className="w-1 h-1 rounded-full bg-current opacity-30" />
              Click to view
            </p>
          </div>
          <div className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 hidden sm:flex",
            isMeeting ? "bg-white/10 text-white" : "bg-primary/10 text-primary"
          )}>
            <ExternalLink className="w-3.5 h-3.5" />
          </div>
        </div>
      </a>

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl h-[85vh] flex flex-col bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={url}
                  download={name}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                  title="Download PDF"
                >
                  <Download className="w-4 h-4" />
                </a>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <div className="w-px h-5 bg-gray-300 dark:bg-zinc-700 mx-1"></div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Close viewer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* PDF Content */}
            <div className="flex-1 w-full bg-gray-100 dark:bg-black">
              <iframe
                src={`${url}#view=FitH`}
                className="w-full h-full border-none"
                title={name}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
