import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, Sun, Moon, Sunset } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TimeZoneEntry {
  city: string;
  offset: number; // hours from UTC
  label: string;
  members: { initials: string; name: string }[];
}

const zones: TimeZoneEntry[] = [
  { city: "Bangkok", offset: 7, label: "ICT", members: [{ initials: "SK", name: "สมชาย K." }, { initials: "AP", name: "อริสา P." }, { initials: "JW", name: "จิรวัฒน์ W." }] },
  { city: "Tokyo", offset: 9, label: "JST", members: [{ initials: "TS", name: "ธนา S." }] },
  { city: "London", offset: 0, label: "GMT", members: [{ initials: "NM", name: "นภา M." }] },
  { city: "New York", offset: -5, label: "EST", members: [{ initials: "PL", name: "พิมพ์ L." }] },
];

function getTimeIcon(hour: number) {
  if (hour >= 6 && hour < 12) return <Sun className="w-3.5 h-3.5 text-warning" />;
  if (hour >= 12 && hour < 18) return <Sunset className="w-3.5 h-3.5 text-warning" />;
  return <Moon className="w-3.5 h-3.5 text-info" />;
}

function getTimeString(offset: number) {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const localHour = (utcHour + offset + 24) % 24;
  return {
    timeStr: `${String(localHour).padStart(2, "0")}:${String(utcMin).padStart(2, "0")}`,
    hour: localHour,
    isWorkHours: localHour >= 9 && localHour < 18,
  };
}

export default function TimeZoneWidget() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2.5">
      {zones.map((zone, i) => {
        const { timeStr, hour, isWorkHours } = getTimeString(zone.offset);
        return (
          <motion.div
            key={zone.city}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3"
          >
            <div className="flex items-center gap-1.5 w-14 shrink-0">
              {getTimeIcon(hour)}
              <span className="text-sm font-mono font-semibold text-foreground">{timeStr}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-foreground">{zone.city}</span>
                <span className="text-[10px] text-muted-foreground">{zone.label}</span>
                {isWorkHours && (
                  <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                )}
              </div>
            </div>
            <div className="flex -space-x-1.5">
              {zone.members.slice(0, 3).map((m) => (
                <Avatar key={m.initials} className="h-5 w-5 border border-card">
                  <AvatarFallback className="bg-primary/10 text-primary text-[8px]">{m.initials}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
