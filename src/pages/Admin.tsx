import { useState } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  Shield,
  Users,
  UserPlus,
  Settings,
  Mail,
  Ban,
  Key,
  Building,
  Globe,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusIndicator from "@/components/shared/StatusIndicator";

const users = [
  { id: "1", name: "สมชาย K.", email: "somchai@acme.com", role: "Admin", status: "online" as const, lastActive: "Now", isActive: true },
  { id: "2", name: "อริสา P.", email: "arisa@acme.com", role: "Manager", status: "online" as const, lastActive: "Now", isActive: true },
  { id: "3", name: "จิรวัฒน์ W.", email: "jirawat@acme.com", role: "Member", status: "busy" as const, lastActive: "Now", isActive: true },
  { id: "4", name: "พิมพ์ L.", email: "pim@acme.com", role: "Member", status: "away" as const, lastActive: "15m ago", isActive: true },
  { id: "5", name: "ธนา S.", email: "thana@acme.com", role: "Member", status: "online" as const, lastActive: "Now", isActive: true },
  { id: "6", name: "นภา M.", email: "napa@acme.com", role: "Member", status: "offline" as const, lastActive: "2h ago", isActive: true },
  { id: "7", name: "วิภา T.", email: "wipa@acme.com", role: "Admin", status: "offline" as const, lastActive: "1d ago", isActive: false },
];

const roleColors: Record<string, string> = {
  Admin: "bg-destructive/10 text-destructive",
  Manager: "bg-primary/10 text-primary",
  Member: "bg-secondary text-secondary-foreground",
};

const adminSections = [
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Roles & Permissions", icon: Shield },
  { id: "org", label: "Organization", icon: Building },
  { id: "security", label: "Security Policy", icon: Key },
];

export default function Admin() {
  const [activeSection, setActiveSection] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex h-screen">
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
              <h2 className="font-semibold text-foreground">Users Management</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 w-48 text-sm" />
                </div>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite User
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
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Last Active</th>
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
                        <td className="px-4 py-3">
                          <Badge className={cn("text-xs", roleColors[user.role])}>{user.role}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.isActive ? "secondary" : "outline"} className="text-xs">
                            {user.isActive ? "Active" : "Deactivated"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">{user.lastActive}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
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
            {[
              { role: "Admin", desc: "Full access to all features", perms: ["Manage users", "Manage teams", "View reports", "Org settings", "Create meetings", "All channels"] },
              { role: "Manager", desc: "Team management and reporting", perms: ["Manage own team", "View team reports", "Create meetings", "All channels"] },
              { role: "Member", desc: "Standard access", perms: ["Join meetings", "Chat", "View tasks", "Update own profile"] },
            ].map((r) => (
              <Card key={r.role}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{r.role}</h3>
                      <p className="text-sm text-muted-foreground">{r.desc}</p>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {r.perms.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
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
                  <label className="text-sm font-medium text-foreground">Organization Name</label>
                  <Input defaultValue="Acme Corporation" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Allowed Email Domains</label>
                  <Input defaultValue="@acme.com" className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">Only emails from these domains can be invited</p>
                </div>
                <Button>Save</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "security" && (
          <div className="p-6 max-w-2xl space-y-6">
            <h2 className="text-xl font-bold text-foreground">Security Policy</h2>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Minimum Password Length</label>
                  <Input type="number" defaultValue="8" className="mt-1 w-24" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Session Timeout (minutes)</label>
                  <Input type="number" defaultValue="480" className="mt-1 w-24" />
                </div>
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">Require uppercase in password</p>
                  </div>
                  <input type="checkbox" defaultChecked className="accent-primary" />
                </div>
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">Require special character</p>
                  </div>
                  <input type="checkbox" defaultChecked className="accent-primary" />
                </div>
                <Button>Save Policy</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
