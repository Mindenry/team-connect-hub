import { motion } from "framer-motion";
import { Folder, Clock, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatBytes, formatDate, iconForMime, getFileColor } from "./utils";
import type { DriveEntry } from "./types";

interface DriveGridProps {
  entries: DriveEntry[];
  onOpenEntry: (entry: DriveEntry) => void;
  onManageAccess: (entry: DriveEntry) => void;
}

export function DriveGrid({ entries, onOpenEntry, onManageAccess }: DriveGridProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {entries.map((entry) => {
        const version = entry.latestVersion;
        const Icon = entry.isFolder ? Folder : iconForMime(version?.mimeType, entry.name);
        const fileColor = entry.isFolder ? "text-primary" : getFileColor(version?.mimeType, entry.name);

        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={cn(
                "group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-300 cursor-pointer",
                "hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1.5",
                "ring-0 hover:ring-1 hover:ring-primary/20"
              )}
              onClick={() => onOpenEntry(entry)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm shrink-0",
                      entry.isFolder
                        ? "bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10"
                        : "bg-gradient-to-br from-muted/60 to-muted/40 group-hover:from-muted/70 group-hover:to-muted/50",
                      "group-hover:scale-110 group-hover:shadow-md"
                    )}
                  >
                    <Icon className={cn("w-7 h-7 transition-transform duration-300", fileColor)} />
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!entry.isFolder && version && (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 bg-muted/80">
                        v{version.version}
                      </Badge>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 border-border/60 hover:bg-muted/50"
                          onClick={(e) => {
                            e.stopPropagation();
                            onManageAccess(entry);
                          }}
                        >
                          <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>จัดการสิทธิ์</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors duration-200">
                  {entry.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2.5">
                  {entry.isFolder ? (
                    <span className="flex items-center gap-1">
                      <Folder className="w-3 h-3" />
                      <span>โฟลเดอร์</span>
                    </span>
                  ) : (
                    <>
                      <span>{formatBytes(version?.size)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(entry.updatedAt)}
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
