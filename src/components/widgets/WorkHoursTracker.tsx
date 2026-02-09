import { motion } from "framer-motion";

const hours = [
  { label: "9", focused: 45, meeting: 15 },
  { label: "10", focused: 0, meeting: 60 },
  { label: "11", focused: 50, meeting: 10 },
  { label: "12", focused: 30, meeting: 0 },
  { label: "1", focused: 0, meeting: 0 },
  { label: "2", focused: 40, meeting: 20 },
  { label: "3", focused: 55, meeting: 5 },
  { label: "4", focused: 35, meeting: 25 },
  { label: "5", focused: 20, meeting: 0 },
];

export default function WorkHoursTracker() {
  const totalFocused = hours.reduce((a, h) => a + h.focused, 0);
  const totalMeeting = hours.reduce((a, h) => a + h.meeting, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[10px] text-muted-foreground">Focus ({Math.round(totalFocused / 60)}h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-[10px] text-muted-foreground">Meeting ({Math.round(totalMeeting / 60)}h)</span>
          </div>
        </div>
        <span className="text-xs font-medium text-foreground">Today</span>
      </div>

      <div className="flex items-end gap-1 h-20">
        {hours.map((h, i) => (
          <div key={h.label} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex flex-col-reverse gap-[1px] h-16">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(h.focused / 60) * 100}%` }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
                className="w-full bg-primary rounded-t-sm min-h-0"
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(h.meeting / 60) * 100}%` }}
                transition={{ delay: 0.1 + i * 0.04, duration: 0.4 }}
                className="w-full bg-warning rounded-t-sm min-h-0"
              />
            </div>
            <span className="text-[9px] text-muted-foreground">{h.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
