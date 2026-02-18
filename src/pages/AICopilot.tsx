import { useState } from "react";
import { Sparkles, Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type Role = "user" | "assistant" | "system";

interface CopilotMessage {
  id: string;
  role: Role;
  text: string;
  createdAt: string;
}

export default function AICopilotPage() {
  const currentUser = auth.getUser();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!input.trim() || !currentUser || loading) return;

    const question = input.trim();
    setInput("");

    const userMessage: CopilotMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: question,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          userId: currentUser.id,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const fallback =
          text && text.includes("quota")
            ? "ตอนนี้โควตา AI ของระบบหมด หรือผู้ให้บริการภายนอกไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง หรือให้ผู้ดูแลตรวจสอบการตั้งค่า API key ค่ะ"
            : "AI Copilot ไม่สามารถตอบคำถามได้ในตอนนี้ กรุณาลองใหม่อีกครั้งค่ะ";

        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "system",
            text: fallback,
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      const data = await res.json();
      const answer = data.answer || "AI Copilot ไม่สามารถตอบคำถามนี้ได้";

      const aiMessage: CopilotMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: answer,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("AI Copilot request failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "system",
          text: "มีข้อผิดพลาดในการเชื่อมต่อ AI Copilot กรุณาลองใหม่อีกครั้งค่ะ",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void ask();
    }
  };

  const quickPrompts = [
    "สรุป meeting วันนี้ของทีมฉัน",
    "ตอนนี้ task ที่สำคัญและ overdue มีอะไรบ้าง",
    "ช่วยเขียนสรุปสั้น ๆ ส่งในช่อง standup ให้หน่อย",
    "มีไฟล์/เอกสารอะไรเกี่ยวกับ onboarding บ้าง",
  ];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="h-14 border-b px-6 flex items-center justify-between bg-background/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-600 to-sky-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">AI Copilot</span>
            <span className="text-xs text-muted-foreground">
              ถาม AI เกี่ยวกับ meeting, tasks, docs หรือให้ช่วยเขียนข้อความ
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: quick prompts */}
        <div className="w-72 border-r bg-muted/40 hidden md:flex flex-col">
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-semibold text-muted-foreground">ตัวอย่างคำถาม</p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-xs">
            {quickPrompts.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="w-full text-left px-3 py-2 rounded-lg bg-background hover:bg-accent transition-colors border text-foreground"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Right: conversation */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-sm text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-sky-400 flex items-center justify-center mb-1">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <p className="font-medium">เริ่มคุยกับ AI Copilot ได้เลย</p>
                <p className="text-xs max-w-sm">
                  ถามเกี่ยวกับ meeting, task, หรือขอให้ช่วยเขียนข้อความ เช่น สรุป standup, ร่างอีเมล, หรือค้นหาเอกสารในทีม
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex gap-3 max-w-3xl",
                  m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : m.role === "assistant"
                      ? "bg-violet-600 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className={cn(
                    "px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap border",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : m.role === "assistant"
                      ? "bg-card text-foreground rounded-bl-none"
                      : "bg-muted text-muted-foreground rounded-bl-none",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                AI กำลังคิดคำตอบให้คุณ...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t px-6 py-3 bg-background/80 backdrop-blur">
            <div className="max-w-3xl mx-auto space-y-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ลองถามว่า “สรุป meeting วันนี้ให้หน่อย” หรือ “ช่วยร่างข้อความส่งในช่อง standup”..."
                rows={3}
                className="resize-none text-sm"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground">
                  กด <kbd className="bg-muted px-1 rounded text-[10px]">Enter</kbd> เพื่อส่ง ·{" "}
                  <kbd className="bg-muted px-1 rounded text-[10px]">Shift+Enter</kbd> ขึ้นบรรทัดใหม่
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={ask}
                    disabled={!input.trim() || !currentUser || loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

