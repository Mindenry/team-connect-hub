import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  MessageSquare,
  Calendar,
  Star,
  BarChart3,
  Download,
  Filter,
  Award,
  Target,
  Zap,
  Activity,
  Sparkles,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Flame,
  Rocket,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { auth } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface PerformanceData {
  period: {
    startDate: string;
    endDate: string;
  };
  taskCompletionRates: Array<{
    userId: string;
    userName: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }>;
  meetingAttendanceRates: Array<{
    userId: string;
    userName: string;
    totalMeetings: number;
    attendedMeetings: number;
    attendanceRate: number;
  }>;
  chatResponseTimes: Array<{
    userId: string;
    userName: string;
    totalMessages: number;
    respondedMessages: number;
    avgResponseTimeMinutes: number | null;
    avgResponseTimeHours: number | null;
  }>;
  workHoursVsOutput: Array<{
    userId: string;
    userName: string;
    totalHours: number;
    completedTasks: number;
    outputPerHour: number;
  }>;
  peerFeedbacks: Array<{
    userId: string;
    userName: string;
    totalFeedbacks: number;
    avgRating: number;
    ratingsByCategory: Array<{
      category: string;
      avgRating: number;
      count: number;
    }>;
    recentFeedbacks: Array<{
      id: string;
      rating: number;
      comment: string | null;
      category: string;
      giverName: string;
      createdAt: string;
    }>;
  }>;
}

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  gradient, 
  trend, 
  delay = 0 
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  gradient: string;
  trend?: { value: number; label: string };
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    className="group relative"
  >
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-background via-background to-background/50 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl" />
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <motion.p
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: delay + 0.2, duration: 0.3 }}
                className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
              >
                {value}
              </motion.p>
              {trend && (
                <Badge 
                  variant={trend.value >= 0 ? "default" : "secondary"}
                  className={`text-xs ${trend.value >= 0 ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}`}
                >
                  {trend.value >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {trend.label}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
            )}
          </div>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: delay + 0.3, type: "spring", stiffness: 200 }}
            className={`p-3 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}
          >
            <Icon className="w-6 h-6 text-white" />
          </motion.div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const PerformanceBar = ({ 
  name, 
  value, 
  maxValue, 
  rank, 
  color, 
  details 
}: {
  name: string;
  value: number;
  maxValue: number;
  rank: number;
  color: string;
  details?: string;
}) => {
  const percentage = (value / maxValue) * 100;
  const medals = ["🥇", "🥈", "🥉"];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative"
    >
      <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-card/50 to-card/30 border border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shrink-0">
          {rank <= 3 ? (
            <span className="text-2xl">{medals[rank - 1]}</span>
          ) : (
            <span className="text-lg font-bold text-primary">#{rank}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-foreground truncate">{name}</p>
            <span className={`text-sm font-bold ${color} ml-2`}>
              {value.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-2.5 bg-muted/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              className={`h-full rounded-full bg-gradient-to-r ${color.includes('green') ? 'from-green-500 to-emerald-400' : color.includes('blue') ? 'from-blue-500 to-cyan-400' : color.includes('purple') ? 'from-purple-500 to-pink-400' : 'from-orange-500 to-amber-400'} shadow-lg`}
            />
          </div>
          {details && (
            <p className="text-xs text-muted-foreground mt-1.5">{details}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [teams, setTeams] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const teamsRes = await fetch(`${API_BASE}/teams`).then((r) => r.json());
        setTeams(teamsRes);
      } catch (err) {
        console.error("Failed to load teams:", err);
      }
    };
    loadTeams();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(dateRange));

        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        if (selectedTeam !== "all") {
          params.append("teamId", selectedTeam);
        }

        const res = await fetch(`${API_BASE}/reports/performance?${params}`);
        const performanceData = await res.json();
        setData(performanceData);
      } catch (err) {
        console.error("Failed to load performance data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedTeam, dateRange]);

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-emerald-600";
    if (rating >= 3.5) return "text-blue-600";
    if (rating >= 2.5) return "text-amber-600";
    return "text-red-600";
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-600";
    if (rate >= 60) return "text-blue-600";
    if (rate >= 40) return "text-amber-600";
    return "text-red-600";
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-muted-foreground font-medium">Loading performance insights...</p>
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No performance data available</p>
        </div>
      </div>
    );
  }

  // Calculate averages
  const avgTaskCompletion = data.taskCompletionRates.length > 0
    ? Math.round(data.taskCompletionRates.reduce((sum, r) => sum + r.completionRate, 0) / data.taskCompletionRates.length)
    : 0;

  const avgAttendance = data.meetingAttendanceRates.length > 0
    ? Math.round(data.meetingAttendanceRates.reduce((sum, r) => sum + r.attendanceRate, 0) / data.meetingAttendanceRates.length)
    : 0;

  const avgResponseTime = data.chatResponseTimes.filter((r) => r.avgResponseTimeHours !== null).length > 0
    ? Math.round((data.chatResponseTimes.filter((r) => r.avgResponseTimeHours !== null).reduce((sum, r) => sum + (r.avgResponseTimeHours || 0), 0) / data.chatResponseTimes.filter((r) => r.avgResponseTimeHours !== null).length) * 10) / 10
    : 0;

  const avgRating = data.peerFeedbacks.length > 0
    ? Math.round((data.peerFeedbacks.reduce((sum, r) => sum + r.avgRating, 0) / data.peerFeedbacks.length) * 10) / 10
    : 0;

  // Prepare chart data
  const taskChartData = data.taskCompletionRates
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 10)
    .map((item) => ({
      name: item.userName.split(" ")[0],
      completionRate: item.completionRate,
      completed: item.completedTasks,
      total: item.totalTasks,
    }));

  const attendanceChartData = data.meetingAttendanceRates
    .sort((a, b) => b.attendanceRate - a.attendanceRate)
    .slice(0, 10)
    .map((item) => ({
      name: item.userName.split(" ")[0],
      attendanceRate: item.attendanceRate,
      attended: item.attendedMeetings,
      total: item.totalMeetings,
    }));

  const responseTimeData = data.chatResponseTimes
    .filter((item) => item.avgResponseTimeHours !== null)
    .sort((a, b) => (a.avgResponseTimeHours || 0) - (b.avgResponseTimeHours || 0))
    .slice(0, 10)
    .map((item) => ({
      name: item.userName.split(" ")[0],
      responseTime: item.avgResponseTimeHours || 0,
      responded: item.respondedMessages,
      total: item.totalMessages,
    }));

  const outputData = data.workHoursVsOutput
    .filter((item) => item.totalHours > 0)
    .sort((a, b) => b.outputPerHour - a.outputPerHour)
    .slice(0, 10)
    .map((item) => ({
      name: item.userName.split(" ")[0],
      outputPerHour: item.outputPerHour,
      hours: item.totalHours,
      tasks: item.completedTasks,
    }));

  const maxCompletionRate = Math.max(...taskChartData.map(d => d.completionRate), 100);
  const maxAttendanceRate = Math.max(...attendanceChartData.map(d => d.attendanceRate), 100);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden border-b border-border/50 bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        <div className="relative flex items-center justify-between px-8 py-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg"
              >
                <BarChart3 className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
                  Performance Dashboard
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(data.period.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(data.period.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36 bg-background/50 backdrop-blur-sm border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-44 bg-background/50 backdrop-blur-sm border-border/50">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Task Completion"
            value={`${avgTaskCompletion}%`}
            subtitle="Average completion rate"
            icon={CheckCircle2}
            gradient="from-blue-500 to-cyan-500"
            trend={{ value: 5.2, label: "+5.2%" }}
            delay={0.1}
          />
          <StatCard
            title="Meeting Attendance"
            value={`${avgAttendance}%`}
            subtitle="Average attendance rate"
            icon={Calendar}
            gradient="from-emerald-500 to-teal-500"
            trend={{ value: 2.1, label: "+2.1%" }}
            delay={0.2}
          />
          <StatCard
            title="Response Time"
            value={`${avgResponseTime}h`}
            subtitle="Average response time"
            icon={MessageSquare}
            gradient="from-purple-500 to-pink-500"
            trend={{ value: -0.5, label: "-0.5h" }}
            delay={0.3}
          />
          <StatCard
            title="Peer Rating"
            value={`${avgRating}/5`}
            subtitle="Average peer rating"
            icon={Star}
            gradient="from-amber-500 to-orange-500"
            trend={{ value: 0.3, label: "+0.3" }}
            delay={0.4}
          />
        </div>

        {/* Enhanced Tabs */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="bg-card/50 backdrop-blur-sm border border-border/50 p-1.5 rounded-xl h-auto">
            <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="meetings" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Meetings
            </TabsTrigger>
            <TabsTrigger value="response" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              Response
            </TabsTrigger>
            <TabsTrigger value="output" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
              <Zap className="w-4 h-4 mr-2" />
              Productivity
            </TabsTrigger>
            <TabsTrigger value="feedback" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
              <Star className="w-4 h-4 mr-2" />
              Feedback
            </TabsTrigger>
          </TabsList>

          {/* Task Completion Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      Completion Rate Overview
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={taskChartData}>
                      <defs>
                        <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          padding: "8px",
                        }}
                      />
                      <Bar dataKey="completionRate" fill="url(#taskGradient)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.taskCompletionRates
                    .sort((a, b) => b.completionRate - a.completionRate)
                    .slice(0, 5)
                    .map((item, idx) => (
                      <PerformanceBar
                        key={item.userId}
                        name={item.userName}
                        value={item.completionRate}
                        maxValue={maxCompletionRate}
                        rank={idx + 1}
                        color="text-blue-600"
                        details={`${item.completedTasks} / ${item.totalTasks} tasks`}
                      />
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Meeting Attendance Tab */}
          <TabsContent value="meetings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    Attendance Rate Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={attendanceChartData}>
                      <defs>
                        <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          padding: "8px",
                        }}
                      />
                      <Bar dataKey="attendanceRate" fill="url(#attendanceGradient)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-500" />
                    Attendance Leaders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.meetingAttendanceRates
                    .sort((a, b) => b.attendanceRate - a.attendanceRate)
                    .slice(0, 5)
                    .map((item, idx) => (
                      <PerformanceBar
                        key={item.userId}
                        name={item.userName}
                        value={item.attendanceRate}
                        maxValue={maxAttendanceRate}
                        rank={idx + 1}
                        color="text-emerald-600"
                        details={`${item.attendedMeetings} / ${item.totalMeetings} meetings`}
                      />
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Response Time Tab */}
          <TabsContent value="response" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    Response Time Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={responseTimeData}>
                      <defs>
                        <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0.2} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          padding: "8px",
                        }}
                      />
                      <Area type="monotone" dataKey="responseTime" stroke="#a855f7" strokeWidth={2} fill="url(#responseGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-purple-500" />
                    Fastest Responders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.chatResponseTimes
                    .filter((item) => item.avgResponseTimeHours !== null)
                    .sort((a, b) => (a.avgResponseTimeHours || 0) - (b.avgResponseTimeHours || 0))
                    .slice(0, 5)
                    .map((item, idx) => (
                      <motion.div
                        key={item.userId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-4 rounded-xl bg-gradient-to-r from-card/50 to-card/30 border border-border/50 hover:border-purple-500/50 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                              <span className="text-sm font-bold text-purple-600">#{idx + 1}</span>
                            </div>
                            <p className="font-semibold">{item.userName}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {item.avgResponseTimeHours?.toFixed(1)}h avg
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {item.respondedMessages}/{item.totalMessages}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Work Hours vs Output Tab */}
          <TabsContent value="output" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    Productivity Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={outputData}>
                      <defs>
                        <linearGradient id="outputGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          padding: "8px",
                        }}
                      />
                      <Bar dataKey="outputPerHour" fill="url(#outputGradient)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    Most Productive
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.workHoursVsOutput
                    .filter((item) => item.totalHours > 0)
                    .sort((a, b) => b.outputPerHour - a.outputPerHour)
                    .slice(0, 5)
                    .map((item, idx) => (
                      <motion.div
                        key={item.userId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-4 rounded-xl bg-gradient-to-r from-card/50 to-card/30 border border-border/50 hover:border-orange-500/50 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
                              <span className="text-sm font-bold text-orange-600">#{idx + 1}</span>
                            </div>
                            <p className="font-semibold">{item.userName}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-orange-600">
                            {item.outputPerHour.toFixed(2)} tasks/hour
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.completedTasks} tasks in {item.totalHours.toFixed(1)}h
                          </p>
                        </div>
                      </motion.div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Peer Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                    Peer Ratings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.peerFeedbacks
                    .sort((a, b) => b.avgRating - a.avgRating)
                    .slice(0, 8)
                    .map((item, idx) => (
                      <motion.div
                        key={item.userId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group p-4 rounded-xl bg-gradient-to-r from-card/50 to-card/30 border border-border/50 hover:border-rose-500/50 transition-all duration-300 hover:shadow-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-white font-bold">
                              {item.userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-semibold">{item.userName}</p>
                              <Badge className={`${getRatingColor(item.avgRating)} bg-opacity-10 border-0`}>
                                {item.avgRating.toFixed(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3.5 h-3.5 ${
                                      star <= Math.round(item.avgRating)
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-muted-foreground/30"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                ({item.totalFeedbacks} reviews)
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-rose-500" />
                    Recent Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.peerFeedbacks
                    .flatMap((user) =>
                      user.recentFeedbacks.map((feedback) => ({
                        ...feedback,
                        userName: user.userName,
                      }))
                    )
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 10)
                    .map((feedback, idx) => (
                      <motion.div
                        key={feedback.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 rounded-xl bg-gradient-to-r from-card/50 to-card/30 border border-border/50 hover:border-rose-500/50 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm">{feedback.userName}</p>
                              <Badge variant="outline" className="text-xs">
                                {feedback.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              From {feedback.giverName}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= feedback.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {feedback.comment && (
                          <p className="text-sm text-foreground/80 mb-2 leading-relaxed">
                            "{feedback.comment}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(feedback.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </motion.div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
