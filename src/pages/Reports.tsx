import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Video,
  CheckSquare,
  Users,
  Clock,
  TrendingUp,
  Download,
  Calendar,
  AlertCircle,
  DollarSign,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { apiGet } from "@/lib/api";
import { auth } from "@/lib/auth";

export default function Reports() {
  const currentUser = auth.getUser();
  const [meetingData, setMeetingData] = useState<any[]>([]);
  const [taskStatusData, setTaskStatusData] = useState<any[]>([]);
  const [teamWorkload, setTeamWorkload] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalMeetings: 0, avgDuration: 0, tasksCompleted: 0, overdueTasks: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [teams, setTeams] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [teamReport, setTeamReport] = useState<any>(null);
  const [userReport, setUserReport] = useState<any>(null);

  useEffect(() => {
    loadData();
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam && startDate && endDate) {
      loadTeamReport();
    }
    if (currentUser?.id && startDate && endDate) {
      loadUserReport();
    }
  }, [selectedTeam, startDate, endDate]);

  const loadTeams = async () => {
    try {
      const res = await apiGet<any[]>("/teams");
      setTeams(res || []);
    } catch (err) {
      console.error("Failed to load teams", err);
    }
  };

  const loadTeamReport = async () => {
    try {
      const res = await apiGet<any>(
        `/reports/team-productivity?teamId=${selectedTeam}&startDate=${startDate}&endDate=${endDate}`
      );
      setTeamReport(res);
    } catch (err) {
      console.error("Failed to load team report", err);
    }
  };

  const loadUserReport = async () => {
    try {
      const res = await apiGet<any>(
        `/reports/user-activity?userId=${currentUser?.id}&startDate=${startDate}&endDate=${endDate}`
      );
      setUserReport(res);
    } catch (err) {
      console.error("Failed to load user report", err);
    }
  };

  const loadData = async () => {
    try {
      const [meetings, tasks] = await Promise.all([
        apiGet<any[]>("/meetings").catch(() => []),
        apiGet<any[]>("/tasks").catch(() => []),
      ]);
      
      if (!Array.isArray(meetings) || !Array.isArray(tasks)) {
        throw new Error("Invalid response format");
      }

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekMeetings = meetings.filter((m: any) => new Date(m.startTime) >= weekAgo);

      const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
      const meetingByDay = days.map((day, idx) => {
        const dayStart = new Date(weekAgo);
        dayStart.setDate(dayStart.getDate() + idx);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const dayMeetings = weekMeetings.filter((m: any) => {
          const mtgDate = new Date(m.startTime);
          return mtgDate >= dayStart && mtgDate < dayEnd;
        });
        const totalDuration = dayMeetings.reduce((sum: number, m: any) => {
          const start = new Date(m.startTime);
          const end = new Date(m.endTime);
          return sum + (end.getTime() - start.getTime()) / 60000;
        }, 0);
        return { day, meetings: dayMeetings.length, duration: totalDuration };
      });

      const taskStatusCounts = {
        todo: tasks.filter((t: any) => t.status === "todo").length,
        in_progress: tasks.filter((t: any) => t.status === "in_progress").length,
        review: tasks.filter((t: any) => t.status === "review").length,
        done: tasks.filter((t: any) => t.status === "done").length,
      };

      const allTeams = await apiGet<any[]>("/teams").catch(() => []);
      const workload = Array.isArray(allTeams) ? await Promise.all(
        allTeams.map(async (team: any) => {
          const teamTasks = tasks.filter((t: any) => t.teamId === team.id);
          const overdue = teamTasks.filter((t: any) => {
            if (!t.dueDate) return false;
            return new Date(t.dueDate) < now && t.status !== "done";
          }).length;
          return { team: team.name, tasks: teamTasks.length, overdue };
        })
      ) : [];

      setMeetingData(meetingByDay);
      setTaskStatusData([
        { name: "To Do", value: taskStatusCounts.todo, color: "hsl(var(--muted-foreground))" },
        { name: "In Progress", value: taskStatusCounts.in_progress, color: "hsl(var(--primary))" },
        { name: "In Review", value: taskStatusCounts.review, color: "hsl(var(--warning))" },
        { name: "Done", value: taskStatusCounts.done, color: "hsl(var(--success))" },
      ]);
      setTeamWorkload(workload);
      setStats({
        totalMeetings: weekMeetings.length,
        avgDuration: weekMeetings.length > 0 ? Math.round(weekMeetings.reduce((sum: number, m: any) => {
          const start = new Date(m.startTime);
          const end = new Date(m.endTime);
          return sum + (end.getTime() - start.getTime()) / 60000;
        }, 0) / weekMeetings.length) : 0,
        tasksCompleted: taskStatusCounts.done,
        overdueTasks: tasks.filter((t: any) => {
          if (!t.dueDate) return false;
          return new Date(t.dueDate) < now && t.status !== "done";
        }).length,
      });
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadTeams();
  }, []);
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-6 h-14 border-b shrink-0">
        <h1 className="text-lg font-semibold text-foreground">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            This Week
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Meetings", value: stats.totalMeetings.toString(), sub: "This week", icon: Video, trend: "" },
            { label: "Avg Duration", value: `${stats.avgDuration}m`, sub: "Per meeting", icon: Clock, trend: "" },
            { label: "Tasks Completed", value: stats.tasksCompleted.toString(), sub: "This week", icon: CheckSquare, trend: "" },
            { label: "Overdue Tasks", value: stats.overdueTasks.toString(), sub: "Across teams", icon: AlertCircle, trend: "" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                    {stat.trend && <span className="text-xs text-success font-medium">{stat.trend}</span>}
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label} — {stat.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="meetings">
          <TabsList>
            <TabsTrigger value="meetings">Meeting Report</TabsTrigger>
            <TabsTrigger value="tasks">Task Report</TabsTrigger>
            <TabsTrigger value="team">Team Productivity</TabsTrigger>
            <TabsTrigger value="user">My Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="meetings" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Meetings per Day</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-[240px] flex items-center justify-center text-muted-foreground">Loading...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={meetingData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip />
                        <Bar dataKey="meetings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Duration (minutes)</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-[240px] flex items-center justify-center text-muted-foreground">Loading...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={meetingData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip />
                        <Line type="monotone" dataKey="duration" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Task Status Distribution</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  {loading ? (
                    <div className="h-[240px] flex items-center justify-center text-muted-foreground">Loading...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {taskStatusData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Team Workload</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <div className="text-muted-foreground">Loading...</div>
                  ) : teamWorkload.length === 0 ? (
                    <div className="text-muted-foreground">No team data</div>
                  ) : (
                    teamWorkload.map((team) => (
                    <div key={team.team} className="flex items-center gap-3">
                      <span className="text-sm text-foreground w-28">{team.team}</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${(team.tasks / 25) * 100}%` }} />
                      </div>
                      <span className="text-sm text-foreground w-8 text-right">{team.tasks}</span>
                      {team.overdue > 0 && (
                        <Badge variant="destructive" className="text-xs">{team.overdue} overdue</Badge>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Team Productivity Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label>Team</Label>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {teamReport && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">
                            {teamReport.summary?.tasks?.total || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">Total Tasks</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">
                            {teamReport.summary?.tasks?.completed || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">Completed</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">
                            {teamReport.summary?.meetings?.total || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">Meetings</p>
                        </CardContent>
                      </Card>
                    </div>

                    {teamReport.members && teamReport.members.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Team Members</h3>
                        <div className="space-y-2">
                          {teamReport.members.map((member: any) => (
                            <Card key={member.user.id}>
                              <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{member.user.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {member.tasks?.completed || 0} tasks completed
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold">
                                      {member.timeTracking?.totalHours?.toFixed(1) || 0}h
                                    </p>
                                    <p className="text-xs text-muted-foreground">Total Time</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">My Activity Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {userReport && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">
                            {userReport.summary?.tasks?.completed || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">Tasks Completed</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">
                            {userReport.summary?.timeTracking?.totalHours?.toFixed(1) || 0}h
                          </div>
                          <p className="text-xs text-muted-foreground">Total Hours</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">
                            {userReport.summary?.meetings?.attended || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">Meetings Attended</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
