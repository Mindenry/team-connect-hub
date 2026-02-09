import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Coffee, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TimerMode = "focus" | "break";

export default function FocusTimer() {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 min
  const [sessions, setSessions] = useState(3); // completed today

  const totalTime = mode === "focus" ? 25 * 60 : 5 * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (mode === "focus") {
            setSessions((s) => s + 1);
            setMode("break");
            return 5 * 60;
          } else {
            setMode("focus");
            return 25 * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, mode]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(mode === "focus" ? 25 * 60 : 5 * 60);
  }, [mode]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          animate={{ scale: mode === "focus" ? 1 : 0.9, opacity: mode === "focus" ? 1 : 0.5 }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary cursor-pointer text-xs font-medium"
          onClick={() => { setMode("focus"); setTimeLeft(25 * 60); setIsRunning(false); }}
        >
          <Target className="w-3 h-3" /> Focus
        </motion.div>
        <motion.div
          animate={{ scale: mode === "break" ? 1 : 0.9, opacity: mode === "break" ? 1 : 0.5 }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/10 text-success cursor-pointer text-xs font-medium"
          onClick={() => { setMode("break"); setTimeLeft(5 * 60); setIsRunning(false); }}
        >
          <Coffee className="w-3 h-3" /> Break
        </motion.div>
      </div>

      {/* Circular progress */}
      <div className="relative w-28 h-28 mb-3">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none"
            stroke={mode === "focus" ? "hsl(var(--primary))" : "hsl(var(--success))"}
            strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            animate={{ strokeDashoffset: `${2 * Math.PI * 42 * (1 - progress / 100)}` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={`${mins}:${secs}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold tabular-nums text-foreground"
            >
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </motion.span>
          </AnimatePresence>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {mode === "focus" ? "Focus" : "Break"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground"
          onClick={reset}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full",
            mode === "focus" ? "gradient-primary" : "bg-success hover:bg-success/90"
          )}
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </Button>
        <div className="h-8 w-8 flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-medium">{sessions}🔥</span>
        </div>
      </div>
    </div>
  );
}
