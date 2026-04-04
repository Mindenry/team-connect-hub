import { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, UserPlus, RefreshCw, Users, Edit, Crown, IdCard, MessageSquare, CheckSquare, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusIndicator from "@/components/shared/StatusIndicator";
import AddTeamMemberDialog from "@/components/dialogs/AddTeamMemberDialog";
import CreateChannelDialog from "@/components/dialogs/CreateChannelDialog";
import InviteUserDialog from "@/components/dialogs/InviteUserDialog";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { getSocket } from "@/lib/websocket";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { usePresence } from "@/hooks/usePresence";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";

import {
  TeamSidebar,
  TeamHeader,
  TeamFilters,
  TeamDetailHeader,
  type Team,
  type TeamMember,
  type ViewMode,
  type TeamsFilter,
  type OrgStats,
  getRoleLabel,
  rolePriority,
  canPromoteToLead,
} from "@/components/teams";

export default function Teams() {
  const { isUserOnline } = usePresence();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDescription, setEditTeamDescription] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TeamsFilter>("all");
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("tc:teams:favorites");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const canSeeEmployees = !!user && ["org_owner", "admin", "manager"].includes((user.role || "").toLowerCase());
  const canManageTeamRoles = useMemo(() => canPromoteToLead(user?.role), [user?.role]);
  const orgRole = String(user?.role || "").toLowerCase();

  const persistFavorites = (ids: string[]) => {
    setFavoriteTeamIds(ids);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("tc:teams:favorites", JSON.stringify(ids));
      }
    } catch {}
  };

  const toggleFavorite = (teamId: string) => {
    persistFavorites(
      favoriteTeamIds.includes(teamId)
        ? favoriteTeamIds.filter((id) => id !== teamId)
        : [...favoriteTeamIds, teamId]
    );
  };

  const loadTeams = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [teamsResRaw, tasksResRaw, channelsResRaw] = await Promise.all([
        apiGet<any[]>("/teams").catch(() => []),
        apiGet<any[]>("/tasks").catch(() => []),
        apiGet<any[]>("/channels").catch(() => []),
      ]);

      const teamsRes = Array.isArray(teamsResRaw) ? teamsResRaw : [];
      const tasksRes = Array.isArray(tasksResRaw) ? tasksResRaw : [];
      const channelsRes = Array.isArray(channelsResRaw) ? channelsResRaw : [];

      if (teamsRes.length === 0) {
        setTeams([]);
        return;
      }

      const teamsWithData: Team[] = [];
      for (let i = 0; i < teamsRes.length; i++) {
        const team = teamsRes[i];
        if (i > 0) await new Promise((resolve) => setTimeout(resolve, 150));

        const membersRes = await apiGet<any[]>(`/teams/${team.id}/members`).catch(() => []);
        const members: TeamMember[] = Array.isArray(membersRes)
          ? membersRes
              .map((m: any) => {
                const userId = m.user?.id as string | undefined;
                const role = String(m.role || "member").toLowerCase();
                return {
                  name: m.user?.name || "Unknown",
                  initials: (m.user?.name || "U").split(" ").map((n: string) => n[0]).join(""),
                  email: m.user?.email || "",
                  role,
                  avatar: m.user?.avatar || undefined,
                  status: isUserOnline(userId) ? "online" : "offline",
                  joinedDate: new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                  userId,
                  department: m.user?.department,
                  position: m.user?.position,
                } as TeamMember;
              })
              .sort((a, b) => rolePriority(a.role) - rolePriority(b.role))
          : [];

        const teamChannels = Array.isArray(channelsRes)
          ? channelsRes
              .filter((c: any) => c.teamId === team.id)
              .map((c: any) => ({
                id: c.id,
                name: c.name,
                type: c.type || "general",
                messages: c._count?.messages || 0,
              }))
          : [];

        const teamTasks = Array.isArray(tasksRes) ? tasksRes.filter((t: any) => t.teamId === team.id) : [];
        const activeTasks = teamTasks.filter((t: any) => t.status !== "done").length;

        teamsWithData.push({
          id: team.id,
          name: team.name,
          description: team.description || "",
          members,
          channels: teamChannels,
          activeTasks,
          createdDate: new Date(team.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        });
      }

      setTeams(teamsWithData);
      if (teamsWithData.length > 0 && !selectedTeam) {
        setSelectedTeam(teamsWithData[0].id);
      }
    } catch (err) {
      console.error("Failed to load teams:", err);
      setTeams([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  // Real-time WebSocket listeners for teams
  useEffect(() => {
    const socket = getSocket();

    const handleTeamCreated = (team: any) => {
      console.log("[Teams] Real-time: team created", team.id);
      // Reload teams to get full data with members
      loadTeams();
    };

    const handleTeamUpdated = (team: any) => {
      console.log("[Teams] Real-time: team updated", team.id);
      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, name: team.name, description: team.description || t.description } : t)));
    };

    const handleTeamMemberAdded = (data: { teamId: string; member: any }) => {
      console.log("[Teams] Real-time: member added to team", data.teamId);
      // Reload the specific team to get updated members
      loadTeams();
    };

    const handleTaskCreated = (task: any) => {
      console.log("[Teams] Real-time: task created", task.id);
      if (task.teamId) {
        setTeams((prev) => prev.map((t) => (t.id === task.teamId ? { ...t, activeTasks: t.activeTasks + 1 } : t)));
      }
    };

    const handleTaskUpdated = (task: any) => {
      console.log("[Teams] Real-time: task updated", task.id);
      // Task counts might have changed, reload teams
      loadTeams();
    };

    const handleTaskDeleted = (taskId: string) => {
      console.log("[Teams] Real-time: task deleted", taskId);
      // Task counts might have changed, reload teams
      loadTeams();
    };

    socket.on("team:created", handleTeamCreated);
    socket.on("team:updated", handleTeamUpdated);
    socket.on("team:member:added", handleTeamMemberAdded);
    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:deleted", handleTaskDeleted);

    return () => {
      socket.off("team:created", handleTeamCreated);
      socket.off("team:updated", handleTeamUpdated);
      socket.off("team:member:added", handleTeamMemberAdded);
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:deleted", handleTaskDeleted);
    };
  }, []);

  const filteredTeams = useMemo(() => {
    let result = teams;
    if (activeFilter === "mine" && user?.id) {
      result = result.filter((team) => team.members.some((m) => m.userId === user.id));
    } else if (activeFilter === "favorites") {
      result = result.filter((team) => favoriteTeamIds.includes(team.id));
    } else if (activeFilter === "active") {
      result = result.filter((team) => team.activeTasks > 0);
    }
    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter(
      (team) => team.name.toLowerCase().includes(query) || team.description.toLowerCase().includes(query)
    );
  }, [teams, searchQuery, activeFilter, favoriteTeamIds, user?.id]);

  const orgStats: OrgStats = useMemo(() => {
    const totalTeams = teams.length;
    const uniqueMembers = new Set<string>();
    let totalActiveTasks = 0;
    let totalChannels = 0;
    teams.forEach((t) => {
      t.members.forEach((m) => {
        if (m.userId) uniqueMembers.add(m.userId);
      });
      totalActiveTasks += t.activeTasks;
      totalChannels += t.channels.length;
    });
    return { totalTeams, totalMembers: uniqueMembers.size, totalActiveTasks, totalChannels };
  }, [teams]);

  const handleCreateTeam = async () => {
    try {
      const newTeam = await apiPost<{ id: string; name: string; description?: string; createdAt: string }>("/teams", { name: teamName, description: teamDescription });
      setShowCreateTeam(false);
      setTeamName("");
      setTeamDescription("");
      toast.success("Team created successfully");
      const teamData: Team = {
        id: newTeam.id,
        name: newTeam.name,
        description: newTeam.description || "",
        members: [],
        channels: [],
        activeTasks: 0,
        createdDate: new Date(newTeam.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };
      setTeams((prev) => [...prev, teamData]);
      setSelectedTeam(newTeam.id);
    } catch (err: any) {
      console.error("Failed to create team:", err);
      toast.error(err.message || "Failed to create team");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure you want to delete this team? This action cannot be undone.")) return;
    try {
      await apiDelete(`/teams/${teamId}`);
      toast.success("Team deleted successfully");
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      if (selectedTeam === teamId) {
        setSelectedTeam(teams.length > 1 ? teams.find((t) => t.id !== teamId)?.id || null : null);
      }
      loadTeams();
    } catch (err: any) {
      console.error("Failed to delete team:", err);
      toast.error(err.message || "Failed to delete team");
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!confirm("Are you sure you want to remove this member from the team?")) return;
    try {
      await apiDelete(`/teams/${teamId}/members?userId=${encodeURIComponent(userId)}`);
      toast.success("Member removed successfully");
      loadTeams();
    } catch (err: any) {
      console.error("Failed to remove member:", err);
      toast.error(err.message || "Failed to remove member");
    }
  };

  const handleChangeMemberRole = async (teamId: string, userId: string, role: "lead" | "member") => {
    try {
      await apiPatch(`/teams/${teamId}/members/${userId}/role?role=${role}`);
      toast.success("อัปเดตบทบาทเรียบร้อย");
      loadTeams();
    } catch (err: any) {
      console.error("Failed to update member role:", err);
      toast.error(err.message || "Failed to update member role");
    }
  };

  const activeTeam = teams.find((t) => t.id === selectedTeam);
  const activeTeamManagerRole = activeTeam?.members.find((m) => m.userId === user?.id)?.role?.toLowerCase();
  const canChangeTeamMemberRoles = orgRole === "org_owner" || activeTeamManagerRole === "lead";
  const canRemoveTeamMembers = orgRole === "org_owner" || activeTeamManagerRole === "lead";
  const onlineMembers = activeTeam?.members.filter((m) => isUserOnline(m.userId || "")) || [];
  const totalMembers = activeTeam?.members.length || 0;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <TeamHeader
          orgStats={orgStats}
          onRefresh={() => loadTeams(true)}
          refreshing={refreshing}
          onInviteUser={() => setShowInviteUser(true)}
          onCreateTeam={() => setShowCreateTeam(true)}
          canSeeEmployees={canSeeEmployees}
        />

        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[2000px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-full flex flex-col">
            <div className="py-3 sm:py-4 md:py-5 space-y-3 sm:space-y-4">
              <TeamFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-5 pb-4 sm:pb-6 overflow-hidden min-h-0">
              {(!isMobile || selectedTeam === null) && (
                <TeamSidebar
                  teams={teams}
                  filteredTeams={filteredTeams}
                  selectedTeamId={selectedTeam}
                  favoriteTeamIds={favoriteTeamIds}
                  loading={loading}
                  viewMode={viewMode}
                  currentUserId={user?.id}
                  onSelectTeam={setSelectedTeam}
                  onToggleFavorite={toggleFavorite}
                  onCreateTeam={() => setShowCreateTeam(true)}
                />
              )}

              {(!isMobile || selectedTeam !== null) && (
                <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-3 sm:gap-4">
                  {loading ? (
                    <div className="space-y-4">
                      <Card className="border-border/60 bg-card/70">
                        <CardContent className="p-6 space-y-4">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-64" />
                          <div className="grid grid-cols-3 gap-4">
                            <Skeleton className="h-16 w-full rounded-xl" />
                            <Skeleton className="h-16 w-full rounded-xl" />
                            <Skeleton className="h-16 w-full rounded-xl" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : !activeTeam ? (
                    <Card className="border-dashed border-border/60 bg-card/60 flex-1 flex flex-col">
                      <CardContent className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                          <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">เลือกทีมจากด้านซ้ายเพื่อดูรายละเอียด</p>
                          <p className="text-xs text-muted-foreground max-w-sm">หรือสร้างทีมใหม่เพื่อเริ่มต้น workspace สำหรับทีมของคุณ</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <TeamDetailHeader
                        team={activeTeam}
                        onlineMembersCount={onlineMembers.length}
                        canManage={canChangeTeamMemberRoles}
                        onEdit={() => {
                          setEditTeamName(activeTeam.name);
                          setEditTeamDescription(activeTeam.description || "");
                          setShowEditTeam(true);
                        }}
                        onDelete={() => handleDeleteTeam(activeTeam.id)}
                      />

                      <Card className="border-border/70 bg-card/80 flex-1 min-h-0">
                        <CardContent className="p-4 flex flex-col min-h-0 h-full">
                          <Tabs defaultValue="people" className="flex flex-col min-h-0 h-full">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <TabsList className="bg-muted/40 border border-border/60">
                                <TabsTrigger value="people" className="text-xs">
                                  People
                                  <span className="ml-1 text-[10px] text-muted-foreground">({activeTeam.members.length})</span>
                                </TabsTrigger>
                              </TabsList>

                              {canChangeTeamMemberRoles && selectedTeam && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-2 px-3 text-xs bg-background/60 hover:bg-primary/5 border-border/60"
                                  onClick={() => setShowAddMember(true)}
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  เพิ่มสมาชิก
                                </Button>
                              )}
                            </div>

                            <TabsContent value="people" className="flex-1 min-h-0 mt-3">
                              <ScrollArea className="h-full">
                                <div className={cn("pr-2", viewMode === "gallery" ? "space-y-2" : "space-y-1.5")}>
                                  {activeTeam.members.map((member) => {
                                    const online = member.userId ? isUserOnline(member.userId) : false;
                                    const status: "online" | "busy" | "away" | "offline" = online ? "online" : "offline";
                                    const roleLabel = getRoleLabel(member.role);
                                    const isSelf = member.userId && user?.id && member.userId === user.id;

                                    return (
                                      <div
                                        key={member.userId ?? member.email}
                                        className={cn(
                                          "group rounded-xl border border-border/60 bg-background/80 flex items-center transition-all",
                                          "hover:border-primary/40 hover:bg-primary/5",
                                          viewMode === "gallery" ? "px-3 py-2.5 gap-3" : "px-2.5 py-2 gap-2"
                                        )}
                                      >
                                        <div className="relative">
                                          <Avatar className="h-9 w-9 ring-2 ring-background">
                                            <AvatarImage src={member.avatar} alt={member.name || "Avatar"} />
                                            <AvatarFallback className="bg-gradient-to-br from-primary/25 to-primary/10 text-[11px] font-semibold text-primary">
                                              {member.initials}
                                            </AvatarFallback>
                                            {member.userId && (
                                              <StatusIndicator status={status} className="absolute -bottom-0.5 -right-0.5 border-2 border-background" />
                                            )}
                                          </Avatar>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-0.5">
                                            <p className="text-xs font-medium text-foreground truncate">{member.name}</p>
                                            {member.role === "lead" ? (
                                              <Badge variant="secondary" className="h-4 px-1.5 text-[9px] gap-0.5 bg-primary/10 text-primary border-primary/20">
                                                <Crown className="w-3 h-3" />
                                                Lead
                                              </Badge>
                                            ) : (
                                              <Badge variant="secondary" className="h-4 px-1.5 text-[9px] gap-0.5">
                                                <IdCard className="w-3 h-3" />
                                                Member
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[9px] text-muted-foreground">
                                            <span>
                                              {member.position || roleLabel}
                                              {member.department ? ` · ${member.department}` : ""}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground/80">เข้าร่วม {member.joinedDate}</span>
                                          </div>
                                        </div>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <MoreHorizontal className="w-3.5 h-3.5" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            {member.userId && (
                                              <>
                                                <DropdownMenuItem onClick={() => navigate(`/chat?dm=${member.userId}`)}>
                                                  <MessageSquare className="w-4 h-4 mr-2" />
                                                  ส่งข้อความ
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => navigate(`/tasks?assigneeId=${member.userId}`)}>
                                                  <CheckSquare className="w-4 h-4 mr-2" />
                                                  ดูงาน
                                                </DropdownMenuItem>
                                                {canChangeTeamMemberRoles && selectedTeam && !isSelf && (
                                                  <>
                                                    <DropdownMenuSeparator />
                                                    {member.role !== "lead" && (
                                                      <DropdownMenuItem onClick={() => handleChangeMemberRole(selectedTeam, member.userId!, "lead")}>
                                                        <Crown className="w-4 h-4 mr-2" />
                                                        ตั้งเป็น Team Lead
                                                      </DropdownMenuItem>
                                                    )}
                                                    {member.role !== "member" && (
                                                      <DropdownMenuItem onClick={() => handleChangeMemberRole(selectedTeam, member.userId!, "member")}>
                                                        <IdCard className="w-4 h-4 mr-2" />
                                                        ตั้งเป็น Member
                                                      </DropdownMenuItem>
                                                    )}
                                                  </>
                                                )}
                                              </>
                                            )}
                                            {member.userId && selectedTeam && canRemoveTeamMembers && !isSelf && (
                                              <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => handleRemoveMember(selectedTeam, member.userId!)}>
                                                  <Trash2 className="w-4 h-4 mr-2" />
                                                  ลบออกจากทีม
                                                </DropdownMenuItem>
                                              </>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    );
                                  })}
                                </div>
                              </ScrollArea>
                            </TabsContent>
                          </Tabs>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <AddTeamMemberDialog open={showAddMember} onOpenChange={setShowAddMember} teamId={selectedTeam || ""} onSuccess={() => loadTeams(true)} />
        <CreateChannelDialog open={showCreateChannel} onOpenChange={setShowCreateChannel} />
        <InviteUserDialog open={showInviteUser} onOpenChange={setShowInviteUser} teamId={selectedTeam || undefined} onInviteSuccess={() => loadTeams(true)} />

        <Dialog open={showEditTeam} onOpenChange={setShowEditTeam}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" />
                แก้ไขทีม
              </DialogTitle>
              <DialogDescription>อัปเดตข้อมูลทีม</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>ชื่อทีม</Label>
                <Input placeholder="เช่น Marketing" className="mt-1.5 h-10" value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} />
              </div>
              <div>
                <Label>คำอธิบาย</Label>
                <Textarea placeholder="ทีมนี้ทำอะไรบ้าง?" className="mt-1.5" value={editTeamDescription} onChange={(e) => setEditTeamDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowEditTeam(false); setEditTeamName(""); setEditTeamDescription(""); }}>ยกเลิก</Button>
              <Button
                onClick={async () => {
                  if (!selectedTeam || !editTeamName.trim()) return;
                  try {
                    await apiPatch(`/teams/${selectedTeam}`, { name: editTeamName, description: editTeamDescription });
                    setShowEditTeam(false);
                    setEditTeamName("");
                    setEditTeamDescription("");
                    toast.success("อัปเดตทีมสำเร็จ");
                    loadTeams();
                  } catch (err: any) {
                    console.error("Failed to update team:", err);
                    toast.error(err.message || "อัปเดตทีมไม่สำเร็จ");
                  }
                }}
                disabled={!editTeamName.trim()}
              >
                บันทึก
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                สร้างทีมใหม่
              </DialogTitle>
              <DialogDescription>สร้างทีมใหม่สำหรับองค์กรของคุณ</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>ชื่อทีม</Label>
                <Input placeholder="เช่น Marketing" className="mt-1.5 h-10" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
              </div>
              <div>
                <Label>คำอธิบาย</Label>
                <Textarea placeholder="ทีมนี้ทำอะไรบ้าง?" className="mt-1.5" value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreateTeam(false); setTeamName(""); setTeamDescription(""); }}>ยกเลิก</Button>
              <Button onClick={handleCreateTeam} disabled={!teamName.trim()}>สร้างทีม</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
