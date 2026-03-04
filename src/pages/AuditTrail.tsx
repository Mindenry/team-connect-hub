import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Download,
  Filter,
  FileSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCircle,
  Zap,
  Clock,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string | null;
  userName: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function AuditTrail() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    entity: "",
    userId: "",
    action: "",
    search: "",
  });
  const [page, setPage] = useState(1);
  const limit = 200;

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.entity) params.append("entity", filters.entity);
      if (filters.userId) params.append("userId", filters.userId);
      if (filters.action) params.append("action", filters.action);
      params.append("limit", limit.toString());

      const data = await apiGet<AuditLog[]>(`/audit-logs?${params.toString()}`);
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      setError("ไม่สามารถโหลด Audit Logs ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filters.entity, filters.userId, filters.action]);

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return "bg-green-100 text-green-800";
      case "update":
        return "bg-blue-100 text-blue-800";
      case "delete":
        return "bg-red-100 text-red-800";
      case "upload":
        return "bg-purple-100 text-purple-800";
      case "login":
        return "bg-indigo-100 text-indigo-800";
      case "logout":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity.toLowerCase()) {
      case "user":
        return "👤";
      case "task":
        return "📋";
      case "meeting":
        return "📹";
      case "message":
        return "💬";
      case "team":
        return "👥";
      case "file":
        return "📁";
      default:
        return "📄";
    }
  };

  const getEntityLabel = (entity: string) => {
    switch (entity.toLowerCase()) {
      case "user":
        return "User";
      case "task":
        return "Task";
      case "meeting":
        return "Meeting";
      case "message":
        return "Message";
      case "team":
        return "Team";
      case "file":
      case "document":
        return "File / Document";
      default:
        return entity || "Unknown";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const exportLogs = () => {
    const csv = [
      ["Action", "Entity", "Entity ID", "User", "IP Address", "Date", "Details"].join(","),
      ...logs.map((log) =>
        [
          log.action,
          log.entity,
          log.entityId,
          log.userName || "System",
          log.ipAddress || "N/A",
          formatDate(log.createdAt),
          JSON.stringify(log.details || {}),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((log) => {
        const detailsText =
          typeof log.details === "string"
            ? log.details
            : JSON.stringify(log.details || {});
        return (
          log.action.toLowerCase().includes(searchLower) ||
          log.entity.toLowerCase().includes(searchLower) ||
          log.userName?.toLowerCase().includes(searchLower) ||
          log.entityId.toLowerCase().includes(searchLower) ||
          detailsText.toLowerCase().includes(searchLower)
        );
      });
    }

    return result;
  }, [logs, filters.search]);

  const stats = useMemo(() => {
    const total = logs.length;
    const uniqueUsers = new Set(
      logs.map((l) => l.userId).filter((id): id is string => Boolean(id))
    ).size;
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    ).getTime();
    const todayCount = logs.filter(
      (l) => new Date(l.createdAt).getTime() >= startOfToday
    ).length;

    return { total, uniqueUsers, todayCount };
  }, [logs]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-[1920px] mx-auto px-6 lg:px-8">
            <div className="h-20 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                    <FileSearch className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse-soft" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-foreground tracking-tight">
                    Audit Trail & Activity Logs
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    ติดตามทุกกิจกรรมในระบบแบบละเอียด · โปร่งใส · พร้อมตรวจสอบย้อนหลัง
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 border-border/60"
                      onClick={loadLogs}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh ข้อมูลล่าสุด</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 border-border/60"
                      onClick={exportLogs}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Export CSV สำหรับ Audit ภายนอก
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-6 h-full flex flex-col overflow-y-auto gap-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border/60 bg-card/80 hover:bg-card transition-all duration-200 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      เหตุการณ์ทั้งหมด
                    </CardTitle>
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold tracking-tight">
                    {stats.total.toLocaleString("th-TH")}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Audit events ที่ดึงมาจากระบบล่าสุด
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/80 hover:bg-card transition-all duration-200 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      ผู้ใช้ที่มีการทำกิจกรรม
                    </CardTitle>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <UserCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold tracking-tight">
                    {stats.uniqueUsers.toLocaleString("th-TH")}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    นับจาก userId ที่ปรากฏใน log ชุดนี้
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/80 hover:bg-card transition-all duration-200 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      กิจกรรมวันนี้
                    </CardTitle>
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-indigo-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold tracking-tight">
                    {stats.todayCount.toLocaleString("th-TH")}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    นับจากช่วงเที่ยงคืนของวันนี้จนถึงตอนนี้
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters + quick filters */}
            <Card className="border-border/60 bg-card/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Filters</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    เลือกดูเฉพาะ entity หรือ action ที่ต้องการ · ค้นหาจากข้อความได้
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Search
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="ค้นหาจาก action, entity, user, details..."
                        value={filters.search}
                        onChange={(e) =>
                          setFilters({ ...filters, search: e.target.value })
                        }
                        className="pl-9 h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Entity
                    </label>
                    <Select
                      value={filters.entity || undefined}
                      onValueChange={(value) =>
                        setFilters({
                          ...filters,
                          entity: value === "all" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All entities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All entities</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="message">Message</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Action
                    </label>
                    <Select
                      value={filters.action || undefined}
                      onValueChange={(value) =>
                        setFilters({
                          ...filters,
                          action: value === "all" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All actions" />
                      </SelectTrigger>
                      <SelectContent>
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

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      User ID
                    </label>
                    <Input
                      placeholder="Filter by user ID"
                      value={filters.userId}
                      onChange={(e) =>
                        setFilters({ ...filters, userId: e.target.value })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    Quick filters:
                  </span>
                  <Button
                    variant={filters.action === "create" ? "default" : "outline"}
                    size="xs"
                    className={cn(
                      "h-7 px-2 text-[11px]",
                      filters.action === "create" && "bg-emerald-600 text-white"
                    )}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        action: filters.action === "create" ? "" : "create",
                      })
                    }
                  >
                    Create only
                  </Button>
                  <Button
                    variant={filters.action === "update" ? "default" : "outline"}
                    size="xs"
                    className={cn(
                      "h-7 px-2 text-[11px]",
                      filters.action === "update" && "bg-blue-600 text-white"
                    )}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        action: filters.action === "update" ? "" : "update",
                      })
                    }
                  >
                    Update only
                  </Button>
                  <Button
                    variant={filters.action === "delete" ? "default" : "outline"}
                    size="xs"
                    className={cn(
                      "h-7 px-2 text-[11px]",
                      filters.action === "delete" && "bg-red-600 text-white"
                    )}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        action: filters.action === "delete" ? "" : "delete",
                      })
                    }
                  >
                    Deletes only
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setFilters({ entity: "", userId: "", action: "", search: "" })
                    }
                  >
                    เคลียร์ filter ทั้งหมด
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Audit Logs List */}
            <Card className="flex-1 border-border/60 bg-card/80 flex flex-col min-h-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Audit Logs{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({filteredLogs.length})
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      รายการกิจกรรมทั้งหมดที่เกี่ยวข้องกับ Task, Meeting, Documents,
                      Uploads, Time Tracking และฟีเจอร์อื่นๆ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 min-h-0">
                {loading ? (
                  <div className="space-y-3 pt-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/40 p-3"
                      >
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-3 w-64" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                    <p className="text-sm font-medium text-destructive">
                      {error}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ตรวจสอบการเชื่อมต่อ หรือสิทธิ์การเข้าถึง (ต้องเป็น admin /
                      manager)
                    </p>
                    <Button
                      size="sm"
                      className="mt-2"
                      variant="outline"
                      onClick={loadLogs}
                    >
                      ลองโหลดใหม่อีกครั้ง
                    </Button>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      ไม่พบ Audit Logs ตามเงื่อนไขที่เลือก
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ลองขยายช่วงเวลาหรือเคลียร์ filter แล้วลองอีกครั้ง
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1 max-h-[calc(100vh-320px)] overflow-auto pr-1">
                    {filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex gap-3 rounded-xl border border-border/40 bg-background hover:bg-muted/60 transition-colors px-4 py-3"
                      >
                        <div className="flex flex-col items-center pt-1">
                          <div className="w-9 h-9 rounded-full bg-card flex items-center justify-center ring-2 ring-background shadow-sm">
                            <span className="text-base">
                              {getEntityIcon(log.entity)}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "h-6 px-2 text-[11px] capitalize border",
                                getActionColor(log.action)
                              )}
                            >
                              {log.action}
                            </Badge>
                            <span className="text-xs font-medium text-foreground/90">
                              {getEntityLabel(log.entity)}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              #{log.entityId.substring(0, 8)}…
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              {formatDate(log.createdAt)}
                            </span>
                            {log.userName && (
                              <span className="flex items-center gap-1.5">
                                <UserCircle className="w-3 h-3" />
                                <span>โดย {log.userName}</span>
                              </span>
                            )}
                            {log.ipAddress && (
                              <span className="flex items-center gap-1.5">
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[9px] font-mono">
                                  IP
                                </span>
                                <span>{log.ipAddress}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              <span>Audit ID: {log.id.substring(0, 8)}…</span>
                            </span>
                          </div>

                          {log.details && Object.keys(log.details).length > 0 && (
                            <details className="mt-1.5 group">
                              <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground inline-flex items-center gap-1">
                                <span>View details</span>
                              </summary>
                              <pre className="mt-1.5 p-2 bg-muted rounded text-[11px] overflow-auto max-h-40">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
