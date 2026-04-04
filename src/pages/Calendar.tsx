import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { CalendarDays, CalendarRange, CalendarSearch, ChevronLeft, ChevronRight, CheckSquare, Clock, Filter, Loader2, Users, Video, Sparkles, TrendingUp, Zap, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { apiGet, apiPatch } from "@/lib/api";

import {
  DraggableEventCard,
  StaticEventCard,
  DroppableDay,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  dateKey,
  addDays,
  type ViewMode,
  type RawMeeting,
  type RawTask,
  type CalendarEvent,
  type TeamOption,
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

  useEffect(() => {
    let cancelled = false;
    const loadTeams = async () => {
      try {
        const data = await apiGet<any[]>("/teams").catch(() => []);
        if (!cancelled) setTeams((Array.isArray(data) ? data : []).map((t: any) => ({ id: t.id, name: t.name })));
      } catch {}
    };
    loadTeams();
    return () => { cancelled = true; };
  }, []);

  const { rangeStart, rangeEnd, visibleDays } = useMemo(() => {
    if (view === "day") {
      const start = startOfDay(currentDate);
      const end = endOfDay(currentDate);
      return { rangeStart: start, rangeEnd: end, visibleDays: [start] };
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
    while (d <= end) {
      days.push(new Date(d));
      d = addDays(d, 1);
    }
    return { rangeStart: start, rangeEnd: end, visibleDays: days };
  }, [currentDate, view]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
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
        const end = m.endTime ? new Date(m.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
        if (isNaN(end.getTime())) return null;
        return { id: `meeting-${m.id}`, entityId: m.id, type: "meeting" as const, title: m.title, start, end, allDay: false, teamName: m.team?.name ?? undefined, assigneeName: m.host?.name ?? undefined, status: m.status };
      } catch { return null; }
    }).filter((m): m is NonNullable<typeof m> => m !== null);

    const mappedTasks: CalendarEvent[] = tasks.filter((t) => t.dueDate).map((t) => {
      try {
        const due = new Date(t.dueDate as string);
        if (isNaN(due.getTime())) return null;
        const start = startOfDay(due);
        const end = endOfDay(due);
        return { id: `task-${t.id}`, entityId: t.id, type: "task" as const, title: t.title, start, end, allDay: true, teamName: t.team?.name ?? undefined, assigneeName: t.assignee?.name ?? undefined, status: t.status ?? undefined, priority: t.priority ?? undefined };
      } catch { return null; }
    }).filter((t): t is NonNullable<typeof t> => t !== null);

    const mappedHolidays: CalendarEvent[] = holidays.map((h) => {
      const date = new Date(h.date);
      return { id: `holiday-${h.id}`, entityId: h.id, type: "holiday" as const, title: h.nameEn || h.name, start: startOfDay(date), end: endOfDay(date), allDay: true, status: h.type };
    });

    return [...mappedMeetings, ...mappedTasks, ...mappedHolidays];
  }, [meetings, tasks, holidays, refreshKey]);

  const eventsInRange = useMemo(() => {
    return events.filter((e) => {
      const overlaps = e.start <= rangeEnd && e.end >= rangeStart;
      if (!overlaps) return false;
      if (e.type === "meeting" && !filterTypes.meetings) return false;
      if (e.type === "task" && !filterTypes.tasks) return false;
      if (e.type === "holiday" && !filterTypes.holidays) return false;
      return true;
    });
  }, [events, rangeStart, rangeEnd, filterTypes]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of eventsInRange) {
      try {
        const key = dateKey(ev.start);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      } catch {}
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
    const id = event.active.id as string;
    const ev = events.find((e) => e.id === id);
    if (ev) setActiveEvent(ev);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (!overId.startsWith("day-")) return;

    const ev = events.find((e) => e.id === activeId);
    if (!ev || ev.type === "holiday") return;

    const parts = overId.split("-");
    if (parts.length < 4) return;

    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10);
    const day = parseInt(parts[3], 10);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return;

    const newStart = new Date(year, month - 1, day);
    const current = ev.start;

    if (ev.type === "meeting") {
      newStart.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
      const duration = ev.end.getTime() - ev.start.getTime();
      const newEnd = new Date(newStart.getTime() + duration);
      setMeetings((prev) => prev.map((m) => m.id === ev.entityId ? { ...m, startTime: newStart.toISOString(), endTime: newEnd.toISOString() } : m));
      try {
        await apiPatch(`/meetings/${ev.entityId}`, { startTime: newStart.toISOString(), endTime: newEnd.toISOString() });
      } catch {
        const qs = teamFilter !== "all" ? `?teamId=${encodeURIComponent(teamFilter)}` : "";
        const meetingsData = await apiGet<RawMeeting[]>(`/meetings${qs}`).catch(() => []);
        setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
      }
    } else {
      newStart.setHours(0, 0, 0, 0);
      const newDueDate = newStart.toISOString();
      const updatedTasks = tasks.map((t) => t.id === ev.entityId ? { ...t, dueDate: newDueDate } : { ...t });
      setTasks(updatedTasks);
      setRefreshKey((k) => k + 1);
      try {
        await apiPatch(`/tasks/${ev.entityId}`, { dueDate: newDueDate });
        const qs = teamFilter !== "all" ? `?teamId=${encodeURIComponent(teamFilter)}` : "";
        const tasksData = await apiGet<RawTask[]>(`/tasks${qs}`).catch(() => []);
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setRefreshKey((k) => k + 1);
      } catch {
        const qs = teamFilter !== "all" ? `?teamId=${encodeURIComponent(teamFilter)}` : "";
        const tasksData = await apiGet<RawTask[]>(`/tasks${qs}`).catch(() => []);
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setRefreshKey((k) => k + 1);
      }
    }
  };

  const titleLabel = useMemo(() => {
    if (view === "day") return currentDate.toLocaleDateString("th-TH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (view === "week") {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return `${start.toLocaleDateString("th-TH", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("th-TH", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }, [currentDate, view]);

  const isToday = (date: Date) => isSameDay(date, new Date());

  const workloadSummary = useMemo(() => {
    const summary = new Map<string, { meetings: number; tasks: number; holidays: number }>();
    for (const ev of eventsInRange) {
      const key = dateKey(ev.start);
      const item = summary.get(key) ?? { meetings: 0, tasks: 0, holidays: 0 };
      if (ev.type === "meeting") item.meetings += 1;
      else if (ev.type === "task") item.tasks += 1;
      else if (ev.type === "holiday") item.holidays += 1;
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
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="h-14 sm:h-16 md:h-20 flex items-center justify-between gap-2 sm:gap-4 md:gap-6">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                    <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full border-2 border-background animate-pulse-soft" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground tracking-tight">Team Calendar</h1>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">ดูการประชุม · กำหนดส่งงาน · วันหยุด · จัดการตารางงานของทีม</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
                {!isMobile && (
                  <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                    <TabsList className="h-9 md:h-10 bg-muted/40 border border-border/50 p-1">
                      <TabsTrigger value="day" className="h-7 md:h-8 px-3 md:px-4 text-[10px] md:text-xs font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50">
                        <CalendarSearch className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" />วัน
                      </TabsTrigger>
                      <TabsTrigger value="week" className="h-7 md:h-8 px-3 md:px-4 text-[10px] md:text-xs font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50">
                        <CalendarRange className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" />สัปดาห์
                      </TabsTrigger>
                      <TabsTrigger value="month" className="h-7 md:h-8 px-3 md:px-4 text-[10px] md:text-xs font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border/50">
                        <CalendarDays className="w-3 h-3 md:w-3.5 md:h-3.5 mr-1 md:mr-1.5" />เดือน
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

                {isMobile && (
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-background" onClick={handlePrev}>
                        <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>ก่อนหน้า</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-background" onClick={handleNext}>
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>ถัดไป</TooltipContent>
                  </Tooltip>
                  <Button variant="outline" size="sm" className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 border-border/50 bg-background/50 hover:bg-background hidden sm:inline-flex" onClick={handleToday}>วันนี้</Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
          <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 sm:py-3 md:py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 flex-wrap">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-foreground truncate">{titleLabel}</h2>
                  <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 h-4 sm:h-5 bg-primary/10 text-primary border-primary/20">{eventsInRange.length} รายการ</Badge>
                    {stats.totalMeetings > 0 && <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 h-4 sm:h-5 border-primary/30 text-primary bg-primary/5"><Video className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 sm:mr-1" />{stats.totalMeetings}</Badge>}
                    {stats.totalTasks > 0 && <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 h-4 sm:h-5 border-amber-300 text-amber-700 bg-amber-50"><CheckSquare className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 sm:mr-1" />{stats.totalTasks}</Badge>}
                    {stats.totalHolidays > 0 && <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 h-4 sm:h-5 border-red-300 text-red-700 bg-red-50"><Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 sm:mr-1" />{stats.totalHolidays}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-medium hidden sm:inline">ทีม</span>
                  <Select value={teamFilter} onValueChange={setTeamFilter}>
                    <SelectTrigger className="h-8 sm:h-9 w-[120px] sm:w-[160px] md:w-[180px] text-[10px] sm:text-xs border-border/50 bg-background/50 hover:bg-background"><SelectValue placeholder="ทุกทีม" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกทีม</SelectItem>
                      {teams.map((team) => (<SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-9 text-xs gap-2 transition-all duration-200 border-border/60 bg-background hover:bg-muted hover:border-border text-foreground hover:text-foreground shadow-sm hover:shadow-md", showFilters && "bg-primary/10 border-primary/50 text-primary ring-1 ring-primary/20")} title="ตัวกรองเพิ่มเติม">
                      <Filter className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">ตัวกรอง</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4" align="end" sideOffset={8}>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">ตัวกรอง</h4>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="filter-meetings" checked={filterTypes.meetings} onCheckedChange={(checked) => setFilterTypes((prev) => ({ ...prev, meetings: checked as boolean }))} />
                            <Label htmlFor="filter-meetings" className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"><Video className="w-4 h-4 text-primary" />การประชุม</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="filter-tasks" checked={filterTypes.tasks} onCheckedChange={(checked) => setFilterTypes((prev) => ({ ...prev, tasks: checked as boolean }))} />
                            <Label htmlFor="filter-tasks" className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"><CheckSquare className="w-4 h-4 text-amber-600" />งาน</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="filter-holidays" checked={filterTypes.holidays} onCheckedChange={(checked) => setFilterTypes((prev) => ({ ...prev, holidays: checked as boolean }))} />
                            <Label htmlFor="filter-holidays" className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"><Sparkles className="w-4 h-4 text-red-600" />วันหยุด</Label>
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-border/50">
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => setFilterTypes({ meetings: true, tasks: true, holidays: true })}>รีเซ็ตทั้งหมด</Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="max-w-[1920px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 sm:py-3 md:py-4 h-full flex flex-col">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground font-medium">กำลังโหลดปฏิทิน...</span>
                </div>
              </div>
            ) : error ? (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4"><X className="w-8 h-8 text-destructive" /></div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">โหลดปฏิทินไม่สำเร็จ</h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </CardContent>
              </Card>
            ) : (
              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <AnimatePresence mode="wait">
                  {view === "month" ? (
                    <motion.div key="month" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3 overflow-x-auto">
                      {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
                        <div key={day} className="text-center py-1.5 sm:py-2 md:py-3 text-[9px] sm:text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/30 rounded sm:rounded-md md:rounded-lg">{day}</div>
                      ))}
                      {visibleDays.map((day) => {
                        const key = dateKey(day);
                        const dayEvents = eventsByDay.get(key) ?? [];
                        const summary = workloadSummary.get(key) ?? { meetings: 0, tasks: 0, holidays: 0 };
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        const eventsKey = `${key}-${dayEvents.length}-${dayEvents.map((e) => e.id).join(",")}`;
                        return (
                          <motion.div key={eventsKey} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15 }}>
                            <Card className={cn("border-border/50 bg-card/70 hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1 ring-0 hover:ring-1 hover:ring-primary/20", isToday(day) && "ring-2 ring-primary/50 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/70 shadow-lg", !isCurrentMonth && "opacity-50")}>
                              <CardHeader className="py-1.5 sm:py-2.5 md:py-3.5 px-1.5 sm:px-2.5 md:px-3.5 flex flex-row items-center justify-between bg-gradient-to-r from-transparent via-muted/10 to-transparent">
                                <div className="flex items-center gap-1 sm:gap-2 md:gap-2.5">
                                  <span className={cn("text-xs sm:text-sm md:text-base font-bold transition-all duration-200", isToday(day) && "text-primary scale-110", !isCurrentMonth && "text-muted-foreground")}>{day.getDate()}</span>
                                  {isToday(day) && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />}
                                </div>
                                <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap">
                                  {summary.holidays > 0 && <Badge className="bg-gradient-to-r from-red-100 via-red-50 to-red-100 text-red-900 border-0 text-[8px] sm:text-[9px] px-1 sm:px-2 h-3.5 sm:h-4.5 shadow-sm font-semibold">🎉</Badge>}
                                  {summary.meetings > 0 && <Badge className="bg-gradient-to-r from-primary/20 via-primary/15 to-primary/20 text-primary border-0 text-[8px] sm:text-[9px] px-1 sm:px-2 h-3.5 sm:h-4.5 shadow-sm font-semibold">{summary.meetings}</Badge>}
                                  {summary.tasks > 0 && <Badge className="bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 text-amber-900 border-0 text-[8px] sm:text-[9px] px-1 sm:px-2 h-3.5 sm:h-4.5 shadow-sm font-semibold">{summary.tasks}</Badge>}
                                </div>
                              </CardHeader>
                              <CardContent className="px-1 sm:px-2 md:px-3 pb-1.5 sm:pb-2 md:pb-3">
                                <DroppableDay date={day} className="min-h-[40px] sm:min-h-[50px] md:min-h-[60px]">
                                  {dayEvents.slice(0, isMobile ? 2 : 3).map((ev) => <DraggableEventCard key={`${ev.id}-${refreshKey}`} event={ev} />)}
                                  {dayEvents.length > (isMobile ? 2 : 3) && <div className="text-[8px] sm:text-[10px] text-muted-foreground mt-0.5 sm:mt-1 font-medium px-0.5 sm:px-1">+{dayEvents.length - (isMobile ? 2 : 3)} เพิ่มเติม</div>}
                                </DroppableDay>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  ) : (
                    <motion.div key={view} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="h-full">
                      <Card className="flex-1 border-border/50 bg-card/50 shadow-xl flex flex-col min-h-0">
                        <CardContent className="p-1.5 sm:p-3 md:p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                          <div className={cn("grid flex-1 gap-1 sm:gap-2 md:gap-3 min-h-0", isMobile ? "grid-cols-1" : "grid-cols-[70px_minmax(0,1fr)]")}>
                            {!isMobile && (
                              <div className="flex flex-col text-xs text-muted-foreground pr-3 border-r border-border/60 shrink-0">
                                {Array.from({ length: 12 }).map((_, i) => {
                                  const hour = 8 + i;
                                  return <div key={hour} className="h-12 flex items-start justify-end pr-2 pt-0.5"><span className="font-medium text-[11px]">{`${hour.toString().padStart(2, "0")}:00`}</span></div>;
                                })}
                              </div>
                            )}
                            <div className="flex flex-col overflow-x-auto overflow-y-hidden min-w-0">
                              <div className={cn("grid gap-1 sm:gap-2 flex-1 min-h-0", view === "day" ? "grid-cols-1" : isMobile ? "grid-cols-1" : "grid-cols-7")}>
                                {(view === "day" ? [currentDate] : visibleDays.slice(0, 7)).map((day) => {
                                  const key = dateKey(day);
                                  const dayEvents = eventsByDay.get(key) ?? [];
                                  const allDayEvents = dayEvents.filter((e) => e.allDay);
                                  const timedEvents = dayEvents.filter((e) => !e.allDay);
                                  const summary = workloadSummary.get(key) ?? { meetings: 0, tasks: 0, holidays: 0 };
                                  const eventsKey = `${key}-${dayEvents.length}-${dayEvents.map((e) => e.id).join(",")}`;
                                  return (
                                    <div key={eventsKey} className="flex flex-col min-w-0">
                                      <div className="flex items-center justify-between mb-1 sm:mb-2 px-1 sm:px-2">
                                        <div className="flex items-baseline gap-1 sm:gap-2">
                                          <span className={cn("text-xs sm:text-sm font-bold", isToday(day) && "text-primary")}>{day.toLocaleDateString("th-TH", { weekday: "short", day: "numeric" })}</span>
                                          {isToday(day) && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary animate-pulse" />}
                                        </div>
                                        <div className="flex items-center gap-0.5 sm:gap-1">
                                          {summary.holidays > 0 && <Badge className="bg-red-100 text-red-900 border-0 text-[8px] sm:text-[9px] px-1 sm:px-1.5 h-3.5 sm:h-4">🎉</Badge>}
                                          {summary.meetings > 0 && <Badge className="bg-primary/10 text-primary border-0 text-[8px] sm:text-[9px] px-1 sm:px-1.5 h-3.5 sm:h-4">{summary.meetings}</Badge>}
                                          {summary.tasks > 0 && <Badge className="bg-amber-100 text-amber-900 border-0 text-[8px] sm:text-[9px] px-1 sm:px-1.5 h-3.5 sm:h-4">{summary.tasks}</Badge>}
                                        </div>
                                      </div>
                                      <DroppableDay date={day} id={`day-${key}-all`} className="min-h-[30px] sm:min-h-[40px]">
                                        {allDayEvents.map((ev) => <DraggableEventCard key={`${ev.id}-${refreshKey}`} event={ev} />)}
                                      </DroppableDay>
                                      <div className="mt-1 sm:mt-1.5 relative border border-border/60 rounded-md sm:rounded-lg bg-gradient-to-br from-muted/40 via-muted/25 to-background overflow-hidden shadow-md flex-1 min-h-0">
                                        <div className="absolute inset-0 pointer-events-none">
                                          {Array.from({ length: 12 }).map((_, i) => <div key={i} className={cn("border-b border-border/40", isMobile ? "h-10" : "h-12", i === 0 && "border-t")} />)}
                                        </div>
                                        <DroppableDay date={day} id={`day-${key}-time`} className="h-full min-h-0">
                                          <div className="relative h-full overflow-y-auto pt-0.5 px-0.5 sm:px-1">
                                            {timedEvents.map((ev) => <StaticEventCard key={`${ev.id}-${refreshKey}`} event={ev} />)}
                                          </div>
                                        </DroppableDay>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                <DragOverlay>
                  {activeEvent ? <div className="opacity-90"><DraggableEventCard event={activeEvent} /></div> : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}