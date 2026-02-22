import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Settings,
  UserPlus,
  Crown,
  Hash,
  Video,
  CheckSquare,
  Trash2,
  Edit,
  MessageSquare,
  Grid3x3,
  List,
  X,
  RefreshCw,
  Calendar,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusIndicator from "@/components/shared/StatusIndicator";
import InviteUserDialog from "@/components/dialogs/InviteUserDialog";
import CreateChannelDialog from "@/components/dialogs/CreateChannelDialog";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface TeamMember {
  name: string;
  initials: string;
  email: string;
  role: "lead" | "member";
  status: "online" | "busy" | "away" | "offline";
  joinedDate: string;
  userId?: string;
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

type ViewMode = "grid" | "list";

export default function Teams() {
  const { isUserOnline } = usePresence();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDescription, setEditTeamDescription] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [refreshing, setRefreshing] = useState(false);

  const loadTeams = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Load base data first
      const [teamsResRaw, tasksResRaw, channelsResRaw] = await Promise.all([
        apiGet<any[]>("/teams").catch(() => []),
        apiGet<any[]>("/tasks").catch(() => []),
        apiGet<any[]>("/channels").catch(() => []), // Load once for all teams
      ]);

      // Ensure all responses are arrays (apiGet should handle this, but double-check)
      const teamsRes = Array.isArray(teamsResRaw) ? teamsResRaw : [];
      const tasksRes = Array.isArray(tasksResRaw) ? tasksResRaw : [];
      const channelsRes = Array.isArray(channelsResRaw) ? channelsResRaw : [];

      if (teamsRes.length === 0) {
        console.warn("No teams found or invalid response format");
        setTeams([]);
        return;
      }

      // Process teams sequentially with delay to avoid rate limiting
      const teamsWithData = [];
      for (let i = 0; i < teamsRes.length; i++) {
        const team = teamsRes[i];
        
        // Add delay between requests (except first one)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        
          const membersRes = await apiGet<any[]>(`/teams/${team.id}/members`).catch(() => []);
          const members = Array.isArray(membersRes) ? membersRes.map((m: any) => ({
            name: m.user?.name || "Unknown",
            initials: (m.user?.name || "U").split(" ").map((n: string) => n[0]).join(""),
            email: m.user?.email || "",
            role: m.role === "admin" ? "lead" : "member",
            status: (isUserOnline(m.user?.id) ? "online" : "offline") as const,
            joinedDate: new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            userId: m.user?.id,
          })) : [];

          const teamChannels = Array.isArray(channelsRes) ? channelsRes.filter((c: any) => c.teamId === team.id).map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type || "general",
            messages: c._count?.messages || 0,
          })) : [];

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

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const query = searchQuery.toLowerCase();
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        team.description.toLowerCase().includes(query)
    );
  }, [teams, searchQuery]);

  const handleCreateTeam = async () => {
    try {
      const newTeam = await apiPost("/teams", { name: teamName, description: teamDescription });
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
      setTeams(prev => [...prev, teamData]);
      setSelectedTeam(newTeam.id);
      loadTeams();
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
      setTeams(prev => prev.filter(t => t.id !== teamId));
      if (selectedTeam === teamId) {
        setSelectedTeam(teams.length > 1 ? teams.find(t => t.id !== teamId)?.id || null : null);
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
      await apiPatch(`/teams/${teamId}/members/${userId}`, { isActive: false });
      toast.success("Member removed successfully");
      loadTeams();
    } catch (err: any) {
      console.error("Failed to remove member:", err);
      toast.error(err.message || "Failed to remove member");
    }
  };

  const handleNavigateToChannel = (channelId: string) => {
    navigate(`/chat?channel=${channelId}`);
  };

  const activeTeam = teams.find((t) => t.id === selectedTeam);
  const onlineMembers = activeTeam?.members.filter(m => isUserOnline(m.userId || "")) || [];
  const totalMembers = activeTeam?.members.length || 0;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Modern Header */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="h-20 flex items-center justify-between gap-6">
              {/* Left: Logo & Title */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/5 ring-1 ring-primary/10">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-foreground tracking-tight">Teams</h1>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    จัดการทีม · สมาชิก · ช่องทางสื่อสาร · ทำงานร่วมกัน
                  </p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 border-border/60 bg-background/50 hover:bg-background"
                      onClick={() => loadTeams(true)}
                    >
                      <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>รีเฟรช</TooltipContent>
                </Tooltip>
                <Button
                  size="sm"
                  className="h-10 gap-2 px-4"
                  onClick={() => setShowCreateTeam(true)}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">ทีมใหม่</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 h-full flex flex-col">
            {/* Toolbar */}
            <div className="py-6 space-y-4">
              {/* Search & View Toggle */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาทีม..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 bg-background/50 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/50 backdrop-blur-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="icon"
                        className={cn(
                          "h-8 w-8 transition-all duration-200",
                          viewMode === "grid" && "bg-background shadow-md ring-1 ring-border/50"
                        )}
                        onClick={() => setViewMode("grid")}
                      >
                        <Grid3x3 className={cn("w-4 h-4 transition-colors", viewMode === "grid" ? "text-primary" : "")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>มุมมองแบบ Grid</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="icon"
                        className={cn(
                          "h-8 w-8 transition-all duration-200",
                          viewMode === "list" && "bg-background shadow-md ring-1 ring-border/50"
                        )}
                        onClick={() => setViewMode("list")}
                      >
                        <List className={cn("w-4 h-4 transition-colors", viewMode === "list" ? "text-primary" : "")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>มุมมองแบบ List</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Content Area - Split View */}
            <div className="flex-1 overflow-hidden pb-6 flex gap-6">
              <div className={cn("flex-1 transition-all duration-300", activeTeam && "max-w-[calc(100%-432px)]")}>
              {loading ? (
                <div className="space-y-4">
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {[...Array(8)].map((_, i) => (
                        <Card key={i} className="border-border/60">
                          <CardContent className="p-6">
                            <Skeleton className="h-12 w-12 rounded-xl mb-4" />
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-3 w-1/2" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...Array(8)].map((_, i) => (
                        <Card key={i} className="border-border/60">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <Skeleton className="h-10 w-10 rounded-lg" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/4" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : filteredTeams.length === 0 ? (
                <Card className="border-border/50 border-dashed bg-card/40">
                  <CardContent className="flex flex-col items-center justify-center py-20 px-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/40 flex items-center justify-center mb-5 shadow-sm">
                      {searchQuery ? (
                        <Search className="w-10 h-10 text-muted-foreground" />
                      ) : (
                        <Users className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      {searchQuery ? "ไม่พบผลลัพธ์" : "ยังไม่มีทีม"}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed mb-6">
                      {searchQuery
                        ? "ลองค้นหาด้วยคำอื่น หรือลบคำค้นหาเพื่อดูรายการทั้งหมด"
                        : "เริ่มต้นด้วยการสร้างทีมแรกของคุณเพื่อทำงานร่วมกัน"}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setShowCreateTeam(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        สร้างทีมใหม่
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : viewMode === "grid" ? (
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                    {filteredTeams.map((team) => (
                      <motion.div
                        key={team.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card
                          className={cn(
                            "group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-300 cursor-pointer",
                            "hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1.5",
                            "ring-0 hover:ring-1 hover:ring-primary/20",
                            selectedTeam === team.id && "ring-2 ring-primary/30 border-primary/50 bg-primary/5"
                          )}
                          onClick={() => setSelectedTeam(team.id)}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-4">
                              <div
                                className={cn(
                                  "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm",
                                  "bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10",
                                  "group-hover:scale-110 group-hover:shadow-md"
                                )}
                              >
                                <Users className="w-7 h-7 text-primary transition-transform duration-300" />
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setEditTeamName(team.name);
                                    setEditTeamDescription(team.description);
                                    setShowEditTeam(true);
                                  }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    แก้ไขทีม
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteTeam(team.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    ลบทีม
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <h3 className="font-semibold text-sm text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors duration-200">
                              {team.name}
                            </h3>
                            {team.description && (
                              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                {team.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {team.members.length}
                              </span>
                              <span className="flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                {team.channels.length}
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckSquare className="w-3 h-3" />
                                {team.activeTasks}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-1 pb-4">
                    {filteredTeams.map((team) => (
                      <motion.div
                        key={team.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card
                          className={cn(
                            "group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-300 cursor-pointer",
                            "hover:shadow-lg hover:shadow-black/8",
                            "ring-0 hover:ring-1 hover:ring-primary/10",
                            selectedTeam === team.id && "ring-2 ring-primary/30 border-primary/50 bg-primary/5"
                          )}
                          onClick={() => setSelectedTeam(team.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm",
                                  "bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10",
                                  "group-hover:scale-110 group-hover:shadow-md"
                                )}
                              >
                                <Users className="w-6 h-6 text-primary transition-transform duration-300" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors duration-200">
                                    {team.name}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  {team.description && (
                                    <span className="truncate max-w-xs">{team.description}</span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {team.members.length} สมาชิก
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    {team.channels.length} ช่อง
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <CheckSquare className="w-3 h-3" />
                                    {team.activeTasks} งาน
                                  </span>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setEditTeamName(team.name);
                                    setEditTeamDescription(team.description);
                                    setShowEditTeam(true);
                                  }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    แก้ไขทีม
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteTeam(team.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    ลบทีม
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              </div>

              {/* Team Detail Sidebar */}
              {activeTeam && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-[420px] border-l border-border/50 bg-background/95 backdrop-blur-sm flex flex-col shrink-0"
                >
                  <ScrollArea className="flex-1">
                    {/* Header */}
                    <div className="p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 via-primary/2 to-transparent">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm ring-1 ring-primary/10">
                              <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h2 className="text-xl font-bold text-foreground truncate">{activeTeam.name}</h2>
                              <p className="text-xs text-muted-foreground mt-0.5">สร้างเมื่อ {activeTeam.createdDate}</p>
                            </div>
                          </div>
                          {activeTeam.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">{activeTeam.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="p-3 rounded-lg bg-background/60 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">สมาชิก</span>
                          </div>
                          <p className="text-lg font-bold text-foreground">{totalMembers}</p>
                          {onlineMembers.length > 0 && (
                            <p className="text-[10px] text-green-500 mt-0.5">{onlineMembers.length} ออนไลน์</p>
                          )}
                        </div>
                        <div className="p-3 rounded-lg bg-background/60 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <Hash className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">ช่อง</span>
                          </div>
                          <p className="text-lg font-bold text-foreground">{activeTeam.channels.length}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background/60 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckSquare className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">งาน</span>
                          </div>
                          <p className="text-lg font-bold text-foreground">{activeTeam.activeTasks}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9 gap-2"
                          onClick={() => setShowInvite(true)}
                        >
                          <UserPlus className="w-4 h-4" />
                          เพิ่มสมาชิก
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-2"
                          onClick={() => {
                            setEditTeamName(activeTeam.name);
                            setEditTeamDescription(activeTeam.description);
                            setShowEditTeam(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/chat?teamId=${activeTeam.id}`)}>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              เปิดแชททีม
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/tasks?teamId=${activeTeam.id}`)}>
                              <CheckSquare className="w-4 h-4 mr-2" />
                              ดูงานทีม
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteTeam(activeTeam.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              ลบทีม
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="p-6">
                <Tabs defaultValue="members" className="w-full">
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="members" className="flex-1">
                      สมาชิก ({activeTeam.members.length})
                    </TabsTrigger>
                    <TabsTrigger value="channels" className="flex-1">
                      ช่อง ({activeTeam.channels.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="members" className="space-y-2 mt-0">
                    {activeTeam.members.length === 0 ? (
                      <Card className="border-dashed border-border/50 bg-card/40">
                        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                          <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground mb-1">ยังไม่มีสมาชิก</p>
                          <p className="text-xs text-muted-foreground text-center mb-4">
                            เพิ่มสมาชิกคนแรกเพื่อเริ่มทำงานร่วมกัน
                          </p>
                          <Button size="sm" onClick={() => setShowInvite(true)} className="gap-2">
                            <UserPlus className="w-4 h-4" />
                            เพิ่มสมาชิก
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      activeTeam.members.map((member) => {
                        const online = member.userId ? isUserOnline(member.userId) : false;
                        const status = online ? "online" : "offline";
                        return (
                          <Card
                            key={member.name}
                            className="group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-200"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <Avatar className="h-10 w-10 ring-2 ring-background">
                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-semibold">
                                      {member.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <StatusIndicator
                                    status={status as "online" | "offline" | "busy" | "away"}
                                    className="absolute -bottom-0.5 -right-0.5 border-2 border-background"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                                    {member.role === "lead" && (
                                      <Badge variant="default" className="h-5 px-1.5 text-[10px] gap-1">
                                        <Crown className="w-3 h-3" />
                                        Lead
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">เข้าร่วม {member.joinedDate}</p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => navigate(`/chat?dm=${member.userId}`)}>
                                      <MessageSquare className="w-4 h-4 mr-2" />
                                      ส่งข้อความ
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate(`/tasks?assigneeId=${member.userId}`)}>
                                      <CheckSquare className="w-4 h-4 mr-2" />
                                      ดูงาน
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => selectedTeam && member.userId && handleRemoveMember(selectedTeam, member.userId)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      ลบออกจากทีม
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </TabsContent>

                  <TabsContent value="channels" className="space-y-2 mt-0">
                    <div className="flex justify-end mb-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-2"
                        onClick={() => setShowCreateChannel(true)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        เพิ่มช่อง
                      </Button>
                    </div>
                    {activeTeam.channels.length === 0 ? (
                      <Card className="border-dashed border-border/50 bg-card/40">
                        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
                          <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
                            <Hash className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground mb-1">ยังไม่มีช่อง</p>
                          <p className="text-xs text-muted-foreground text-center mb-4">
                            สร้างช่องแรกเพื่อเริ่มสนทนา
                          </p>
                          <Button size="sm" onClick={() => setShowCreateChannel(true)} className="gap-2">
                            <Plus className="w-4 h-4" />
                            สร้างช่อง
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      activeTeam.channels.map((ch) => (
                        <Card
                          key={ch.id}
                          className="group border-border/50 bg-card/60 hover:bg-card hover:border-border/80 transition-all duration-200 cursor-pointer"
                          onClick={() => handleNavigateToChannel(ch.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                                <Hash className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold text-foreground">#{ch.name}</p>
                                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                                    {ch.type}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{ch.messages} ข้อความ</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleNavigateToChannel(ch.id)}>
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    เปิดช่อง
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    ลบช่อง
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>
                    </Tabs>
                  </div>
                  </ScrollArea>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Dialogs */}
        <InviteUserDialog
          open={showInvite}
          onOpenChange={setShowInvite}
          teamId={selectedTeam || undefined}
          onInviteSuccess={loadTeams}
        />
        <CreateChannelDialog open={showCreateChannel} onOpenChange={setShowCreateChannel} />

        {/* Edit Team Dialog */}
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

        {/* Create Team Dialog */}
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
                <Input
                  placeholder="เช่น Marketing"
                  className="mt-1.5 h-10"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && teamName.trim()) {
                      handleCreateTeam();
                    }
                  }}
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
