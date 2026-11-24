import { useState } from "react";
import { useLocation } from "react-router-dom";
import { RotateCcw, Sparkles } from "lucide-react";
import { DEMO_MODE } from "@/lib/demo/config";
import { resetDemoDb } from "@/lib/demo/db";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Small floating badge that makes it obvious this deployment is a demo and
 * lets testers restore the original sample data.
 */
export default function DemoBanner() {
  const location = useLocation();
  const [resetting, setResetting] = useState(false);

  if (!DEMO_MODE) return null;

  const isMeeting = location.pathname.startsWith("/meeting-room");
  // The meeting room already shows its own "Demo meeting" badge and the
  // floating pill would overlap the participant/chat panel there.
  if (isMeeting) return null;

  const handleReset = () => {
    const confirmed = window.confirm(
      "รีเซ็ตข้อมูลเดโมทั้งหมดหรือไม่?\n\nข้อมูลที่คุณสร้างระหว่างทดลอง (แชท งาน ไฟล์ ฯลฯ) จะหายไป และข้อมูลตัวอย่างจะกลับมาเหมือนเดิม",
    );
    if (!confirmed) return;
    setResetting(true);
    resetDemoDb();
    // Drop demo unread counters so the reset feels clean.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("chat:unread:") || k.startsWith("chat:active:"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="fixed bottom-20 right-4 z-[95] flex items-center gap-1 rounded-full border border-blue-400/40 bg-slate-900/90 px-2 py-1 text-[11px] text-blue-100 shadow-lg backdrop-blur-md"
      >
        <span className="flex items-center gap-1.5 pl-1">
          <Sparkles className="h-3 w-3 text-blue-300" />
          <span className="font-semibold tracking-wide">DEMO</span>
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="ml-1 hidden cursor-default text-[10px] text-blue-200/50 sm:inline">ข้อมูลตัวอย่าง</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-xs">
            โหมดทดลอง — ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์ของคุณ
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-blue-200/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              aria-label="Reset demo data"
            >
              <RotateCcw className={`h-3 w-3 ${resetting ? "animate-spin" : ""}`} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            รีเซ็ตข้อมูลเดโม
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
