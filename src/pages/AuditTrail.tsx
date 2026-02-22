import { useState, useEffect } from "react";
import { apiGet } from "../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Calendar, Search, Filter, Download, RefreshCw } from "lucide-react";

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
  const [filters, setFilters] = useState({
    entity: "",
    userId: "",
    action: "",
    search: "",
  });
  const [page, setPage] = useState(1);
  const limit = 50;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.entity) params.append("entity", filters.entity);
      if (filters.userId) params.append("userId", filters.userId);
      if (filters.action) params.append("action", filters.action);
      params.append("limit", limit.toString());

      const data = await apiGet<AuditLog[]>(`/audit-logs?${params.toString()}`);
      setLogs(data);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
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

  const filteredLogs = logs.filter((log) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        log.action.toLowerCase().includes(searchLower) ||
        log.entity.toLowerCase().includes(searchLower) ||
        log.userName?.toLowerCase().includes(searchLower) ||
        log.entityId.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Trail</h1>
          <p className="text-muted-foreground mt-1">
            ดูประวัติการใช้งานและกิจกรรมทั้งหมดในระบบ
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={loadLogs}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Entity</label>
              <Select
                value={filters.entity || undefined}
                onValueChange={(value) =>
                  setFilters({ ...filters, entity: value === "all" ? "" : value })
                }
              >
                <SelectTrigger>
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
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select
                value={filters.action || undefined}
                onValueChange={(value) =>
                  setFilters({ ...filters, action: value === "all" ? "" : value })
                }
              >
                <SelectTrigger>
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
              <label className="text-sm font-medium">User ID</label>
              <Input
                placeholder="Filter by user ID"
                value={filters.userId}
                onChange={(e) =>
                  setFilters({ ...filters, userId: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs ({filteredLogs.length})</CardTitle>
          <CardDescription>
            รายการกิจกรรมทั้งหมดที่เกิดขึ้นในระบบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="text-2xl">{getEntityIcon(log.entity)}</div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                          <span className="font-medium">{log.entity}</span>
                          <span className="text-muted-foreground text-sm">
                            {log.entityId.substring(0, 8)}...
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(log.createdAt)}
                          </span>
                          {log.userName && (
                            <span>โดย {log.userName}</span>
                          )}
                          {log.ipAddress && (
                            <span>IP: {log.ipAddress}</span>
                          )}
                        </div>

                        {log.details && Object.keys(log.details).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                              View details
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
