import { useState } from "react";
import {
  Search,
  MoreHorizontal,
  Shield,
  Users,
  UserPlus,
  Key,
  Building,
  Mail,
  Ban,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  Edit,
  Trash2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusIndicator from "@/components/shared/StatusIndicator";
import InviteUserDialog from "@/components/dialogs/InviteUserDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "online" | "busy" | "away" | "offline";
  lastActive: string;
  isActive: boolean;
  teams: string[];
  joinedDate: string;
}

const users: UserRecord[] = [
  { id: "1", name: "สมชาย K.", email: "somchai@acme.com", role: "Admin", status: "online", lastActive: "Now", isActive: true, teams: ["Engineering"], joinedDate: "Jan 15, 2025" },
  { id: "2", name: "อริสา P.", email: "arisa@acme.com", role: "Manager", status: "online", lastActive: "Now", isActive: true, teams: ["Design"], joinedDate: "Jan 20, 2025" },
  { id: "3", name: "จิรวัฒน์ W.", email: "jirawat@acme.com", role: "Member", status: "busy", lastActive: "Now", isActive: true, teams: ["Engineering"], joinedDate: "Mar 5, 2025" },
  { id: "4", name: "พิมพ์ L.", email: "pim@acme.com", role: "Member", status: "away", lastActive: "15m ago", isActive: true, teams: ["Design", "Engineering"], joinedDate: "Feb 10, 2025" },
  { id: "5", name: "ธนา S.", email: "thana@acme.com", role: "Member", status: "online", lastActive: "Now", isActive: true, teams: ["Engineering"], joinedDate: "Feb 15, 2025" },
  { id: "6", name: "นภา M.", email: "napa@acme.com", role: "Member", status: "offline", lastActive: "2h ago", isActive: true, teams: ["Engineering"], joinedDate: "Apr 1, 2025" },
  { id: "7", name: "วิภา T.", email: "wipa@acme.com", role: "Admin", status: "offline", lastActive: "1d ago", isActive: false, teams: ["Operations"], joinedDate: "Jan 15, 2025" },
  { id: "8", name: "กิตติ R.", email: "kitti@acme.com", role: "Member", status: "online", lastActive: "Now", isActive: true, teams: ["Operations"], joinedDate: "Mar 20, 2025" },
  { id: "9", name: "ปรียา S.", email: "preeya@acme.com", role: "Member", status: "online", lastActive: "Now", isActive: true, teams: ["Operations"], joinedDate: "Apr 15, 2025" },
];

const roleColors: Record<string, string> = {
  Admin: "bg-destructive/10 text-destructive",
  Manager: "bg-primary/10 text-primary",
  Member: "bg-secondary text-secondary-foreground",
};

const auditLogs = [
  { id: 1, user: "สมชาย K.", action: "Invited user preeya@acme.com", time: "Today 9:15 AM", type: "user" },
  { id: 2, user: "อริสา P.", action: "Created channel #design-system", time: "Today 9:00 AM", type: "channel" },
  { id: 3, user: "สมชาย K.", action: "Changed role of จิรวัฒน์ W. to Member", time: "Yesterday 4:30 PM", type: "role" },
  { id: 4, user: "วิภา T.", action: "Deactivated account", time: "Yesterday 2:00 PM", type: "user" },
  { id: 5, user: "สมชาย K.", action: "Updated security policy", time: "Feb 7, 2026", type: "security" },
  { id: 6, user: "สมชาย K.", action: "Created team 'Operations'", time: "Feb 1, 2026", type: "team" },
];

const adminSections = [
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Roles & Permissions", icon: Shield },
  { id: "org", label: "Organization", icon: Building },
  { id: "security", label: "Security Policy", icon: Key },
  { id: "audit", label: "Audit Log", icon: Eye },
];

export default function Admin() {
  const [activeSection, setActiveSection] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex h-screen">
      <InviteUserDialog open={showInvite} onOpenChange={setShowInvite} />

      <div className="w-56 border-r shrink-0 p-4">
        <h1 className="text-lg font-semibold text-foreground mb-4 px-2">Admin</h1>
        <nav className="space-y-0.5">
          {adminSections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                activeSection === s.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeSection === "users" && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-6 h-14 border-b shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-foreground">Users Management</h2>
                <Badge variant="secondary" className="text-xs">{users.length} users</Badge>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 w-48 text-sm" />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-8 w-28 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
                <Button size="sm" onClick={() => setShowInvite(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />Invite User
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="border rounded-lg overflow-hidden">
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
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {user.name.split(" ").map(n => n[0]).join("")}
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
                        <td className="px-4 py-3"><Badge className={cn("text-xs", roleColors[user.role])}>{user.role}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {user.teams.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.isActive ? "secondary" : "outline"} className="text-xs">
                            {user.isActive ? <><CheckCircle className="w-3 h-3 mr-1" />Active</> : <><XCircle className="w-3 h-3 mr-1" />Deactivated</>}
                          </Badge>
                        </td>
                        <td className="px-4 py-3"><span className="text-sm text-muted-foreground">{user.lastActive}</span></td>
                        <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{user.joinedDate}</span></td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem><Edit className="w-4 h-4 mr-2" />Edit User</DropdownMenuItem>
                              <DropdownMenuItem><Key className="w-4 h-4 mr-2" />Reset Password</DropdownMenuItem>
                              <DropdownMenuItem><Shield className="w-4 h-4 mr-2" />Change Role</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive"><Ban className="w-4 h-4 mr-2" />{user.isActive ? "Deactivate" : "Reactivate"}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSection === "roles" && (
          <div className="p-6 max-w-3xl space-y-6">
            <h2 className="text-xl font-bold text-foreground">Roles & Permissions</h2>
            <p className="text-sm text-muted-foreground">Define what each role can do in the organization</p>
            {[
              { role: "Admin", desc: "Full access to all features and settings", users: 2, perms: ["Manage users", "Manage teams", "View all reports", "Org settings", "Security policy", "Create meetings", "All channels", "Audit log"] },
              { role: "Manager", desc: "Team management, reporting, and moderation", users: 1, perms: ["Manage own team", "View team reports", "Create meetings", "Moderate channels", "Invite members"] },
              { role: "Member", desc: "Standard access for everyday work", users: 6, perms: ["Join meetings", "Chat in channels", "View/update own tasks", "Update own profile"] },
            ].map((r) => (
              <Card key={r.role}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge className={cn("text-xs", roleColors[r.role])}>{r.role}</Badge>
                      <span className="text-xs text-muted-foreground">{r.users} users</span>
                    </div>
                    <Button variant="outline" size="sm"><Edit className="w-3.5 h-3.5 mr-1" />Edit</Button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{r.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.perms.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-success" />{p}
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
                  <Input defaultValue="Acme Corporation" className="mt-1" />
                </div>
                <div>
                  <Label>Allowed Email Domains</Label>
                  <Input defaultValue="@acme.com" className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">Only emails from these domains can be invited. Separate with comma.</p>
                </div>
                <div>
                  <Label>Default Team for New Members</Label>
                  <Select defaultValue="none">
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default team</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "security" && (
          <div className="p-6 max-w-2xl space-y-6">
            <h2 className="text-xl font-bold text-foreground">Security Policy</h2>
            <Card>
              <CardHeader><CardTitle className="text-base">Password Policy</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Minimum Password Length</Label>
                    <Input type="number" defaultValue="8" className="mt-1" />
                  </div>
                  <div>
                    <Label>Session Timeout (minutes)</Label>
                    <Input type="number" defaultValue="480" className="mt-1" />
                  </div>
                </div>
                {[
                  { label: "Require uppercase letter", defaultChecked: true },
                  { label: "Require lowercase letter", defaultChecked: true },
                  { label: "Require number", defaultChecked: true },
                  { label: "Require special character", defaultChecked: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <Switch defaultChecked={item.defaultChecked} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Meeting Security</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Enable Waiting Room by default", desc: "New meetings will have waiting room enabled", defaultChecked: true },
                  { label: "Only host can share screen", desc: "Participants need host permission to share", defaultChecked: false },
                  { label: "Lock meetings automatically after start", desc: "Prevent uninvited participants", defaultChecked: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.defaultChecked} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Button>Save Policy</Button>
          </div>
        )}

        {activeSection === "audit" && (
          <div className="p-6 max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Audit Log</h2>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Eye className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{log.user}</span>{" "}
                          <span className="text-muted-foreground">{log.action}</span>
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{log.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
