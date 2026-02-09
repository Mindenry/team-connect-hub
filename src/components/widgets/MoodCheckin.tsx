import { useState } from "react";
import { motion } from "framer-motion";

const moods = [
  { emoji: "😫", label: "Stressed", color: "bg-destructive/10" },
  { emoji: "😐", label: "Okay", color: "bg-warning/10" },
  { emoji: "🙂", label: "Good", color: "bg-info/10" },
  { emoji: "😊", label: "Great", color: "bg-success/10" },
  { emoji: "🔥", label: "On Fire", color: "bg-primary/10" },
];

const teamMoods = [
  { name: "อริสา P.", mood: "😊", time: "9:15 AM" },
  { name: "จิรวัฒน์ W.", mood: "🙂", time: "9:30 AM" },
  { name: "ธนา S.", mood: "🔥", time: "9:05 AM" },
  { name: "พิมพ์ L.", mood: "😐", time: "10:00 AM" },
];

export default function MoodCheckin() {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (i: number) => {
    setSelected(i);
    setTimeout(() => setSubmitted(true), 300);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <p className="text-sm text-muted-foreground mb-3">Team mood today</p>
        <div className="flex justify-center gap-3 mb-3">
          {[
            { emoji: "🔥", count: 1 },
            { emoji: "😊", count: 2 },
            { emoji: "🙂", count: 1 },
            { emoji: "😐", count: 1 },
          ].map((m, i) => (
            <motion.div
              key={m.emoji}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center"
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">{m.count}</span>
            </motion.div>
          ))}
        </div>
        <div className="space-y-1.5">
          {teamMoods.map((tm, i) => (
            <motion.div
              key={tm.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="flex items-center justify-between text-xs px-2"
            >
              <span className="text-foreground">{tm.name}</span>
              <div className="flex items-center gap-1.5">
                <span>{tm.mood}</span>
                <span className="text-muted-foreground">{tm.time}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground mb-1">How are you feeling today?</p>
      <p className="text-xs text-muted-foreground mb-4">4 of 8 teammates checked in</p>
      <div className="flex justify-center gap-2">
        {moods.map((m, i) => (
          <motion.button
            key={m.label}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            animate={selected === i ? { scale: 1.3, y: -4 } : { scale: 1, y: 0 }}
            onClick={() => handleSelect(i)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
              selected === i ? m.color : "hover:bg-muted"
            }`}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-[10px] text-muted-foreground">{m.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
