import { motion } from "framer-motion";
import { Check, ExternalLink, Trash2, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "./types";
import { typeIcons, typeColors } from "./types";
import { formatTime } from "./utils";

interface NotificationItemRowProps {
  notification: NotificationItem;
  index: number;
  onMarkRead: (n: NotificationItem) => void;
  onDelete: (n: NotificationItem) => void;
  onClick: (n: NotificationItem) => void;
  navigate: (link: string) => void;
}

export function NotificationItemRow({ notification: n, index, onMarkRead, onDelete, onClick, navigate }: NotificationItemRowProps) {
  const Icon = typeIcons[n.type] || typeIcons.default;
  const isGrouped = n.type === 'grouped' && (n as any).notifications;

  return (
    <motion.div
      key={n.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ delay: 0.02 + index * 0.01 }}
      className={cn(
        "group flex items-start gap-3 rounded-xl border p-3 transition-colors cursor-pointer",
        n.read ? "bg-background/40 hover:bg-muted/30" : "bg-primary/5 hover:bg-primary/10 border-primary/20",
        isGrouped && "border-2 border-primary/30"
      )}
      onClick={() => onClick(n)}
    >
      <div className={cn("mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl shrink-0 relative", typeColors[n.type] || typeColors.default)}>
        <Icon className="h-5 w-5" />
        {isGrouped && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
            {(n as any).count}
          </Badge>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-sm text-foreground truncate", !n.read && "font-semibold")}>
              {n.title}
              {isGrouped && <span className="ml-2 text-xs text-muted-foreground">({(n as any).count} notifications)</span>}
            </p>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{n.message}</p>
            {isGrouped && (n as any).notifications && (
              <div className="mt-2 space-y-1">
                {(n as any).notifications.slice(0, 3).map((subNotif: any, idx: number) => (
                  <p key={idx} className="text-[11px] text-muted-foreground/80 pl-2 border-l-2 border-muted">• {subNotif.title}</p>
                ))}
                {(n as any).notifications.length > 3 && (
                  <p className="text-[11px] text-muted-foreground/60 pl-2">+ {(n as any).notifications.length - 3} more</p>
                )}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">{formatTime(n.createdAt)}</span>
              <Badge variant="secondary" className="h-5 text-[10px]">{n.type.replace(/_/g, " ")}</Badge>
              {(n as any).priority && (
                <Badge variant="outline" className={cn("h-5 text-[10px]", (n as any).priority === 'urgent' && "bg-destructive/10 text-destructive border-destructive/20", (n as any).priority === 'high' && "bg-warning/10 text-warning border-warning/20")}>
                  {(n as any).priority}
                </Badge>
              )}
              {!n.read && <Badge className="h-5 text-[10px] bg-primary/10 text-primary border border-primary/20">new</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!n.read && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMarkRead(n); }}>
                    <Check className="h-4 w-4 mr-2" /> Mark as read
                  </DropdownMenuItem>
                )}
                {n.link && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if (n.link!.startsWith("/")) navigate(n.link!); else window.open(n.link, "_blank"); }}>
                    <ExternalLink className="h-4 w-4 mr-2" /> Open
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(n); }}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
