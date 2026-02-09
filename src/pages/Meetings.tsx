import { useState } from "react";
import {
  Video,
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  MoreHorizontal,
  Filter,
  Link as LinkIcon,
  Copy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  team: string;
  host: { name: string; initials: string };
  participants: number;
  status: "live" | "upcoming" | "ended";
  hasWaitingRoom: boolean;
}

const meetings: Meeting[] = [
  { id: "1", title: "Sprint Planning", date: "Today", time: "10:00 AM", duration: "1h", team: "Engineering", host: { name: "สมชาย K.", initials: "SK" }, participants: 8, status: "live", hasWaitingRoom: true },
  { id: "2", title: "Design Review", date: "Today", time: "2:00 PM", duration: "45m", team: "Design", host: { name: "อริสา P.", initials: "AP" }, participants: 5, status: "upcoming", hasWaitingRoom: false },
  { id: "3", title: "1-on-1 with Manager", date: "Today", time: "4:30 PM", duration: "30m", team: "", host: { name: "สมชาย K.", initials: "SK" }, participants: 2, status: "upcoming", hasWaitingRoom: false },
  { id: "4", title: "Product Roadmap Discussion", date: "Tomorrow", time: "9:00 AM", duration: "1h 30m", team: "Company", host: { name: "วิภา T.", initials: "VT" }, participants: 12, status: "upcoming", hasWaitingRoom: true },
  { id: "5", title: "Daily Standup", date: "Yesterday", time: "10:00 AM", duration: "15m", team: "Engineering", host: { name: "สมชาย K.", initials: "SK" }, participants: 6, status: "ended", hasWaitingRoom: false },
  { id: "6", title: "Client Presentation", date: "Yesterday", time: "3:00 PM", duration: "1h", team: "Design", host: { name: "อริสา P.", initials: "AP" }, participants: 10, status: "ended", hasWaitingRoom: true },
];

const statusStyles: Record<string, string> = {
  live: "bg-success text-success-foreground",
  upcoming: "bg-primary text-primary-foreground",
  ended: "bg-muted text-muted-foreground",
};

export default function Meetings() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-6 h-14 border-b shrink-0">
        <h1 className="text-lg font-semibold text-foreground">Meetings</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search meetings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 w-48 text-sm" />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button size="sm" asChild>
            <Link to="/meeting-room">
              <Video className="w-4 h-4 mr-2" />
              Instant Meeting
            </Link>
          </Button>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {meetings.map((meeting) => (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-medium text-foreground">{meeting.title}</h3>
                        <Badge className={`text-xs ${statusStyles[meeting.status]}`}>
                          {meeting.status === "live" ? "LIVE" : meeting.status}
                        </Badge>
                        {meeting.hasWaitingRoom && (
                          <Badge variant="outline" className="text-xs">Waiting Room</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />{meeting.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />{meeting.time} ({meeting.duration})
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />{meeting.participants}
                        </span>
                        {meeting.team && <Badge variant="secondary" className="text-xs">{meeting.team}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{meeting.host.initials}</AvatarFallback>
                      </Avatar>
                      {meeting.status === "live" && (
                        <Button size="sm" asChild>
                          <Link to="/meeting-room">Join</Link>
                        </Button>
                      )}
                      {meeting.status === "upcoming" && (
                        <Button size="sm" variant="outline">
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copy Link
                        </Button>
                      )}
                      {meeting.status === "ended" && (
                        <Button size="sm" variant="ghost">Summary</Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="upcoming" className="space-y-3">
            {meetings.filter(m => m.status !== "ended").map((meeting) => (
              <Card key={meeting.id}><CardContent className="p-4 text-sm text-foreground">{meeting.title} — {meeting.time}</CardContent></Card>
            ))}
          </TabsContent>
          <TabsContent value="past" className="space-y-3">
            {meetings.filter(m => m.status === "ended").map((meeting) => (
              <Card key={meeting.id}><CardContent className="p-4 text-sm text-foreground">{meeting.title} — {meeting.time}</CardContent></Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
