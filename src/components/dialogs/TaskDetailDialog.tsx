import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckSquare, Calendar, User, Tag, Flag, MessageSquare, Paperclip,
  Clock, Link as LinkIcon, Send, ArrowUp, ArrowRight, ArrowDown, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AnimatedDialog as Dialog,
  AnimatedDialogContent as DialogContent,
  AnimatedDialogHeader as DialogHeader,
  AnimatedDialogTitle as DialogTitle,
} from "@/components/shared/AnimatedDialog";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface TaskDetailDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void;
  task?: { id: string; title: string; priority: string; assignee: { name: string; initials: string }; dueDate: string; tags: string[]; linkedMeeting?: string; };
}

const priorityIcons: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  high: { icon: ArrowUp, color: "text-destructive", label: "High" },
  medium: { icon: ArrowRight, color: "text-warning", label: "Medium" },
  low: { icon: ArrowDown, color: "text-muted-foreground", label: "Low" },
};

export default function TaskDetailDialog({ open, onOpenChange, task }: TaskDetailDialogProps) {
  const [comment, setComment] = useState("");
  const [taskData, setTaskData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const currentUser = auth.getUser();

  useEffect(() => {
    if (open && task?.id) {
      const loadTask = async () => {
        setLoading(true);
        try {
          const res = await fetch(`${API_BASE}/tasks/${task.id}`);
          if (res.ok) {
            const data = await res.json();
            setTaskData(data);
            setComments(data.comments || []);
            setActivityLog(data.activityLog || []);
          }
        } catch (err) {
          console.error("Failed to load task:", err);
        } finally {
          setLoading(false);
        }
      };
      loadTask();
    }
  }, [open, task?.id]);

  const handleAddComment = async () => {
    if (!comment.trim() || !task?.id || !currentUser) return;
    setSendingComment(true);
    try {
      const res = await fetch(`${API_BASE}/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          text: comment,
        }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setComment("");
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSendingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task?.id || !currentUser) return;
    try {
      await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          userId: currentUser.id,
        }),
      });
      // Reload task data
      const res = await fetch(`${API_BASE}/tasks/${task.id}`);
      if (res.ok) {
        const data = await res.json();
        setTaskData(data);
        setActivityLog(data.activityLog || []);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  if (!task) return null;

  const displayTask = taskData || task;
  const priority = priorityIcons[displayTask.priority] || priorityIcons.medium;
  const PriorityIcon = priority.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg"><CheckSquare className="w-5 h-5 text-primary" />{task.title}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Description</h4>
                <Textarea 
                  value={displayTask.description || ""} 
                  readOnly
                  className="min-h-[100px] text-sm bg-muted/50" 
                />
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Comments</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : comments.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No comments yet</div>
                  ) : (
                    comments.map((c: any, i: number) => (
                      <motion.div 
                        key={c.id} 
                        initial={{ opacity: 0, y: 8 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: i * 0.04 }} 
                        className="flex gap-3"
                      >
                        <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {c.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium text-foreground">{c.user?.name || "Unknown"}</span>
                          </p>
                          <div className="mt-1 p-2.5 rounded-lg bg-muted text-sm text-foreground">{c.text}</div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(c.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Input 
                    value={comment} 
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleAddComment())}
                    placeholder="Add a comment..." 
                    className="text-sm" 
                  />
                  <Button 
                    size="icon" 
                    className="shrink-0" 
                    onClick={handleAddComment}
                    disabled={sendingComment || !comment.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Activity Log</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : activityLog.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No activity yet</div>
                  ) : (
                    activityLog.map((log: any, i: number) => {
                      const actionText = log.action === "created" ? "created this task" :
                        log.action === "status_changed" ? `changed status from ${log.oldValue} to ${log.newValue}` :
                        log.action === "assigned" ? `assigned to ${log.newValue ? "someone" : "unassigned"}` :
                        log.action === "comment_added" ? "added a comment" :
                        log.action;
                      return (
                        <motion.div 
                          key={log.id} 
                          initial={{ opacity: 0, y: 8 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          transition={{ delay: i * 0.04 }} 
                          className="flex gap-3"
                        >
                          <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                              {log.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                      <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-medium text-foreground">{log.user?.name || "System"}</span>{" "}
                              <span className="text-muted-foreground">{actionText}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                      </div>
                    </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-4 border-l pl-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                <Select 
                  value={displayTask.status || "todo"} 
                  onValueChange={handleStatusChange}
                >
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
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Assignee</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                      {displayTask.assignee?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "NA"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">{displayTask.assignee?.name || "Unassigned"}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Priority</p>
                <div className="flex items-center gap-1.5">
                  <PriorityIcon className={cn("w-4 h-4", priority.color)} />
                  <span className="text-sm text-foreground">{priority.label}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Due Date</p>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {displayTask.dueDate ? new Date(displayTask.dueDate).toLocaleDateString() : "No due date"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {(displayTask.tags || []).length > 0 ? (
                    displayTask.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No tags</span>
                  )}
                </div>
              </div>
              {displayTask.meeting && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Linked Meeting</p>
                  <div className="flex items-center gap-1.5 text-sm text-primary">
                    <LinkIcon className="w-4 h-4" />
                    <span>{displayTask.meeting.title}</span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Created</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {displayTask.createdAt ? new Date(displayTask.createdAt).toLocaleDateString() : "Unknown"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
