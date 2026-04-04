import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { usePresence } from "@/hooks/usePresence";
import {
  Search,
  Users,
  Download,
  RefreshCw,
  UserPlus,
  Settings,
  Shield,
  Key,
  Building,
  Send,
  Activity,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import InviteUserDialog from "@/components/dialogs/InviteUserDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiGet, apiPatch, apiDelete, apiPut, apiPost, apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/websocket";
import {
  DirectoryGrid,
  UserManagementTable,
  InvitesTable,
  PermissionsMatrix,
  AuditLogsPanel,
  OrgSettingsPanel,
  SecurityPolicyPanel,
  EditUserDialog,
  DeleteUserDialog,
  type UserRecord,
  type OrgSettings,
  type SecuritySettings as SecuritySettingsType,
  type AuditFilters,
  type PermissionRecord,
  type InviteRecord,
  ROLE_LABELS,
  ROLES_LIST,
} from "@/components/directory";

const adminSections = [
  { id: "directory", label: "Directory", icon: Users, desc: "Member directory" },
  { id: "users", label: "Manage Users", icon: Settings, desc: "User management" },
  { id: "invites", label: "Invites", icon: Send, desc: "Invitation history" },
  { id: "roles", label: "Roles & Permissions", icon: Shield, desc: "Access control" },
  { id: "org", label: "Organization", icon: Building, desc: "Org settings" },
  { id: "security", label: "Security Policy", icon: Key, desc: "Security rules" },
];

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
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    name: "",
    allowedDomains: "",
    defaultTeam: "",
    logo: "",
    departments: [],
  });
  const [newDepartment, setNewDepartment] = useState("");
  const [newPositionState, setNewPositionState] = useState<Record<string, string>>({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [orgSettingsJson, setOrgSettingsJson] = useState<any>({});
  const [securitySettings, setSecuritySettings] = useState<SecuritySettingsType>({
    minPasswordLength: 8,
    sessionTimeout: 480,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  });

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);

  const canAccess = useMemo(() => {
    const r = (user?.role || "").toLowerCase();
    return r === "org_owner" || r === "admin" || r === "manager";
  }, [user?.role]);

  const canManageOrg = useMemo(() => {
    const r = (user?.role || "").toLowerCase();
    return r === "org_owner" || r === "admin";
  }, [user?.role]);

  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({
    entity: "",
    userId: "",
    action: "",
    search: "",
  });
  const auditLimit = 200;

  const [permissionsData, setPermissionsData] = useState<PermissionRecord[]>([]);
  const [permissionsDirty, setPermissionsDirty] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  const loadAuditLogs = async () => {
    setAuditLogsLoading(true);
    setAuditLogsError(null);
    try {
      const params = new URLSearchParams();
      if (auditFilters.entity) params.append("entity", auditFilters.entity);
      if (auditFilters.userId) params.append("userId", auditFilters.userId);
      if (auditFilters.action) params.append("action", auditFilters.action);
      params.append("limit", auditLimit.toString());

      const data = await apiGet<any[]>(`/audit-logs?${params.toString()}`);
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

  useEffect(() => {
    loadData();
  }, []);

  // Real-time WebSocket listeners for directory
  useEffect(() => {
    const socket = getSocket();

    const handleUserCreated = (user: any) => {
      console.log("[Directory] Real-time: user created", user.id);
      loadData();
    };

    const handleUserUpdated = (updatedUser: any) => {
      console.log("[Directory] Real-time: user updated", updatedUser.id);
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? { ...u, name: updatedUser.name, role: updatedUser.role, department: updatedUser.department, position: updatedUser.position, isActive: updatedUser.isActive } : u)));
    };

    const handleUserDeleted = (userId: string) => {
      console.log("[Directory] Real-time: user deleted", userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    };

    const handleTeamCreated = (team: any) => {
      console.log("[Directory] Real-time: team created", team.id);
      loadData();
    };

    const handleTeamUpdated = (team: any) => {
      console.log("[Directory] Real-time: team updated", team.id);
      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, name: team.name, description: team.description } : t)));
    };

    const handleTeamDeleted = (teamId: string) => {
      console.log("[Directory] Real-time: team deleted", teamId);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
    };

    socket.on("user:created", handleUserCreated);
    socket.on("user:updated", handleUserUpdated);
    socket.on("user:deleted", handleUserDeleted);
    socket.on("team:created", handleTeamCreated);
    socket.on("team:updated", handleTeamUpdated);
    socket.on("team:deleted", handleTeamDeleted);

    return () => {
      socket.off("user:created", handleUserCreated);
      socket.off("user:updated", handleUserUpdated);
      socket.off("user:deleted", handleUserDeleted);
      socket.off("team:created", handleTeamCreated);
      socket.off("team:updated", handleTeamUpdated);
      socket.off("team:deleted", handleTeamDeleted);
    };
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        apiGet<any[]>("/users").catch(() => []),
        apiGet<any[]>("/teams").catch(() => []),
      ]);

      const usersData: UserRecord[] = usersRes.map((u: any) => {
        const userTeams = teamsRes
          .filter((t: any) =>
            t.members?.some((m: any) => m.userId === u.id) &&
            t.name.toLowerCase() !== "personal recordings"
          )
          .map((t: any) => t.name);

        // Helper function to format last active time
        const formatLastActive = (lastActiveAt: string | Date | null | undefined, isOnline: boolean): string => {
          if (isOnline) return "Now";
          if (!lastActiveAt) return "Never";
          
          const lastActiveDate = new Date(lastActiveAt);
          const now = new Date();
          const diffMs = now.getTime() - lastActiveDate.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);
          
          if (diffMins < 1) return "Just now";
          if (diffMins < 60) return `${diffMins} min ago`;
          if (diffHours < 24) return `${diffHours}h ago`;
          if (diffDays < 7) return `${diffDays}d ago`;
          return lastActiveDate.toLocaleDateString();
        };

        const isOnline = isUserOnline(u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role || "employee",
          status: isOnline ? "online" : "offline",
          lastActive: formatLastActive(u.lastActiveAt, isOnline),
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

      const current = Array.isArray(usersRes) ? usersRes.find((u: any) => u.id === user?.id) : null;
      const resolvedOrgId = current?.organizationId || (Array.isArray(usersRes) ? usersRes[0]?.organizationId : null);
      if (resolvedOrgId) {
        setOrgId(resolvedOrgId);
        const org = await apiGet<any>(`/organizations/${resolvedOrgId}`).catch(() => null);
        if (org) {
          console.log('Loaded org data:', org);
          console.log('Org settings:', org.settings);
          setOrgSettingsJson(org.settings || {});
          setOrgSettings({
            name: org.name || "",
            allowedDomains: Array.isArray(org.allowedDomains) ? org.allowedDomains.join(", ") : org.domain || "",
            defaultTeam: (org.settings?.defaultTeamId as string) || "",
            logo: org.logo || "",
            departments: Array.isArray(org.settings?.departments)
              ? org.settings.departments.map((d: any) => ({
                  name: d.name || (typeof d === 'string' ? d : "Unnamed"),
                  positions: Array.isArray(d.positions) ? d.positions : []
                }))
              : [],
          });
          if (org.settings?.securityPolicy) {
            setSecuritySettings((prev) => ({ ...prev, ...(org.settings.securityPolicy as any) }));
          }
        }

        try {
          const perms = await apiGet<PermissionRecord[]>(`/permissions/${resolvedOrgId}`).catch(() => []);
          if (Array.isArray(perms) && perms.length > 0) {
            setPermissionsData(perms);
          }
        } catch { /* ignore */ }

        try {
          const invitesRes = await apiGet<InviteRecord[]>(`/invites/organization/${resolvedOrgId}`).catch(() => []);
          if (Array.isArray(invitesRes)) {
            setInvites(invitesRes);
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
      toast.error("Failed to load admin data");
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
      const payload = {
        name: orgSettings.name,
        logo: orgSettings.logo || null,
        allowedDomains,
        settings: {
          ...(orgSettingsJson || {}),
          defaultTeamId: orgSettings.defaultTeam || null,
          departments: orgSettings.departments,
        },
      };
      console.log('Saving org settings:', JSON.stringify(payload, null, 2));
      const result = await apiPatch(`/organizations/${orgId}`, payload);
      console.log('Save result:', result);
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

  const getPermValue = (role: string, resource: string, action: string) => {
    if (role === "org_owner") return true;
    const found = permissionsData.find(
      (p) => p.role === role && p.resource === resource && p.action === action,
    );
    return found ? found.allowed : false;
  };

  const togglePerm = (role: string, resource: string, action: string) => {
    if (role === "org_owner") return;
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
      const perms = await apiGet<PermissionRecord[]>(`/permissions/${orgId}`).catch(() => []);
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

  const handleAddDepartment = () => {
    if (newDepartment.trim() && !orgSettings.departments.find(d => d.name.toLowerCase() === newDepartment.trim().toLowerCase())) {
      setOrgSettings({
        ...orgSettings,
        departments: [...orgSettings.departments, { name: newDepartment.trim(), positions: [] }],
      });
      setNewDepartment("");
    }
  };

  const handleAddPosition = (deptName: string) => {
    const val = newPositionState[deptName]?.trim();
    if (val) {
      const deptIdx = orgSettings.departments.findIndex(d => d.name === deptName);
      if (deptIdx >= 0 && !orgSettings.departments[deptIdx].positions.includes(val)) {
        const updatedDepts = [...orgSettings.departments];
        updatedDepts[deptIdx].positions.push(val);
        setOrgSettings({ ...orgSettings, departments: updatedDepts });
        setNewPositionState({ ...newPositionState, [deptName]: "" });
      }
    }
  };

  const handleRemoveDepartment = (deptName: string) => {
    setOrgSettings({
      ...orgSettings,
      departments: orgSettings.departments.filter(d => d.name !== deptName)
    });
  };

  const handleRemovePosition = (deptName: string, position: string) => {
    const deptIdx = orgSettings.departments.findIndex(d => d.name === deptName);
    if (deptIdx >= 0) {
      const updatedDepts = [...orgSettings.departments];
      updatedDepts[deptIdx].positions = updatedDepts[deptIdx].positions.filter(p => p !== position);
      setOrgSettings({ ...orgSettings, departments: updatedDepts });
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

  const usersByRole = useMemo(() => {
    const counts: Record<string, number> = {};
    ROLES_LIST.forEach((r) => {
      counts[r] = users.filter((u) => {
        const ur = (u.role || "").toLowerCase();
        if (r === "admin") return ur === "admin" || ur === "org_owner";
        if (r === "org_owner") return ur === "org_owner";
        return ur === r;
      }).length;
    });
    return counts;
  }, [users]);

  useEffect(() => {
    if (user && !canAccess && activeSection !== "directory") {
      setActiveSection("directory");
    }
  }, [user, canAccess, activeSection]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Sticky Header */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[2000px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 space-y-3 sm:space-y-4">
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 border-border/60 bg-background/50 hover:bg-accent" onClick={loadData}>
                          <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refresh</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 sm:h-9 gap-1.5 px-2.5 text-[11px] sm:text-xs border-border/60 bg-background/50 hover:bg-accent">
                          <Download className="w-3.5 h-3.5 shrink-0" /><span className="hidden sm:inline">Export</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>ส่งออกรายชื่อ</TooltipContent>
                    </Tooltip>
                  </>
                )}
                {canManageOrg && (
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

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[2000px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-full flex flex-col">
            {/* Toolbar */}
            <div className="py-4 sm:py-6 space-y-4">
              {/* Tab Pills */}
              {canAccess && (
                <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/50 backdrop-blur-sm w-fit overflow-x-auto">
                  {adminSections.map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={cn(
                          "px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap",
                          activeSection === s.id
                            ? "bg-background shadow-md ring-1 ring-border/50 text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5", activeSection === s.id && "text-primary")} />
                        <span className="hidden sm:inline">{s.label}</span>
                        <span className="sm:hidden">{s.label.split(" ")[0]}</span>
                        {s.id === "users" && users.length > 0 && (
                          <span className={cn("ml-0.5 text-xs font-semibold px-1.5 py-0.5 rounded", activeSection === s.id ? "bg-primary/15 text-primary" : "bg-muted/80 text-muted-foreground")}>{users.length}</span>
                        )}
                        {s.id === "invites" && inviteCounts.pending > 0 && (
                          <span className={cn("ml-0.5 text-xs font-semibold px-1.5 py-0.5 rounded", activeSection === s.id ? "bg-amber-500/15 text-amber-600" : "bg-amber-500/10 text-amber-500")}>{inviteCounts.pending}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Search & Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] sm:min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="ค้นหาผู้ใช้..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10 bg-background/50 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/20" />
                  {searchQuery && (
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setSearchQuery("")}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {activeSection === "users" && (
                  <div className="flex items-center gap-2">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="h-10 w-28 sm:w-32 bg-background/50 border-border/60">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-10 w-28 sm:w-32 bg-background/50 border-border/60">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="away">Away</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto pb-6">
              {activeSection === "directory" && (
                <DirectoryGrid users={filteredUsers} />
              )}

              {activeSection === "users" && canManageOrg && (
                <UserManagementTable
                  users={filteredUsers}
                  roleCounts={roleCounts}
                  onlineCount={users.filter((u) => isUserOnline(u.id)).length}
                  onEditUser={handleEditUser}
                  onToggleStatus={handleToggleUserStatus}
                  onDeleteUser={(user) => {
                    setDeletingUser(user);
                    setShowDeleteConfirm(true);
                  }}
                  isUserOnline={isUserOnline}
                />
              )}

              {activeSection === "invites" && (
                <InvitesTable
                  invites={invites}
                  inviteCounts={inviteCounts}
                  onCancelInvite={handleCancelInvite}
                />
              )}

              {activeSection === "roles" && canManageOrg && (
                <PermissionsMatrix
                  permissionsData={permissionsData}
                  permissionsDirty={permissionsDirty}
                  permSaving={permSaving}
                  usersByRole={usersByRole}
                  onTogglePerm={togglePerm}
                  onSave={handleSavePermissions}
                  onSeedDefaults={handleSeedDefaults}
                />
              )}

              {activeSection === "org" && canManageOrg && (
                <OrgSettingsPanel
                  orgSettings={orgSettings}
                  teams={teams}
                  logoUploading={logoUploading}
                  newDepartment={newDepartment}
                  newPositionState={newPositionState}
                  onOrgSettingsChange={setOrgSettings}
                  onLogoUpload={handleLogoUpload}
                  onNewDepartmentChange={setNewDepartment}
                  onNewPositionChange={(dept, val) => setNewPositionState(prev => ({ ...prev, [dept]: val }))}
                  onAddDepartment={handleAddDepartment}
                  onAddPosition={handleAddPosition}
                  onRemoveDepartment={handleRemoveDepartment}
                  onRemovePosition={handleRemovePosition}
                  onSave={handleSaveOrgSettings}
                />
              )}

              {activeSection === "security" && canManageOrg && (
                <>
                  <SecurityPolicyPanel
                    settings={securitySettings}
                    onSettingsChange={setSecuritySettings}
                    onSave={handleSaveSecuritySettings}
                  />
                  <div className="mt-8">
                    <AuditLogsPanel
                      logs={filteredAuditLogs}
                      filters={auditFilters}
                      loading={auditLogsLoading}
                      error={auditLogsError}
                      stats={auditStats}
                      onLoad={loadAuditLogs}
                      onFilterChange={setAuditFilters}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dialogs */}
        <EditUserDialog
          open={showEditUser}
          onOpenChange={setShowEditUser}
          user={editingUser}
          orgSettings={orgSettings}
          onUserChange={setEditingUser}
          onSave={handleSaveUser}
        />

        <DeleteUserDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          userName={deletingUser?.name || null}
          onDelete={handleDeleteUser}
        />

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
