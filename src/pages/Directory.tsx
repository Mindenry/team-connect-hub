import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { usePresence } from "@/hooks/usePresence";
import { motion } from "framer-motion";
import {
  Search,
  MoreHorizontal,
  Shield,
  Users,
  Key,
  Building,
  Ban,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  Save,
  RefreshCw,
  UserPlus,
  Mail,
  Settings,
  Activity,
  Crown,
  Filter,
  X,
  Send,
  Clock,
  AlertCircle,
  FileSearch,
  Calendar,
  UserCircle,
  Zap,
  Upload,
  Briefcase,
  Image,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import InviteUserDialog from "@/components/dialogs/InviteUserDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import StatusIndicator from "@/components/shared/StatusIndicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { apiGet, apiPatch, apiDelete, apiPut, apiPost, apiFetch, API_BASE } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

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

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "online" | "busy" | "away" | "offline" | "dnd";
  lastActive: string;
  isActive: boolean;
  teams: string[];
  joinedDate: string;
  createdAt: string;
  avatar?: string;
  department?: string;
  position?: string;
}

const roleColors: Record<string, string> = {
  org_owner: "bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
  admin: "bg-gradient-to-r from-red-500/15 to-rose-500/10 text-red-700 dark:text-red-400 border border-red-500/20",
  manager: "bg-gradient-to-r from-blue-500/15 to-indigo-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
  employee: "bg-gradient-to-r from-emerald-500/10 to-green-500/5 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
};

const adminSections = [
  { id: "directory", label: "Directory", icon: Users, desc: "Member directory" },
  { id: "users", label: "Manage Users", icon: Settings, desc: "User management" },
  { id: "invites", label: "Invites", icon: Send, desc: "Invitation history" },
  { id: "roles", label: "Roles & Permissions", icon: Shield, desc: "Access control" },
  { id: "org", label: "Organization", icon: Building, desc: "Org settings" },
  { id: "security", label: "Security Policy", icon: Key, desc: "Security rules" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 120, damping: 16 } },
};

const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.03, y: -6, transition: { type: "spring" as const, stiffness: 300, damping: 20 } },
};

export default function Directory() {
  const { user } = useAuth();
  const { isUserOnline } = usePresence();
  const [activeSection, setActiveSection] = useState("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditUser, setShowEditUser] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [orgSettings, setOrgSettings] = useState<{
    name: string;
    allowedDomains: string;
    defaultTeam: string;
    logo: string;
    departments: string[];
    positions: string[];
  }>({
    name: "",
    allowedDomains: "",
    defaultTeam: "",
    logo: "",
    departments: [],
    positions: [],
  });
  const [newDepartment, setNewDepartment] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [orgSettingsJson, setOrgSettingsJson] = useState<any>({});
  const [securitySettings, setSecuritySettings] = useState({
    minPasswordLength: 8,
    sessionTimeout: 480,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  });

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);

  // Audit Logs State
  const canAccess = useMemo(() => {
    const r = (user?.role || "").toLowerCase();
    return r === "org_owner" || r === "admin";
  }, [user?.role]);

  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);
  const [auditFilters, setAuditFilters] = useState({
    entity: "",
    userId: "",
    action: "",
    search: "",
  });
  const auditLimit = 200;

  const loadAuditLogs = async () => {
    setAuditLogsLoading(true);
    setAuditLogsError(null);
    try {
      const params = new URLSearchParams();
      if (auditFilters.entity) params.append("entity", auditFilters.entity);
      if (auditFilters.userId) params.append("userId", auditFilters.userId);
      if (auditFilters.action) params.append("action", auditFilters.action);
      params.append("limit", auditLimit.toString());

      const data = await apiGet<AuditLog[]>(`/audit-logs?${params.toString()}`);
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      setAuditLogsError("ไม่สามารถโหลด Audit Logs ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setAuditLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "security" && canAccess) {
      loadAuditLogs();
    }
  }, [auditFilters.entity, auditFilters.userId, auditFilters.action, activeSection, canAccess]);

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "create": return "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-500/30";
      case "update": return "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30";
      case "delete": return "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30";
      case "upload": return "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-500/30";
      case "login": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30";
      case "logout": return "bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400 border-gray-200 dark:border-gray-500/30";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400 border-gray-200 dark:border-gray-500/30";
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity.toLowerCase()) {
      case "user": return "👤";
      case "task": return "📋";
      case "meeting": return "📹";
      case "message": return "💬";
      case "team": return "👥";
      case "file": return "📁";
      default: return "📄";
    }
  };

  const getEntityLabel = (entity: string) => {
    switch (entity.toLowerCase()) {
      case "user": return "User";
      case "task": return "Task";
      case "meeting": return "Meeting";
      case "message": return "Message";
      case "team": return "Team";
      case "file":
      case "document": return "File / Document";
      default: return entity || "Unknown";
    }
  };

  const formatAuditDate = (dateString: string) => {
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
      ...auditLogs.map((log) =>
        [
          log.action,
          log.entity,
          log.entityId,
          log.userName || "System",
          log.ipAddress || "N/A",
          formatAuditDate(log.createdAt),
          JSON.stringify(log.details || {}).replace(/,/g, "，"), // safe csv
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

  const filteredAuditLogs = useMemo(() => {
    let result = auditLogs;
    if (auditFilters.search) {
      const searchLower = auditFilters.search.toLowerCase();
      result = result.filter((log) => {
        const detailsText = typeof log.details === "string" ? log.details : JSON.stringify(log.details || {});
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
  }, [auditLogs, auditFilters.search]);

  const auditStats = useMemo(() => {
    const total = auditLogs.length;
    const uniqueUsers = new Set(auditLogs.map((l) => l.userId).filter(Boolean)).size;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayCount = auditLogs.filter((l) => new Date(l.createdAt).getTime() >= startOfToday.getTime()).length;
    return { total, uniqueUsers, todayCount };
  }, [auditLogs]);

  // Permissions matrix state
  interface PermRecord { role: string; resource: string; action: string; allowed: boolean }
  const [permissionsData, setPermissionsData] = useState<PermRecord[]>([]);
  const [permissionsDirty, setPermissionsDirty] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  const RESOURCES = [
    { key: "users", label: "Users", actions: ["view", "create", "edit", "delete"] },
    { key: "teams", label: "Teams", actions: ["view", "create", "edit", "delete"] },
    { key: "meetings", label: "Meetings", actions: ["view", "create", "edit", "delete"] },
    { key: "tasks", label: "Tasks", actions: ["view", "create", "edit", "delete"] },
    { key: "channels", label: "Channels", actions: ["view", "create", "edit", "delete"] },
    { key: "reports", label: "Reports", actions: ["view"] },
    { key: "drive", label: "Shared Drive", actions: ["view", "manage"] },
    { key: "settings", label: "Settings", actions: ["view", "manage"] },
    { key: "audit", label: "Audit Log", actions: ["view"] },
    { key: "invites", label: "Invites", actions: ["manage"] },
    { key: "announcements", label: "Announcements", actions: ["manage"] },
  ];
  const ROLES_LIST = ["org_owner", "admin", "manager", "employee"];
  const ROLE_LABELS: Record<string, string> = {
    org_owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    employee: "Member"
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        apiGet<any[]>("/users").catch(() => []),
        apiGet<any[]>("/teams").catch(() => []),
      ]);

      const usersData: UserRecord[] = usersRes.map((u: any) => {
        const userTeams = teamsRes
          .filter((t: any) => t.members?.some((m: any) => m.userId === u.id))
          .map((t: any) => t.name);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role || "employee",
          status: isUserOnline(u.id) ? "online" : "offline",
          lastActive: "Now",
          isActive: u.isActive !== false,
          teams: userTeams,
          joinedDate: new Date(u.createdAt).toLocaleDateString(),
          createdAt: u.createdAt,
          avatar: u.avatar,
          department: u.department,
          position: u.position,
        };
      });

      setUsers(usersData);
      setTeams(teamsRes);

      // Resolve org from current user record
      const current = Array.isArray(usersRes) ? usersRes.find((u: any) => u.id === user?.id) : null;
      const resolvedOrgId = current?.organizationId || (Array.isArray(usersRes) ? usersRes[0]?.organizationId : null);
      if (resolvedOrgId) {
        setOrgId(resolvedOrgId);
        const org = await apiGet<any>(`/organizations/${resolvedOrgId}`).catch(() => null);
        if (org) {
          setOrgSettingsJson(org.settings || {});
          setOrgSettings({
            name: org.name || "",
            allowedDomains: Array.isArray(org.allowedDomains) ? org.allowedDomains.join(", ") : org.domain || "",
            defaultTeam: (org.settings?.defaultTeamId as string) || "",
            logo: org.logo || "",
            departments: Array.isArray(org.settings?.departments) ? org.settings.departments : [],
            positions: Array.isArray(org.settings?.positions) ? org.settings.positions : [],
          });
          // Hydrate security settings if present
          if (org.settings?.securityPolicy) {
            setSecuritySettings((prev) => ({ ...prev, ...(org.settings.securityPolicy as any) }));
          }
        }

        // Load role permissions
        try {
          const perms = await apiGet<PermRecord[]>(`/permissions/${resolvedOrgId}`).catch(() => []);
          if (Array.isArray(perms) && perms.length > 0) {
            setPermissionsData(perms);
          }
        } catch { /* ignore */ }

        // Load invites
        try {
          const invitesRes = await apiGet<any[]>(`/invites/organization/${resolvedOrgId}`).catch(() => []);
          if (Array.isArray(invitesRes)) {
            setInvites(invitesRes);
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
      toast.error("Failed to load admin data");
    } finally {
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    const normalizedRole = (u.role || "").toLowerCase();
    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "admin"
        ? normalizedRole === "admin" || normalizedRole === "org_owner"
        : normalizedRole === roleFilter);

    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleEditUser = (user: UserRecord) => {
    setEditingUser(user);
    setShowEditUser(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      await apiPatch(`/users/${editingUser.id}`, {
        name: editingUser.name,
        role: editingUser.role,
        isActive: editingUser.isActive,
        department: editingUser.department || null,
        position: editingUser.position || null,
      });
      toast.success("User updated successfully");
      setShowEditUser(false);
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await apiDelete(`/users/${deletingUser.id}`);
      toast.success("User deleted successfully");
      setShowDeleteConfirm(false);
      setDeletingUser(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const handleToggleUserStatus = async (user: UserRecord) => {
    try {
      await apiPatch(`/users/${user.id}`, {
        isActive: !user.isActive,
      });
      toast.success(`User ${!user.isActive ? "activated" : "deactivated"}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status");
    }
  };

  const handleSaveOrgSettings = async () => {
    try {
      if (!orgId) throw new Error("Organization not found");
      const allowedDomains = orgSettings.allowedDomains
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      await apiPatch(`/organizations/${orgId}`, {
        name: orgSettings.name,
        logo: orgSettings.logo || null,
        allowedDomains,
        settings: {
          ...(orgSettingsJson || {}),
          defaultTeamId: orgSettings.defaultTeam || null,
          departments: orgSettings.departments,
          positions: orgSettings.positions,
        },
      });
      toast.success("Organization settings saved");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/storage/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const url = data?.data?.url || data?.url || "";
      setOrgSettings((prev) => ({ ...prev, logo: url }));
      toast.success("Logo uploaded! Click Save to apply.");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setLogoUploading(false);
    }
  };

  // Permission matrix helpers
  const getPermValue = (role: string, resource: string, action: string) => {
    if (role === "org_owner") return true; // always on
    const found = permissionsData.find(
      (p) => p.role === role && p.resource === resource && p.action === action,
    );
    return found ? found.allowed : false;
  };

  const togglePerm = (role: string, resource: string, action: string) => {
    if (role === "org_owner") return; // cannot change owner perms
    setPermissionsDirty(true);
    setPermissionsData((prev) => {
      const idx = prev.findIndex(
        (p) => p.role === role && p.resource === resource && p.action === action,
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], allowed: !copy[idx].allowed };
        return copy;
      }
      return [...prev, { role, resource, action, allowed: true }];
    });
  };

  const handleSavePermissions = async () => {
    if (!orgId) return;
    setPermSaving(true);
    try {
      // Send only non-owner permissions
      const toSave = permissionsData.filter((p) => p.role !== "org_owner");
      await apiPut(`/permissions/${orgId}`, { permissions: toSave });
      toast.success("Permissions saved successfully");
      setPermissionsDirty(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save permissions");
    } finally {
      setPermSaving(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!orgId) return;
    try {
      await apiPost(`/permissions/${orgId}/seed`, {});
      toast.success("Default permissions restored");
      // Reload
      const perms = await apiGet<PermRecord[]>(`/permissions/${orgId}`).catch(() => []);
      if (Array.isArray(perms)) setPermissionsData(perms);
      setPermissionsDirty(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to seed defaults");
    }
  };

  const handleSaveSecuritySettings = async () => {
    try {
      if (!orgId) throw new Error("Organization not found");
      await apiPatch(`/organizations/${orgId}`, {
        settings: {
          ...(orgSettingsJson || {}),
          securityPolicy: securitySettings,
        },
      });
      toast.success("Security settings saved");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save security settings");
    }
  };

  const handleCancelInvite = async (token: string) => {
    try {
      await apiDelete(`/invites/${token}`);
      toast.success("Invite cancelled");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel invite");
    }
  };

  const inviteCounts = useMemo(() => {
    const now = new Date();
    return {
      total: invites.length,
      pending: invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) > now).length,
      accepted: invites.filter((inv) => inv.usedAt).length,
      expired: invites.filter((inv) => !inv.usedAt && new Date(inv.expiresAt) <= now).length,
    };
  }, [invites]);

  const roleCounts = useMemo(() => {
    return {
      Admin: users.filter((u) => ["org_owner", "admin"].includes(u.role)).length,
      Manager: users.filter((u) => u.role === "manager").length,
      Member: users.filter((u) => ["employee", "member"].includes(u.role)).length,
    };
  }, [users]);

  // If user cannot access admin, force them to the directory view only
  useEffect(() => {
    if (user && !canAccess && activeSection !== "directory") {
      setActiveSection("directory");
    }
  }, [user, canAccess, activeSection]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* ══════ Sticky Header ══════ */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10 ring-1 ring-primary/20">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  {users.filter(u => isUserOnline(u.id)).length > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-semibold sm:font-bold text-foreground tracking-tight">
                    {canAccess ? "Company Directory & Admin" : "Company Directory"}
                  </h1>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                    {canAccess ? "จัดการผู้ใช้ · สิทธิ์ · โครงสร้างองค์กร · นโยบายความปลอดภัย" : "ค้นหาและเชื่อมต่อกับคนในองค์กร"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 self-stretch sm:self-auto justify-end">
                {canAccess && (
                  <>
                    <Tooltip><TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 border-border/60 bg-background/50 hover:bg-accent" onClick={loadData}>
                        <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </TooltipTrigger><TooltipContent>Refresh</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 sm:h-9 gap-1.5 px-2.5 text-[11px] sm:text-xs border-border/60 bg-background/50 hover:bg-accent">
                        <Download className="w-3.5 h-3.5 shrink-0" /><span className="hidden sm:inline">Export</span>
                      </Button>
                    </TooltipTrigger><TooltipContent>ส่งออกรายชื่อ</TooltipContent></Tooltip>
                  </>
                )}
                {canAccess && (
                  <Button size="sm" className="h-8 sm:h-9 gap-1.5 px-2.5 text-[11px] sm:text-xs font-medium shrink-0" onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="w-3.5 h-3.5 shrink-0" /><span className="hidden sm:inline">Invite User</span>
                  </Button>
                )}
              </div>
            </div>
            {/* Overview stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">ทั้งหมด</span>
                <div className="flex items-baseline gap-1 mt-1.5"><span className="text-lg sm:text-xl font-semibold tabular-nums">{users.length}</span><span className="text-[10px] text-muted-foreground">users</span></div>
              </div>
              <div className={cn("rounded-xl border px-3 py-2.5 flex flex-col justify-between", users.filter(u => isUserOnline(u.id)).length > 0 ? "border-emerald-500/60 bg-emerald-500/5" : "border-border/60 bg-card/60")}>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Activity className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium tracking-wide">ออนไลน์</span>
                </div>
                <div className="flex items-baseline gap-1 mt-1.5"><span className="text-lg sm:text-xl font-semibold tabular-nums">{users.filter(u => isUserOnline(u.id)).length}</span><span className="text-[10px] text-muted-foreground">online</span></div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">แอดมิน</span>
                <div className="flex items-baseline gap-1 mt-1.5"><span className="text-lg sm:text-xl font-semibold tabular-nums">{roleCounts.Admin}</span><span className="text-[10px] text-muted-foreground">admins</span></div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">ผู้จัดการ</span>
                <div className="flex items-baseline gap-1 mt-1.5"><span className="text-lg sm:text-xl font-semibold tabular-nums">{roleCounts.Manager}</span><span className="text-[10px] text-muted-foreground">managers</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════ Main Content ══════ */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col">
            {/* Toolbar */}
            <div className="py-4 sm:py-6 space-y-4">
              {/* Tab Pills */}
              {canAccess && (
                <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/50 backdrop-blur-sm w-fit overflow-x-auto">
                  {adminSections.map((s) => (
                    <button key={s.id} onClick={() => setActiveSection(s.id)} className={cn("px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap", activeSection === s.id ? "bg-background shadow-md ring-1 ring-border/50 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60")}>
                      <s.icon className={cn("w-3.5 h-3.5", activeSection === s.id && "text-primary")} />
                      <span className="hidden sm:inline">{s.label}</span>
                      <span className="sm:hidden">{s.label.split(" ")[0]}</span>
                      {s.id === "users" && users.length > 0 && (<span className={cn("ml-0.5 text-xs font-semibold px-1.5 py-0.5 rounded", activeSection === s.id ? "bg-primary/15 text-primary" : "bg-muted/80 text-muted-foreground")}>{users.length}</span>)}
                      {s.id === "invites" && inviteCounts.pending > 0 && (<span className={cn("ml-0.5 text-xs font-semibold px-1.5 py-0.5 rounded", activeSection === s.id ? "bg-amber-500/15 text-amber-600" : "bg-amber-500/10 text-amber-500")}>{inviteCounts.pending}</span>)}
                    </button>
                  ))}
                </div>
              )}
              {/* Search & Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] sm:min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="ค้นหาผู้ใช้..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10 bg-background/50 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/20" />
                  {searchQuery && (<Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setSearchQuery("")}><X className="w-4 h-4" /></Button>)}
                </div>
                {activeSection === "users" && (
                  <div className="flex items-center gap-2">
                    <Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger className="h-10 w-28 sm:w-32 bg-background/50 border-border/60"><SelectValue placeholder="Role" /></SelectTrigger><SelectContent><SelectItem value="all">All Roles</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="employee">Member</SelectItem></SelectContent></Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-10 w-28 sm:w-32 bg-background/50 border-border/60"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="offline">Offline</SelectItem><SelectItem value="busy">Busy</SelectItem><SelectItem value="away">Away</SelectItem></SelectContent></Select>
                  </div>
                )}
              </div>
            </div>

            {/* ══════ Content Area ══════ */}
            <div className="flex-1 overflow-auto pb-6">

        {/* Directory View - Available to all */}
        {activeSection === "directory" && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key="directory"
          >
            {filteredUsers.map((u) => (
              <motion.div key={u.id} variants={itemVariants}>
                <motion.div variants={cardHoverVariants} initial="rest" whileHover="hover">
                  <Card className="border border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-300 overflow-hidden group hover:shadow-lg hover:shadow-black/8 ring-0 hover:ring-1 hover:ring-primary/10">
                    {/* Top gradient accent bar */}
                    <div className="h-1 bg-gradient-to-r from-primary/60 via-blue-500/40 to-purple-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <CardContent className="p-5 flex flex-col items-center text-center">
                      <div className="relative mb-4">
                        <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                          <AvatarImage src={u.avatar} />
                          <AvatarFallback className="text-xl bg-gradient-to-br from-primary/15 to-blue-500/10 text-primary font-semibold">
                            {u.name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <StatusIndicator status={u.status as any} className="absolute bottom-0 right-0 h-5 w-5 border-2 border-background" />
                      </div>
                      <h3 className="font-semibold text-[15px] truncate w-full text-foreground">{u.name}</h3>
                      <div className="flex flex-col items-center gap-1.5 mb-3 w-full mt-1">
                        {u.position && (
                          <p className="text-[13px] font-medium text-muted-foreground truncate w-full text-center">
                            {u.position}
                          </p>
                        )}
                        <Badge variant="outline" className={cn("font-medium capitalize h-6 px-3 text-[11px] shadow-sm", roleColors[u.role] || roleColors.employee)}>
                          {u.role === 'org_owner' ? 'Owner' : ROLE_LABELS[u.role] || u.role || 'Member'}
                        </Badge>
                      </div>
                      <Separator className="my-2 opacity-50" />
                      <div className="w-full space-y-1.5 text-xs mt-1">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </div>
                        {u.department && (
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Building className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{u.department}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="col-span-full py-24 text-center text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 opacity-30" />
                </div>
                <p className="text-sm font-medium">No members found</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your search query</p>
              </div>
            )}
          </motion.div>
        )}
        {activeSection === "users" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} key="users" className="space-y-5">
          <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">User Management</CardTitle>
                  <CardDescription className="text-xs">Search, filter, and manage user access across the organization.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: "Total Users", value: users.length, icon: Users, gradient: "from-blue-500/20 via-blue-500/10 to-blue-500/5", iconBg: "bg-blue-500/10", iconColor: "text-blue-600", borderColor: "border-blue-500/20" },
                  { label: "Admins", value: roleCounts.Admin, icon: Crown, gradient: "from-amber-500/20 via-amber-500/10 to-amber-500/5", iconBg: "bg-amber-500/10", iconColor: "text-amber-600", borderColor: "border-amber-500/20" },
                  { label: "Managers", value: roleCounts.Manager, icon: Shield, gradient: "from-purple-500/20 via-purple-500/10 to-purple-500/5", iconBg: "bg-purple-500/10", iconColor: "text-purple-600", borderColor: "border-purple-500/20" },
                  { label: "Online Now", value: users.filter((u) => isUserOnline(u.id)).length, icon: Activity, gradient: "from-emerald-500/20 via-emerald-500/10 to-emerald-500/5", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600", borderColor: "border-emerald-500/20" },
                ].map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <Card key={kpi.label} className={cn("group relative border-2 overflow-hidden hover:shadow-lg transition-all duration-300", kpi.borderColor)}>
                      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", kpi.gradient)} />
                      <CardContent className="relative p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", kpi.iconBg)}>
                            <Icon className={cn("h-4 w-4", kpi.iconColor)} />
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="border border-border/60 rounded-xl overflow-hidden bg-background/40">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                          User
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                          Role
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                          Teams
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                          Status
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                          Last Active
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                          Joined
                        </th>
                        <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-t hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {user.name.split(" ").map((n) => n[0]).join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <StatusIndicator
                                  status={user.status}
                                  className="absolute -bottom-0.5 -right-0.5 border-card"
                                />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={cn("text-xs font-medium", roleColors[user.role] || "bg-secondary")}>
                              {ROLE_LABELS[user.role] || user.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {user.teams.slice(0, 2).map((t) => (
                                <Badge key={t} variant="outline" className="text-xs">
                                  {t}
                                </Badge>
                              ))}
                              {user.teams.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.teams.length - 2}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={user.isActive ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {user.isActive ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Deactivated
                                </>
                              )}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-muted-foreground">{user.lastActive}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">{user.joinedDate}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Shield className="w-4 h-4 mr-2" />
                                  Change Role / Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleToggleUserStatus(user)}
                                >
                                  <Ban className="w-4 h-4 mr-2" />
                                  {user.isActive ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDeletingUser(user);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        )}

        {activeSection === "invites" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} key="invites" className="space-y-5">
            <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Invitation History</CardTitle>
                    <CardDescription className="text-xs">Track all invitations sent to new members.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: "Total Invites", value: inviteCounts.total, icon: Send, gradient: "from-blue-500/20 via-blue-500/10 to-blue-500/5", iconBg: "bg-blue-500/10", iconColor: "text-blue-600", borderColor: "border-blue-500/20" },
                    { label: "Pending", value: inviteCounts.pending, icon: Clock, gradient: "from-amber-500/20 via-amber-500/10 to-amber-500/5", iconBg: "bg-amber-500/10", iconColor: "text-amber-600", borderColor: "border-amber-500/20" },
                    { label: "Accepted", value: inviteCounts.accepted, icon: CheckCircle, gradient: "from-emerald-500/20 via-emerald-500/10 to-emerald-500/5", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600", borderColor: "border-emerald-500/20" },
                    { label: "Expired", value: inviteCounts.expired, icon: AlertCircle, gradient: "from-red-500/20 via-red-500/10 to-red-500/5", iconBg: "bg-red-500/10", iconColor: "text-red-600", borderColor: "border-red-500/20" },
                  ].map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                      <Card key={kpi.label} className={cn("group relative border-2 overflow-hidden hover:shadow-lg transition-all duration-300", kpi.borderColor)}>
                        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", kpi.gradient)} />
                        <CardContent className="relative p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", kpi.iconBg)}>
                              <Icon className={cn("h-4 w-4", kpi.iconColor)} />
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Invites Table */}
                <div className="border border-border/60 rounded-xl overflow-hidden bg-background/40">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Invited</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Expires</th>
                        <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                              <Send className="h-6 w-6 opacity-30" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">No invites sent yet</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Click "Invite User" to send your first invitation</p>
                          </td>
                        </tr>
                      ) : (
                        invites.map((inv) => {
                          const now = new Date();
                          const isUsed = !!inv.usedAt;
                          const isExpired = !isUsed && new Date(inv.expiresAt) <= now;
                          const isPending = !isUsed && !isExpired;
                          const statusLabel = isUsed ? "Accepted" : isExpired ? "Expired" : "Pending";
                          const statusColor = isUsed
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : isExpired
                              ? "bg-red-500/10 text-red-600 border-red-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20";
                          const StatusIcon = isUsed ? CheckCircle : isExpired ? XCircle : Clock;

                          return (
                            <tr key={inv.id || inv.token} className="border-t hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Mail className="w-3.5 h-3.5 text-primary" />
                                  </div>
                                  <span className="text-sm font-medium text-foreground">{inv.email}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className={cn("text-xs font-medium", roleColors[inv.role] || roleColors.employee)}>
                                  {ROLE_LABELS[inv.role] || inv.role || "Member"}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className={cn("text-xs font-medium gap-1", statusColor)}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusLabel}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(inv.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn("text-xs", isExpired ? "text-red-500" : "text-muted-foreground")}>
                                  {new Date(inv.expiresAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isPending && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleCancelInvite(inv.token)}
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Cancel invite</TooltipContent>
                                  </Tooltip>
                                )}
                                {isUsed && (
                                  <span className="text-xs text-emerald-500">
                                    {new Date(inv.usedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeSection === "roles" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} key="roles" className="space-y-5">
            <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Roles & Permissions</CardTitle>
                    <CardDescription className="text-xs">
                      Configure what each role can access. Owner permissions are always enabled.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSeedDefaults}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Reset Defaults
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePermissions}
                      disabled={!permissionsDirty || permSaving}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {permSaving ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Role summary badges */}
                <div className="flex flex-wrap gap-3 mb-5">
                  {ROLES_LIST.map((r) => (
                    <div key={r} className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs font-medium shadow-sm", roleColors[r] || "bg-muted/60 text-muted-foreground")}>
                        {ROLE_LABELS[r]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {users.filter((u) => {
                          const ur = (u.role || "").toLowerCase();
                          if (r === "admin") return ur === "admin" || ur === "org_owner";
                          if (r === "org_owner") return ur === "org_owner";
                          return ur === r;
                        }).length} users
                      </span>
                    </div>
                  ))}
                </div>

                {/* Permission Matrix Table */}
                <div className="border border-border/60 rounded-xl overflow-hidden bg-background/40">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 min-w-[160px]">
                            Resource
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3 min-w-[80px]">
                            Action
                          </th>
                          {ROLES_LIST.map((r) => (
                            <th
                              key={r}
                              className="text-center text-xs font-medium text-muted-foreground px-3 py-3 min-w-[80px]"
                            >
                              {ROLE_LABELS[r]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {RESOURCES.map((res) =>
                          res.actions.map((act, actIdx) => (
                            <tr
                              key={`${res.key}-${act}`}
                              className={cn(
                                "border-t hover:bg-muted/30 transition-colors",
                                actIdx === 0 && "border-t-2 border-t-border/60",
                              )}
                            >
                              {actIdx === 0 ? (
                                <td
                                  className="px-4 py-2.5 text-sm font-medium text-foreground align-top"
                                  rowSpan={res.actions.length}
                                >
                                  {res.label}
                                </td>
                              ) : null}
                              <td className="px-3 py-2.5">
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {act}
                                </Badge>
                              </td>
                              {ROLES_LIST.map((role) => {
                                const isOwner = role === "org_owner";
                                const checked = getPermValue(role, res.key, act);
                                return (
                                  <td key={role} className="px-3 py-2.5 text-center">
                                    <Switch
                                      checked={checked}
                                      disabled={isOwner}
                                      onCheckedChange={() => togglePerm(role, res.key, act)}
                                      className="scale-75"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {permissionsDirty && (
                  <p className="text-xs text-amber-500 mt-3 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    You have unsaved changes
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeSection === "org" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} key="org" className="max-w-2xl space-y-5">
            <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Organization Settings</CardTitle>
                <CardDescription className="text-xs">Configure your organization's general settings and policies.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Organization Logo */}
                <div>
                  <Label className="flex items-center gap-2"><Image className="w-4 h-4" />Organization Logo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border/60 bg-muted/30 flex items-center justify-center overflow-hidden">
                      {orgSettings.logo ? (
                        <img src={orgSettings.logo} alt="Org logo" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Building className="w-8 h-8 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                        <div className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-background/60 hover:bg-accent text-sm font-medium transition-colors", logoUploading && "opacity-50 pointer-events-none")}>
                          <Upload className="w-4 h-4" />
                          {logoUploading ? "Uploading..." : "Upload Logo"}
                        </div>
                      </label>
                      {orgSettings.logo && (
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => setOrgSettings({ ...orgSettings, logo: "" })}>
                          <X className="w-3 h-3 mr-1" /> Remove
                        </Button>
                      )}
                      <p className="text-[11px] text-muted-foreground">Recommended: 200×200px, PNG or JPG, max 5MB</p>
                    </div>
                  </div>
                </div>
                <Separator className="opacity-50" />
                <div>
                  <Label>Organization Name</Label>
                  <Input
                    value={orgSettings.name}
                    onChange={(e) =>
                      setOrgSettings({ ...orgSettings, name: e.target.value })
                    }
                    className="mt-1.5 bg-background/60 border-border/60"
                    placeholder="Acme Corporation"
                  />
                </div>
                <Separator className="opacity-50" />
                <div>
                  <Label>Allowed Email Domains</Label>
                  <Input
                    value={orgSettings.allowedDomains}
                    onChange={(e) =>
                      setOrgSettings({ ...orgSettings, allowedDomains: e.target.value })
                    }
                    className="mt-1.5 bg-background/60 border-border/60"
                    placeholder="@acme.com, @company.com"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Only emails from these domains can be invited. Separate with comma.
                  </p>
                </div>
                <Separator className="opacity-50" />
                <div>
                  <Label>Default Team for New Members</Label>
                  <Select
                    value={orgSettings.defaultTeam || "none"}
                    onValueChange={(value) =>
                      setOrgSettings({ ...orgSettings, defaultTeam: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger className="mt-1.5 bg-background/60 border-border/60">
                      <SelectValue placeholder="No default team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default team</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator className="opacity-50" />
                
                {/* Structure: Departments */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Building className="w-4 h-4 text-primary" />
                    Departments
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Define the departments available for users in your organization.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      placeholder="e.g. Engineering, HR, Sales"
                      className="bg-background/60 border-border/60"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newDepartment.trim()) {
                          e.preventDefault();
                          if (!orgSettings.departments.includes(newDepartment.trim())) {
                            setOrgSettings({
                              ...orgSettings,
                              departments: [...orgSettings.departments, newDepartment.trim()],
                            });
                          }
                          setNewDepartment("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (newDepartment.trim() && !orgSettings.departments.includes(newDepartment.trim())) {
                          setOrgSettings({
                            ...orgSettings,
                            departments: [...orgSettings.departments, newDepartment.trim()],
                          });
                          setNewDepartment("");
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {orgSettings.departments.map((dept, idx) => (
                      <Badge key={idx} variant="secondary" className="pl-3 pr-1 py-1 flex items-center gap-1 bg-muted/50 border-border/50">
                        {dept}
                        <button
                          type="button"
                          onClick={() => setOrgSettings({
                            ...orgSettings,
                            departments: orgSettings.departments.filter(d => d !== dept)
                          })}
                          className="hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 ml-1 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {orgSettings.departments.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No departments configured</span>
                    )}
                  </div>
                </div>

                <Separator className="opacity-50" />

                {/* Structure: Positions */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    Positions
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Define the positions or titles available for users in your organization.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={newPosition}
                      onChange={(e) => setNewPosition(e.target.value)}
                      placeholder="e.g. Manager, Senior Developer"
                      className="bg-background/60 border-border/60"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newPosition.trim()) {
                          e.preventDefault();
                          if (!orgSettings.positions.includes(newPosition.trim())) {
                            setOrgSettings({
                              ...orgSettings,
                              positions: [...orgSettings.positions, newPosition.trim()],
                            });
                          }
                          setNewPosition("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (newPosition.trim() && !orgSettings.positions.includes(newPosition.trim())) {
                          setOrgSettings({
                            ...orgSettings,
                            positions: [...orgSettings.positions, newPosition.trim()],
                          });
                          setNewPosition("");
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {orgSettings.positions.map((pos, idx) => (
                      <Badge key={idx} variant="secondary" className="pl-3 pr-1 py-1 flex items-center gap-1 bg-muted/50 border-border/50">
                        {pos}
                        <button
                          type="button"
                          onClick={() => setOrgSettings({
                            ...orgSettings,
                            positions: orgSettings.positions.filter(p => p !== pos)
                          })}
                          className="hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 ml-1 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {orgSettings.positions.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No positions configured</span>
                    )}
                  </div>
                </div>

                <Separator className="opacity-50" />
                <Button onClick={handleSaveOrgSettings} className="gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-500 shadow-lg">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeSection === "security" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} key="security" className="w-full space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Password Policy</CardTitle>
                  <CardDescription className="text-xs">Define password requirements for all users.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Minimum Password Length</Label>
                      <Input
                        type="number"
                        value={securitySettings.minPasswordLength}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            minPasswordLength: parseInt(e.target.value) || 8,
                          })
                        }
                        className="mt-1.5 bg-background/60 border-border/60"
                      />
                    </div>
                    <div>
                      <Label>Session Timeout (minutes)</Label>
                      <Input
                        type="number"
                        value={securitySettings.sessionTimeout}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            sessionTimeout: parseInt(e.target.value) || 480,
                          })
                        }
                        className="mt-1.5 bg-background/60 border-border/60"
                      />
                    </div>
                  </div>
                  <Separator className="opacity-50" />
                  <div className="space-y-1">
                    {[
                      { key: "requireUppercase", label: "Require uppercase letter" },
                      { key: "requireLowercase", label: "Require lowercase letter" },
                      { key: "requireNumber", label: "Require number" },
                      { key: "requireSpecial", label: "Require special character" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-foreground">{item.label}</span>
                        <Switch
                          checked={securitySettings[item.key as keyof typeof securitySettings] as boolean}
                          onCheckedChange={(checked) =>
                            setSecuritySettings({
                              ...securitySettings,
                              [item.key]: checked,
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="pt-2">
              <Button onClick={handleSaveSecuritySettings} className="gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-500 shadow-lg">
                <Save className="w-4 h-4" />
                Save Policy
              </Button>
            </div>

            <Separator className="my-8 opacity-50" />

            {/*  ══════ Audit Log Section ══════ */}
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
                      <Button variant="outline" size="icon" className="h-9 w-9 border-border/60" onClick={loadAuditLogs}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh</TooltipContent>
                  </Tooltip>
                  <Button variant="outline" size="sm" className="h-9 border-border/60" onClick={exportLogs}>
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
                  <div className="text-xl font-bold">{auditStats.total.toLocaleString("th-TH")}</div>
                </Card>
                <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm py-3 px-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Active Users</span>
                    <UserCircle className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-xl font-bold">{auditStats.uniqueUsers.toLocaleString("th-TH")}</div>
                </Card>
                <Card className="border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm py-3 px-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Today's Events</span>
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-xl font-bold">{auditStats.todayCount.toLocaleString("th-TH")}</div>
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
                          value={auditFilters.search}
                          onChange={(e) => setAuditFilters({ ...auditFilters, search: e.target.value })}
                          className="pl-8 h-8 text-xs bg-background/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Entity</Label>
                      <Select
                        value={auditFilters.entity || "all"}
                        onValueChange={(val) => setAuditFilters({ ...auditFilters, entity: val === "all" ? "" : val })}
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
                        value={auditFilters.action || "all"}
                        onValueChange={(val) => setAuditFilters({ ...auditFilters, action: val === "all" ? "" : val })}
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
                        value={auditFilters.userId}
                        onChange={(e) => setAuditFilters({ ...auditFilters, userId: e.target.value })}
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
                    Activity Logs ({filteredAuditLogs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  {auditLogsLoading ? (
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
                  ) : auditLogsError ? (
                    <div className="p-8 text-center text-sm text-destructive">{auditLogsError}</div>
                  ) : filteredAuditLogs.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">No audit logs match criteria</div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="divide-y divide-border/40">
                        {filteredAuditLogs.map((log) => (
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
                                <span className="text-[10px] text-muted-foreground">#{log.entityId.substring(0,8)}</span>
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
        )}
            </div>
          </div>
        </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={editingUser.email} className="mt-1" disabled />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, role: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator className="opacity-50" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" />Department</Label>
                  <Select
                    value={editingUser.department || "none"}
                    onValueChange={(value) =>
                      setEditingUser({ ...editingUser, department: value === "none" ? null : value })
                    }
                    disabled={orgSettings.departments.length === 0}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={orgSettings.departments.length === 0 ? "No departments configured" : "Select department"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {orgSettings.departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" />Position</Label>
                  <Select
                    value={editingUser.position || "none"}
                    onValueChange={(value) =>
                      setEditingUser({ ...editingUser, position: value === "none" ? null : value })
                    }
                    disabled={orgSettings.positions.length === 0}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={orgSettings.positions.length === 0 ? "No positions configured" : "Select position"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {orgSettings.positions.map((pos) => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Deactivated users cannot access the system
                  </p>
                </div>
                <Switch
                  checked={editingUser.isActive}
                  onCheckedChange={(checked) =>
                    setEditingUser({ ...editingUser, isActive: checked })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUser(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInviteSuccess={() => {
          setShowInviteDialog(false);
          loadData();
        }}
      />
      </div>
    </TooltipProvider>
  );
}
