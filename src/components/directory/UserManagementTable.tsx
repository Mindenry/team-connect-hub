import { motion } from "framer-motion";
import { Users, Crown, Shield, Activity, MoreHorizontal, CheckCircle, XCircle, Ban, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import StatusIndicator from "@/components/shared/StatusIndicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { roleColors, ROLE_LABELS } from "./types";
import { getInitials } from "./utils";
import type { UserRecord } from "./types";

interface UserManagementTableProps {
  users: UserRecord[];
  roleCounts: { Admin: number; Manager: number; Member: number };
  onlineCount: number;
  onEditUser: (user: UserRecord) => void;
  onToggleStatus: (user: UserRecord) => void;
  onDeleteUser: (user: UserRecord) => void;
  isUserOnline: (id: string) => boolean;
}

export function UserManagementTable({
  users,
  roleCounts,
  onlineCount,
  onEditUser,
  onToggleStatus,
  onDeleteUser,
  isUserOnline,
}: UserManagementTableProps) {
  const kpiCards = [
    { label: "Total Users", value: users.length, icon: Users, gradient: "from-blue-500/20 via-blue-500/10 to-blue-500/5", iconBg: "bg-blue-500/10", iconColor: "text-blue-600", borderColor: "border-blue-500/20" },
    { label: "Admins", value: roleCounts.Admin, icon: Crown, gradient: "from-amber-500/20 via-amber-500/10 to-amber-500/5", iconBg: "bg-amber-500/10", iconColor: "text-amber-600", borderColor: "border-amber-500/20" },
    { label: "Managers", value: roleCounts.Manager, icon: Shield, gradient: "from-purple-500/20 via-purple-500/10 to-purple-500/5", iconBg: "bg-purple-500/10", iconColor: "text-purple-600", borderColor: "border-purple-500/20" },
    { label: "Online Now", value: onlineCount, icon: Activity, gradient: "from-emerald-500/20 via-emerald-500/10 to-emerald-500/5", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600", borderColor: "border-emerald-500/20" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
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
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {kpiCards.map((kpi) => {
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

          {/* Users Table */}
          <div className="border border-border/60 rounded-xl overflow-hidden bg-background/40">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">User</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Teams</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Last Active</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Joined</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <StatusIndicator status={user.status} className="absolute -bottom-0.5 -right-0.5 border-card" />
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
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                        {user.teams.length > 2 && (
                          <Badge variant="outline" className="text-xs">+{user.teams.length - 2}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? "secondary" : "outline"} className="text-xs">
                        {user.isActive ? (
                          <><CheckCircle className="w-3 h-3 mr-1" />Active</>
                        ) : (
                          <><XCircle className="w-3 h-3 mr-1" />Deactivated</>
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditUser(user)}>
                            <Shield className="w-4 h-4 mr-2" />
                            Change Role / Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onToggleStatus(user)}>
                            <Ban className="w-4 h-4 mr-2" />
                            {user.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDeleteUser(user)} className="text-destructive">
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
  );
}
