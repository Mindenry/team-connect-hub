import { useState } from "react";
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

const meetingData = [
  { day: "Mon", meetings: 5, duration: 180 },
  { day: "Tue", meetings: 3, duration: 120 },
  { day: "Wed", meetings: 7, duration: 300 },
  { day: "Thu", meetings: 4, duration: 150 },
  { day: "Fri", meetings: 6, duration: 240 },
];

const taskStatusData = [
  { name: "To Do", value: 15, color: "hsl(var(--muted-foreground))" },
  { name: "In Progress", value: 8, color: "hsl(var(--primary))" },
  { name: "In Review", value: 4, color: "hsl(var(--warning))" },
  { name: "Done", value: 23, color: "hsl(var(--success))" },
];

const teamWorkload = [
  { team: "Engineering", tasks: 22, overdue: 3 },
  { team: "Design", tasks: 12, overdue: 1 },
  { team: "Operations", tasks: 8, overdue: 0 },
  { team: "Marketing", tasks: 5, overdue: 2 },
];

export default function Reports() {
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
            { label: "Total Meetings", value: "25", sub: "This week", icon: Video, trend: "+12%" },
            { label: "Avg Duration", value: "42m", sub: "Per meeting", icon: Clock, trend: "-5%" },
            { label: "Tasks Completed", value: "23", sub: "This week", icon: CheckSquare, trend: "+18%" },
            { label: "Overdue Tasks", value: "6", sub: "Across teams", icon: AlertCircle, trend: "-2" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-success font-medium">{stat.trend}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label} — {stat.sub}</p>
              </CardContent>
            </Card>
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
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={meetingData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip />
                      <Bar dataKey="meetings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Duration (minutes)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={meetingData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="duration" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
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
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Team Workload</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {teamWorkload.map((team) => (
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
