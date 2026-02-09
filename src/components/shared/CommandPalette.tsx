import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Video,
  MessageSquare,
  CheckSquare,
  Users,
  Hash,
  FileText,
  Calendar,
  LayoutDashboard,
  BarChart3,
  Bell,
  Shield,
  Settings,
  ArrowRight,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface SearchResult {
  id: string;
  type: "page" | "meeting" | "task" | "channel" | "message" | "member";
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  url: string;
}

const allResults: SearchResult[] = [
  // Pages
  { id: "p1", type: "page", title: "Dashboard", subtitle: "Main overview", icon: LayoutDashboard, url: "/" },
  { id: "p2", type: "page", title: "Meetings", subtitle: "View & schedule meetings", icon: Video, url: "/meetings" },
  { id: "p3", type: "page", title: "Chat", subtitle: "Channels & direct messages", icon: MessageSquare, url: "/chat" },
  { id: "p4", type: "page", title: "Tasks", subtitle: "Kanban board & task management", icon: CheckSquare, url: "/tasks" },
  { id: "p5", type: "page", title: "Teams", subtitle: "Team & member management", icon: Users, url: "/teams" },
  { id: "p6", type: "page", title: "Reports", subtitle: "Meeting & task analytics", icon: BarChart3, url: "/reports" },
  { id: "p7", type: "page", title: "Notifications", subtitle: "View all notifications", icon: Bell, url: "/notifications" },
  { id: "p8", type: "page", title: "Admin", subtitle: "Users, roles & security", icon: Shield, url: "/admin" },
  { id: "p9", type: "page", title: "Settings", subtitle: "Profile, devices & privacy", icon: Settings, url: "/settings" },
  // Meetings
  { id: "m1", type: "meeting", title: "Sprint Planning", subtitle: "Today 10:00 AM · Engineering", icon: Video, url: "/meeting-room" },
  { id: "m2", type: "meeting", title: "Design Review", subtitle: "Today 2:00 PM · Design", icon: Video, url: "/meetings" },
  { id: "m3", type: "meeting", title: "Product Roadmap Discussion", subtitle: "Tomorrow 9:00 AM", icon: Video, url: "/meetings" },
  // Tasks
  { id: "t1", type: "task", title: "Fix Safari upload bug", subtitle: "High · จิรวัฒน์ W. · Due Feb 10", icon: CheckSquare, url: "/tasks" },
  { id: "t2", type: "task", title: "Implement user profile page", subtitle: "High · สมชาย K. · In Progress", icon: CheckSquare, url: "/tasks" },
  { id: "t3", type: "task", title: "Update API documentation", subtitle: "Medium · อริสา P. · To Do", icon: CheckSquare, url: "/tasks" },
  { id: "t4", type: "task", title: "Database migration v2.3", subtitle: "High · ธนา S. · In Progress", icon: CheckSquare, url: "/tasks" },
  // Channels
  { id: "c1", type: "channel", title: "#general", subtitle: "Engineering", icon: Hash, url: "/chat" },
  { id: "c2", type: "channel", title: "#standup", subtitle: "Engineering", icon: Hash, url: "/chat" },
  { id: "c3", type: "channel", title: "#reviews", subtitle: "Design", icon: Hash, url: "/chat" },
  // Members
  { id: "u1", type: "member", title: "สมชาย K.", subtitle: "Admin · somchai@acme.com", icon: Users, url: "/admin" },
  { id: "u2", type: "member", title: "อริสา P.", subtitle: "Manager · arisa@acme.com", icon: Users, url: "/admin" },
  { id: "u3", type: "member", title: "จิรวัฒน์ W.", subtitle: "Member · jirawat@acme.com", icon: Users, url: "/admin" },
  // Messages
  { id: "msg1", type: "message", title: "\"ใครเจอ bug ใน production ไหม?\"", subtitle: "#general · อริสา P.", icon: MessageSquare, url: "/chat" },
  { id: "msg2", type: "message", title: "\"PR #142 ไป review ด้วยนะครับ\"", subtitle: "#general · พิมพ์ L.", icon: MessageSquare, url: "/chat" },
];

const typeLabels: Record<string, string> = {
  page: "Pages",
  meeting: "Meetings",
  task: "Tasks",
  channel: "Channels",
  member: "Members",
  message: "Messages",
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const filtered = query.length === 0
    ? allResults.filter(r => r.type === "page")
    : allResults.filter(r =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.subtitle?.toLowerCase().includes(query.toLowerCase())
      );

  const grouped = filtered.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback((result: SearchResult) => {
    setOpen(false);
    setQuery("");
    navigate(result.url);
  }, [navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatFiltered[selectedIndex]) {
      handleSelect(flatFiltered[selectedIndex]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden border shadow-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-2 px-4 border-b">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search everything... meetings, tasks, messages, members"
            className="border-0 shadow-none focus-visible:ring-0 h-12 text-sm"
            autoFocus
          />
          <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto scrollbar-thin py-2">
          {flatFiltered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          )}
          {Object.entries(grouped).map(([type, results]) => (
            <div key={type}>
              <p className="text-xs font-semibold uppercase text-muted-foreground px-4 py-1.5">
                {typeLabels[type] || type}
              </p>
              {results.map((result) => {
                const globalIndex = flatFiltered.indexOf(result);
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      globalIndex === selectedIndex
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <result.icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    {globalIndex === selectedIndex && (
                      <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded">↵</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
