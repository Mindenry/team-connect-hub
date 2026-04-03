import { motion } from "framer-motion";
import { Folder, Clock, Share2, Download, LinkIcon, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatBytes, formatDate, iconForMime, getFileColor } from "./utils";
import type { DriveEntry } from "./types";

interface DriveListProps {
  entries: DriveEntry[];
  onOpenEntry: (entry: DriveEntry) => void;
  onManageAccess: (entry: DriveEntry) => void;
  onDownload: (url?: string, filename?: string) => void;
  onCopyLink: (url?: string) => void;
  onOpenExternal: (url?: string) => void;
}

export function DriveList({
  entries,
  onOpenEntry,
  onManageAccess,
  onDownload,
  onCopyLink,
  onOpenExternal,
}: DriveListProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const version = entry.latestVersion;
        const Icon = entry.isFolder ? Folder : iconForMime(version?.mimeType, entry.name);
        const fileColor = entry.isFolder ? "text-primary" : getFileColor(version?.mimeType, entry.name);

        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Card
              className={cn(
                "group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-300 cursor-pointer",
                "hover:shadow-lg hover:shadow-black/8",
                "ring-0 hover:ring-1 hover:ring-primary/10"
              )}
              onClick={() => onOpenEntry(entry)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm",
                      entry.isFolder
                        ? "bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10"
                        : "bg-gradient-to-br from-muted/60 to-muted/40 group-hover:from-muted/70 group-hover:to-muted/50",
                      "group-hover:scale-110 group-hover:shadow-md"
                    )}
                  >
                    <Icon className={cn("w-6 h-6 transition-transform duration-300", fileColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors duration-200">
                        {entry.name}
                      </h3>
                      {!entry.isFolder && version && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-muted/80">
                          v{version.version}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                  </div>
                  {!entry.isFolder && version && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              onManageAccess(entry);
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>จัดการสิทธิ์</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownload(version.url, entry.name);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>ดาวน์โหลด</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopyLink(version.url);
                            }}
                          >
                            <LinkIcon className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>คัดลอกลิงก์</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenExternal(version.url);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>เปิดในแท็บใหม่</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {entry.isFolder && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              onManageAccess(entry);
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>จัดการสิทธิ์</TooltipContent>
                      </Tooltip>
                    </div>
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
