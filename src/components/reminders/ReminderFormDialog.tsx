import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Repeat, Plus, Sparkles } from "lucide-react";
import type { NewReminderForm, RecurringPattern } from "./types";
import { getInitials } from "./utils";

interface ReminderFormDialogProps {
  newReminder: NewReminderForm;
  users: any[];
  currentUserId?: string;
  onUpdate: (reminder: Partial<NewReminderForm>) => void;
  onSubmit: () => void;
  submitLabel?: string;
}

export function ReminderFormDialog({ newReminder, users, currentUserId, onUpdate, onSubmit, submitLabel = "Create" }: ReminderFormDialogProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" value={newReminder.title} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="e.g. Prep weekly standup" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={newReminder.description} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="Optional context…" rows={3} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Type</Label>
          <Select value={newReminder.type} onValueChange={(value) => onUpdate({ type: value })}>
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
          <Input type="datetime-local" value={newReminder.remindAt} onChange={(e) => onUpdate({ remindAt: e.target.value })} />
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground inline-flex items-center gap-2">
              <Repeat className="h-4 w-4 text-foreground/70" />
              Repeat (creates multiple reminders)
            </p>
            <p className="text-xs text-muted-foreground">We'll generate the next occurrences automatically.</p>
          </div>
          <Switch checked={newReminder.isRecurring} onCheckedChange={(checked) => onUpdate({ isRecurring: checked })} />
        </div>
        {newReminder.isRecurring && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Pattern</Label>
              <Select value={newReminder.recurringPattern} onValueChange={(value) => onUpdate({ recurringPattern: value as RecurringPattern })}>
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
              <Input type="number" min={1} max={30} value={newReminder.occurrences} onChange={(e) => onUpdate({ occurrences: Number(e.target.value) })} />
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Recipients</Label>
        <p className="text-xs text-muted-foreground">Leave empty to remind yourself only.</p>
        <ScrollArea className="h-36 rounded-xl border bg-background/40 p-2">
          <div className="space-y-1.5">
            {users.filter((u) => u.id !== currentUserId).map((u) => (
              <label key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40 cursor-pointer">
                <Checkbox
                  checked={newReminder.userIds.includes(u.id)}
                  onCheckedChange={(checked) => {
                    if (checked) onUpdate({ userIds: [...newReminder.userIds, u.id] });
                    else onUpdate({ userIds: newReminder.userIds.filter((id) => id !== u.id) });
                  }}
                />
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-muted/60">{getInitials(u.name || "?")}</AvatarFallback>
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
        <Button onClick={onSubmit} className="gap-2">
          <Plus className="h-4 w-4" />
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
