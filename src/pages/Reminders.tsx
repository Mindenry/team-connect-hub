import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  CheckCircle2,
  Clock,
  Repeat,
  Edit,
  Trash2,
  Search,
  CalendarDays,
  List,
  BellOff,
  MoreVertical,
  Sparkles,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { PageHero, PageShell } from "@/components/shared/PageShell";

interface Reminder {
  id: string;
  title: string;
  description?: string;
  type: string;
  relatedId?: string;
  relatedType?: string;
  remindAt: string;
  isSent: boolean;
  createdAt: string;
  creator?: { id: string; name: string };
  recipients?: Array<{
    id: string;
    userId: string;
    isRead: boolean;
    readAt?: string;
    user?: { id: string; name: string };
  }>;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function Reminders() {
  const { toast } = useToast();
  const currentUser = auth.getUser();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "sent" | "overdue">("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReminders, setSelectedReminders] = useState<Set<string>>(new Set());
  const [newReminder, setNewReminder] = useState({
    title: "",
    description: "",
    type: "custom",
    remindAt: "",
    isRecurring: false,
    recurringPattern: "none" as "none" | "daily" | "weekly" | "monthly",
    occurrences: 10,
    userIds: [] as string[],
  });
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadUsers();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter === "pending") {
        params.append("isSent", "false");
      } else if (filter === "sent") {
        params.append("isSent", "true");
      }
      if (currentUser?.id) {
        params.append("userId", currentUser.id);
      }

      const res = await apiGet<Reminder[]>(`/reminders?${params.toString()}`).catch(() => []);
      setReminders(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error("Failed to load reminders:", err);
      setReminders([]);
      if (err.message && !err.message.includes("401")) {
        toast({
          title: "Error",
          description: err.message || "Failed to load reminders",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await apiGet<any[]>("/users").catch(() => []);
      setUsers(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load users", err);
      setUsers([]);
    }
  };

  const computeRecurringDates = (base: Date, pattern: "daily" | "weekly" | "monthly", count: number) => {
    const dates: Date[] = [new Date(base)];
    for (let i = 1; i < count; i++) {
      const next = new Date(dates[i - 1]);
      if (pattern === "daily") next.setDate(next.getDate() + 1);
      if (pattern === "weekly") next.setDate(next.getDate() + 7);
      if (pattern === "monthly") next.setMonth(next.getMonth() + 1);
      dates.push(next);
    }
    return dates;
  };

  const handleCreate = async () => {
    if (!newReminder.title.trim() || !newReminder.remindAt) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const userIds = newReminder.userIds.length > 0 ? newReminder.userIds : [currentUser?.id];
      const base = new Date(newReminder.remindAt);
      if (newReminder.isRecurring && newReminder.recurringPattern !== "none") {
        const count = Math.max(1, Math.min(30, Number(newReminder.occurrences) || 10));
        const dates = computeRecurringDates(base, newReminder.recurringPattern, count);
        for (const d of dates) {
          // eslint-disable-next-line no-await-in-loop
          await apiPost("/reminders", {
            title: newReminder.title,
            description: newReminder.description,
            type: newReminder.type,
            remindAt: d.toISOString(),
            createdBy: currentUser?.id,
            userIds,
          });
        }
      } else {
        await apiPost("/reminders", {
          title: newReminder.title,
          description: newReminder.description,
          type: newReminder.type,
          remindAt: base.toISOString(),
          createdBy: currentUser?.id,
          userIds,
        });
      }
      toast({
        title: "Success",
        description: newReminder.isRecurring ? "Recurring reminders created" : "Reminder created successfully",
      });
      setShowCreateDialog(false);
      setNewReminder({
        title: "",
        description: "",
        type: "custom",
        remindAt: "",
        isRecurring: false,
        recurringPattern: "none",
        occurrences: 10,
        userIds: [],
      });
      loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create reminder",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setNewReminder({
      title: reminder.title,
      description: reminder.description || "",
      type: reminder.type,
      remindAt: new Date(reminder.remindAt).toISOString().slice(0, 16),
      isRecurring: false,
      recurringPattern: "none",
      occurrences: 10,
      userIds: reminder.recipients?.map((r) => r.userId) || [],
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!editingReminder || !newReminder.title.trim() || !newReminder.remindAt) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiPatch(`/reminders/${editingReminder.id}`, {
        ...newReminder,
        userId: currentUser?.id,
      });
      toast({
        title: "Success",
        description: "Reminder updated successfully",
      });
      setShowEditDialog(false);
      setEditingReminder(null);
      loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update reminder",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsRead = async (reminderId: string) => {
    try {
      await apiPatch(`/reminders/${reminderId}/read`, {
        userId: currentUser?.id,
      });
      toast({
        title: "Success",
        description: "Reminder marked as read",
      });
      loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to mark reminder as read",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (reminderId: string) => {
    try {
      await apiDelete(`/reminders/${reminderId}`, {
        body: { userId: currentUser?.id },
      });
      toast({
        title: "Success",
        description: "Reminder deleted",
      });
      loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete reminder",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReminders.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedReminders).map((id) =>
          apiDelete(`/reminders/${id}`, {
            body: { userId: currentUser?.id },
          })
        )
      );
      toast({
        title: "Success",
        description: `${selectedReminders.size} reminder(s) deleted`,
      });
      setSelectedReminders(new Set());
      loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete reminders",
        variant: "destructive",
      });
    }
  };

  const formatWhen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const absMins = Math.round(Math.abs(diffMs) / 60000);
    const absHours = Math.round(Math.abs(diffMs) / 3600000);
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (diffMs < 0 && absMins < 60) return `${absMins}m ago`;
    if (diffMs < 0 && absHours < 24) return `${absHours}h ago`;
    if (sameDay) return `Today · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const isOverdue = (remindAt: string, isSent: boolean) => {
    return new Date(remindAt) < new Date() && !isSent;
  };

  const filteredReminders = useMemo(() => {
    return reminders
      .filter((r) => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          r.title.toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q);
        const matchesFilter =
          filter === "all" ||
          (filter === "pending" && !r.isSent) ||
          (filter === "sent" && r.isSent) ||
          (filter === "overdue" && isOverdue(r.remindAt, r.isSent));
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
  }, [reminders, searchQuery, filter]);

  const pendingCount = reminders.filter((r) => !r.isSent).length;
  const overdueCount = reminders.filter((r) => isOverdue(r.remindAt, r.isSent)).length;

  const remindersForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    const d = selectedDate.getDate();
    return filteredReminders.filter((r) => {
      const dt = new Date(r.remindAt);
      return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
    });
  }, [filteredReminders, selectedDate]);

  const toggleAllVisible = (checked: boolean) => {
    if (!checked) return setSelectedReminders(new Set());
    setSelectedReminders(new Set(filteredReminders.map((r) => r.id)));
  };

  const listContent = (
    <Card className="border bg-card/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="bg-muted/40">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border bg-background/40 p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-7 px-2"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className="h-7 px-2"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
            {viewMode === "list" && filteredReminders.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border bg-background/40 px-2 py-1.5">
                <Checkbox
                  checked={selectedReminders.size > 0 && selectedReminders.size === filteredReminders.length}
                  onCheckedChange={(v) => toggleAllVisible(!!v)}
                />
                <span className="text-xs text-muted-foreground">
                  {selectedReminders.size > 0 ? `${selectedReminders.size} selected` : "Select"}
                </span>
                {selectedReminders.size > 0 && (
                  <Button variant="destructive" size="sm" className="h-7" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="flex items-center gap-3 rounded-xl border bg-background/40 p-3">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            ))}
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="rounded-xl border bg-background/40 p-6 text-center">
            <BellOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-foreground">No reminders found.</p>
            <p className="mt-1 text-xs text-muted-foreground">Create one to keep your day on track.</p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New reminder
              </Button>
            </div>
          </div>
        ) : viewMode === "calendar" ? (
          <div className="grid gap-3 lg:grid-cols-12">
            <Card className="lg:col-span-4 border bg-background/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Pick a date</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-8 border bg-background/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  {selectedDate
                    ? selectedDate.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })
                    : "Reminders"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {(remindersForSelectedDate.length === 0 ? [] : remindersForSelectedDate).map((reminder, idx) => {
                  const userRecipient = reminder.recipients?.find((r) => r.userId === currentUser?.id);
                  const isRead = userRecipient?.isRead || false;
                  const overdue = isOverdue(reminder.remindAt, reminder.isSent);
                  return (
                    <motion.div
                      key={reminder.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 + idx * 0.02 }}
                      className="flex items-start gap-3 rounded-xl border bg-card/60 p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 shrink-0">
                        <Clock className="h-4 w-4 text-foreground/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={cn("text-sm font-medium text-foreground truncate", isRead && "line-through text-muted-foreground")}>
                            {reminder.title}
                          </p>
                          {overdue && <Badge variant="destructive" className="h-5 text-[10px]">Overdue</Badge>}
                          {reminder.isSent && <Badge variant="outline" className="h-5 text-[10px]">Sent</Badge>}
                          <Badge variant="secondary" className="h-5 text-[10px]">{reminder.type}</Badge>
                        </div>
                        {reminder.description && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{reminder.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatWhen(reminder.remindAt)}
                          </span>
                          {reminder.recipients?.length ? (
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {reminder.recipients.length} recipient{reminder.recipients.length === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isRead && (
                          <Button variant="outline" size="sm" className="h-8" onClick={() => handleMarkAsRead(reminder.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Read
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(reminder)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(reminder.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  );
                })}
                {remindersForSelectedDate.length === 0 && (
                  <div className="rounded-xl border bg-card/40 p-6 text-center">
                    <p className="text-sm text-foreground">No reminders on this day.</p>
                    <p className="mt-1 text-xs text-muted-foreground">Pick another date, or create one.</p>
                    <div className="mt-4">
                      <Button variant="outline" onClick={() => setShowCreateDialog(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        New reminder
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filteredReminders.map((reminder, idx) => {
                const userRecipient = reminder.recipients?.find((r) => r.userId === currentUser?.id);
                const isRead = userRecipient?.isRead || false;
                const overdue = isOverdue(reminder.remindAt, reminder.isSent);
                const isSelected = selectedReminders.has(reminder.id);
                return (
                  <motion.div
                    key={reminder.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ delay: 0.02 + idx * 0.01 }}
                    className={cn(
                      "group flex items-start gap-3 rounded-xl border bg-background/40 p-3 hover:bg-muted/30 transition-colors",
                      overdue && "border-destructive/40",
                      isSelected && "ring-2 ring-primary/40",
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        const next = new Set(selectedReminders);
                        if (checked) next.add(reminder.id);
                        else next.delete(reminder.id);
                        setSelectedReminders(next);
                      }}
                      className="mt-1"
                    />
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 shrink-0">
                      <Clock className="h-4 w-4 text-foreground/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn("text-sm font-medium text-foreground truncate", isRead && "line-through text-muted-foreground")}>
                          {reminder.title}
                        </p>
                        {overdue && <Badge variant="destructive" className="h-5 text-[10px]">Overdue</Badge>}
                        {reminder.isSent && <Badge variant="outline" className="h-5 text-[10px]">Sent</Badge>}
                        <Badge variant="secondary" className="h-5 text-[10px]">{reminder.type}</Badge>
                      </div>
                      {reminder.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{reminder.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatWhen(reminder.remindAt)}
                        </span>
                        {reminder.creator?.name && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {reminder.creator.name}
                          </span>
                        )}
                        {reminder.recipients?.length ? (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {reminder.recipients.length} recipient{reminder.recipients.length === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isRead && (
                        <Button variant="outline" size="sm" className="h-8" onClick={() => handleMarkAsRead(reminder.id)}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Read
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-80 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(reminder)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(reminder.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <PageShell>
      <PageHero
        title={
          <span className="inline-flex items-center gap-2">
            <span className="gradient-text">Reminders</span>
          </span>
        }
        description="Schedule nudges for yourself or teammates—no more missed meetings or deadlines."
        meta={
          <div className="flex items-center gap-2">
            {pendingCount > 0 && <Badge variant="secondary" className="h-5 text-[10px]">{pendingCount} pending</Badge>}
            {overdueCount > 0 && <Badge variant="destructive" className="h-5 text-[10px]">{overdueCount} overdue</Badge>}
          </div>
        }
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reminders…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-72 pl-9 bg-background/40"
              />
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary shadow-sm gap-2">
                  <Plus className="h-4 w-4" />
                  New reminder
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create reminder</DialogTitle>
                  <DialogDescription>Send a timely nudge to yourself or your team.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" value={newReminder.title} onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })} placeholder="e.g. Prep weekly standup" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={newReminder.description} onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })} placeholder="Optional context…" rows={3} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Type</Label>
                      <Select value={newReminder.type} onValueChange={(value) => setNewReminder({ ...newReminder, type: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="deadline">Deadline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Remind at *</Label>
                      <Input type="datetime-local" value={newReminder.remindAt} onChange={(e) => setNewReminder({ ...newReminder, remindAt: e.target.value })} />
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground inline-flex items-center gap-2">
                          <Repeat className="h-4 w-4 text-foreground/70" />
                          Repeat (creates multiple reminders)
                        </p>
                        <p className="text-xs text-muted-foreground">We’ll generate the next occurrences automatically.</p>
                      </div>
                      <Switch checked={newReminder.isRecurring} onCheckedChange={(checked) => setNewReminder({ ...newReminder, isRecurring: checked })} />
                    </div>
                    {newReminder.isRecurring && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label>Pattern</Label>
                          <Select
                            value={newReminder.recurringPattern}
                            onValueChange={(value: any) => setNewReminder({ ...newReminder, recurringPattern: value })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Occurrences (max 30)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={newReminder.occurrences}
                            onChange={(e) => setNewReminder({ ...newReminder, occurrences: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label>Recipients</Label>
                    <p className="text-xs text-muted-foreground">Leave empty to remind yourself only.</p>
                    <ScrollArea className="h-36 rounded-xl border bg-background/40 p-2">
                      <div className="space-y-1.5">
                        {users.filter((u) => u.id !== currentUser?.id).map((u) => (
                          <label key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40 cursor-pointer">
                            <Checkbox
                              checked={newReminder.userIds.includes(u.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setNewReminder({ ...newReminder, userIds: [...newReminder.userIds, u.id] });
                                else setNewReminder({ ...newReminder, userIds: newReminder.userIds.filter((id) => id !== u.id) });
                              }}
                            />
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] bg-muted/60">
                                {(u.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground">{u.name}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary/80" />
                      Tip: Use repeat for daily/weekly routines.
                    </div>
                    <Button onClick={handleCreate} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {/* Edit */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit reminder</DialogTitle>
            <DialogDescription>Update this reminder (single item).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input value={newReminder.title} onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={newReminder.description} onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={newReminder.type} onValueChange={(value) => setNewReminder({ ...newReminder, type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Remind at *</Label>
                <Input type="datetime-local" value={newReminder.remindAt} onChange={(e) => setNewReminder({ ...newReminder, remindAt: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleUpdate} disabled={!editingReminder} className="gap-2">
                <Edit className="h-4 w-4" />
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {listContent}
    </PageShell>
  );
}
