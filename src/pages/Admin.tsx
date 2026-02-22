import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { usePresence } from "@/hooks/usePresence";
import {
  Search,
  MoreHorizontal,
  Shield,
  Users,
  UserPlus,
  Key,
  Building,
  Ban,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  Edit,
  Trash2,
  Save,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import StatusIndicator from "@/components/shared/StatusIndicator";
import InviteUserDialog from "@/components/dialogs/InviteUserDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHero, PageShell } from "@/components/shared/PageShell";

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
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  user?: { name: string; email: string };
  details: any;
  createdAt: string;
}

const roleColors: Record<string, string> = {
  Admin: "bg-destructive/10 text-destructive",
  Manager: "bg-primary/10 text-primary",
  Member: "bg-secondary text-secondary-foreground",
  employee: "bg-secondary text-secondary-foreground",
  admin: "bg-destructive/10 text-destructive",
  manager: "bg-primary/10 text-primary",
};

const adminSections = [
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Roles & Permissions", icon: Shield },
  { id: "org", label: "Organization", icon: Building },
  { id: "security", label: "Security Policy", icon: Key },
  { id: "audit", label: "Audit Log", icon: Eye },
];

export default function Admin() {
  const { user } = useAuth();
  const { isUserOnline } = usePresence();
  const [activeSection, setActiveSection] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgSettings, setOrgSettings] = useState({
    name: "",
    allowedDomains: "",
    defaultTeam: "",
  });
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgSettingsJson, setOrgSettingsJson] = useState<any>({});
  const [securitySettings, setSecuritySettings] = useState({
    minPasswordLength: 8,
    sessionTimeout: 480,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
    waitingRoomDefault: true,
    onlyHostShareScreen: false,
    lockMeetingsAuto: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, teamsRes, auditLogsRes] = await Promise.all([
        apiGet<any[]>("/users").catch(() => []),
        apiGet<any[]>("/teams").catch(() => []),
        apiGet<any[]>("/audit-logs?limit=100").catch(() => []),
      ]);

      const usersData: UserRecord[] = usersRes.map((u: any) => {
        const userTeams = teamsRes
          .filter((t: any) => t.members?.some((m: any) => m.userId === u.id))
          .map((t: any) => t.name);

        const roleMap: Record<string, string> = {
          org_owner: "Admin",
          admin: "Admin",
          manager: "Manager",
          employee: "Member",
          member: "Member",
        };

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: roleMap[u.role] || "Member",
          status: isUserOnline(u.id) ? "online" : (u.status || "offline"),
          lastActive: "Now",
          isActive: u.isActive !== false,
          teams: userTeams,
          joinedDate: new Date(u.createdAt).toLocaleDateString(),
          createdAt: u.createdAt,
        };
      });

      setUsers(usersData);
      setTeams(teamsRes);
      setAuditLogs(auditLogsRes || []);

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
          });
          // Hydrate security settings if present
          if (org.settings?.securityPolicy) {
            setSecuritySettings((prev) => ({ ...prev, ...(org.settings.securityPolicy as any) }));
          }
        }
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
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
        role: editingUser.role.toLowerCase(),
        isActive: editingUser.isActive,
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
        allowedDomains,
        settings: {
          ...(orgSettingsJson || {}),
          defaultTeamId: orgSettings.defaultTeam || null,
        },
      });
      toast.success("Organization settings saved");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
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

  const roleCounts = useMemo(() => {
    return {
      Admin: users.filter((u) => u.role === "Admin").length,
      Manager: users.filter((u) => u.role === "Manager").length,
      Member: users.filter((u) => u.role === "Member").length,
    };
  }, [users]);

  const canAccess = useMemo(() => {
    const r = (user?.role || "").toLowerCase();
    return r.includes("admin") || r.includes("manager") || r.includes("org_owner");
  }, [user?.role]);

  if (!canAccess) {
    return (
      <PageShell>
        <PageHero
          title={<span className="gradient-text">Admin</span>}
          description="You don’t have permission to view this page."
        />
        <div className="rounded-2xl border bg-card/70 p-6 text-sm text-muted-foreground">
          Ask an admin to grant you access.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <InviteUserDialog open={showInvite} onOpenChange={setShowInvite} />

      <PageHero
        title={<span className="gradient-text">Admin Console</span>}
        description="Manage users, roles, organization settings, and audit logs."
        meta={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-5 text-[10px]">
              {users.length} users
            </Badge>
            {loading && (
              <Badge variant="outline" className="h-5 text-[10px]">
                Loading…
              </Badge>
            )}
          </div>
        }
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-64 pl-9 bg-background/40"
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setShowInvite(true)} className="gradient-primary shadow-sm gap-2">
              <UserPlus className="h-4 w-4" />
              Invite
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Nav */}
        <Card className="lg:col-span-3 border bg-card/70 shadow-sm h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Sections</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {adminSections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  activeSection === s.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <s.icon className="w-4 h-4" />
                <span className="flex-1 text-left">{s.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {s.id === "users"
                    ? users.length
                    : s.id === "audit"
                    ? auditLogs.length
                    : ""}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Content */}
        <div className="lg:col-span-9 space-y-4">
        {activeSection === "users" && (
          <Card className="border bg-card/70 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold">Users</CardTitle>
                  <p className="text-xs text-muted-foreground">Search, filter, and manage access.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-9 w-32 bg-background/40">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-32 bg-background/40">
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
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{users.length}</div>
                  <div className="text-xs text-muted-foreground">Total Users</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{roleCounts.Admin}</div>
                  <div className="text-xs text-muted-foreground">Admins</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{roleCounts.Manager}</div>
                  <div className="text-xs text-muted-foreground">Managers</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    {users.filter((u) => u.status === "online").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Online Now</div>
                </CardContent>
              </Card>
              </div>

              <div className="border rounded-xl overflow-hidden bg-background/40">
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
                            <Badge className={cn("text-xs", roleColors[user.role])}>
                              {user.role}
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
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Key className="w-4 h-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Shield className="w-4 h-4 mr-2" />
                                  Change Role
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
        )}

        {activeSection === "roles" && (
          <div className="p-6 max-w-3xl space-y-6">
            <h2 className="text-xl font-bold text-foreground">Roles & Permissions</h2>
            <p className="text-sm text-muted-foreground">
              Define what each role can do in the organization
            </p>
            {[
              {
                role: "Admin",
                desc: "Full access to all features and settings",
                users: roleCounts.Admin,
                perms: [
                  "Manage users",
                  "Manage teams",
                  "View all reports",
                  "Org settings",
                  "Security policy",
                  "Create meetings",
                  "All channels",
                  "Audit log",
                ],
              },
              {
                role: "Manager",
                desc: "Team management, reporting, and moderation",
                users: roleCounts.Manager,
                perms: [
                  "Manage own team",
                  "View team reports",
                  "Create meetings",
                  "Moderate channels",
                  "Invite members",
                ],
              },
              {
                role: "Member",
                desc: "Standard access for everyday work",
                users: roleCounts.Member,
                perms: [
                  "Join meetings",
                  "Chat in channels",
                  "View/update own tasks",
                  "Update own profile",
                ],
              },
            ].map((r) => (
              <Card key={r.role}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge className={cn("text-xs", roleColors[r.role])}>{r.role}</Badge>
                      <span className="text-xs text-muted-foreground">{r.users} users</span>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{r.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.perms.map((p) => (
                      <Badge
                        key={p}
                        variant="secondary"
                        className="text-xs flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3 text-success" />
                        {p}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeSection === "org" && (
          <div className="p-6 max-w-2xl space-y-6">
            <h2 className="text-xl font-bold text-foreground">Organization Settings</h2>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label>Organization Name</Label>
                  <Input
                    value={orgSettings.name}
                    onChange={(e) =>
                      setOrgSettings({ ...orgSettings, name: e.target.value })
                    }
                    className="mt-1"
                    placeholder="Acme Corporation"
                  />
                </div>
                <div>
                  <Label>Allowed Email Domains</Label>
                  <Input
                    value={orgSettings.allowedDomains}
                    onChange={(e) =>
                      setOrgSettings({ ...orgSettings, allowedDomains: e.target.value })
                    }
                    className="mt-1"
                    placeholder="@acme.com, @company.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Only emails from these domains can be invited. Separate with comma.
                  </p>
                </div>
                <div>
                  <Label>Default Team for New Members</Label>
                  <Select
                    value={orgSettings.defaultTeam}
                    onValueChange={(value) =>
                      setOrgSettings({ ...orgSettings, defaultTeam: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
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
                <Button onClick={handleSaveOrgSettings}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "security" && (
          <div className="p-6 max-w-2xl space-y-6">
            <h2 className="text-xl font-bold text-foreground">Security Policy</h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Password Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      className="mt-1"
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
                      className="mt-1"
                    />
                  </div>
                </div>
                {[
                  {
                    key: "requireUppercase",
                    label: "Require uppercase letter",
                  },
                  {
                    key: "requireLowercase",
                    label: "Require lowercase letter",
                  },
                  {
                    key: "requireNumber",
                    label: "Require number",
                  },
                  {
                    key: "requireSpecial",
                    label: "Require special character",
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1">
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
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meeting Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    key: "waitingRoomDefault",
                    label: "Enable Waiting Room by default",
                    desc: "New meetings will have waiting room enabled",
                  },
                  {
                    key: "onlyHostShareScreen",
                    label: "Only host can share screen",
                    desc: "Participants need host permission to share",
                  },
                  {
                    key: "lockMeetingsAuto",
                    label: "Lock meetings automatically after start",
                    desc: "Prevent uninvited participants",
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={
                        securitySettings[item.key as keyof typeof securitySettings] as boolean
                      }
                      onCheckedChange={(checked) =>
                        setSecuritySettings({
                          ...securitySettings,
                          [item.key]: checked,
                        })
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Button onClick={handleSaveSecuritySettings}>
              <Save className="w-4 h-4 mr-2" />
              Save Policy
            </Button>
          </div>
        )}

        {activeSection === "audit" && (
          <div className="p-6 max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Audit Log</h2>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="divide-y">
                    {auditLogs.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No audit logs found
                      </div>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Eye className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">
                              <span className="font-medium">
                                {log.user?.name || "Unknown User"}
                              </span>{" "}
                              <span className="text-muted-foreground">{log.action}</span>{" "}
                              <span className="text-muted-foreground">{log.entity}</span>
                            </p>
                            {log.details && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {JSON.stringify(log.details)}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
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
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
    </PageShell>
  );
}
