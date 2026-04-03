import { motion } from "framer-motion";
import { FileSearch, RefreshCw, Download, Zap, UserCircle, Clock, Filter, Shield, Calendar, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getActionColor, getEntityIcon, getEntityLabel, formatAuditDate, exportLogsToCSV } from "./utils";
import type { AuditLog, AuditFilters } from "./types";

interface AuditLogsPanelProps {
  logs: AuditLog[];
  filters: AuditFilters;
  loading: boolean;
  error: string | null;
  stats: { total: number; uniqueUsers: number; todayCount: number };
  onLoad: () => void;
  onFilterChange: (filters: AuditFilters) => void;
}

export function AuditLogsPanel({
  logs,
  filters,
  loading,
  error,
  stats,
  onLoad,
  onFilterChange,
}: AuditLogsPanelProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full space-y-5">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-primary" />
              Audit Log
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Track system activities, events, and user actions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 border-border/60" onClick={onLoad}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Button variant="outline" size="sm" className="h-9 border-border/60" onClick={() => exportLogsToCSV(logs)}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm py-3 px-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">Total Events</span>
              <Zap className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-xl font-bold">{stats.total.toLocaleString("th-TH")}</div>
          </Card>
          <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm py-3 px-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">Active Users</span>
              <UserCircle className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold">{stats.uniqueUsers.toLocaleString("th-TH")}</div>
          </Card>
          <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm py-3 px-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">Today's Events</span>
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl font-bold">{stats.todayCount.toLocaleString("th-TH")}</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-visible">
          <CardHeader className="py-3 px-4 pb-2 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search details..."
                    value={filters.search}
                    onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                    className="pl-8 h-8 text-xs bg-background/50"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Entity</Label>
                <Select
                  value={filters.entity || "all"}
                  onValueChange={(val) => onFilterChange({ ...filters, entity: val === "all" ? "" : val })}
                >
                  <SelectTrigger className="h-8 text-xs bg-background/50">
                    <SelectValue placeholder="All entities" />
                  </SelectTrigger>
                  <SelectContent side="bottom" className="max-h-64">
                    <SelectItem value="all">All entities</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="file">File/Doc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Action</Label>
                <Select
                  value={filters.action || "all"}
                  onValueChange={(val) => onFilterChange({ ...filters, action: val === "all" ? "" : val })}
                >
                  <SelectTrigger className="h-8 text-xs bg-background/50">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent side="bottom" className="max-h-64">
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="upload">Upload</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="logout">Logout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">User ID</Label>
                <Input
                  placeholder="Filter by ID"
                  value={filters.userId}
                  onChange={(e) => onFilterChange({ ...filters, userId: e.target.value })}
                  className="h-8 text-xs bg-background/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm flex flex-col min-h-0">
          <CardHeader className="py-3 px-4 border-b border-border/30">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Activity Logs ({logs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center text-sm text-destructive">{error}</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No audit logs match criteria</div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="divide-y divide-border/40">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-background border border-border/50 shadow-sm flex items-center justify-center shrink-0 text-sm mt-0.5">
                        {getEntityIcon(log.entity)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 capitalize font-medium", getActionColor(log.action))}>
                            {log.action}
                          </Badge>
                          <span className="text-xs font-semibold text-foreground">{getEntityLabel(log.entity)}</span>
                          <span className="text-[10px] text-muted-foreground">#{log.entityId.substring(0, 8)}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatAuditDate(log.createdAt)}</span>
                          {log.userName && <span className="flex items-center gap-1"><UserCircle className="w-3 h-3" />{log.userName}</span>}
                          {log.ipAddress && <span className="flex items-center gap-1"><span className="font-mono bg-muted px-1 rounded">IP</span>{log.ipAddress}</span>}
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <details className="mt-2 group">
                            <summary className="text-[10px] text-primary cursor-pointer hover:underline mb-1">View Details</summary>
                            <pre className="p-2 bg-background border border-border/50 rounded-md text-[10px] overflow-auto max-h-32 text-muted-foreground">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
