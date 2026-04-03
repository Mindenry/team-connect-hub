export interface AuditLog {
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

export interface UserRecord {
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

export interface OrgSettings {
  name: string;
  allowedDomains: string;
  defaultTeam: string;
  logo: string;
  departments: { name: string; positions: string[] }[];
}

export interface SecuritySettings {
  minPasswordLength: number;
  sessionTimeout: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

export interface AuditFilters {
  entity: string;
  userId: string;
  action: string;
  search: string;
}

export interface InviteRecord {
  id: string;
  token: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface PermissionRecord {
  role: string;
  resource: string;
  action: string;
  allowed: boolean;
}

export const ROLE_LABELS: Record<string, string> = {
  org_owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  employee: "Member",
};

export const roleColors: Record<string, string> = {
  org_owner: "bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
  admin: "bg-gradient-to-r from-red-500/15 to-rose-500/10 text-red-700 dark:text-red-400 border border-red-500/20",
  manager: "bg-gradient-to-r from-blue-500/15 to-indigo-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
  employee: "bg-gradient-to-r from-emerald-500/10 to-green-500/5 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
};

export const adminSections = [
  { id: "directory", label: "Directory", icon: "Users", desc: "Member directory" },
  { id: "users", label: "Manage Users", icon: "Settings", desc: "User management" },
  { id: "invites", label: "Invites", icon: "Send", desc: "Invitation history" },
  { id: "roles", label: "Roles & Permissions", icon: "Shield", desc: "Access control" },
  { id: "org", label: "Organization", icon: "Building", desc: "Org settings" },
  { id: "security", label: "Security Policy", icon: "Key", desc: "Security rules" },
] as const;

export const RESOURCES = [
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
] as const;

export const ROLES_LIST = ["org_owner", "admin", "manager", "employee"] as const;
