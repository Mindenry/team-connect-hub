import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CalendarDays, CalendarRange, CalendarSearch,
  ChevronLeft, ChevronRight, CheckSquare, Filter,
  Loader2, Video, Sparkles, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { apiGet, apiPatch } from "@/lib/api";
import { TimeGrid } from "@/components/calendar/TimeGrid";

import {
  DraggableEventCard,
  DroppableDay,
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  isSameDay, dateKey, addDays,
  type ViewMode, type RawMeeting, type RawTask,
  type CalendarEvent, type TeamOption,
} from "@/components/calendar";

export default function TeamCalendar() {
  const isMobile = useIsMobile();
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [meetings, setMeetings] = useState<RawMeeting[]>([]);
  const [tasks, setTasks] = useState<RawTask[]>([]);
  const [holidays, setHolidays] = useState<Array<{ id: string; name: string; nameEn?: string; date: string; type: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filterTypes, setFilterTypes] = useState({ meetings: true, tasks: true, holidays: true });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // load teams
  useEffect(() => {
    let cancelled = false;
    apiGet<any[]>("/teams").catch(() => []).then((data) => {
      if (!cancelled)
        setTeams((Array.isArray(data) ? data : []).map((t: any) => ({ id: t.id, name: t.name })));
    });
    return () => { cancelled = true; };
  }, []);

  const { rangeStart, rangeEnd, visibleDays } = useMemo(() => {
    if (view === "day") {
      const start = startOfDay(currentDate);
      return { rangeStart: start, rangeEnd: endOfDay(currentDate), visibleDays: [start] };
    }
    if (view === "week") {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) days.push(addDays(start, i));
      return { rangeStart: start, rangeEnd: end, visibleDays: days };
    }
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days: Date[] = [];
    let d = new Date(start);
    while (d <= end) { days.push(new Date(d)); d = addDays(d, 1); }
    return { rangeStart: start, rangeEnd: end, visibleDays: days };
  }, [currentDate, view]);

  // load data
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const qs = teamFilter !== "all" ? `?teamId=${encodeURIComponent(teamFilter)}` : "";
        const [meetingsData, tasksData, holidaysData] = await Promise.all([
          apiGet<RawMeeting[]>(`/meetings${qs}`).catch(() => []),
          apiGet<RawTask[]>(`/tasks${qs}`).catch(() => []),
          apiGet<any[]>(`/holidays/range?startDate=${rangeStart.toISOString()}&endDate=${rangeEnd.toISOString()}`).catch(() => []),
        ]);
        if (!cancelled) {
          setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
          setTasks(Array.isArray(tasksData) ? tasksData : []);
          setHolidays(Array.isArray(holidaysData) ? holidaysData : []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Failed to load calendar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [teamFilter, rangeStart, rangeEnd]);

  const events: CalendarEvent[] = useMemo(() => {
    void refreshKey;
    const mappedMeetings: CalendarEvent[] = meetings.filter((m) => m.startTime).map((m) => {
      try {
        const start = new Date(m.startTime);
        if (isNaN(start.getTime())) return null;
        const end = m.endTime ? new Date(m.endTime) : new Date(start.getTime() + 3600000);
        if (isNaN(end.getTime())) return null;
        return { id: `meeting-${m.id}`, entityId: m.id, type: "meeting" as const, title: m.title, start, end, allDay: false, teamName: m.team?.name, assigneeName: m.host?.name, status: m.status };
      } catch { return null; }
    }).filter(Boolean) as CalendarEvent[];

    const mappedTasks: CalendarEvent[] = tasks.filter((t) => t.dueDate).map((t) => {
      try {
        const due = new Date(t.dueDate as string);
        if (isNaN(due.getTime())) return null;
        return { id: `task-${t.id}`, entityId: t.id, type: "task" as const, title: t.title, start: startOfDay(due), end: endOfDay(due), allDay: true, teamName: t.team?.name, assigneeName: t.assignee?.name, status: t.status ?? undefined, priority: t.priority ?? undefined };
      } catch { return null; }
    }).filter(Boolean) as CalendarEvent[];

    const mappedHolidays: CalendarEvent[] = holidays.map((h) => {
      const date = new Date(h.date);
      return { id: `holiday-${h.id}`, entityId: h.id, type: "holiday" as const, title: h.nameEn || h.name, start: startOfDay(date), end: endOfDay(date), allDay: true, status: h.type };
    });

    return [...mappedMeetings, ...mappedTasks, ...mappedHolidays];
  }, [meetings, tasks, holidays, refreshKey]);

  const eventsInRange = useMemo(() => events.filter((e) => {
    if (e.start > rangeEnd || e.end < rangeStart) return false;
    if (e.type === "meeting" && !filterTypes.meetings) return false;
    if (e.type === "task" && !filterTypes.tasks) return false;
    if (e.type === "holiday" && !filterTypes.holidays) return false;
    return true;
  }), [events, rangeStart, rangeEnd, filterTypes]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of eventsInRange) {
      const key = dateKey(ev.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return a.start.getTime() - b.start.getTime();
      });
    }
    return map;
  }, [eventsInRange]);

  const handlePrev = () => {
    if (view === "day") setCurrentDate((d) => addDays(d, -1));
    else if (view === "week") setCurrentDate((d) => addDays(d, -7));
    else { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }
  };
  const handleNext = () => {
    if (view === "day") setCurrentDate((d) => addDays(d, 1));
    else if (view === "week") setCurrentDate((d) => addDays(d, 7));
    else { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }
  };
  const handleToday = () => setCurrentDate(new Date());

  const handleDragStart = (event: DragStartEvent) => {
    const ev = events.find((e) => e.id === event.active.id as string);
    if (ev) setActiveEvent(ev);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    // accept both day-YYYY-MM-DD and day-YYYY-MM-DD-time / day-YYYY-MM-DD-all
    const match = overId.match(/^day-(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return;

    const ev = events.find((e) => e.id === activeId);
    if (!ev || ev.type === "holiday") return;

    const [, y, mo, d] = match;
    const newStart = new Date(+y, +mo - 1, +d);

    if (ev.type === "meeting") {
      newStart.setHours(ev.start.getHours(), ev.start.getMinutes(), ev.start.getSeconds());
      const duration = ev.end.getTime() - ev.start.getTime();
      const newEnd = new Date(newStart.getTime() + duration);
      setMeetings((prev) => prev.map((m) => m.id === ev.entityId ? { ...m, startTime: newStart.toISOString(), endTime: newEnd.toISOString() } : m));
      try {
        await apiPatch(`/meetings/${ev.entityId}`, { startTime: newStart.toISOString(), endTime: newEnd.toISOString() });
      } catch {
        const qs = teamFilter !== "all" ? `?teamId=${encodeURIComponent(teamFilter)}` : "";
        setMeetings(await apiGet<RawMeeting[]>(`/meetings${qs}`).catch(() => []));
      }
    } else {
      const newDueDate = newStart.toISOString();
      setTasks((prev) => prev.map((t) => t.id === ev.entityId ? { ...t, dueDate: newDueDate } : t));
      setRefreshKey((k) => k + 1);
      try {
        await apiPatch(`/tasks/${ev.entityId}`, { dueDate: newDueDate });
      } catch {}
      const qs = teamFilter !== "all" ? `?teamId=${encodeURIComponent(teamFilter)}` : "";
      setTasks(await apiGet<RawTask[]>(`/tasks${qs}`).catch(() => []));
      setRefreshKey((k) => k + 1);
    }
  };

  const titleLabel = useMemo(() => {
    if (view === "day") return currentDate.toLocaleDateString("th-TH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (view === "week") {
      const s = startOfWeek(currentDate), e = endOfWeek(currentDate);
      return `${s.toLocaleDateString("th-TH", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("th-TH", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }, [currentDate, view]);

  const isToday = (date: Date) => isSameDay(date, new Date());
  const workloadSummary = useMemo(() => {
    const summary = new Map<string, { meetings: number; tasks: number; holidays: number }>();
    for (const ev of eventsInRange) {
      const key = dateKey(ev.start);
      const item = summary.get(key) ?? { meetings: 0, tasks: 0, holidays: 0 };
      if (ev.type === "meeting") item.meetings++;
      else if (ev.type === "task") item.tasks++;
      else if (ev.type === "holiday") item.holidays++;
      summary.set(key, item);
    }
    return summary;
  }, [eventsInRange]);

  const stats = useMemo(() => ({
    totalMeetings: eventsInRange.filter((e) => e.type === "meeting").length,
    totalTasks: eventsInRange.filter((e) => e.type === "task").length,
    totalHolidays: eventsInRange.filter((e) => e.type === "holiday").length,
  }), [eventsInRange]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">

        {/* ── Top nav ── */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shrink-0">
          <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="h-14 sm:h-16 md:h-20 flex items-center justify-between gap-2 sm:gap-4">
              {/* brand */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                    <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-background animate-pulse-soft" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight">Team Calendar</h1>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">ดูการประชุม · กำหนดส่งงาน · วันหยุด · จัดการตารางงานของทีม</p>
                </div>
              </div>

              {/* view tabs + nav */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {!isMobile ? (
                  <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                    <TabsList className="h-9 md:h-10 bg-muted/40 border border-border/50 p-1">
                      {[
                        { value: "day", label: "วัน", Icon: CalendarSearch },
                        { value: "week", label: "สัปดาห์", Icon: CalendarRange },
                        { value: "month", label: "เดือน", Icon: CalendarDays },
                      ].map(({ value, label, Icon }) => (
                        <TabsTrigger key={value} value={value} className="h-7 md:h-8 px-3 md:px-4 text-[10px] md:text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50">
                          <Icon className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1" />{label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                ) : (
                  <Select value={view} onValueChange={(v) => setView(v as ViewMode)}>
                    <SelectTrigger className="h-8 w-[100px] text-xs border-border/50 bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">วัน</SelectItem>
                      <SelectItem value="week">สัปดาห์</SelectItem>
                      <SelectItem value="month">เดือน</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <div className="flex items-center gap-0.5 sm:gap-1 border border-border/50 rounded-lg p-0.5 sm:p-1 bg-muted/30">
                  <Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={handlePrev}><ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></Button>
                  </TooltipTrigger><TooltipContent>ก่อนหน้า</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={handleNext}><ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></Button>
                  </TooltipTrigger><TooltipContent>ถัดไป</TooltipContent></Tooltip>
                  <Button variant="outline" size="sm" className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 border-border/50 bg-background/50 hidden sm:inline-flex" onClick={handleToday}>วันนี้</Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sub-header: date label + stats + filters ── */}
        <div className="border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent shrink-0">
          <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 sm:py-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold truncate">{titleLabel}</h2>
                <div className="flex items-center gap-1 sm:gap-2 mt-0.5 flex-wrap">
                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0.5 h-4 sm:h-5 bg-primary/10 text-primary border-primary/20">{eventsInRange.length} รายการ</Badge>
                  {stats.totalMeetings > 0 && <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0.5 h-4 sm:h-5 border-primary/30 text-primary bg-primary/5"><Video className="w-2 h-2 mr-0.5" />{stats.totalMeetings}</Badge>}
                  {stats.totalTasks > 0 && <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0.5 h-4 sm:h-5 border-amber-300 text-amber-700 bg-amber-50"><CheckSquare className="w-2 h-2 mr-0.5" />{stats.totalTasks}</Badge>}
                  {stats.totalHolidays > 0 && <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0.5 h-4 sm:h-5 border-red-300 text-red-700 bg-red-50"><Sparkles className="w-2 h-2 mr-0.5" />{stats.totalHolidays}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium hidden sm:inline">ทีม</span>
                  <Select value={teamFilter} onValueChange={setTeamFilter}>
                    <SelectTrigger className="h-8 sm:h-9 w-[120px] sm:w-[160px] text-[10px] sm:text-xs border-border/50 bg-background/50"><SelectValue placeholder="ทุกทีม" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกทีม</SelectItem>
                      {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-9 text-xs gap-2 border-border/60 bg-background shadow-sm", showFilters && "bg-primary/10 border-primary/50 text-primary")}>
                      <Filter className="w-3.5 h-3.5" /><span className="hidden sm:inline">ตัวกรอง</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 p-4" align="end" sideOffset={8}>
                    <h4 className="text-sm font-semibold mb-3">ตัวกรอง</h4>
                    <div className="space-y-3">
                      {[
                        { key: "meetings", label: "การประชุม", Icon: Video, color: "text-primary" },
                        { key: "tasks", label: "งาน", Icon: CheckSquare, color: "text-amber-600" },
                        { key: "holidays", label: "วันหยุด", Icon: Sparkles, color: "text-red-600" },
                      ].map(({ key, label, Icon, color }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox id={`filter-${key}`} checked={filterTypes[key as keyof typeof filterTypes]}
                            onCheckedChange={(c) => setFilterTypes((p) => ({ ...p, [key]: c as boolean }))} />
                          <Label htmlFor={`filter-${key}`} className="text-sm cursor-pointer flex items-center gap-2">
                            <Icon className={cn("w-4 h-4", color)} />{label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs"
                        onClick={() => setFilterTypes({ meetings: true, tasks: true, holidays: true })}>รีเซ็ตทั้งหมด</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main calendar area ── */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground font-medium">กำลังโหลดปฏิทิน...</span>
              </div>
            </div>
          ) : error ? (
            <div className="px-4 py-4">
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4"><X className="w-8 h-8 text-destructive" /></div>
                  <h3 className="text-lg font-semibold mb-1">โหลดปฏิทินไม่สำเร็จ</h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <AnimatePresence mode="wait">

                {/* ─── MONTH VIEW — has padding like before ─── */}
                {view === "month" && (
                  <motion.div
                    key="month"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 overflow-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4"
                  >
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3">
                      {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
                        <div key={day} className="text-center py-1.5 sm:py-2 text-[9px] sm:text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 rounded-md">{day}</div>
                      ))}
                      {visibleDays.map((day) => {
                        const key = dateKey(day);
                        const dayEvents = eventsByDay.get(key) ?? [];
                        const summary = workloadSummary.get(key) ?? { meetings: 0, tasks: 0, holidays: 0 };
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        return (
                          <motion.div key={`${key}-${dayEvents.length}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15 }}>
                            <Card className={cn("border-border/50 bg-card/70 hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:ring-1 hover:ring-primary/20",
                              isToday(day) && "ring-2 ring-primary/50 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/70 shadow-lg",
                              !isCurrentMonth && "opacity-50")}>
                              <CardHeader className="py-1.5 sm:py-2.5 px-1.5 sm:px-2.5 flex flex-row items-center justify-between bg-gradient-to-r from-transparent via-muted/10 to-transparent">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <span className={cn("text-xs sm:text-sm font-bold", isToday(day) && "text-primary scale-110", !isCurrentMonth && "text-muted-foreground")}>{day.getDate()}</span>
                                  {isToday(day) && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />}
                                </div>
                                <div className="flex items-center gap-0.5 flex-wrap">
                                  {summary.holidays > 0 && <Badge className="bg-red-100 text-red-900 border-0 text-[8px] px-1 h-3.5 sm:h-4">🎉</Badge>}
                                  {summary.meetings > 0 && <Badge className="bg-primary/15 text-primary border-0 text-[8px] px-1 h-3.5 sm:h-4 font-semibold">{summary.meetings}</Badge>}
                                  {summary.tasks > 0 && <Badge className="bg-amber-100 text-amber-900 border-0 text-[8px] px-1 h-3.5 sm:h-4 font-semibold">{summary.tasks}</Badge>}
                                </div>
                              </CardHeader>
                              <CardContent className="px-1 sm:px-2 pb-1.5 sm:pb-2">
                                <DroppableDay date={day} className="min-h-[40px] sm:min-h-[50px] md:min-h-[60px]">
                                  {dayEvents.slice(0, isMobile ? 2 : 3).map((ev) => <DraggableEventCard key={`${ev.id}-${refreshKey}`} event={ev} />)}
                                  {dayEvents.length > (isMobile ? 2 : 3) && (
                                    <div className="text-[8px] sm:text-[10px] text-muted-foreground mt-0.5 font-medium px-0.5">+{dayEvents.length - (isMobile ? 2 : 3)} เพิ่มเติม</div>
                                  )}
                                </DroppableDay>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* ─── DAY / WEEK VIEW — full width, no padding ─── */}
                {(view === "day" || view === "week") && (
                  <motion.div
                    key={view}
                    initial={{ opacity: 0, x: view === "day" ? -16 : 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: view === "day" ? 16 : -16 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 min-h-0 flex flex-col w-full"
                  >
                    <TimeGrid
                      days={view === "day" ? [currentDate] : visibleDays}
                      eventsByDay={eventsByDay}
                      refreshKey={refreshKey}
                      isToday={isToday}
                    />
                  </motion.div>
                )}

              </AnimatePresence>

              <DragOverlay>
                {activeEvent ? <div className="opacity-90 pointer-events-none"><DraggableEventCard event={activeEvent} /></div> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}