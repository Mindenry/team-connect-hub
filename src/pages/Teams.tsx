import { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Settings,
  UserPlus,
  Crown,
  Hash,
  CheckSquare,
  Trash2,
  Edit,
  MessageSquare,
  X,
  RefreshCw,
  Sparkles,
  Star,
  StarOff,
  Filter,
  IdCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusIndicator from "@/components/shared/StatusIndicator";
import AddTeamMemberDialog from "@/components/dialogs/AddTeamMemberDialog";
import CreateChannelDialog from "@/components/dialogs/CreateChannelDialog";
import InviteUserDialog from "@/components/dialogs/InviteUserDialog";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
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
import { usePresence } from "@/hooks/usePresence";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeamMember {
  name: string;
  initials: string;
  email: string;
  role: string;
  status: "online" | "busy" | "away" | "offline";
  joinedDate: string;
  userId?: string;
  department?: string;
  position?: string;
}

interface TeamChannel {
  id: string;
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

type ViewMode = "gallery" | "compact";

type TeamsFilter = "all" | "mine" | "favorites" | "active";

function getRoleLabel(role?: string) {
  const value = String(role || "member").toLowerCase();
  if (value === "lead") return "Team Lead";
  return "Member";
}

function rolePriority(role?: string) {
  const value = String(role || "member").toLowerCase();
  if (value === "lead") return 0;
  return 1;
}

function canPromoteToLead(currentUserRole?: string) {
  const r = String(currentUserRole || "").toLowerCase();
  return r === "org_owner" || r === "admin";
}

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

  const canSeeEmployees =
    !!user &&
    ["org_owner", "admin", "manager"].includes((user.role || "").toLowerCase());

  // สิทธิ์ระดับองค์กรสำหรับจัดการทีม
  // - เปลี่ยน role สมาชิกทีม: org_owner, admin (ให้ตรงกับ backend @Roles)
  // - ลบสมาชิกออกจากทีม: org_owner, admin, manager
  const canManageTeamRoles = useMemo(
    () => canPromoteToLead(user?.role),
    [user?.role],
  );
  const orgRole = String(user?.role || "").toLowerCase();

  const persistFavorites = (ids: string[]) => {
    setFavoriteTeamIds(ids);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("tc:teams:favorites", JSON.stringify(ids));
      }
    } catch {
      // ignore storage errors
    }
  };

  const toggleFavorite = (teamId: string) => {
    persistFavorites(
      favoriteTeamIds.includes(teamId)
        ? favoriteTeamIds.filter((id) => id !== teamId)
        : [...favoriteTeamIds, teamId],
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

      const teamsWithData = [];
      for (let i = 0; i < teamsRes.length; i++) {
        const team = teamsRes[i];

        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        const membersRes = await apiGet<any[]>(
          `/teams/${team.id}/members`,
        ).catch(() => []);
        const members = Array.isArray(membersRes)
          ? membersRes
              .map((m: any) => {
                const userId = m.user?.id as string | undefined;
                const role = String(m.role || "member").toLowerCase();
                return {
                  name: m.user?.name || "Unknown",
                  initials: (m.user?.name || "U")
                    .split(" ")
                    .map((n: string) => n[0])
                    .join(""),
                  email: m.user?.email || "",
                  role,
                  avatar: m.user?.avatar || undefined,
                  status: isUserOnline(userId) ? "online" : "offline",
                  joinedDate: new Date(m.createdAt).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      year: "numeric",
                    },
                  ),
                  userId,
                  department: m.user?.department,
                  position: m.user?.position,
                } as any;
              })
              .sort(
                (a: TeamMember, b: TeamMember) =>
                  rolePriority(a.role) - rolePriority(b.role),
              )
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

        const teamTasks = Array.isArray(tasksRes)
          ? tasksRes.filter((t: any) => t.teamId === team.id)
          : [];
        const activeTasks = teamTasks.filter(
          (t: any) => t.status !== "done",
        ).length;

        teamsWithData.push({
          id: team.id,
          name: team.name,
          description: team.description || "",
          members,
          channels: teamChannels,
          activeTasks,
          createdDate: new Date(team.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
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

  const filteredTeams = useMemo(() => {
    let result = teams;

    if (activeFilter === "mine" && user?.id) {
      result = result.filter((team) =>
        team.members.some((m) => m.userId === user.id),
      );
    } else if (activeFilter === "favorites") {
      result = result.filter((team) => favoriteTeamIds.includes(team.id));
    } else if (activeFilter === "active") {
      result = result.filter((team) => team.activeTasks > 0);
    }

    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        team.description.toLowerCase().includes(query),
    );
  }, [teams, searchQuery, activeFilter, favoriteTeamIds, user?.id]);

  const orgStats = useMemo(() => {
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

    return {
      totalTeams,
      totalMembers: uniqueMembers.size,
      totalActiveTasks,
      totalChannels,
    };
  }, [teams]);

  const handleCreateTeam = async () => {
    try {
      const newTeam = await apiPost("/teams", {
        name: teamName,
        description: teamDescription,
      });
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
        createdDate: new Date(newTeam.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };
      setTeams((prev) => [...prev, teamData]);
      setSelectedTeam(newTeam.id);
      // Don't call loadTeams() immediately - the team is already in state
      // and loadTeams would overwrite with potentially stale data
    } catch (err: any) {
      console.error("Failed to create team:", err);
      toast.error(err.message || "Failed to create team");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this team? This action cannot be undone.",
      )
    )
      return;
    try {
      await apiDelete(`/teams/${teamId}`);
      toast.success("Team deleted successfully");
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      if (selectedTeam === teamId) {
        setSelectedTeam(
          teams.length > 1
            ? teams.find((t) => t.id !== teamId)?.id || null
            : null,
        );
      }
      loadTeams();
    } catch (err: any) {
      console.error("Failed to delete team:", err);
      toast.error(err.message || "Failed to delete team");
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!confirm("Are you sure you want to remove this member from the team?"))
      return;
    try {
      await apiDelete(
        `/teams/${teamId}/members?userId=${encodeURIComponent(userId)}`,
      );
      toast.success("Member removed successfully");
      loadTeams();
    } catch (err: any) {
      console.error("Failed to remove member:", err);
      toast.error(err.message || "Failed to remove member");
    }
  };

  const handleChangeMemberRole = async (
    teamId: string,
    userId: string,
    role: "lead" | "member",
  ) => {
    try {
      await apiPatch(`/teams/${teamId}/members/${userId}/role?role=${role}`);
      toast.success("อัปเดตบทบาทเรียบร้อย");
      loadTeams();
    } catch (err: any) {
      console.error("Failed to update member role:", err);
      toast.error(err.message || "Failed to update member role");
    }
  };

  const handleNavigateToChannel = (channelId: string) => {
    // Navigate to channel logic
  };

  const activeTeam = teams.find((t) => t.id === selectedTeam);
  const activeTeamManagerRole = activeTeam?.members
    .find((m) => m.userId === user?.id)
    ?.role?.toLowerCase();

  const canChangeTeamMemberRoles =
    orgRole === "org_owner" || activeTeamManagerRole === "lead";
  const canRemoveTeamMembers =
    orgRole === "org_owner" || activeTeamManagerRole === "lead";

  const onlineMembers =
    activeTeam?.members.filter((m) => isUserOnline(m.userId || "")) || [];
  const totalMembers = activeTeam?.members.length || 0;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="h-20 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 flex items-center justify-center shadow-md shadow-primary/10 ring-1 ring-primary/20">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-[9px] text-primary-foreground border border-background shadow-sm">
                    <Sparkles className="w-3 h-3" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    Teams OS
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    มุมมองรวมของทีม · คน · ช่องทางสื่อสาร · งานที่ยังเดินอยู่
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] text-muted-foreground/90">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{orgStats.totalTeams} ทีม</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    <span>{orgStats.totalChannels} ช่อง</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CheckSquare className="w-3 h-3" />
                    <span>{orgStats.totalActiveTasks} งานเปิดอยู่</span>
                  </span>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 border-border/60 bg-background/60 hover:bg-accent hover:text-accent-foreground"
                      onClick={() => loadTeams(true)}
                    >
                      <RefreshCw
                        className={cn("w-4 h-4", refreshing && "animate-spin")}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>รีเฟรชข้อมูลทีม</TooltipContent>
                </Tooltip>

                {canSeeEmployees && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 px-3 border-border/60 bg-background/60 hover:bg-accent"
                    onClick={() => setShowInviteUser(true)}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">เชิญผู้ใช้</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-9 gap-2 px-3 font-medium"
                  onClick={() => setShowCreateTeam(true)}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">สร้างทีมใหม่</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-full flex flex-col">
            <div className="py-3 sm:py-4 md:py-5 space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="relative flex-1 min-w-0 sm:min-w-[220px] md:min-w-[260px]">
                  <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาทีมตามชื่อหรือคำอธิบาย..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 sm:pl-9 h-9 sm:h-10 text-sm bg-background/60 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-0.5 sm:gap-1 rounded-lg sm:rounded-xl border border-border/60 bg-muted/40 px-0.5 sm:px-1 py-0.5 sm:py-1 backdrop-blur-sm overflow-x-auto">
                  <span className="hidden md:inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground">
                    <Filter className="w-3 h-3" />
                    มุมมอง
                  </span>
                  {[
                    { key: "all", label: "ทั้งหมด" },
                    { key: "mine", label: "ของฉัน" },
                    { key: "favorites", label: "ปักหมุด" },
                    { key: "active", label: "งานเปิด" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setActiveFilter(item.key as TeamsFilter)}
                      className={cn(
                        "px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-medium transition-all whitespace-nowrap",
                        activeFilter === item.key
                          ? "bg-background shadow-sm ring-1 ring-border/60 text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-0.5 rounded-lg sm:rounded-xl border border-border/60 bg-background/60 px-0.5 sm:px-1 py-0.5 sm:py-1">
                  <button
                    onClick={() => setViewMode("gallery")}
                    className={cn(
                      "px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-medium",
                      viewMode === "gallery"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Gallery
                  </button>
                  <button
                    onClick={() => setViewMode("compact")}
                    className={cn(
                      "px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-medium",
                      viewMode === "compact"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Compact
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-5 pb-4 sm:pb-6 overflow-hidden min-h-0">
              {/* Teams sidebar - hidden on mobile, shown as drawer or bottom sheet on mobile */}
              {(!isMobile || selectedTeam === null) && (
                <div
                  className={cn(
                    "shrink-0 flex flex-col rounded-xl sm:rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden",
                    isMobile ? "w-full" : "w-[260px]",
                  )}
                >
                  <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border/60 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Teams index
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground/80">
                        {filteredTeams.length} จาก {teams.length} ทีม
                      </p>
                    </div>
                    {favoriteTeamIds.length > 0 && (
                      <Badge
                        variant="outline"
                        className="h-5 sm:h-6 px-1.5 sm:px-2 text-[9px] sm:text-[10px]"
                      >
                        <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1 text-amber-500" />
                        {favoriteTeamIds.length}
                      </Badge>
                    )}
                  </div>
                  <ScrollArea className="flex-1">
                    {loading ? (
                      <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="rounded-lg sm:rounded-xl border border-border/40 bg-muted/40 px-2.5 sm:px-3 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3"
                          >
                            <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg" />
                            <div className="flex-1 space-y-1">
                              <Skeleton className="h-2.5 sm:h-3 w-4/5" />
                              <Skeleton className="h-2 sm:h-2.5 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredTeams.length === 0 ? (
                      <div className="px-3 sm:px-4 py-6 sm:py-8 text-center text-[10px] sm:text-xs text-muted-foreground space-y-2 sm:space-y-3">
                        <div className="flex justify-center">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted/50 flex items-center justify-center">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                          </div>
                        </div>
                        <p className="font-medium">
                          {searchQuery
                            ? "ไม่พบทีมที่ตรงกับคำค้นหา"
                            : "ยังไม่มีทีมในมุมมองนี้"}
                        </p>
                        {!searchQuery && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCreateTeam(true)}
                            className="h-7 sm:h-8 text-[10px] sm:text-xs"
                          >
                            สร้างทีมแรกของคุณ
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="p-2 sm:p-3 space-y-1 sm:space-y-1.5">
                        {filteredTeams.map((team) => {
                          const isSelected = team.id === selectedTeam;
                          const isFavorite = favoriteTeamIds.includes(team.id);
                          const isMyTeam =
                            !!user?.id &&
                            team.members.some((m) => m.userId === user.id);
                          return (
                            <motion.div
                              key={team.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.18 }}
                              onClick={() => {
                                setSelectedTeam(team.id);
                                // On mobile, show team details after selection
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedTeam(team.id);
                                }
                              }}
                              className={cn(
                                "w-full text-left rounded-lg sm:rounded-xl border transition-all flex items-center cursor-pointer select-none",
                                "hover:border-primary/40 hover:bg-primary/5",
                                isSelected
                                  ? "border-primary/60 bg-primary/10 shadow-sm"
                                  : "border-border/40 bg-background/40",
                                viewMode === "gallery"
                                  ? "px-2.5 sm:px-3 py-2 sm:py-2.5 gap-2 sm:gap-3"
                                  : "px-2 sm:px-2.5 py-1.5 gap-2 text-[10px] sm:text-[11px]",
                              )}
                            >
                              <div className="relative">
                                <div
                                  className={cn(
                                    "rounded-md sm:rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center",
                                    viewMode === "gallery"
                                      ? "w-8 h-8 sm:w-9 sm:h-9"
                                      : "w-6 h-6 sm:w-7 sm:h-7",
                                  )}
                                >
                                  <Users
                                    className={cn(
                                      "text-primary",
                                      viewMode === "gallery"
                                        ? "w-3.5 h-3.5 sm:w-4 sm:h-4"
                                        : "w-3 h-3.5 sm:w-3.5 sm:h-3.5",
                                    )}
                                  />
                                </div>
                                {isFavorite && (
                                  <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500 absolute -top-0.5 -right-0.5 drop-shadow-sm" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    "font-medium text-foreground truncate",
                                    viewMode === "gallery"
                                      ? "text-[11px] sm:text-xs"
                                      : "text-[10px] sm:text-[11px]",
                                  )}
                                >
                                  {team.name}
                                </p>
                                <div className="mt-0.5 flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] text-muted-foreground">
                                  <span className="inline-flex items-center gap-0.5">
                                    <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    {team.members.length}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5">
                                    <Hash className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    {team.channels.length}
                                  </span>
                                  {team.activeTasks > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                      <CheckSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                      {team.activeTasks}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-0.5 sm:gap-1">
                                {isMyTeam && (
                                  <Badge
                                    variant="outline"
                                    className="h-3.5 sm:h-4 px-1 sm:px-1.5 text-[8px] sm:text-[9px] border-primary/40 text-primary"
                                  >
                                    My
                                  </Badge>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(team.id);
                                      }}
                                      className="inline-flex items-center justify-center rounded-full h-5 w-5 sm:h-6 sm:w-6 hover:bg-background/80"
                                    >
                                      {isFavorite ? (
                                        <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500" />
                                      ) : (
                                        <StarOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {isFavorite
                                      ? "เอาออกจากที่ปักหมุด"
                                      : "ปักหมุดทีมนี้"}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}

              {/* Team details panel */}
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
                          <p className="text-sm font-semibold text-foreground">
                            เลือกทีมจากด้านซ้ายเพื่อดูรายละเอียด
                          </p>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            หรือสร้างทีมใหม่เพื่อเริ่มต้น workspace
                            สำหรับทีมของคุณ
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <Card className="border-border/70 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent">
                        <CardContent className="p-6 flex flex-col gap-4">
                          <div className="flex flex-wrap items-start gap-4 justify-between">
                            <div className="flex items-start gap-4 min-w-0">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/25 via-primary/15 to-primary/5 flex items-center justify-center shadow-md ring-1 ring-primary/20">
                                <Users className="w-6 h-6 text-primary" />
                              </div>
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h2 className="text-lg font-semibold text-foreground truncate">
                                    {activeTeam.name}
                                  </h2>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  สร้างเมื่อ {activeTeam.createdDate}
                                </p>
                                {activeTeam.description && (
                                  <p className="text-xs text-muted-foreground/90 mt-1 line-clamp-2">
                                    {activeTeam.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {canChangeTeamMemberRoles && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  >
                                    <Settings className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditTeamName(activeTeam.name);
                                      setEditTeamDescription(
                                        activeTeam.description || "",
                                      );
                                      setShowEditTeam(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    แก้ไขทีม
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    onClick={() =>
                                      handleDeleteTeam(activeTeam.id)
                                    }
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    ลบทีม
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
                              <div className="flex items-center justify-between mb-1">
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Users className="w-3 h-3" />
                                  สมาชิก
                                </span>
                                {onlineMembers.length > 0 && (
                                  <span className="text-[10px] text-emerald-500">
                                    {onlineMembers.length} ออนไลน์
                                  </span>
                                )}
                              </div>
                              <p className="text-base font-semibold text-foreground">
                                {totalMembers}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/70 bg-card/80 flex-1 min-h-0">
                        <CardContent className="p-4 flex flex-col min-h-0 h-full">
                          <Tabs
                            defaultValue="people"
                            className="flex flex-col min-h-0 h-full"
                          >
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <TabsList className="bg-muted/40 border border-border/60">
                                <TabsTrigger value="people" className="text-xs">
                                  People
                                  <span className="ml-1 text-[10px] text-muted-foreground">
                                    ({activeTeam.members.length})
                                  </span>
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

                            <TabsContent
                              value="people"
                              className="flex-1 min-h-0 mt-3"
                            >
                              <ScrollArea className="h-full">
                                <div
                                  className={cn(
                                    "pr-2",
                                    viewMode === "gallery"
                                      ? "space-y-2"
                                      : "space-y-1.5",
                                  )}
                                >
                                  {activeTeam.members.map((member) => {
                                    const online = member.userId
                                      ? isUserOnline(member.userId)
                                      : false;
                                    const status = online
                                      ? "online"
                                      : "offline";
                                    const roleLabel = getRoleLabel(member.role);
                                    const isSelf =
                                      member.userId &&
                                      user?.id &&
                                      member.userId === user.id;

                                    return (
                                      <div
                                        key={member.userId ?? member.email}
                                        className={cn(
                                          "group rounded-xl border border-border/60 bg-background/80 flex items-center transition-all",
                                          "hover:border-primary/40 hover:bg-primary/5",
                                          viewMode === "gallery"
                                            ? "px-3 py-2.5 gap-3"
                                            : "px-2.5 py-2 gap-2",
                                        )}
                                      >
                                        <div className="relative">
                                          <Avatar className="h-9 w-9 ring-2 ring-background">
                                            <AvatarImage
                                              src={(member as any).avatar}
                                              alt={member.name || "Avatar"}
                                            />
                                            <AvatarFallback className="bg-gradient-to-br from-primary/25 to-primary/10 text-[11px] font-semibold text-primary">
                                              {member.initials}
                                            </AvatarFallback>
                                            {member.userId && (
                                              <StatusIndicator
                                                status={
                                                  status as
                                                    | "online"
                                                    | "offline"
                                                    | "busy"
                                                    | "away"
                                                }
                                                className="absolute -bottom-0.5 -right-0.5 border-2 border-background"
                                              />
                                            )}
                                          </Avatar>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-0.5">
                                            <p className="text-xs font-medium text-foreground truncate">
                                              {member.name}
                                            </p>
                                            {member.role === "lead" ? (
                                              <Badge
                                                variant="secondary"
                                                className="h-4 px-1.5 text-[9px] gap-0.5 bg-primary/10 text-primary border-primary/20"
                                              >
                                                <Crown className="w-3 h-3" />
                                                Lead
                                              </Badge>
                                            ) : (
                                              <Badge
                                                variant="secondary"
                                                className="h-4 px-1.5 text-[9px] gap-0.5"
                                              >
                                                <IdCard className="w-3 h-3" />
                                                Member
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-muted-foreground truncate">
                                            {member.email}
                                          </p>
                                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[9px] text-muted-foreground">
                                            <span>
                                              {member.position || roleLabel}
                                              {member.department
                                                ? ` · ${member.department}`
                                                : ""}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground/80">
                                              เข้าร่วม {member.joinedDate}
                                            </span>
                                          </div>
                                        </div>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <MoreHorizontal className="w-3.5 h-3.5" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            {member.userId && (
                                              <>
                                                <DropdownMenuItem
                                                  onClick={() =>
                                                    navigate(
                                                      `/chat?dm=${member.userId}`,
                                                    )
                                                  }
                                                >
                                                  <MessageSquare className="w-4 h-4 mr-2" />
                                                  ส่งข้อความ
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                  onClick={() =>
                                                    navigate(
                                                      `/tasks?assigneeId=${member.userId}`,
                                                    )
                                                  }
                                                >
                                                  <CheckSquare className="w-4 h-4 mr-2" />
                                                  ดูงาน
                                                </DropdownMenuItem>

                                                {canChangeTeamMemberRoles &&
                                                  selectedTeam &&
                                                  !isSelf && (
                                                    <>
                                                      <DropdownMenuSeparator />
                                                      {member.role !==
                                                        "lead" && (
                                                        <DropdownMenuItem
                                                          onClick={() =>
                                                            handleChangeMemberRole(
                                                              selectedTeam,
                                                              member.userId!,
                                                              "lead",
                                                            )
                                                          }
                                                        >
                                                          <Crown className="w-4 h-4 mr-2" />
                                                          ตั้งเป็น Team Lead
                                                        </DropdownMenuItem>
                                                      )}
                                                      {member.role !==
                                                        "member" && (
                                                        <DropdownMenuItem
                                                          onClick={() =>
                                                            handleChangeMemberRole(
                                                              selectedTeam,
                                                              member.userId!,
                                                              "member",
                                                            )
                                                          }
                                                        >
                                                          <IdCard className="w-4 h-4 mr-2" />
                                                          ตั้งเป็น Member
                                                        </DropdownMenuItem>
                                                      )}
                                                    </>
                                                  )}
                                              </>
                                            )}

                                            {member.userId &&
                                              selectedTeam &&
                                              canRemoveTeamMembers &&
                                              !isSelf && (
                                                <>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() =>
                                                      handleRemoveMember(
                                                        selectedTeam,
                                                        member.userId!,
                                                      )
                                                    }
                                                  >
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

        <AddTeamMemberDialog
          open={showAddMember}
          onOpenChange={setShowAddMember}
          teamId={selectedTeam || ""}
          onSuccess={() => loadTeams(true)}
        />
        <CreateChannelDialog
          open={showCreateChannel}
          onOpenChange={setShowCreateChannel}
        />

        <InviteUserDialog
          open={showInviteUser}
          onOpenChange={setShowInviteUser}
          teamId={selectedTeam || undefined}
          onInviteSuccess={() => loadTeams(true)}
        />

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
                <Input
                  placeholder="เช่น Marketing"
                  className="mt-1.5 h-10"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                />
              </div>
              <div>
                <Label>คำอธิบาย</Label>
                <Textarea
                  placeholder="ทีมนี้ทำอะไรบ้าง?"
                  className="mt-1.5"
                  value={editTeamDescription}
                  onChange={(e) => setEditTeamDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditTeam(false);
                  setEditTeamName("");
                  setEditTeamDescription("");
                }}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedTeam || !editTeamName.trim()) return;
                  try {
                    await apiPatch(`/teams/${selectedTeam}`, {
                      name: editTeamName,
                      description: editTeamDescription,
                    });
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
              <DialogDescription>
                สร้างทีมใหม่สำหรับองค์กรของคุณ
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>ชื่อทีม</Label>
                <Input
                  placeholder="เช่น Marketing"
                  className="mt-1.5 h-10"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>
              <div>
                <Label>คำอธิบาย</Label>
                <Textarea
                  placeholder="ทีมนี้ทำอะไรบ้าง?"
                  className="mt-1.5"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateTeam(false);
                  setTeamName("");
                  setTeamDescription("");
                }}
              >
                ยกเลิก
              </Button>
              <Button onClick={handleCreateTeam} disabled={!teamName.trim()}>
                สร้างทีม
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
