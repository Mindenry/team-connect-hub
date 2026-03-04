import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckSquare, User, ArrowRight, Calendar, Flag, MessageSquare, 
  Clock, FileText, Target, Zap, X, Activity
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSocket } from "@/lib/websocket";
import { apiGet } from "@/lib/api";

interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'comment_added' | 'assigned' | 'status_changed';
  user: { id: string; name: string; initials?: string; avatar?: string };
  task?: { id: string; title: string };
  message: string;
  timestamp: Date;
  details?: any;
}

interface TeamActivityFeedProps {
  teamId?: string;
  maxItems?: number;
  className?: string;
}

export function TeamActivityFeed({ teamId, maxItems = 10, className }: TeamActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);
        params.append('limit', maxItems.toString());
        
        const data = await apiGet<any[]>(`/tasks/activity?${params}`).catch(() => []);
        
        // Ensure data is an array
        if (!Array.isArray(data)) {
          setActivities([]);
          return;
        }
        
        const mapped = data.map((item: any) => ({
          id: item.id,
          type: item.action || 'task_updated',
          user: {
            id: item.user?.id || 'system',
            name: item.user?.name || 'System',
            initials: item.user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
            avatar: item.user?.avatar,
          },
          task: item.task ? {
            id: item.task.id,
            title: item.task.title,
          } : undefined,
          message: formatActivityMessage(item),
          timestamp: new Date(item.createdAt || Date.now()),
          details: item,
        }));
        setActivities(mapped);
      } catch (err) {
        console.error('Failed to load activities:', err);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();

    const socket = getSocket();
    const handleTaskCreated = (task: any) => {
      setActivities((prev) => [{
        id: `activity-${Date.now()}`,
        type: 'task_created' as const,
        user: {
          id: task.assignee?.id || 'system',
          name: task.assignee?.name || 'Someone',
          initials: task.assignee?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        },
        task: { id: task.id, title: task.title },
        message: `created task "${task.title}"`,
        timestamp: new Date(),
      }, ...prev].slice(0, maxItems));
    };

    const handleTaskUpdated = (task: any) => {
      setActivities((prev) => [{
        id: `activity-${Date.now()}`,
        type: 'task_updated' as const,
        user: {
          id: task.assignee?.id || 'system',
          name: task.assignee?.name || 'Someone',
          initials: task.assignee?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        },
        task: { id: task.id, title: task.title },
        message: `updated task "${task.title}"`,
        timestamp: new Date(),
      }, ...prev].slice(0, maxItems));
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
    };
  }, [teamId, maxItems]);

  const formatActivityMessage = (item: any): string => {
    const userName = item.user?.name || 'Someone';
    const taskTitle = item.task?.title || 'a task';
    
    switch (item.action) {
      case 'created':
        return `created task "${taskTitle}"`;
      case 'status_changed':
        return `changed status of "${taskTitle}" from ${item.oldValue} to ${item.newValue}`;
      case 'assigned':
        return `assigned "${taskTitle}"`;
      case 'comment_added':
        return `commented on "${taskTitle}"`;
      case 'priority_changed':
        return `changed priority of "${taskTitle}" to ${item.newValue}`;
      default:
        return `updated "${taskTitle}"`;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_created':
        return CheckSquare;
      case 'task_completed':
        return CheckSquare;
      case 'comment_added':
        return MessageSquare;
      case 'assigned':
        return User;
      case 'status_changed':
        return ArrowRight;
      default:
        return Activity;
    }
  };

  const visibleActivities = isExpanded ? activities : activities.slice(0, 5);

  if (loading && activities.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Team Activity</h3>
          </div>
          <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Team Activity</h3>
            <Badge variant="secondary" className="text-[10px]">{activities.length}</Badge>
          </div>
          {activities.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </Button>
          )}
        </div>
        <div className="space-y-3">
          <AnimatePresence>
            {visibleActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const timeAgo = getTimeAgo(activity.timestamp);
              
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={activity.user.avatar} alt={activity.user.name || "Avatar"} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                      {activity.user.initials || activity.user.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-foreground">
                        <span className="font-medium">{activity.user.name}</span>{" "}
                        <span className="text-muted-foreground">{activity.message}</span>
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
