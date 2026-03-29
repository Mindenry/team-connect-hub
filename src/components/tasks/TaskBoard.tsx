import { useState, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Plus, MoreHorizontal, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Task } from "./types";
import TaskCard from "./TaskCard";

interface TaskBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, data: Partial<Task>) => void;
  onTaskCreate: () => void;
}

const COLUMNS = [
  { id: "todo", label: "To Do", color: "bg-slate-500", icon: "📋" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-500", icon: "🔄" },
  { id: "review", label: "Review", color: "bg-amber-500", icon: "👀" },
  { id: "done", label: "Done", color: "bg-green-500", icon: "✅" },
];

export default function TaskBoard({
  tasks,
  onTaskClick,
  onTaskUpdate,
  onTaskCreate,
}: TaskBoardProps) {
  // Group tasks by status
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort by position within each column
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [tasks]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as Task["status"];
    const task = tasks.find((t) => t.id === draggableId);

    if (!task) return;

    // Optimistic update
    onTaskUpdate(task.id, {
      status: newStatus,
      position: destination.index,
    });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          const columnTasks = tasksByColumn[column.id] || [];
          
          return (
            <div
              key={column.id}
              className="flex flex-col min-w-[280px] max-w-[320px] flex-1"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-sm", column.color)} />
                  <span className="font-medium text-sm text-foreground">
                    {column.label}
                  </span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {columnTasks.length}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => onTaskCreate()}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Column Content */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 rounded-xl border-2 border-dashed p-2 transition-colors min-h-[200px]",
                      snapshot.isDraggingOver
                        ? "border-primary/40 bg-primary/5"
                        : "border-transparent bg-muted/20"
                    )}
                  >
                    <AnimatePresence mode="popLayout">
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <motion.div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className={cn(
                                "mb-2 last:mb-0",
                                snapshot.isDragging && "z-50"
                              )}
                            >
                              <TaskCard
                                task={task}
                                onClick={() => onTaskClick(task)}
                                isDragging={snapshot.isDragging}
                              />
                            </motion.div>
                          )}
                        </Draggable>
                      ))}
                    </AnimatePresence>
                    {provided.placeholder}

                    {/* Add task button */}
                    <Button
                      variant="ghost"
                      className="w-full h-9 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/60 hover:border-border mt-1"
                      onClick={() => onTaskCreate()}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      เพิ่มงาน
                    </Button>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
