import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import {
  Video,
  Calendar,
  MessageSquare,
  CheckSquare,
  Users,
  MapPin,
  Target,
  Eye,
  Timer,
  Hash,
  BarChart3,
  Sparkles,
  Zap,
  Clock,
  Plus,
  ChevronRight,
  Rocket,
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownRight,
  PlayCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import StatusIndicator from "@/components/shared/StatusIndicator";
import CreateMeetingDialog from "@/components/dialogs/CreateMeetingDialog";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";
import TaskDetailDialog from "@/components/dialogs/TaskDetailDialog";
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
  priority: "urgent" | "high" | "medium" | "low";
  status: string;
  dueDate?: string;
  assignee?: { id: string; name: string; initials: string; avatar?: string };
  project?: { id: string; key: string; name: string; color?: string };
  epic?: { id: string; name: string; color?: string };
  tags: string[];
};

type MemberItem = {
  id: string;
  name: string;
  initials: string;
  status: string;
  activity: string;
  room: string | null;
  avatar?: string;
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

const priorityConfig: Record<string, { color: string; icon: any; label: string }> = {
  urgent: {
    color: "bg-gradient-to-br from-red-600/25 via-red-500/15 to-red-500/5 text-red-700 border-red-600/40",
    icon: AlertCircle,
    label: "Urgent",
  },
  high: {
    color: "bg-gradient-to-br from-red-500/20 via-red-500/10 to-red-500/5 text-red-600 border-red-500/30",
    icon: AlertCircle,
    label: "High",
  },
  medium: {
    color: "bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-amber-500/5 text-amber-600 border-amber-500/30",
    icon: Circle,
    label: "Medium",
  },
  low: {
    color: "bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-blue-500/5 text-blue-600 border-blue-500/30",
    icon: CheckCircle2,
    label: "Low",
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 20,
    },
  },
};

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
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
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

        const [meetingsRes, teamsRes] = await Promise.all([
          apiGet<any[]>("/meetings?status=upcoming").catch(() => []),
          apiGet<any[]>("/teams").catch(() => []),
        ]);

        const [usersRes, tasksRes] = await Promise.all([
          apiGet<any[]>("/users").catch(() => []),
          apiGet<any[]>("/tasks").catch(() => []).then((tasks: any[]) =>
            Array.isArray(tasks) ? tasks.filter((t: any) => t.status === "todo" || t.status === "in_progress") : []
          ),
        ]);
        
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
          priority: (t.priority === "urgent" || t.priority === "high" || t.priority === "medium" || t.priority === "low") ? t.priority : "medium",
          status: t.status || "todo",
          dueDate: t.dueDate || undefined,
          assignee: t.assignee
            ? {
                id: t.assignee.id,
                name: t.assignee.name,
                initials:
                  t.assignee.name
                    ?.split(" ")
                    .map((p: string) => p[0])
                    .join("")
                    .toUpperCase() ?? "NA",
              }
            : undefined,
          project: t.project
            ? {
                id: t.project.id,
                key: t.project.key,
                name: t.project.name,
                color: t.project.color,
              }
            : undefined,
          epic: t.epic
            ? {
                id: t.epic.id,
                name: t.epic.name,
                color: t.epic.color,
              }
            : undefined,
          tags: Array.isArray(t.tags) ? t.tags : [],
        }));

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

        const allUsersList: MemberItem[] = mergedUsers.map((u: any) => {
          const userStatus = u.status || "offline";
          
          return {
            id: u.id,
            name: u.name || "Unknown",
            initials: (u.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
            status: userStatus,
            activity: u.activity || (userStatus === "online" ? "Available" : userStatus === "away" ? "Away" : userStatus === "busy" ? "Busy" : userStatus === "dnd" ? "Focusing · Do Not Disturb" : "Offline"),
            room: u.currentRoom || null,
            avatar: u.avatar,
          };
        });

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

  useEffect(() => {
    const handleUserStatusUpdate = () => {
      const loadData = async () => {
        try {
          const usersRes = await apiGet<any[]>("/users").catch(() => []);
          const safeUsers = Array.isArray(usersRes) ? usersRes : [];
          
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
          
          const allUsersList: MemberItem[] = mergedUsers.map((u: any) => {
            const userStatus = u.status || "offline";
            return {
              id: u.id,
              name: u.name || "Unknown",
              initials: (u.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
              status: userStatus,
              activity: u.activity || (userStatus === "online" ? "Available" : userStatus === "away" ? "Away" : userStatus === "busy" ? "Busy" : userStatus === "dnd" ? "Focusing · Do Not Disturb" : "Offline"),
              room: u.currentRoom || null,
              avatar: u.avatar,
            };
          });
          
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
  
  const allUsersMap = useMemo(() => {
    const map = new Map<string, MemberItem>();
    allUsers.forEach((m) => {
      map.set(m.id, m);
    });
    return map;
  }, [allUsers]);
  
  const teamPulseMembers = useMemo(() => {
    const onlineMembersList: Array<MemberItem & { isOnline: boolean }> = [];
    
    onlineUsers.forEach((onlineUser) => {
      const existingMember = allUsersMap.get(onlineUser.userId);
      
      if (existingMember) {
        let finalStatus: "online" | "busy" | "away" | "offline" | "dnd" = "online";
        
        if (existingMember.status && ["online", "busy", "away", "dnd"].includes(existingMember.status)) {
          finalStatus = existingMember.status as "online" | "busy" | "away" | "dnd";
        }
        
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
          avatar: (onlineUser as any).avatar,
        });
      }
    });
    
    onlineMembersList.sort((a, b) => {
      if (currentUser) {
        if (a.id === currentUser.id) return -1;
        if (b.id === currentUser.id) return 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    return onlineMembersList;
  }, [onlineUsers, allUsersMap, currentUser]);
  
  const membersWithPresence = useMemo(() => {
    return members.map((m) => {
      const isOnline = isUserOnline(m.id);
      
      let finalStatus: "online" | "busy" | "away" | "offline" | "dnd" = "offline";
      
      if (isOnline) {
        if (m.status && ["online", "busy", "away", "dnd"].includes(m.status)) {
          finalStatus = m.status as "online" | "busy" | "away" | "dnd";
        } else {
          finalStatus = "online";
        }
      } else {
        finalStatus = "offline";
      }
      
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

  // Quick navigation for KPI cards to connect metrics with workflows
  const handleKpiClick = (label: string) => {
    if (label === "Meetings Today") {
      navigate("/meetings");
      return;
    }
    if (label === "Open Tasks") {
      navigate("/tasks");
      return;
    }
    if (label === "Unread Messages") {
      navigate("/chat");
      return;
    }
    if (label === "Team Online") {
      navigate("/teams");
    }
  };

  const kpiCards = [
    { 
      label: "Meetings Today", 
      value: stats.meetingsToday, 
      icon: Video,
      gradient: "from-blue-500/20 via-blue-500/10 to-blue-500/5",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
      borderColor: "border-blue-500/20",
      trend: "+12%",
      trendUp: true,
    },
    { 
      label: "Open Tasks", 
      value: stats.openTasks, 
      icon: CheckSquare,
      gradient: "from-amber-500/20 via-amber-500/10 to-amber-500/5",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
      borderColor: "border-amber-500/20",
      trend: "+5",
      trendUp: true,
    },
    { 
      label: "Unread Messages", 
      value: stats.unreadMessages, 
      icon: MessageSquare,
      gradient: "from-purple-500/20 via-purple-500/10 to-purple-500/5",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-600",
      borderColor: "border-purple-500/20",
      trend: null,
      trendUp: null,
    },
    { 
      label: "Team Online", 
      value: onlineSummary, 
      icon: Users,
      gradient: "from-green-500/20 via-green-500/10 to-green-500/5",
      iconBg: "bg-green-500/10",
      iconColor: "text-green-600",
      borderColor: "border-green-500/20",
      trend: `${onlineCount} active`,
      trendUp: true,
    },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        <motion.div
          className="relative mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <CreateMeetingDialog open={showCreateMeeting} onOpenChange={setShowCreateMeeting} />
          <CreateTaskDialog
            open={showCreateTask}
            onOpenChange={setShowCreateTask}
            onCreated={(task) => {
              // After creating from dashboard, jump to the task detail in Tasks page
              setShowCreateTask(false);
              setSelectedTask(null);
              navigate("/tasks", { state: { openTask: task } });
            }}
          />
          <JoinMeetingByCodeDialog open={showJoinByCode} onOpenChange={setShowJoinByCode} />
          <TaskDetailDialog
            open={!!selectedTask}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedTask(null);
              }
            }}
            task={
              selectedTask
                ? {
                    id: selectedTask.id,
                    title: selectedTask.title,
                    priority: selectedTask.priority,
                    assignee: selectedTask.assignee,
                    dueDate: selectedTask.dueDate,
                    tags: selectedTask.tags,
                    linkedMeeting: undefined,
                    sprint: undefined,
                    epic: selectedTask.epic,
                  }
                : undefined
            }
          />

          {/* Hero Header Section */}
          <motion.div 
            variants={itemVariants}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-blue-500/5 to-purple-500/10 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
            <Card className="relative border-0 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
              <CardContent className="relative p-6 sm:p-8 lg:p-10">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                        <LayoutDashboard className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date().toLocaleDateString("th-TH", { 
                            weekday: "long", 
                            month: "long", 
                            day: "numeric",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent mb-2">
                        {greeting}, <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">{currentUser?.name || "User"}</span>
                      </h1>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-3">
                        {nextMeeting ? (
                          <>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                              <span className="font-medium text-foreground">Next:</span>
                              <span className="text-foreground">{nextMeeting.title}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50">
                              <Clock className="w-4 h-4" />
                              <span>{new Date(nextMeeting.startTime).toLocaleTimeString("th-TH", { hour: "numeric", minute: "2-digit" })}</span>
                            </div>
                          </>
                        ) : (
                          <div className="px-3 py-1.5 rounded-lg bg-muted/50">
                            <span>No meetings scheduled for today</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="font-medium text-green-600">{onlineCount}</span>
                          <span className="text-muted-foreground">online</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 lg:flex-nowrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="lg" 
                          onClick={() => setShowJoinByCode(true)} 
                          className="h-12 gap-2 border-2 bg-background/50 backdrop-blur-sm hover:bg-background hover:border-primary/50 hover:shadow-lg transition-all group"
                        >
                          <Hash className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                          <span className="hidden sm:inline">Join by Code</span>
                          <span className="sm:hidden">Join</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>เข้าร่วมการประชุมด้วยรหัส</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="lg" 
                          onClick={() => setShowCreateTask(true)} 
                          className="h-12 gap-2 border-2 bg-background/50 backdrop-blur-sm hover:bg-background hover:border-amber-500/50 hover:shadow-lg transition-all group"
                        >
                          <CheckSquare className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          <span className="hidden sm:inline">New Task</span>
                          <span className="sm:hidden">Task</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>สร้างงานใหม่</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="lg" 
                          onClick={() => setShowCreateMeeting(true)} 
                          className="h-12 gap-2 border-2 bg-background/50 backdrop-blur-sm hover:bg-background hover:border-blue-500/50 hover:shadow-lg transition-all group"
                        >
                          <Calendar className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          <span className="hidden sm:inline">Schedule</span>
                          <span className="sm:hidden">Meet</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>กำหนดการประชุม</TooltipContent>
                    </Tooltip>
                    <Button 
                      size="lg" 
                      className="h-12 gap-2 bg-gradient-to-r from-primary via-blue-600 to-purple-600 hover:from-primary/90 hover:via-blue-500 hover:to-purple-500 shadow-xl hover:shadow-2xl transition-all group" 
                      asChild
                    >
                      <Link to="/meeting-lobby/quick-huddle">
                        <Video className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span className="hidden sm:inline">Start Meeting</span>
                        <span className="sm:hidden">Start</span>
                        <Rocket className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {loadError && (
            <motion.div 
              variants={itemVariants}
              className="rounded-2xl border-2 border-destructive/50 bg-destructive/10 backdrop-blur-sm px-6 py-4 shadow-lg"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-foreground">{loadError}</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Reload
                </Button>
              </div>
            </motion.div>
          )}

          {/* KPI Cards Grid */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {kpiCards.map((kpi, index) => {
              const Icon = kpi.icon;
              return (
                <motion.div
                  key={kpi.label}
                  variants={cardHoverVariants}
                  initial="rest"
                  whileHover="hover"
                  custom={index}
                >
                  <Card
                    className="group relative h-full border-2 bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-xl overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer"
                    onClick={() => handleKpiClick(kpi.label)}
                  >
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", kpi.gradient)} />
                    <CardContent className="relative p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                            {kpi.label}
                          </p>
                          {loading ? (
                            <Skeleton className="h-10 w-24 mb-2" />
                          ) : (
                            <div className="flex items-baseline gap-3">
                              <p className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                                {kpi.value}
                              </p>
                              {kpi.trend && (
                                <div className={cn(
                                  "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border",
                                  kpi.trendUp 
                                    ? "bg-green-500/10 text-green-600 border-green-500/30" 
                                    : "bg-red-500/10 text-red-600 border-red-500/30"
                                )}>
                                  {kpi.trendUp ? (
                                    <ArrowUpRight className="w-3 h-3" />
                                  ) : (
                                    <ArrowDownRight className="w-3 h-3" />
                                  )}
                                  <span>{kpi.trend}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6",
                          kpi.iconBg,
                          kpi.borderColor,
                          kpi.iconColor
                        )}>
                          <Icon className="w-7 h-7" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            {/* Meetings Section - Left Column */}
            <motion.div variants={itemVariants} className="lg:col-span-7">
              <Card className="h-full border-2 bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-4 border-b-2 border-border/50 bg-gradient-to-r from-muted/30 via-muted/20 to-transparent">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Video className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Today's Meetings</CardTitle>
                        <CardDescription className="text-xs mt-1">Upcoming and live meetings</CardDescription>
                      </div>
                    </div>
                    <Link 
                      to="/meetings" 
                      className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                    >
                      View Schedule
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {loading ? (
                    <div className="space-y-4">
                      {[0, 1, 2].map((k) => (
                        <div key={k} className="flex items-center gap-4 rounded-xl border-2 border-border/50 bg-background/40 p-4">
                          <Skeleton className="h-14 w-14 rounded-xl" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-64" />
                          </div>
                          <Skeleton className="h-10 w-24 rounded-lg" />
                        </div>
                      ))}
                    </div>
                  ) : todayMeetings.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 p-12 text-center">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mx-auto mb-6">
                        <Calendar className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="text-base font-bold text-foreground mb-2">No upcoming meetings today</p>
                      <p className="text-sm text-muted-foreground mb-6">Schedule one, or start a quick meeting</p>
                      <div className="flex flex-wrap justify-center gap-3">
                        <Button size="lg" variant="outline" onClick={() => setShowCreateMeeting(true)} className="gap-2">
                          <Calendar className="h-4 w-4" />
                          Schedule Meeting
                        </Button>
                        <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-blue-600" asChild>
                          <Link to="/meeting-lobby/quick-huddle">
                            <Video className="h-4 w-4" />
                            Start Meeting
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
                          className="group flex items-center gap-4 rounded-xl border-2 border-border/50 bg-gradient-to-r from-background via-background to-muted/20 p-5 hover:border-primary/50 hover:shadow-xl transition-all duration-300"
                        >
                          <div className={cn(
                            "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all duration-300 group-hover:scale-110",
                            m.isLive 
                              ? "bg-gradient-to-br from-red-500/20 to-red-500/10 border-red-500/30" 
                              : "bg-gradient-to-br from-blue-500/20 to-blue-500/10 border-blue-500/30"
                          )}>
                            <Video className={cn(
                              "w-6 h-6",
                              m.isLive ? "text-red-600" : "text-blue-600"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-base font-bold text-foreground truncate">{m.title}</p>
                              {m.isLive && (
                                <Badge className="h-6 bg-gradient-to-r from-red-500 to-red-600 text-white border-0 text-xs px-2.5 animate-pulse">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
                                  LIVE
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">{new Date(m.startTime).toLocaleTimeString("th-TH", { hour: "numeric", minute: "2-digit" })}</span>
                              </div>
                              <span>·</span>
                              <span>{m.team}</span>
                              <span>·</span>
                              <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                <span>{m.participants} participants</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="lg" 
                            variant={m.isLive ? "default" : "outline"} 
                            className={cn(
                              "h-11 gap-2 min-w-[100px]",
                              m.isLive && "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg"
                            )} 
                            asChild
                          >
                            <Link to={`/meeting-lobby/${m.id}`}>
                              {m.isLive ? (
                                <>
                                  <Zap className="w-4 h-4" />
                                  Join
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="w-4 h-4" />
                                  Lobby
                                </>
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

            {/* Tasks Section - Right Column */}
            <motion.div variants={itemVariants} className="lg:col-span-5">
              <Card className="h-full border-2 bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-4 border-b-2 border-border/50 bg-gradient-to-r from-muted/30 via-muted/20 to-transparent">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <CheckSquare className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">My Tasks</CardTitle>
                        <CardDescription className="text-xs mt-1">Active and pending tasks</CardDescription>
                      </div>
                    </div>
                    <Link 
                      to="/tasks" 
                      className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                    >
                      View All
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {loading ? (
                    <div className="space-y-3">
                      {[0, 1, 2, 3].map((k) => (
                        <div key={k} className="flex items-center gap-3 rounded-xl border-2 border-border/50 bg-background/40 p-4">
                          <Skeleton className="h-5 w-5 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-56" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <Skeleton className="h-7 w-20 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : recentTasks.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 p-12 text-center">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mx-auto mb-6">
                        <CheckSquare className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="text-base font-bold text-foreground mb-2">No tasks assigned</p>
                      <p className="text-sm text-muted-foreground mb-6">Create one to track your next actions</p>
                      <Button size="lg" variant="outline" onClick={() => setShowCreateTask(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Task
                      </Button>
                    </div>
                  ) : (
                    recentTasks.map((t, i) => {
                      const priority = priorityConfig[t.priority] || priorityConfig.low;
                      const PriorityIcon = priority.icon;
                      return (
                        <motion.div
                          key={t.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="group flex items-center gap-4 rounded-xl border-2 border-border/50 bg-gradient-to-r from-background to-muted/10 p-4 hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
                          onClick={() => setSelectedTask(t)}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded shrink-0 transition-colors flex items-center justify-center",
                            t.status === "done" ? "text-green-600" : "text-muted-foreground"
                          )}>
                            {t.status === "done" ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              {t.project && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 font-mono border-muted-foreground/30"
                                >
                                  {t.project.key}
                                </Badge>
                              )}
                              <p
                                className={cn(
                                  "text-sm font-semibold truncate",
                                  t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"
                                )}
                              >
                                {t.title}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <PriorityIcon className="w-3 h-3 text-muted-foreground" />
                                <span>Priority · {priority.label}</span>
                              </div>
                              {t.dueDate && (
                                <>
                                  <span className="text-muted-foreground/40">·</span>
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                      {new Date(t.dueDate).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                </>
                              )}
                              {t.epic && (
                                <>
                                  <span className="text-muted-foreground/40">·</span>
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: t.epic.color || "#6366f1" }}
                                    />
                                    <span className="truncate max-w-[120px]">
                                      {t.epic.name}
                                    </span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {t.assignee ? (
                            <Avatar className="h-7 w-7 border border-border/50 ring-2 ring-background">
                              <AvatarImage src={t.assignee.avatar} alt={t.assignee.name} />
                              <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-semibold">
                                {t.assignee.initials || t.assignee.name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                              <Users className="w-3.5 h-3.5 text-muted-foreground/30" />
                            </div>
                          )}
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs px-3 py-1 h-7 font-semibold border-2",
                              priority.color
                            )}
                          >
                            {priority.label}
                          </Badge>
                        </motion.div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Second Row */}
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            {/* Team Pulse */}
            <motion.div variants={itemVariants} className="lg:col-span-4">
              <Card className="h-full border-2 bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-4 border-b-2 border-border/50 bg-gradient-to-r from-muted/30 via-muted/20 to-transparent">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center border border-green-500/20">
                        <Eye className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Team Pulse</CardTitle>
                        <CardDescription className="text-xs mt-1">Who's online and active</CardDescription>
                      </div>
                    </div>
                    <Link 
                      to="/virtual-office" 
                      className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group"
                    >
                      <MapPin className="w-4 h-4" />
                      Office
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {loading ? (
                    <div className="space-y-3">
                      {[0, 1, 2, 3].map((k) => (
                        <div key={k} className="flex items-center gap-3">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-40" />
                          </div>
                          <Skeleton className="h-7 w-24 rounded-md" />
                        </div>
                      ))}
                    </div>
                  ) : teamPulseMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No team members online</p>
                  ) : (
                    teamPulseMembers.map((m, i) => {
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
                          className="group flex items-center gap-4 rounded-xl border-2 border-border/50 bg-gradient-to-r from-background to-muted/10 p-4 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                        >
                          <div className="relative">
                            <Avatar className={cn(
                              "h-12 w-12 ring-2 transition-all duration-300 group-hover:ring-4",
                              m.isOnline ? "ring-green-500/30 group-hover:ring-green-500/50" : "ring-background"
                            )}>
                              <AvatarImage src={(m as any).avatar} alt={m.name || "Avatar"} />
                              <AvatarFallback className={cn(
                                "bg-gradient-to-br text-foreground text-sm font-bold transition-colors",
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
                            <p className="text-sm font-bold text-foreground truncate mb-1">{m.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {m.activity && presenceStatus !== "offline"
                                ? m.activity
                                : statusLabels[presenceStatus]}
                            </p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs px-3 py-1 h-7 font-semibold border-2",
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
            <motion.div variants={itemVariants} className="lg:col-span-4">
              <Card className="h-full border-2 bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-4 border-b-2 border-border/50 bg-gradient-to-r from-muted/30 via-muted/20 to-transparent">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                      <Video className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold">Active Rooms</CardTitle>
                      <CardDescription className="text-xs mt-1">Live meetings and spaces</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {activeRooms.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 p-12 text-center">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mx-auto mb-6">
                        <Video className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="text-base font-bold text-foreground mb-2">No live rooms right now</p>
                      <p className="text-sm text-muted-foreground mb-6">Start a quick meeting to get moving</p>
                      <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-blue-600" asChild>
                        <Link to="/meeting-lobby/quick-huddle">
                          <Video className="h-4 w-4" />
                          Start Meeting
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
                        className="group flex items-center gap-4 rounded-xl border-2 border-border/50 bg-gradient-to-r from-background via-background to-muted/20 p-5 hover:border-primary/50 hover:shadow-xl transition-all duration-300"
                      >
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 transition-transform duration-300 group-hover:scale-110">
                          <Video className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-foreground truncate mb-2">{room.name}</p>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{room.participants?.length || 0} participants</span>
                          </div>
                        </div>
                        <Button size="lg" variant="outline" className="h-11 gap-2 min-w-[100px] border-2" asChild>
                          <Link to={`/meeting-lobby/${room.roomId}`}>
                            <Zap className="w-4 h-4" />
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
            <motion.div variants={itemVariants} className="lg:col-span-4">
              <Card className="h-full border-2 bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-4 border-b-2 border-border/50 bg-gradient-to-r from-muted/30 via-muted/20 to-transparent">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Hash className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">Daily Standup</CardTitle>
                        <CardDescription className="text-xs mt-1">Team updates and blockers</CardDescription>
                      </div>
                    </div>
                    {teams.length > 0 && (
                      <select
                        className="text-xs px-3 py-2 border-2 border-border/60 rounded-lg bg-background text-foreground hover:bg-muted transition-colors font-medium"
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
                <CardContent className="p-6 space-y-3">
                  {standupLoading ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((k) => (
                        <div key={k} className="flex items-center gap-3">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-44" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !standupTeamId || teams.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No teams configured yet. Create a team and a #standup channel to start daily standups.
                      </p>
                    </div>
                  ) : standupEntries.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 p-12 text-center">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mx-auto mb-6">
                        <Hash className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="text-base font-bold text-foreground mb-2">No standup updates yet today</p>
                      <p className="text-sm text-muted-foreground">
                        Ask your team to post their updates in the <span className="font-bold">#standup</span> channel
                      </p>
                    </div>
                  ) : (
                    standupEntries.slice(0, 6).map((entry, i) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group rounded-xl border-2 border-border/50 bg-gradient-to-r from-background to-muted/10 p-4 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <Avatar className="h-11 w-11 ring-2 ring-background shrink-0">
                            <AvatarImage src={entry.user.avatar || undefined} alt={entry.user.name || "Avatar"} />
                            <AvatarFallback className="bg-gradient-to-br from-muted/80 to-muted/60 text-foreground text-xs font-bold">
                              {(entry.user.name || "?")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-foreground truncate">{entry.user.name}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className="h-5 px-2 text-[10px] bg-green-500/10 text-green-600 border-green-500/30 font-semibold">
                                  {entry.yesterday.length} done
                                </Badge>
                                <Badge variant="outline" className="h-5 px-2 text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30 font-semibold">
                                  {entry.today.length} today
                                </Badge>
                                {entry.blockers.length > 0 && (
                                  <Badge variant="outline" className="h-5 px-2 text-[10px] bg-red-500/10 text-red-600 border-red-500/30 font-semibold">
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
          <motion.div variants={itemVariants} className="lg:col-span-4">
            <Card className="border-2 bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-4 border-b-2 border-border/50 bg-gradient-to-r from-muted/30 via-muted/20 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Productivity</CardTitle>
                    <CardDescription className="text-xs mt-1">Focus time and work hours</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="focus" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-muted/40 mb-6 border-2">
                    <TabsTrigger value="focus" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold">
                      <Timer className="h-4 w-4" />
                      Focus
                    </TabsTrigger>
                    <TabsTrigger value="hours" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold">
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
            <motion.div variants={itemVariants}>
              <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                      <Sparkles className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-foreground mb-2">
                            {digest.digestType === 'daily' ? 'Daily Digest' : 'Hourly Digest'}
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            {digest.unreadCount} unread notifications from {digest.digestType === 'daily' ? 'today' : 'the past hour'}
                          </p>
                          {digest.byType && Object.keys(digest.byType).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(digest.byType).slice(0, 5).map(([type, count]: [string, any]) => (
                                <Badge key={type} variant="secondary" className="h-7 text-xs px-3 bg-primary/10 text-primary border-primary/20 font-semibold">
                                  {type.replace(/_/g, ' ')}: {count}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="lg"
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
                            className="h-11 border-2"
                          >
                            Mark Read
                          </Button>
                          <Button
                            size="lg"
                            onClick={() => navigate('/notifications')}
                            className="h-11 bg-gradient-to-r from-primary to-blue-600"
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