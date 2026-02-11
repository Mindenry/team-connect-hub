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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function Reports() {
  const [meetingData, setMeetingData] = useState<any[]>([]);
  const [taskStatusData, setTaskStatusData] = useState<any[]>([]);
  const [teamWorkload, setTeamWorkload] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalMeetings: 0, avgDuration: 0, tasksCompleted: 0, overdueTasks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Use Reports API
        const [meetingReport, taskReport, teams] = await Promise.all([
          fetch(`${API_BASE}/reports/meetings`).then((r) => r.json()),
          fetch(`${API_BASE}/reports/tasks`).then((r) => r.json()),
          fetch(`${API_BASE}/teams`).then((r) => r.json()),
        ]);

        // Process meeting report data
        const meetingByDay = meetingReport.meetings?.slice(0, 5).map((m: any, idx: number) => ({
          day: new Date(m.startTime).toLocaleDateString("en-US", { weekday: "short" }),
          meetings: 1,
          duration: m.duration || 0,
        })) || [];

        // Process task report data
        setTaskStatusData([
          { name: "To Do", value: taskReport.tasksByStatus?.todo || 0, color: "hsl(var(--muted-foreground))" },
          { name: "In Progress", value: taskReport.tasksByStatus?.in_progress || 0, color: "hsl(var(--primary))" },
          { name: "In Review", value: taskReport.tasksByStatus?.review || 0, color: "hsl(var(--warning))" },
          { name: "Done", value: taskReport.tasksByStatus?.done || 0, color: "hsl(var(--success))" },
        ]);

        // Process team workload
        const workload = await Promise.all(
          teams.map(async (team: any) => {
            try {
              const workloadRes = await fetch(`${API_BASE}/reports/teams/${team.id}/workload`);
              if (workloadRes.ok) {
                const workloadData = await workloadRes.json();
                return {
                  team: team.name,
                  tasks: workloadData.workload?.reduce((sum: number, w: any) => sum + w.totalTasks, 0) || 0,
                  overdue: workloadData.workload?.reduce((sum: number, w: any) => sum + w.overdue, 0) || 0,
                };
              }
            } catch (err) {
              console.error(`Failed to load workload for team ${team.id}:`, err);
            }
            return { team: team.name, tasks: 0, overdue: 0 };
          })
        );

        setMeetingData(meetingByDay);
        setTeamWorkload(workload.filter(w => w.tasks > 0));
        setStats({
          totalMeetings: meetingReport.summary?.totalMeetings || 0,
          avgDuration: Math.round(meetingReport.summary?.avgDuration || 0),
          tasksCompleted: taskReport.summary?.completedTasks || 0,
          overdueTasks: taskReport.summary?.overdueTasks || 0,
        });
      } catch (err) {
        console.error("Failed to load reports:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              try {
                const [meetingReport, taskReport] = await Promise.all([
                  fetch(`${API_BASE}/reports/meetings`).then((r) => r.json()),
                  fetch(`${API_BASE}/reports/tasks`).then((r) => r.json()),
                ]);
                
                // Convert to CSV
                const meetingCSV = [
                  ["Meeting Title", "Start Time", "End Time", "Duration (min)", "Host", "Participants"],
                  ...(meetingReport.meetings || []).map((m: any) => [
                    m.title,
                    m.startTime,
                    m.endTime,
                    m.duration,
                    m.host,
                    m.participants,
                  ]),
                ].map(row => row.join(",")).join("\n");
                
                const blob = new Blob([meetingCSV], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `meeting-report-${new Date().toISOString().split("T")[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error("Export failed:", err);
              }
            }}
          >
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
        </Tabs>
      </div>
    </div>
  );
}
