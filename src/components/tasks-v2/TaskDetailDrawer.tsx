import TaskDetailDialog from "@/components/dialogs/TaskDetailDialog";
import type { TaskCardData } from "./TaskCard";

interface TaskDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskCardData | null;
  onTaskDeleted?: (taskId: string) => void;
}

export default function TaskDetailDrawer({ open, onOpenChange, task, onTaskDeleted }: TaskDetailDrawerProps) {

  // Map TaskCardData to the format expected by TaskDetailDialog
  const dialogTask = task
    ? {
        id: task.id,
        title: task.title,
        priority: task.priority,
        assignee: task.assignee
          ? {
              name: task.assignee.name,
              initials:
                task.assignee.initials ||
                task.assignee.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() ||
                "?",
              id: task.assignee.id,
              avatar: task.assignee.avatar,
            }
          : undefined,
        dueDate: task.dueDate,
        tags: task.tags || [],
        sprint: task.sprint,
        epic: task.epic,
      }
    : undefined;

  // ใช้ TaskDetailDialog โดยตรงให้แสดงเป็น modal เพียงชั้นเดียว (ไม่ซ้อน Sheet ด้านหลัง)
  // AnimatedDialog ภายในจะจัดการ fullscreen/center เองตามขนาดหน้าจอ
  return (
    <TaskDetailDialog
      open={open}
      onOpenChange={onOpenChange}
      task={dialogTask}
      onDeleted={onTaskDeleted}
    />
  );
}
