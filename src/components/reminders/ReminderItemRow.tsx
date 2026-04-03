import { motion } from "framer-motion";
import { Clock, CheckCircle2, Edit, Trash2, MoreVertical, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Reminder } from "./types";
import { formatWhen, isOverdue } from "./utils";

interface ReminderItemRowProps {
  reminder: Reminder;
  index: number;
  currentUserId?: string;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onMarkRead: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
}

export function ReminderItemRow({ reminder, index, currentUserId, isSelected, onSelect, onMarkRead, onEdit, onDelete }: ReminderItemRowProps) {
  const userRecipient = reminder.recipients?.find((r) => r.userId === currentUserId);
  const isRead = userRecipient?.isRead || false;
  const overdue = isOverdue(reminder.remindAt, reminder.isSent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ delay: 0.02 + index * 0.01 }}
      className={cn(
        "group flex items-start gap-3 rounded-xl border bg-background/40 p-3 hover:bg-muted/30 transition-colors",
        overdue && "border-destructive/40",
        isSelected && "ring-2 ring-primary/40"
      )}
    >
      <Checkbox checked={isSelected} onCheckedChange={(checked) => onSelect(reminder.id, !!checked)} className="mt-1" />
      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 shrink-0">
        <Clock className="h-4 w-4 text-foreground/70" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("text-sm font-medium text-foreground truncate", isRead && "line-through text-muted-foreground")}>{reminder.title}</p>
          {overdue && <Badge variant="destructive" className="h-5 text-[10px]">Overdue</Badge>}
          {reminder.isSent && <Badge variant="outline" className="h-5 text-[10px]">Sent</Badge>}
          <Badge variant="secondary" className="h-5 text-[10px]">{reminder.type}</Badge>
        </div>
        {reminder.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{reminder.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatWhen(reminder.remindAt)}</span>
          {reminder.creator?.name && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{reminder.creator.name}</span>}
          {reminder.recipients?.length ? <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{reminder.recipients.length} recipient{reminder.recipients.length === 1 ? "" : "s"}</span> : null}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!isRead && (
          <Button variant="outline" size="sm" className="h-8" onClick={() => onMarkRead(reminder.id)}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Read
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-80 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(reminder)}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(reminder.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
