import { useState } from "react";
import {
  CheckSquare,
  X,
  Calendar,
  User,
  Tag,
  Flag,
  MessageSquare,
  Paperclip,
  Clock,
  Link as LinkIcon,
  Send,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: {
    id: string;
    title: string;
    priority: string;
    assignee: { name: string; initials: string };
    dueDate: string;
    tags: string[];
    linkedMeeting?: string;
  };
}

const activityLog = [
  { id: 1, user: "สมชาย K.", action: "created this task", time: "2 days ago" },
  { id: 2, user: "สมชาย K.", action: "assigned to จิรวัฒน์ W.", time: "2 days ago" },
  { id: 3, user: "จิรวัฒน์ W.", action: "changed status to In Progress", time: "1 day ago" },
  { id: 4, user: "จิรวัฒน์ W.", action: "added comment", time: "5 hours ago", comment: "ตรวจสอบแล้วเป็นปัญหาเรื่อง CORS configuration ครับ กำลังแก้อยู่" },
  { id: 5, user: "อริสา P.", action: "added comment", time: "3 hours ago", comment: "ขอบคุณค่ะ ถ้าต้องการ help ทดสอบบอกได้นะ" },
];

const priorityIcons: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  high: { icon: ArrowUp, color: "text-destructive", label: "High" },
  medium: { icon: ArrowRight, color: "text-warning", label: "Medium" },
  low: { icon: ArrowDown, color: "text-muted-foreground", label: "Low" },
};

export default function TaskDetailDialog({ open, onOpenChange, task }: TaskDetailDialogProps) {
  const [comment, setComment] = useState("");

  if (!task) return null;

  const priority = priorityIcons[task.priority] || priorityIcons.medium;
  const PriorityIcon = priority.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CheckSquare className="w-5 h-5 text-primary" />
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-4">
            {/* Description */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Description</h4>
              <Textarea
                defaultValue="Investigate and fix the file upload bug that occurs on Safari browsers. The issue appears to be related to CORS configuration when uploading files to the storage bucket."
                className="min-h-[100px] text-sm"
              />
            </div>

            <Separator />

            {/* Activity Log */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Activity</h4>
              <div className="space-y-3">
                {activityLog.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium text-foreground">{log.user}</span>{" "}
                        <span className="text-muted-foreground">{log.action}</span>
                      </p>
                      {log.comment && (
                        <div className="mt-1 p-2.5 rounded-lg bg-muted text-sm text-foreground">
                          {log.comment}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add comment */}
              <div className="flex gap-2 mt-4">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="text-sm"
                />
                <Button size="icon" className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 border-l pl-4">
            {/* Status */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
              <Select defaultValue="in_progress">
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Assignee</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    {task.assignee.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground">{task.assignee.name}</span>
              </div>
            </div>

            {/* Priority */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Priority</p>
              <div className="flex items-center gap-1.5">
                <PriorityIcon className={cn("w-4 h-4", priority.color)} />
                <span className="text-sm text-foreground">{priority.label}</span>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Due Date</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{task.dueDate}</span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Linked Meeting */}
            {task.linkedMeeting && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Linked Meeting</p>
                <div className="flex items-center gap-1.5 text-sm text-primary">
                  <LinkIcon className="w-4 h-4" />
                  <span>{task.linkedMeeting}</span>
                </div>
              </div>
            )}

            {/* Created */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Created</p>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Feb 7, 2026</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
