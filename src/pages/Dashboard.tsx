import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  Calendar,
  MessageSquare,
  CheckSquare,
  Users,
  Hash,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import CreateMeetingDialog from "@/components/dialogs/CreateMeetingDialog";
import CreateTaskDialog from "@/components/dialogs/CreateTaskDialog";
import TaskDetailDialog from "@/components/dialogs/TaskDetailDialog";
import JoinMeetingByCodeDialog from "@/components/dialogs/JoinMeetingByCodeDialog";

import { auth } from "@/lib/auth";
import { usePresence } from "@/hooks/usePresence";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { toast } from "sonner";

import {
  KpiCardsGrid,
  MeetingCard,
  TaskCard,
  TeamPulseCard,
  ActiveRoomsCard,
  containerVariants,
  itemVariants,
} from "@/components/dashboard";
import type { MeetingItem, TaskItem, MemberItem, DashboardStats, KpiCardConfig } from "@/components/dashboard";

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
  const [stats, setStats] = useState<DashboardStats>({
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
  }, [currentUser?.id]);

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

  const createQuickHuddle = async () => {
    try {
      const meeting = await apiPost<any>("/meetings/quick-huddle", {});
      toast.success("Quick Huddle created", {
        description: `Meeting code: ${meeting.meetingCode}`,
      });
      // Navigate using meetingCode so URL matches the code shown in toast
      navigate(`/meeting-lobby/${meeting.meetingCode}`);
    } catch (err: any) {
      toast.error("Failed to create Quick Huddle", {
        description: err.message || "Please try again",
      });
    }
  };

  const kpiCards: KpiCardConfig[] = [
    { 
      label: "Meetings Today", 
      value: stats.meetingsToday, 
      icon: Video,
      gradient: "from-blue-500/20 via-blue-500/10 to-blue-500/5",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
      borderColor: "border-blue-500/20",
    },
    { 
      label: "Open Tasks", 
      value: stats.openTasks, 
      icon: CheckSquare,
      gradient: "from-amber-500/20 via-amber-500/10 to-amber-500/5",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
      borderColor: "border-amber-500/20",
    },
    { 
      label: "Unread Messages", 
      value: stats.unreadMessages, 
      icon: MessageSquare,
      gradient: "from-purple-500/20 via-purple-500/10 to-purple-500/5",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-600",
      borderColor: "border-purple-500/20",
    },
    { 
      label: "Team Online", 
      value: onlineSummary, 
      icon: Users,
      gradient: "from-green-500/20 via-green-500/10 to-green-500/5",
      iconBg: "bg-green-500/10",
      iconColor: "text-green-600",
      borderColor: "border-green-500/20",
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

          {/* Compact Hero Header */}
          <motion.div variants={itemVariants}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                    <LayoutDashboard className="w-4 h-4 text-primary" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {greeting}, <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">{currentUser?.name || "User"}</span>
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground ml-[42px]">
                  <div className="flex items-center gap-1.5">
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
                  {nextMeeting && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="font-medium text-foreground text-xs">Next: {nextMeeting.title}</span>
                      <span className="text-muted-foreground">
                        {new Date(nextMeeting.startTime).toLocaleTimeString("th-TH", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-medium text-green-600">{onlineCount}</span>
                    <span>online</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setShowJoinByCode(true)} className="h-9 gap-1.5 text-xs bg-background/50 hover:bg-background hover:border-primary/50 transition-all group">
                      <Hash className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
                      <span className="hidden sm:inline">Join by Code</span>
                      <span className="sm:hidden">Join</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>เข้าร่วมการประชุมด้วยรหัส</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setShowCreateTask(true)} className="h-9 gap-1.5 text-xs bg-background/50 hover:bg-background hover:border-amber-500/50 transition-all group">
                      <CheckSquare className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                      <span className="hidden sm:inline">New Task</span>
                      <span className="sm:hidden">Task</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>สร้างงานใหม่</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setShowCreateMeeting(true)} className="h-9 gap-1.5 text-xs bg-background/50 hover:bg-background hover:border-blue-500/50 transition-all group">
                      <Calendar className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                      <span className="hidden sm:inline">Schedule</span>
                      <span className="sm:hidden">Meet</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>กำหนดการประชุม</TooltipContent>
                </Tooltip>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 text-xs bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-500 shadow-md hover:shadow-lg transition-all group"
                  onClick={createQuickHuddle}
                >
                  <Video className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">Start Meeting</span>
                  <span className="sm:hidden">Start</span>
                </Button>
              </div>
            </div>
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
          <motion.div variants={itemVariants}>
            <KpiCardsGrid cards={kpiCards} loading={loading} onCardClick={handleKpiClick} />
          </motion.div>

          {/* Active Meeting Rooms Banner */}
          <AnimatePresence>
            {activeRooms.length > 0 && (
              <motion.div
                variants={itemVariants}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] via-card/80 to-card/80 backdrop-blur-xl shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <Video className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border-2 border-background" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Active Rooms</p>
                          <p className="text-[11px] text-muted-foreground">
                            {activeRooms.length} room{activeRooms.length !== 1 ? "s" : ""} with{" "}
                            {activeRooms.reduce((sum, r) => sum + r.participants.length, 0)} participant{activeRooms.reduce((sum, r) => sum + r.participants.length, 0) !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <Link to="/meetings" className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group">
                        View All
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </Link>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {activeRooms.map((room, i) => {
                        const myParticipant = room.participants.find((p) => p.userId === currentUser?.id);
                        return (
                          <motion.div
                            key={room.roomId}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05, duration: 0.3 }}
                            className="group flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all duration-300 bg-gradient-to-r from-emerald-500/5 to-transparent border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 hover:-translate-y-0.5"
                            onClick={() => navigate(`/meeting-lobby/${room.roomId}`)}
                          >
                            <div className="relative shrink-0">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/15 text-emerald-600">
                                <Video className="w-5 h-5" />
                              </div>
                              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{room.name}</p>
                              <p className="text-[10px] text-muted-foreground">{room.participants.length} participants</p>
                            </div>
                            <Button size="sm" variant={myParticipant ? "default" : "outline"} className="h-7 px-2.5 text-[11px] font-semibold shrink-0" onClick={(e) => { e.stopPropagation(); navigate(`/meeting-lobby/${room.roomId}`); }}>
                              {myParticipant ? "Return" : "Join"}
                            </Button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content Grid */}
          <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
            {/* Left Column: Meetings + Tasks */}
            <div className="lg:col-span-8 space-y-4">
              <motion.div variants={itemVariants}>
                <MeetingCard meetings={todayMeetings} loading={loading} onCreateMeeting={() => setShowCreateMeeting(true)} onQuickHuddle={createQuickHuddle} />
              </motion.div>

              <motion.div variants={itemVariants}>
                <TaskCard tasks={recentTasks} loading={loading} onCreateTask={() => setShowCreateTask(true)} onTaskClick={setSelectedTask} />
              </motion.div>
            </div>

            {/* Right Column: Team Pulse + Active Rooms */}
            <div className="lg:col-span-4 space-y-4">
              <motion.div variants={itemVariants}>
                <TeamPulseCard members={teamPulseMembers} loading={loading} />
              </motion.div>

              <motion.div variants={itemVariants}>
                <ActiveRoomsCard rooms={activeRooms} onQuickHuddle={createQuickHuddle} />
              </motion.div>
            </div>
          </div>

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
                                <span key={type} className="h-7 text-xs px-3 inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                                  {type.replace(/_/g, ' ')}: {count}
                                </span>
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
                          <Button size="lg" onClick={() => navigate('/notifications')} className="h-11 bg-gradient-to-r from-primary to-blue-600">
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
