import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Calendar,
  MessageSquare,
  CheckSquare,
  Users,
  ArrowRight,
  MapPin,
  Target,
  Eye,
  Timer,
  Hash,
  BarChart3,
  Bell,
  Sparkles,
  TrendingUp,
  Zap,
  Clock,
  Activity,
  Briefcase,
  Plus,
  ChevronRight,
  Star,
  Award,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import StatusIndicator from "@/components/shared/StatusIndicator";
import CreateMeetingDialog from "@/components/dialogs/CreateMeetingDialog";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";
import JoinMeetingByCodeDialog from "@/components/dialogs/JoinMeetingByCodeDialog";
import FocusTimer from "@/components/widgets/FocusTimer";
import WorkHoursTracker from "@/components/widgets/WorkHoursTracker";
import { auth } from "@/lib/auth";
import { usePresence } from "@/hooks/usePresence";
import { apiGet, apiPatch } from "@/lib/api";
import { cn } from "@/lib/utils";

type MeetingItem = {
  id: string;
  title: string;
  startTime: string;
  team: string;
  participants: number;
  isLive: boolean;
};

type TaskItem = {
  id: string;
  title: string;
  priority: string;
  status: string;
};

type MemberItem = {
  id: string;
  name: string;
  initials: string;
  status: string;
  activity: string;
  room: string | null;
};

type StandupEntryItem = {
  id: string;
  userId: string;
  teamId: string;
  date: string;
  rawText: string;
  yesterday: string[];
  today: string[];
  blockers: string[];
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    status?: string | null;
    activity?: string | null;
  };
};

const priorityPills: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-muted/50 text-muted-foreground border-border/60",
};

const container = { animate: { transition: { staggerChildren: 0.05 } } };
const item = { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0, transition: { duration: 0.1 } } };

export default function Dashboard() {
  const navigate = useNavigate();
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showJoinByCode, setShowJoinByCode] = useState(false);

  const [todayMeetings, setTodayMeetings] = useState<MeetingItem[]>([]);
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [allUsers, setAllUsers] = useState<MemberItem[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [standupTeamId, setStandupTeamId] = useState<string | null>(null);
  const [standupEntries, setStandupEntries] = useState<StandupEntryItem[]>([]);
  const [standupLoading, setStandupLoading] = useState(false);
  const [stats, setStats] = useState({
    meetingsToday: 0,
    openTasks: 0,
    unreadMessages: 0,
    teamTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [digest, setDigest] = useState<any>(null);
  const currentUser = auth.getUser();
  const { onlineCount, isUserOnline, activeRooms, onlineUsers } = usePresence();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadError(null);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const now = new Date();

        // Stagger requests to prevent rate limiting - load critical data first, then secondary
        // Load meetings and teams first (most important)
        const [meetingsRes, teamsRes] = await Promise.all([
          apiGet<any[]>("/meetings?status=upcoming").catch(() => []),
          apiGet<any[]>("/teams").catch(() => []),
        ]);

        // Small delay before next batch
        await new Promise(resolve => setTimeout(resolve, 200));

        // Load users and tasks
        const [usersRes, tasksRes] = await Promise.all([
          apiGet<any[]>("/users").catch(() => []),
          apiGet<any[]>("/tasks").catch(() => []).then((tasks: any[]) =>
            Array.isArray(tasks) ? tasks.filter((t: any) => t.status === "todo" || t.status === "in_progress") : []
          ),
        ]);

        // Small delay before next batch
        await new Promise(resolve => setTimeout(resolve, 200));

        // Load remaining data
        const [notificationsRes, channelsRes, digestRes] = await Promise.all([
          currentUser?.id
            ? apiGet<any>(`/notifications?userId=${currentUser.id}&read=false`).catch(() => []).then((res: any) =>
              Array.isArray(res) ? res.length : 0
            ) 
            : Promise.resolve(0),
          apiGet<any[]>("/channels").catch(() => []),
          currentUser?.id
            ? apiGet<any[]>(`/notifications/digests?userId=${currentUser.id}&limit=1&digestType=daily`).catch(() => []).then((res: any) =>
              Array.isArray(res) && res.length > 0 ? res[0] : null
            )
            : Promise.resolve(null),
        ]);

        const safeMeetings = Array.isArray(meetingsRes) ? meetingsRes : [];
        const safeTasks = Array.isArray(tasksRes) ? tasksRes : [];
        const safeUsers = Array.isArray(usersRes) ? usersRes : [];
        const safeTeams = Array.isArray(teamsRes) ? teamsRes : [];

        const meetingsTodayAll: MeetingItem[] = safeMeetings
          .filter((m: any) => {
             const start = new Date(m.startTime);
             return start >= today && start < tomorrow;
          })
          .map((m: any) => ({
             id: m.id,
             title: m.title || "Untitled meeting",
             startTime: m.startTime,
             team: m.team?.name || "Personal",
             participants: m.participants?.length || 0,
             isLive: m.status === "live"
          }));

        const meetingsForList = meetingsTodayAll
          .filter((m: any) => new Date(m.startTime) >= now)
          .slice(0, 4);

        const tasks: TaskItem[] = safeTasks.slice(0, 6).map((t: any) => ({
          id: t.id,
          title: t.title || "Untitled task",
          priority: t.priority || "low",
          status: t.status || "todo",
        }));

        // Merge API users with current authenticated user to ensure \"me\" always appears
        let mergedUsers = [...safeUsers];
        if (currentUser) {
          const existingIndex = mergedUsers.findIndex((u: any) => u.id === currentUser.id);
          const authUserPatch = {
            id: currentUser.id,
            name: currentUser.name,
            status: currentUser.status,
            activity: currentUser.activity,
          };

          if (existingIndex === -1) {
            // Put current user at the top of the list
            mergedUsers.unshift(authUserPatch);
          } else {
            // Merge status/activity from auth into API user
            mergedUsers[existingIndex] = { ...mergedUsers[existingIndex], ...authUserPatch };
          }
        }

        // Create full user list for Team Pulse (all users)
        const allUsersList: MemberItem[] = mergedUsers.map((u: any) => {
          // Preserve status from API (online, busy, away, dnd, offline)
          // Default to "offline" only if status is not provided
          const userStatus = u.status || "offline";
          
          return {
            id: u.id,
            name: u.name || "Unknown",
            initials: (u.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
            status: userStatus,
            activity: u.activity || (userStatus === "online" ? "Available" : userStatus === "away" ? "Away" : userStatus === "busy" ? "Busy" : userStatus === "dnd" ? "Focusing · Do Not Disturb" : "Offline"),
            room: u.currentRoom || null,
          };
        });

        // Limited list for other sections (first 8)
        const memberList: MemberItem[] = allUsersList.slice(0, 8);

        let unreadTotal = notificationsRes || 0;
        
         setTodayMeetings(meetingsForList);
         setRecentTasks(tasks);
         setMembers(memberList);
         setAllUsers(allUsersList);
         setTeams(safeTeams);
         if (!standupTeamId && safeTeams.length > 0) {
          setStandupTeamId(safeTeams[0].id);
         }
         setStats({
          meetingsToday: meetingsTodayAll.length,
          openTasks: safeTasks.length,
          unreadMessages: unreadTotal,
          teamTotal: safeUsers.length,
        });
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setLoadError("We couldn't load your dashboard. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [standupTeamId, currentUser?.id]);

  // Listen for user status updates to refresh data
  useEffect(() => {
    const handleUserStatusUpdate = () => {
      // Reload data when any user's status is updated
      const loadData = async () => {
        try {
          const usersRes = await apiGet<any[]>("/users").catch(() => []);
          const safeUsers = Array.isArray(usersRes) ? usersRes : [];
          
          // Merge with current user if needed
          let mergedUsers = [...safeUsers];
          if (currentUser) {
            const existingIndex = mergedUsers.findIndex((u: any) => u.id === currentUser.id);
            const authUserPatch = {
              id: currentUser.id,
              name: currentUser.name,
              status: currentUser.status,
              activity: currentUser.activity,
            };
            if (existingIndex === -1) {
              mergedUsers.unshift(authUserPatch);
            } else {
              mergedUsers[existingIndex] = { ...mergedUsers[existingIndex], ...authUserPatch };
            }
          }
          
          // Create full user list
          const allUsersList: MemberItem[] = mergedUsers.map((u: any) => {
            const userStatus = u.status || "offline";
            return {
            id: u.id,
            name: u.name || "Unknown",
            initials: (u.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
              status: userStatus,
              activity: u.activity || (userStatus === "online" ? "Available" : userStatus === "away" ? "Away" : userStatus === "busy" ? "Busy" : userStatus === "dnd" ? "Focusing · Do Not Disturb" : "Offline"),
            room: u.currentRoom || null,
            };
          });
          
          // Limited list for other sections
          const memberList: MemberItem[] = allUsersList.slice(0, 8);
          
          setMembers(memberList);
          setAllUsers(allUsersList);
        } catch (err) {
          console.error("Failed to refresh user data:", err);
        }
      };
      loadData();
    };

    window.addEventListener("userStatusUpdated", handleUserStatusUpdate);
    return () => {
      window.removeEventListener("userStatusUpdated", handleUserStatusUpdate);
    };
  }, [currentUser]);

  useEffect(() => {
    const loadStandups = async () => {
      if (!standupTeamId) {
        setStandupEntries([]);
        return;
      }
      setStandupLoading(true);
      try {
        const data = await apiGet<StandupEntryItem[]>(`/standups/today?teamId=${standupTeamId}`).catch(() => []);
        setStandupEntries(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load standup entries:", err);
        setStandupEntries([]);
      } finally {
        setStandupLoading(false);
      }
    };

    void loadStandups();
  }, [standupTeamId]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const nextMeeting = todayMeetings[0];
  const onlineSummary = `${onlineCount}/${stats.teamTotal || 0}`;
  
  // Create a map of all users from API for quick lookup
  const allUsersMap = useMemo(() => {
    const map = new Map<string, MemberItem>();
    allUsers.forEach((m) => {
      map.set(m.id, m);
    });
    return map;
  }, [allUsers]);
  
  // Build Team Pulse list: prioritize online users from presence system
  // This ensures all online users are shown, not just the first 8 from API
  const teamPulseMembers = useMemo(() => {
    // Start with all online users from presence system
    const onlineMembersList: Array<MemberItem & { isOnline: boolean }> = [];
    
    // Add all online users from presence
    onlineUsers.forEach((onlineUser) => {
      const existingMember = allUsersMap.get(onlineUser.userId);
      
      if (existingMember) {
        // User exists in API data, use their info
        let finalStatus: "online" | "busy" | "away" | "offline" | "dnd" = "online";
        
        // Check if status is valid (online, busy, away, dnd)
        if (existingMember.status && ["online", "busy", "away", "dnd"].includes(existingMember.status)) {
          finalStatus = existingMember.status as "online" | "busy" | "away" | "dnd";
        }
        
        // If this is the current user, also check their auth status
        if (currentUser && onlineUser.userId === currentUser.id && currentUser.status) {
          const authStatus = currentUser.status;
          if (["online", "busy", "away", "dnd"].includes(authStatus)) {
            finalStatus = authStatus as "online" | "busy" | "away" | "dnd";
          }
        }
        
        onlineMembersList.push({
          ...existingMember,
          isOnline: true,
          status: finalStatus,
        });
      } else {
        // User is online but not in API data (shouldn't happen, but handle gracefully)
        const initials = (onlineUser.name || "?")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        
        onlineMembersList.push({
          id: onlineUser.userId,
          name: onlineUser.name,
          initials,
          status: "online",
          activity: "Available",
          room: null,
          isOnline: true,
        });
      }
    });
    
    // Sort: current user first, then by name
    onlineMembersList.sort((a, b) => {
      if (currentUser) {
        if (a.id === currentUser.id) return -1;
        if (b.id === currentUser.id) return 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    return onlineMembersList;
  }, [onlineUsers, allUsersMap, currentUser]);
  
  // Update members with real-time online status from presence system (for other sections)
  const membersWithPresence = useMemo(() => {
    return members.map((m) => {
      const isOnline = isUserOnline(m.id);
      
      // Priority logic:
      // 1. If user is offline (not connected to socket) → always "offline"
      // 2. If user is online → use their stored status (busy, away, dnd, online) or default to "online"
      let finalStatus: "online" | "busy" | "away" | "offline" | "dnd" = "offline";
      
      if (isOnline) {
        // User is connected, respect their stored status from API
        // Check if status is valid (online, busy, away, dnd)
        if (m.status && ["online", "busy", "away", "dnd"].includes(m.status)) {
          finalStatus = m.status as "online" | "busy" | "away" | "dnd";
        } else {
          // No explicit status, default to online
          finalStatus = "online";
        }
      } else {
        // User is not connected, always show offline
        finalStatus = "offline";
      }
      
      // If this is the current user, also check their auth status
      if (currentUser && m.id === currentUser.id && currentUser.status) {
        const authStatus = currentUser.status;
        if (isOnline && ["online", "busy", "away", "dnd"].includes(authStatus)) {
          finalStatus = authStatus as "online" | "busy" | "away" | "dnd";
        }
      }
      
      return {
        ...m,
        isOnline,
        status: finalStatus,
      };
    });
  }, [members, isUserOnline, currentUser]);

  const kpiCards = [
    { 
      label: "Meetings today", 
      value: stats.meetingsToday, 
      icon: Video,
      color: "primary",
      trend: "+12%",
    },
    { 
      label: "Open tasks", 
      value: stats.openTasks, 
      icon: CheckSquare,
      color: "amber",
      trend: "+5",
    },
    { 
      label: "Unread messages", 
      value: stats.unreadMessages, 
      icon: MessageSquare,
      color: "blue",
      trend: null,
    },
    { 
      label: "Online now", 
      value: onlineSummary, 
      icon: Users,
      color: "green",
      trend: `${onlineCount} active`,
    },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <motion.div
          className="relative mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 space-y-6"
          variants={container}
          initial="initial"
          animate="animate"
        >
          <CreateMeetingDialog open={showCreateMeeting} onOpenChange={setShowCreateMeeting} />
          <CreateTaskDialog open={showCreateTask} onOpenChange={setShowCreateTask} />
          <JoinMeetingByCodeDialog open={showJoinByCode} onOpenChange={setShowJoinByCode} />

          {/* Hero Section */}
          <motion.div 
            variants={item} 
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/95 to-muted/20 p-6 sm:p-8 shadow-xl"
          >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {new Date().toLocaleDateString("th-TH", { 
                      weekday: "long", 
                      month: "long", 
                      day: "numeric",
                      year: "numeric"
                    })}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                  {greeting}, <span className="text-primary">{currentUser?.name || "User"}</span>
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {nextMeeting ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="font-medium text-foreground">Next meeting:</span>
                        <span className="text-foreground">{nextMeeting.title}</span>
                      </div>
                      <span>·</span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(nextMeeting.startTime).toLocaleTimeString("th-TH", { hour: "numeric", minute: "2-digit" })}</span>
                      </div>
                    </>
                  ) : (
                    <span>No meetings scheduled for today</span>
                  )}
                  <span>·</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-medium text-foreground">{onlineCount}</span>
                    <span>online</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowJoinByCode(true)} 
                      className="h-10 gap-2 border-border/60 bg-background/50 hover:bg-background shadow-sm hover:shadow-md transition-all"
                    >
                      <Hash className="h-4 w-4" />
                      <span className="hidden sm:inline">Join by code</span>
                      <span className="sm:hidden">Join</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>เข้าร่วมการประชุมด้วยรหัส</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowCreateTask(true)} 
                      className="h-10 gap-2 border-border/60 bg-background/50 hover:bg-background shadow-sm hover:shadow-md transition-all"
                    >
                      <CheckSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">New task</span>
                      <span className="sm:hidden">Task</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>สร้างงานใหม่</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowCreateMeeting(true)} 
                      className="h-10 gap-2 border-border/60 bg-background/50 hover:bg-background shadow-sm hover:shadow-md transition-all"
                    >
                      <Calendar className="h-4 w-4" />
                      <span className="hidden sm:inline">Schedule</span>
                      <span className="sm:hidden">Meet</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>กำหนดการประชุม</TooltipContent>
                </Tooltip>
                <Button 
                  size="sm" 
                  className="h-10 gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all" 
                  asChild
                >
                  <Link to="/meeting-room">
                    <Video className="h-4 w-4" />
                    <span className="hidden sm:inline">Start meeting</span>
                    <span className="sm:hidden">Start</span>
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>

          {loadError && (
            <motion.div 
              variants={item} 
              className="rounded-xl border border-destructive/50 bg-destructive/5 px-5 py-4"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-foreground">{loadError}</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Reload
                </Button>
              </div>
            </motion.div>
          )}

          {/* KPI Cards */}
          <motion.div
            variants={item}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {kpiCards.map((kpi, index) => {
              const colorClasses = {
                primary: "from-primary/20 via-primary/10 to-primary/5 text-primary border-primary/30",
                amber: "from-amber-500/20 via-amber-500/10 to-amber-500/5 text-amber-600 border-amber-500/30",
                blue: "from-blue-500/20 via-blue-500/10 to-blue-500/5 text-blue-600 border-blue-500/30",
                green: "from-green-500/20 via-green-500/10 to-green-500/5 text-green-600 border-green-500/30",
              };
              const bgClasses = {
                primary: "bg-primary/10",
                amber: "bg-amber-500/10",
                blue: "bg-blue-500/10",
                green: "bg-green-500/10",
              };

              return (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="group border-border/50 bg-card/80 hover:bg-card hover:border-border/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                            {kpi.label}
                          </p>
                          {loading ? (
                            <Skeleton className="h-8 w-20 mb-2" />
                          ) : (
                            <div className="flex items-baseline gap-2 mb-2">
                              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                {kpi.value}
                              </p>
                              {kpi.trend && (
                                <div className={cn(
                                  "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                                  bgClasses[kpi.color as keyof typeof bgClasses]
                                )}>
                                  <TrendingUp className="w-3 h-3" />
                                  <span>{kpi.trend}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                          "bg-gradient-to-br border",
                          colorClasses[kpi.color as keyof typeof colorClasses]
                        )}>
                          <kpi.icon className="w-6 h-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Meetings Section */}
            <motion.div variants={item} className="lg:col-span-7">
              <Card className="h-full border-border/50 bg-card/80 shadow-lg">
                <CardHeader className="pb-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Video className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Today's Meetings</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Upcoming and live meetings</p>
                      </div>
                    </div>
                    <Link 
                      to="/meetings" 
                      className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                    >
                      View schedule
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  {loading ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((k) => (
                        <div key={k} className="flex items-center gap-4 rounded-xl border border-border/50 bg-background/40 p-4">
                          <Skeleton className="h-12 w-12 rounded-xl" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-64" />
                          </div>
                          <Skeleton className="h-9 w-20 rounded-lg" />
                        </div>
                      ))}
                    </div>
                  ) : todayMeetings.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-8 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-semibold text-foreground mb-1">No upcoming meetings today</p>
                      <p className="text-xs text-muted-foreground mb-4">Schedule one, or start a quick meeting</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowCreateMeeting(true)} className="gap-2">
                          <Calendar className="h-4 w-4" />
                          Schedule
                        </Button>
                        <Button size="sm" className="gap-2 bg-gradient-to-r from-primary to-primary/80" asChild>
                          <Link to="/meeting-room">
                            <Video className="h-4 w-4" />
                            Start meeting
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {todayMeetings.map((m, i) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: i * 0.1 }}
                          className="group flex items-center gap-4 rounded-xl border border-border/50 bg-gradient-to-r from-background via-background to-muted/20 p-4 hover:border-border/80 hover:shadow-md transition-all duration-200"
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110",
                            m.isLive 
                              ? "bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30" 
                              : "bg-muted/60"
                          )}>
                            <Video className={cn(
                              "w-5 h-5",
                              m.isLive ? "text-primary" : "text-foreground/80"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-foreground truncate">{m.title}</p>
                              {m.isLive && (
                                <Badge className="h-5 bg-gradient-to-r from-red-500 to-red-600 text-white border-0 text-[10px] px-2 animate-pulse">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
                                  LIVE
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(m.startTime).toLocaleTimeString("th-TH", { hour: "numeric", minute: "2-digit" })}</span>
                              </div>
                              <span>·</span>
                              <span>{m.team}</span>
                              <span>·</span>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{m.participants}</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant={m.isLive ? "default" : "outline"} 
                            className={cn(
                              "h-9 gap-2",
                              m.isLive && "bg-gradient-to-r from-primary to-primary/80 shadow-md"
                            )} 
                            asChild
                          >
                            <Link to={`/meeting-lobby/${m.id}`}>
                              {m.isLive ? (
                                <>
                                  <Zap className="w-3.5 h-3.5" />
                                  Join
                                </>
                              ) : (
                                "Lobby"
                              )}
                            </Link>
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Tasks Section */}
            <motion.div variants={item} className="lg:col-span-5">
              <Card className="h-full border-border/50 bg-card/80 shadow-lg">
                <CardHeader className="pb-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <CheckSquare className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">My Tasks</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Active and pending tasks</p>
                      </div>
                    </div>
                    <Link 
                      to="/tasks" 
                      className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                    >
                      View all
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-2">
                  {loading ? (
                    <div className="space-y-2">
                      {[0, 1, 2, 3].map((k) => (
                        <div key={k} className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3">
                          <Skeleton className="h-4 w-4 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-56" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : recentTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-8 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                        <CheckSquare className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-semibold text-foreground mb-1">No tasks assigned</p>
                      <p className="text-xs text-muted-foreground mb-4">Create one to track your next actions</p>
                      <Button size="sm" variant="outline" onClick={() => setShowCreateTask(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        New task
                      </Button>
                    </div>
                  ) : (
                    recentTasks.map((t, i) => (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group flex items-center gap-3 rounded-lg border border-border/50 bg-gradient-to-r from-background to-muted/10 p-3 hover:border-border/80 hover:shadow-sm transition-all duration-200"
                      >
                        <CheckSquare className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          t.status === "done" ? "text-green-600" : "text-muted-foreground"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"
                          )}>
                            {t.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Priority · {t.priority}</p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] px-2 py-0.5 h-5 font-medium",
                            priorityPills[t.priority] || priorityPills.low
                          )}
                        >
                          {t.priority}
                        </Badge>
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Row 2 */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Team Pulse */}
            <motion.div variants={item} className="lg:col-span-4">
              <Card className="h-full border-border/50 bg-card/80 shadow-lg">
                <CardHeader className="pb-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Team Pulse</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Who's online and active</p>
                      </div>
                    </div>
                    <Link 
                      to="/virtual-office" 
                      className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Office
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  {loading ? (
                    <div className="space-y-3">
                      {[0, 1, 2, 3].map((k) => (
                        <div key={k} className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-40" />
                          </div>
                          <Skeleton className="h-6 w-20 rounded-md" />
                        </div>
                      ))}
                    </div>
                  ) : teamPulseMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No team members online</p>
                  ) : (
                    teamPulseMembers.map((m, i) => {
                      // Determine status: use presence system status (already updated in membersWithPresence)
                      // m.status is already processed in membersWithPresence:
                      // - If user is offline (not connected to socket) → "offline"
                      // - If user is online → use status from API (busy, away, dnd) or default to "online"
                      const presenceStatus: "online" | "busy" | "away" | "offline" | "dnd" = m.status as any;

                      const roomNames: Record<string, string> = {
                        workspace: "Workspace",
                        "meeting-1": "Meeting A",
                        "meeting-2": "Meeting B",
                        huddle: "Huddle",
                        lounge: "Lounge",
                        phone: "Phone",
                        "quick-huddle": "Quick huddle",
                      };

                      const statusLabels: Record<"online" | "busy" | "away" | "offline" | "dnd", string> = {
                        online: "Online",
                        busy: "Busy",
                        away: "Away",
                        offline: "Offline",
                        dnd: "Do Not Disturb",
                      };

                      const statusColors: Record<"online" | "busy" | "away" | "offline" | "dnd", string> = {
                        online: "bg-green-500/10 text-green-600 border-green-500/30",
                        busy: "bg-red-500/10 text-red-600 border-red-500/30",
                        away: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
                        offline: "bg-muted/40 text-muted-foreground border-border/60",
                        dnd: "bg-purple-500/10 text-purple-600 border-purple-500/30",
                      };

                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="group flex items-center gap-3 rounded-lg border border-border/50 bg-gradient-to-r from-background to-muted/10 p-3 hover:border-border/80 hover:shadow-sm transition-all duration-200"
                        >
                          <div className="relative">
                            <Avatar className={cn(
                              "h-10 w-10 ring-2 transition-all duration-200",
                              m.isOnline ? "ring-green-500/30" : "ring-background"
                            )}>
                              <AvatarFallback className={cn(
                                "bg-gradient-to-br text-foreground text-xs font-semibold transition-colors",
                                m.isOnline ? "from-green-500/20 to-green-500/10" : "from-muted/80 to-muted/60"
                              )}>
                                {m.initials}
                              </AvatarFallback>
                            </Avatar>
                            <StatusIndicator
                              status={presenceStatus}
                              className="absolute -bottom-0.5 -right-0.5 border-2 border-background"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{m.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {m.activity && presenceStatus !== "offline"
                                ? m.activity
                                : statusLabels[presenceStatus]}
                            </p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] px-2.5 py-0.5 h-5 font-medium",
                              statusColors[presenceStatus]
                            )}
                          >
                            {m.room
                              ? roomNames[m.room] || m.room
                              : statusLabels[presenceStatus]}
                          </Badge>
                        </motion.div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Active Rooms */}
            <motion.div variants={item} className="lg:col-span-4">
              <Card className="h-full border-border/50 bg-card/80 shadow-lg">
                <CardHeader className="pb-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Video className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">Active Rooms</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Live meetings and spaces</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  {activeRooms.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-8 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                        <Video className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-semibold text-foreground mb-1">No live rooms right now</p>
                      <p className="text-xs text-muted-foreground mb-4">Start a quick meeting to get moving</p>
                      <Button size="sm" className="gap-2 bg-gradient-to-r from-primary to-primary/80" asChild>
                        <Link to="/meeting-room">
                          <Video className="h-4 w-4" />
                          Start meeting
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    activeRooms.slice(0, 4).map((room: any, i: number) => (
                      <motion.div
                        key={room.roomId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group flex items-center gap-4 rounded-xl border border-border/50 bg-gradient-to-r from-background via-background to-muted/20 p-4 hover:border-border/80 hover:shadow-md transition-all duration-200"
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 transition-transform duration-200 group-hover:scale-110">
                          <Video className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate mb-1">{room.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>{room.participants?.length || 0} participants</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="h-9 gap-2" asChild>
                          <Link to={`/meeting-lobby/${room.roomId}`}>
                            <Zap className="w-3.5 h-3.5" />
                            Join
                          </Link>
                        </Button>
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Daily Standup */}
            <motion.div variants={item} className="lg:col-span-4">
              <Card className="h-full border-border/50 bg-card/80 shadow-lg">
                <CardHeader className="pb-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Hash className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Daily Standup</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Team updates and blockers</p>
                      </div>
                    </div>
                    {teams.length > 0 && (
                      <select
                        className="text-xs px-3 py-1.5 border border-border/60 rounded-lg bg-background text-foreground hover:bg-muted transition-colors"
                        value={standupTeamId ?? ""}
                        onChange={(e) => setStandupTeamId(e.target.value || null)}
                      >
                        {teams.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  {standupLoading ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((k) => (
                        <div key={k} className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-44" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !standupTeamId || teams.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        No teams configured yet. Create a team and a #standup channel to start daily standups.
                      </p>
                    </div>
                  ) : standupEntries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-8 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                        <Hash className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-semibold text-foreground mb-1">No standup updates yet today</p>
                      <p className="text-xs text-muted-foreground">
                        Ask your team to post their updates in the <span className="font-semibold">#standup</span> channel
                      </p>
                    </div>
                  ) : (
                    standupEntries.slice(0, 6).map((entry, i) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group rounded-lg border border-border/50 bg-gradient-to-r from-background to-muted/10 p-3 hover:border-border/80 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 ring-2 ring-background shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-muted/80 to-muted/60 text-foreground text-xs font-semibold">
                              {(entry.user.name || "?")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-foreground truncate">{entry.user.name}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-green-500/10 text-green-600 border-green-500/30">
                                  {entry.yesterday.length} done
                                </Badge>
                                <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/30">
                                  {entry.today.length} today
                                </Badge>
                                {entry.blockers.length > 0 && (
                                  <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-red-500/10 text-red-600 border-red-500/30">
                                    {entry.blockers.length} blockers
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {entry.today.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate">
                                📝 {entry.today[0]}
                                {entry.today.length > 1 ? " +" + (entry.today.length - 1) + " more" : ""}
                              </p>
                            )}
                            {entry.blockers.length > 0 && (
                              <p className="text-xs text-red-600/80 truncate">
                                ⚠️ {entry.blockers[0]}
                                {entry.blockers.length > 1 ? " +" + (entry.blockers.length - 1) + " more" : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Productivity Widget */}
          <motion.div variants={item} className="lg:col-span-4">
            <Card className="border-border/50 bg-card/80 shadow-lg">
              <CardHeader className="pb-4 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Productivity</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Focus time and work hours</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <Tabs defaultValue="focus" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-muted/40 mb-4">
                    <TabsTrigger value="focus" className="gap-2 data-[state=active]:bg-background">
                      <Timer className="h-4 w-4" />
                      Focus
                    </TabsTrigger>
                    <TabsTrigger value="hours" className="gap-2 data-[state=active]:bg-background">
                      <BarChart3 className="h-4 w-4" />
                      Hours
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="focus" className="mt-0">
                    <FocusTimer />
                  </TabsContent>
                  <TabsContent value="hours" className="mt-0">
                    <WorkHoursTracker />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notification Digest */}
          {digest && !digest.isRead && (
            <motion.div variants={item}>
              <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-base font-bold text-foreground mb-1">
                            {digest.digestType === 'daily' ? 'Daily Digest' : 'Hourly Digest'}
                          </p>
                          <p className="text-sm text-muted-foreground mb-3">
                            {digest.unreadCount} unread notifications from {digest.digestType === 'daily' ? 'today' : 'the past hour'}
                          </p>
                          {digest.byType && Object.keys(digest.byType).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(digest.byType).slice(0, 5).map(([type, count]: [string, any]) => (
                                <Badge key={type} variant="secondary" className="h-6 text-xs px-2.5 bg-primary/10 text-primary border-primary/20">
                                  {type.replaceAll('_', ' ')}: {count}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (!currentUser?.id) return;
                              try {
                                await apiPatch(`/notifications/digests/${digest.id}/read?userId=${currentUser.id}`);
                                setDigest({ ...digest, isRead: true });
                              } catch (err) {
                                console.error('Failed to mark digest as read:', err);
                              }
                            }}
                            className="h-9"
                          >
                            Mark read
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => navigate('/notifications')}
                            className="h-9 bg-gradient-to-r from-primary to-primary/80"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
