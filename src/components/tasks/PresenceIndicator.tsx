import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Circle } from "lucide-react";

interface PresenceUser {
  userId: string;
  name: string;
  initials?: string;
  avatar?: string;
  isViewing?: boolean;
  isEditing?: boolean;
  taskId?: string;
}

interface PresenceIndicatorProps {
  users: PresenceUser[];
  maxVisible?: number;
  className?: string;
}

export function PresenceIndicator({ users, maxVisible = 5, className }: PresenceIndicatorProps) {
  if (users.length === 0) return null;

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {visibleUsers.map((user, index) => (
        <motion.div
          key={user.userId}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className="relative"
          title={`${user.name}${user.isEditing ? " (editing)" : user.isViewing ? " (viewing)" : ""}`}
        >
          <Avatar className={cn(
            "h-7 w-7 border-2 transition-all",
            user.isEditing && "border-primary ring-2 ring-primary/20",
            user.isViewing && "border-blue-500",
            !user.isEditing && !user.isViewing && "border-border"
          )}>
            <AvatarImage src={user.avatar || undefined} alt={user.name} />
            <AvatarFallback className={cn(
              "text-[10px] font-semibold",
              user.isEditing && "bg-primary/10 text-primary",
              user.isViewing && "bg-blue-500/10 text-blue-600",
              !user.isEditing && !user.isViewing && "bg-muted"
            )}>
              {user.initials || user.name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          {user.isEditing && (
            <motion.div
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          )}
          {user.isViewing && !user.isEditing && (
            <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-blue-500 fill-blue-500 border-2 border-background rounded-full" />
          )}
        </motion.div>
      ))}
      {remainingCount > 0 && (
        <div className="h-7 w-7 rounded-full bg-muted border-2 border-border flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
