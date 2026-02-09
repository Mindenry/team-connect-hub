import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import StatusIndicator from "@/components/shared/StatusIndicator";

interface TeamMember {
  name: string;
  initials: string;
  role: "lead" | "member";
  status: "online" | "busy" | "away" | "offline";
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  channels: number;
  activeTasks: number;
}

const teams: Team[] = [
  {
    id: "1",
    name: "Engineering",
    description: "Core development team — frontend, backend, and infrastructure",
    members: [
      { name: "สมชาย K.", initials: "SK", role: "lead", status: "online" },
      { name: "จิรวัฒน์ W.", initials: "JW", role: "member", status: "busy" },
      { name: "ธนา S.", initials: "TS", role: "member", status: "online" },
      { name: "นภา M.", initials: "NM", role: "member", status: "away" },
    ],
    channels: 5,
    activeTasks: 12,
  },
  {
    id: "2",
    name: "Design",
    description: "UI/UX design and user research",
    members: [
      { name: "อริสา P.", initials: "AP", role: "lead", status: "online" },
      { name: "พิมพ์ L.", initials: "PL", role: "member", status: "away" },
    ],
    channels: 3,
    activeTasks: 6,
  },
  {
    id: "3",
    name: "Operations",
    description: "HR, admin, and organizational management",
    members: [
      { name: "วิภา T.", initials: "VT", role: "lead", status: "offline" },
      { name: "กิตติ R.", initials: "KR", role: "member", status: "online" },
      { name: "ปรียา S.", initials: "PS", role: "member", status: "online" },
    ],
    channels: 2,
    activeTasks: 4,
  },
];

export default function Teams() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>("1");

  const activeTeam = teams.find((t) => t.id === selectedTeam);

  return (
    <div className="flex h-screen">
      {/* Team List */}
      <div className="w-72 border-r flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <h1 className="text-lg font-semibold text-foreground">Teams</h1>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 space-y-1">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedTeam === team.id
                  ? "bg-chat-active border border-primary/20"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{team.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {team.members.length} members · {team.activeTasks} tasks
                  </p>
                </div>
              </div>
            </button>
          ))}
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
                <Button variant="outline" size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-4">
              {[
                { icon: Users, label: "Members", value: activeTeam.members.length },
                { icon: Hash, label: "Channels", value: activeTeam.channels },
                { icon: CheckSquare, label: "Active Tasks", value: activeTeam.activeTasks },
                { icon: Video, label: "Meetings (week)", value: 4 },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <stat.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{stat.label}:</span>
                  <span className="text-sm font-semibold text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Members</h3>
            <div className="grid gap-2">
              {activeTeam.members.map((member) => (
                <div
                  key={member.name}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <StatusIndicator
                      status={member.status}
                      className="absolute -bottom-0.5 -right-0.5 border-card"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                  </div>
                  <Badge
                    variant={member.role === "lead" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {member.role === "lead" && <Crown className="w-3 h-3 mr-1" />}
                    {member.role}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
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
