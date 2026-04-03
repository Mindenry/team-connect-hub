import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckCircle2, Clock, Search, CalendarDays, List, BellOff, MoreVertical, Edit, Trash2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { auth } from "@/lib/auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { PageHero, PageShell } from "@/components/shared/PageShell";
import { ReminderItemRow, ReminderFormDialog, type Reminder, type NewReminderForm, isOverdue, formatWhen, computeRecurringDates } from "@/components/reminders";

const emptyForm: NewReminderForm = { title: "", description: "", type: "custom", remindAt: "", isRecurring: false, recurringPattern: "none", occurrences: 10, userIds: [] };

export default function RemindersPage() {
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
  const [newReminder, setNewReminder] = useState<NewReminderForm>(emptyForm);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadUsers();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter === "pending") params.append("isSent", "false");
      else if (filter === "sent") params.append("isSent", "true");
      if (currentUser?.id) params.append("userId", currentUser.id);
      const res = await apiGet<Reminder[]>(`/reminders?${params.toString()}`).catch(() => []);
      setReminders(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error("Failed to load reminders:", err);
      setReminders([]);
      if (err.message && !err.message.includes("401")) {
        toast({ title: "Error", description: err.message || "Failed to load reminders", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await apiGet<any[]>("/users").catch(() => []);
      setUsers(Array.isArray(res) ? res : []);
    } catch {
      setUsers([]);
    }
  };

  const handleCreate = async () => {
    if (!newReminder.title.trim() || !newReminder.remindAt) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    try {
      const userIds = newReminder.userIds.length > 0 ? newReminder.userIds : [currentUser?.id];
      const base = new Date(newReminder.remindAt);
      if (newReminder.isRecurring && newReminder.recurringPattern !== "none") {
        const count = Math.max(1, Math.min(30, Number(newReminder.occurrences) || 10));
        const dates = computeRecurringDates(base, newReminder.recurringPattern, count);
        for (const d of dates) {
          await apiPost("/reminders", { title: newReminder.title, description: newReminder.description, type: newReminder.type, remindAt: d.toISOString(), createdBy: currentUser?.id, userIds });
        }
      } else {
        await apiPost("/reminders", { title: newReminder.title, description: newReminder.description, type: newReminder.type, remindAt: base.toISOString(), createdBy: currentUser?.id, userIds });
      }
      toast({ title: "Success", description: newReminder.isRecurring ? "Recurring reminders created" : "Reminder created successfully" });
      setShowCreateDialog(false);
      setNewReminder(emptyForm);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create reminder", variant: "destructive" });
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setNewReminder({ title: reminder.title, description: reminder.description || "", type: reminder.type, remindAt: new Date(reminder.remindAt).toISOString().slice(0, 16), isRecurring: false, recurringPattern: "none", occurrences: 10, userIds: reminder.recipients?.map((r) => r.userId) || [] });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!editingReminder || !newReminder.title.trim() || !newReminder.remindAt) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    try {
      await apiPatch(`/reminders/${editingReminder.id}`, { ...newReminder, userId: currentUser?.id });
      toast({ title: "Success", description: "Reminder updated successfully" });
      setShowEditDialog(false);
      setEditingReminder(null);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update reminder", variant: "destructive" });
    }
  };

  const handleMarkAsRead = async (reminderId: string) => {
    try {
      await apiPatch(`/reminders/${reminderId}/read`, { userId: currentUser?.id });
      toast({ title: "Success", description: "Reminder marked as read" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to mark reminder as read", variant: "destructive" });
    }
  };

  const handleDelete = async (reminderId: string) => {
    try {
      await apiDelete(`/reminders/${reminderId}`, { body: { userId: currentUser?.id } });
      toast({ title: "Success", description: "Reminder deleted" });
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete reminder", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReminders.size === 0) return;
    try {
      await Promise.all(Array.from(selectedReminders).map((id) => apiDelete(`/reminders/${id}`, { body: { userId: currentUser?.id } })));
      toast({ title: "Success", description: `${selectedReminders.size} reminder(s) deleted` });
      setSelectedReminders(new Set());
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete reminders", variant: "destructive" });
    }
  };

  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || r.title.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
      const matchesFilter = filter === "all" || (filter === "pending" && !r.isSent) || (filter === "sent" && r.isSent) || (filter === "overdue" && isOverdue(r.remindAt, r.isSent));
      return matchesSearch && matchesFilter;
    }).sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
  }, [reminders, searchQuery, filter]);

  const pendingCount = reminders.filter((r) => !r.isSent).length;
  const overdueCount = reminders.filter((r) => isOverdue(r.remindAt, r.isSent)).length;

  const remindersForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const y = selectedDate.getFullYear(), m = selectedDate.getMonth(), d = selectedDate.getDate();
    return filteredReminders.filter((r) => { const dt = new Date(r.remindAt); return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d; });
  }, [filteredReminders, selectedDate]);

  const toggleAllVisible = (checked: boolean) => {
    if (!checked) setSelectedReminders(new Set());
    else setSelectedReminders(new Set(filteredReminders.map((r) => r.id)));
  };

  return (
    <PageShell>
      <PageHero
        title={<span className="inline-flex items-center gap-2"><span className="gradient-text">Reminders</span></span>}
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
              <Input placeholder="Search reminders…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 w-72 pl-9 bg-background/40" />
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary shadow-sm gap-2"><Plus className="h-4 w-4" /> New reminder</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Create reminder</DialogTitle><DialogDescription>Send a timely nudge to yourself or your team.</DialogDescription></DialogHeader>
                <ReminderFormDialog newReminder={newReminder} users={users} currentUserId={currentUser?.id} onUpdate={(u) => setNewReminder({ ...newReminder, ...u })} onSubmit={handleCreate} />
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit reminder</DialogTitle><DialogDescription>Update this reminder (single item).</DialogDescription></DialogHeader>
          <ReminderFormDialog newReminder={newReminder} users={users} currentUserId={currentUser?.id} onUpdate={(u) => setNewReminder({ ...newReminder, ...u })} onSubmit={handleUpdate} submitLabel="Update" />
        </DialogContent>
      </Dialog>

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
                <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="h-7 px-2"><List className="h-4 w-4" /></Button>
                <Button variant={viewMode === "calendar" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("calendar")} className="h-7 px-2"><CalendarDays className="h-4 w-4" /></Button>
              </div>
              {viewMode === "list" && filteredReminders.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border bg-background/40 px-2 py-1.5">
                  <Checkbox checked={selectedReminders.size > 0 && selectedReminders.size === filteredReminders.length} onCheckedChange={(v) => toggleAllVisible(!!v)} />
                  <span className="text-xs text-muted-foreground">{selectedReminders.size > 0 ? `${selectedReminders.size} selected` : "Select"}</span>
                  {selectedReminders.size > 0 && <Button variant="destructive" size="sm" className="h-7" onClick={handleBulkDelete}><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>}
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
                  <div className="flex-1 space-y-2"><Skeleton className="h-4 w-64" /><Skeleton className="h-3 w-40" /></div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="rounded-xl border bg-background/40 p-6 text-center">
              <BellOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm text-foreground">No reminders found.</p>
              <p className="mt-1 text-xs text-muted-foreground">Create one to keep your day on track.</p>
              <div className="mt-4"><Button variant="outline" onClick={() => setShowCreateDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> New reminder</Button></div>
            </div>
          ) : viewMode === "calendar" ? (
            <div className="grid gap-3 lg:grid-cols-12">
              <Card className="lg:col-span-4 border bg-background/40">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Pick a date</CardTitle></CardHeader>
                <CardContent className="pt-0"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} /></CardContent>
              </Card>
              <Card className="lg:col-span-8 border bg-background/40">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{selectedDate ? selectedDate.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }) : "Reminders"}</CardTitle></CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {remindersForSelectedDate.map((reminder, idx) => (
                    <ReminderItemRow key={reminder.id} reminder={reminder} index={idx} currentUserId={currentUser?.id} isSelected={false} onSelect={() => {}} onMarkRead={handleMarkAsRead} onEdit={handleEdit} onDelete={handleDelete} />
                  ))}
                  {remindersForSelectedDate.length === 0 && (
                    <div className="rounded-xl border bg-card/40 p-6 text-center">
                      <p className="text-sm text-foreground">No reminders on this day.</p>
                      <p className="mt-1 text-xs text-muted-foreground">Pick another date, or create one.</p>
                      <div className="mt-4"><Button variant="outline" onClick={() => setShowCreateDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> New reminder</Button></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredReminders.map((reminder, idx) => (
                  <ReminderItemRow key={reminder.id} reminder={reminder} index={idx} currentUserId={currentUser?.id} isSelected={selectedReminders.has(reminder.id)} onSelect={(id, checked) => { const next = new Set(selectedReminders); if (checked) next.add(id); else next.delete(id); setSelectedReminders(next); }} onMarkRead={handleMarkAsRead} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
