import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  User as UserIcon,
  Users,
  Flag,
  Paperclip,
  MessageSquare,
  CheckSquare,
  MoreHorizontal,
  Trash2,
  Edit,
  Copy,
  History,
  Plus,
  Link,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { toast } from "sonner";
import { Task, User, Subtask, TaskComment } from "@/components/tasks/types";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onUpdate: (data: Partial<Task>) => void;
  onDelete: () => void;
  users: User[];
}

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do", color: "bg-slate-500" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { value: "review", label: "Review", color: "bg-amber-500" },
  { value: "done", label: "Done", color: "bg-green-500" },
];

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", color: "text-red-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "medium", label: "Medium", color: "text-yellow-600" },
  { value: "low", label: "Low", color: "text-blue-600" },
];

const RECURRING_PATTERNS = [
  { value: "daily", label: "รายวัน" },
  { value: "weekly", label: "รายสัปดาห์" },
  { value: "monthly", label: "รายเดือน" },
];

export default function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  onUpdate,
  onDelete,
  users,
}: TaskDetailDialogProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [fullTask, setFullTask] = useState<Task | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showAttachments, setShowAttachments] = useState(true);

  // Load full task details when dialog opens
  useEffect(() => {
    if (open && task) {
      loadTaskDetails();
    }
  }, [open, task?.id]);

  const loadTaskDetails = async () => {
    if (!task) return;
    setLoadingDetails(true);
    try {
      const [taskDetails, subtasks, comments, activities, attachments] = await Promise.all([
        apiGet<Task>(`/tasks/${task.id}`).catch(() => task),
        apiGet<any[]>(`/tasks/${task.id}/subtasks`).catch(() => []),
        apiGet<any[]>(`/tasks/${task.id}/comments`).catch(() => []),
        apiGet<any[]>(`/tasks/${task.id}/activities`).catch(() => []),
        apiGet<any[]>(`/tasks/${task.id}/attachments`).catch(() => []),
      ]);

      setFullTask({
        ...taskDetails,
        subtasks: subtasks || [],
        comments: comments || [],
        activities: activities || [],
        attachments: attachments || [],
      });
      setTitle(taskDetails.title);
      setDescription(taskDetails.description || "");
    } catch (err) {
      console.error("Failed to load task details:", err);
      setFullTask(task);
      setTitle(task.title);
      setDescription(task.description || "");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveEdit = () => {
    onUpdate({ title, description });
    setEditing(false);
  };

  const handleStatusChange = (status: string) => {
    onUpdate({ status: status as Task["status"] });
  };

  const handlePriorityChange = (priority: string) => {
    onUpdate({ priority: priority as Task["priority"] });
  };

  const handleDueDateChange = (dueDate: string) => {
    onUpdate({ dueDate: dueDate || null });
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim() || !fullTask) return;
    try {
      const subtask = await apiPost<Subtask>(`/tasks/${fullTask.id}/subtasks`, { title: newSubtask });
      setFullTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: [...(prev.subtasks || []), subtask],
            }
          : null
      );
      setNewSubtask("");
      setShowSubtaskInput(false);
      toast.success("เพิ่มงานย่อยสำเร็จ");
    } catch (err: any) {
      toast.error(err.message || "ไม่สามารถเพิ่มงานย่อยได้");
    }
  };

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    try {
      await apiPatch(`/tasks/subtasks/${subtaskId}`, { isCompleted: !isCompleted });
      setFullTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: prev.subtasks?.map((s) =>
                s.id === subtaskId ? { ...s, isCompleted: !isCompleted } : s
              ),
            }
          : null
      );
    } catch (err: any) {
      toast.error(err.message || "ไม่สามารถอัปเดตงานย่อยได้");
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await apiDelete(`/tasks/subtasks/${subtaskId}`);
      setFullTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: prev.subtasks?.filter((s) => s.id !== subtaskId),
            }
          : null
      );
      toast.success("ลบงานย่อยสำเร็จ");
    } catch (err: any) {
      toast.error(err.message || "ไม่สามารถลบงานย่อยได้");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !fullTask) return;
    try {
      const comment = await apiPost<TaskComment>(`/tasks/${fullTask.id}/comments`, { content: newComment });
      setFullTask((prev) =>
        prev
          ? {
              ...prev,
              comments: [...(prev.comments || []), comment],
            }
          : null
      );
      setNewComment("");
      toast.success("เพิ่มความคิดเห็นสำเร็จ");
    } catch (err: any) {
      toast.error(err.message || "ไม่สามารถเพิ่มความคิดเห็นได้");
    }
  };

  const isOverdue = fullTask?.dueDate && new Date(fullTask.dueDate) < new Date() && fullTask.status !== "done";

  if (!task) return null;

  const currentTask = fullTask || task;
  const completedSubtasks = currentTask.subtasks?.filter((s) => s.isCompleted).length || 0;
  const totalSubtasks = currentTask.subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent shrink-0">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-lg flex-1">
                {editing ? (
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-9 text-lg font-semibold"
                    autoFocus
                  />
                ) : (
                  <span className="line-clamp-1">{currentTask.title}</span>
                )}
              </DialogTitle>
              <div className="flex items-center gap-1 shrink-0">
                {editing ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                      ยกเลิก
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit}>
                      บันทึก
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(currentTask.title)}>
                          <Copy className="w-4 h-4 mr-2" />
                          คัดลอกชื่องาน
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Link className="w-4 h-4 mr-2" />
                          คัดลอกลิงก์
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          ลบงาน
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-5 space-y-4">
              {loadingDetails ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <>
                  {/* Quick Stats */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      สร้างเมื่อ {new Date(currentTask.createdAt).toLocaleDateString("th-TH")}
                    </span>
                    {currentTask.createdBy && (
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5" />
                        โดย {currentTask.createdBy.name}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {editing ? (
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="เพิ่มคำอธิบาย..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    currentTask.description && (
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                        {currentTask.description}
                      </div>
                    )
                  )}

                  {/* Properties */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Status */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">สถานะ</label>
                      <Select value={currentTask.status} onValueChange={handleStatusChange}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-sm", option.color)} />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        ความสำคัญ
                      </label>
                      <Select value={currentTask.priority} onValueChange={handlePriorityChange}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <span className={option.color}>{option.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        กำหนดส่ง
                      </label>
                      <Input
                        type="date"
                        value={currentTask.dueDate ? new Date(currentTask.dueDate).toISOString().split("T")[0] : ""}
                        onChange={(e) => handleDueDateChange(e.target.value)}
                        className={cn("h-9", isOverdue && "border-red-500")}
                      />
                      {isOverdue && (
                        <p className="text-[10px] text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          เลยกำหนดส่งแล้ว
                        </p>
                      )}
                    </div>

                    {/* Team */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        ทีม
                      </label>
                      <div className="h-9 px-3 py-2 rounded-md border border-input bg-muted/50 text-sm truncate">
                        {currentTask.team?.name || "-"}
                      </div>
                    </div>
                  </div>

                  {/* Assignees */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      ผู้รับผิดชอบ
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {currentTask.assignees && currentTask.assignees.length > 0 ? (
                        currentTask.assignees.map((assignee) => (
                          <Badge key={assignee.id} variant="secondary" className="gap-1.5">
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={assignee.avatar} />
                              <AvatarFallback className="text-[8px]">
                                {assignee.name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {assignee.name}
                          </Badge>
                        ))
                      ) : currentTask.assignee ? (
                        <Badge variant="secondary" className="gap-1.5">
                          <Avatar className="w-4 h-4">
                            <AvatarImage src={currentTask.assignee.avatar} />
                            <AvatarFallback className="text-[8px]">
                              {currentTask.assignee.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {currentTask.assignee.name}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                      <Button variant="outline" size="sm" className="h-6 text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        เพิ่ม
                      </Button>
                    </div>
                  </div>

                  {/* Tags */}
                  {currentTask.tags && currentTask.tags.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">แท็ก</label>
                      <div className="flex flex-wrap gap-1.5">
                        {currentTask.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-primary/5">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recurring */}
                  {currentTask.isRecurring && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 text-sm">
                        <RefreshCw className="w-4 h-4 text-primary" />
                        <span>
                          งานที่เกิดซ้ำ: {RECURRING_PATTERNS.find((p) => p.value === currentTask.recurringPattern)?.label || "-"}
                        </span>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Subtasks */}
                  <Collapsible open={showSubtasks} onOpenChange={setShowSubtasks}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/30 rounded-md px-2 -mx-2">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">งานย่อย</span>
                        {totalSubtasks > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {completedSubtasks}/{totalSubtasks}
                          </Badge>
                        )}
                      </div>
                      {totalSubtasks > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                          <ChevronDown className={cn("w-4 h-4 transition-transform", showSubtasks && "rotate-180")} />
                        </div>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-2">
                      {currentTask.subtasks?.map((subtask) => (
                        <div
                          key={subtask.id}
                          className="flex items-center gap-2 group py-1.5 px-2 rounded-md hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={subtask.isCompleted}
                            onCheckedChange={() => handleToggleSubtask(subtask.id, subtask.isCompleted)}
                          />
                          <span
                            className={cn(
                              "flex-1 text-sm",
                              subtask.isCompleted && "line-through text-muted-foreground"
                            )}
                          >
                            {subtask.title}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteSubtask(subtask.id)}
                          >
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      {showSubtaskInput ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            placeholder="ชื่องานย่อย..."
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Button size="sm" onClick={handleAddSubtask}>
                            เพิ่ม
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowSubtaskInput(false)}>
                            ยกเลิก
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-muted-foreground"
                          onClick={() => setShowSubtaskInput(true)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          เพิ่มงานย่อย
                        </Button>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {/* Comments */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">ความคิดเห็น</span>
                      {currentTask.comments && currentTask.comments.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {currentTask.comments.length}
                        </Badge>
                      )}
                    </div>

                    {/* Comment input */}
                    <div className="flex gap-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="เขียนความคิดเห็น..."
                        className="min-h-[60px] text-sm"
                      />
                      <Button size="sm" className="self-end" onClick={handleAddComment} disabled={!newComment.trim()}>
                        ส่ง
                      </Button>
                    </div>

                    {/* Comments list */}
                    {currentTask.comments && currentTask.comments.length > 0 && (
                      <div className="space-y-3 mt-3">
                        {currentTask.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={comment.user?.avatar} />
                              <AvatarFallback className="text-[8px]">
                                {comment.user?.name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-muted/30 p-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{comment.user?.name}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(comment.createdAt).toLocaleDateString("th-TH", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Activity Log */}
                  <Collapsible open={showActivity} onOpenChange={setShowActivity}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/30 rounded-md px-2 -mx-2">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">ประวัติการเปลี่ยนแปลง</span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", showActivity && "rotate-180")} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <div className="space-y-2 text-xs text-muted-foreground max-h-48 overflow-y-auto">
                        {currentTask.activities?.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-2 py-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                            <div>
                              <span className="font-medium text-foreground">{activity.user?.name}</span>
                              <span> {activity.action}</span>
                              {activity.field && (
                                <span className="text-primary"> {activity.field}</span>
                              )}
                              {activity.oldValue && activity.newValue && (
                                <span> จาก "{activity.oldValue}" เป็น "{activity.newValue}"</span>
                              )}
                              <span className="text-[10px] ml-1">
                                • {new Date(activity.createdAt).toLocaleDateString("th-TH", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                        {(!currentTask.activities || currentTask.activities.length === 0) && (
                          <p className="text-center py-4">ยังไม่มีประวัติการเปลี่ยนแปลง</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบงาน</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            คุณแน่ใจหรือไม่ที่จะลบงาน "{currentTask.title}"? การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete();
              }}
            >
              ลบงาน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
