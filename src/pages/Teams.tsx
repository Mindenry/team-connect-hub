import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Settings,
  UserPlus,
  Shield,
  Crown,
  Hash,
  Video,
  CheckSquare,
  Trash2,
  Edit,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusIndicator from "@/components/shared/StatusIndicator";
import InviteUserDialog from "@/components/dialogs/InviteUserDialog";
import CreateChannelDialog from "@/components/dialogs/CreateChannelDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface TeamMember {
  name: string;
  initials: string;
  email: string;
  role: "lead" | "member";
  status: "online" | "busy" | "away" | "offline";
  joinedDate: string;
}

interface TeamChannel {
  name: string;
  type: string;
  messages: number;
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  channels: TeamChannel[];
  activeTasks: number;
  createdDate: string;
}

export default function Teams() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const [teamsRes, tasksRes] = await Promise.all([
          fetch(`${API_BASE}/teams`).then((r) => r.json()),
          fetch(`${API_BASE}/tasks`).then((r) => r.json()),
        ]);

        const teamsWithData = await Promise.all(
          teamsRes.map(async (team: any) => {
            const membersRes = await fetch(`${API_BASE}/teams/${team.id}/members`).then((r) => r.json());
            const members = membersRes.map((m: any) => ({
              name: m.user.name,
              initials: m.user.name.split(" ").map((n: string) => n[0]).join(""),
              email: m.user.email,
              role: m.role === "admin" ? "lead" : "member",
              status: "online" as const,
              joinedDate: new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            }));

            const teamTasks = tasksRes.filter((t: any) => t.teamId === team.id);
            const activeTasks = teamTasks.filter((t: any) => t.status !== "done").length;

            return {
              id: team.id,
              name: team.name,
              description: team.description || "",
              members,
              channels: [],
              activeTasks,
              createdDate: new Date(team.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            };
          })
        );

        setTeams(teamsWithData);
        if (teamsWithData.length > 0 && !selectedTeam) {
          setSelectedTeam(teamsWithData[0].id);
        }
      } catch (err) {
        console.error("Failed to load teams:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, []);

  const handleCreateTeam = async () => {
    try {
      const res = await fetch(`${API_BASE}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName }),
      });
      if (res.ok) {
        setShowCreateTeam(false);
        setTeamName("");
        setTeamDescription("");
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to create team:", err);
    }
  };

  const activeTeam = teams.find((t) => t.id === selectedTeam);

  return (
    <div className="flex h-screen">
      <InviteUserDialog open={showInvite} onOpenChange={setShowInvite} />
      <CreateChannelDialog open={showCreateChannel} onOpenChange={setShowCreateChannel} />

      {/* Create Team Dialog */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Create Team</DialogTitle>
            <DialogDescription>Create a new team for your organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Team Name</Label><Input placeholder="e.g., Marketing" className="mt-1" value={teamName} onChange={(e) => setTeamName(e.target.value)} /></div>
            <div><Label>Description</Label><Textarea placeholder="What does this team do?" className="mt-1" value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateTeam(false); setTeamName(""); setTeamDescription(""); }}>Cancel</Button>
            <Button onClick={handleCreateTeam} disabled={!teamName.trim()}>Create Team</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team List */}
      <div className="w-72 border-r flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <h1 className="text-lg font-semibold text-foreground">Teams</h1>
          <Button size="sm" onClick={() => setShowCreateTeam(true)}><Plus className="w-4 h-4 mr-1" />New</Button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 space-y-1">
          {loading ? (
            <div className="text-sm text-muted-foreground p-3">Loading...</div>
          ) : teams.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3">No teams yet</div>
          ) : (
            teams.filter((team) => team.name.toLowerCase().includes(searchQuery.toLowerCase())).map((team) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedTeam === team.id ? "bg-chat-active border border-primary/20" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{team.name}</p>
                  <p className="text-xs text-muted-foreground">{team.members.length} members · {team.activeTasks} tasks</p>
                </div>
              </div>
            </button>
            ))
          )}
        </div>
      </div>

      {/* Team Detail */}
      {activeTeam ? (
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">{activeTeam.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{activeTeam.description}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowInvite(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />Add Member
                </Button>
                <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2" />Edit</Button>
                <Button variant="outline" size="sm"><Settings className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="flex gap-6 mt-4">
              {[
                { icon: Users, label: "Members", value: activeTeam.members.length },
                { icon: Hash, label: "Channels", value: activeTeam.channels.length },
                { icon: CheckSquare, label: "Active Tasks", value: activeTeam.activeTasks },
                { icon: Video, label: "Meetings (week)", value: 4 },
                { icon: MessageSquare, label: "Messages (week)", value: 156 },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <stat.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{stat.label}:</span>
                  <span className="text-sm font-semibold text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            <Tabs defaultValue="members">
              <TabsList className="mb-4">
                <TabsTrigger value="members">Members ({activeTeam.members.length})</TabsTrigger>
                <TabsTrigger value="channels">Channels ({activeTeam.channels.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="space-y-2">
                {activeTeam.members.map((member) => (
                  <div key={member.name} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{member.initials}</AvatarFallback>
                      </Avatar>
                      <StatusIndicator status={member.status} className="absolute -bottom-0.5 -right-0.5 border-card" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">Joined {member.joinedDate}</span>
                    <Badge variant={member.role === "lead" ? "default" : "secondary"} className="text-xs">
                      {member.role === "lead" && <Crown className="w-3 h-3 mr-1" />}{member.role}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></Button>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="channels" className="space-y-2">
                <div className="flex justify-end mb-2">
                  <Button size="sm" variant="outline" onClick={() => setShowCreateChannel(true)}>
                    <Plus className="w-4 h-4 mr-2" />Add Channel
                  </Button>
                </div>
                {activeTeam.channels.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-3">No channels yet</div>
                ) : (
                  activeTeam.channels.map((ch) => (
                    <div key={ch.name} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">#{ch.name}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{ch.type}</Badge>
                      <span className="text-xs text-muted-foreground">{ch.messages} messages</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></Button>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Select a team to view details
        </div>
      )}
    </div>
  );
}
