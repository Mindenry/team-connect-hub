import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Video,
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  MoreHorizontal,
  Filter,
  Copy,
  Zap,
  Phone,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreateMeetingDialog from "@/components/dialogs/CreateMeetingDialog";
import { getSocket } from "@/lib/websocket";
import { auth } from "@/lib/auth";

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

interface ActiveRoom {
  roomId: string;
  name: string;
  participants: Array<{ peerId: string; name: string }>;
  createdAt: Date;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const statusStyles: Record<string, string> = {
  live: "bg-success text-success-foreground",
  upcoming: "bg-primary text-primary-foreground",
  ended: "bg-muted text-muted-foreground",
};

function mapMeeting(m: any): Meeting {
  const start = new Date(m.startTime);
  const end = new Date(m.endTime);
  const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const duration = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 ? ` ${durationMinutes % 60}m` : ""}`
    : `${durationMinutes}m`;
  const date = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const status = m.status === "live" || m.status === "upcoming" || m.status === "ended" ? m.status : "upcoming";
  return {
    id: m.id,
    title: m.title,
    date,
    time,
    duration,
    team: m.team?.name ?? "",
    host: {
      name: m.host?.name ?? "Host",
      initials: m.host?.name?.split(" ").map((p: string) => p[0]).join("").toUpperCase() ?? "H",
    },
    participants: m.tasks?.length ?? 0,
    status,
    hasWaitingRoom: m.waitingRoom ?? false,
  };
}

function MeetingCard({ meeting, index }: { meeting: Meeting; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      <Card className="hover:shadow-md transition-shadow">
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
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{meeting.date}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{meeting.time} ({meeting.duration})</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{meeting.participants}</span>
                {meeting.team && <Badge variant="secondary" className="text-xs">{meeting.team}</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{meeting.host.initials}</AvatarFallback>
              </Avatar>
              {meeting.status === "ended" ? (
                <Button size="sm" variant="ghost" asChild><Link to="/meeting-summary">Summary</Link></Button>
              ) : (
                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" asChild>
                  <Link to={`/meeting-lobby/${meeting.id}`}>Join</Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ActiveRoomCard({ room, onJoin }: { room: ActiveRoom; onJoin: () => void }) {
  const isQuickHuddle = room.roomId === "quick-huddle";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      <Card className="border-2 border-green-500/50 bg-gradient-to-br from-green-500/5 to-transparent hover:border-green-500 transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0 relative">
              {isQuickHuddle ? (
                <Zap className="w-5 h-5 text-green-500" />
              ) : (
                <Video className="w-5 h-5 text-green-500" />
              )}
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-foreground">{room.name}</h3>
                <Badge className="bg-green-500 text-white text-xs animate-pulse">● LIVE</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {room.participants.slice(0, 5).map((p, i) => (
                    <Avatar key={p.peerId} className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="bg-primary/20 text-primary text-[9px]">
                        {p.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {room.participants.length > 5 && (
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="bg-muted text-muted-foreground text-[9px]">
                        +{room.participants.length - 5}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {room.participants.length} {room.participants.length === 1 ? "person" : "people"} in room
                </span>
              </div>
              {room.participants.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {room.participants.map(p => p.name.split(" ")[0]).slice(0, 3).join(", ")}
                  {room.participants.length > 3 && ` and ${room.participants.length - 3} more`}
                </p>
              )}
            </div>
            <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={onJoin}>
              <Phone className="w-4 h-4 mr-2" />
              Join
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Meetings() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);

  // Fetch scheduled meetings
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/meetings`);
        if (!res.ok) throw new Error(`Failed to load meetings (${res.status})`);
        const data = await res.json();
        const mapped: Meeting[] = data.map(mapMeeting);
        if (!cancelled) setItems(mapped);
      } catch (e: any) {
        if (!cancelled) {
          console.error(e);
          setError(e.message ?? "Failed to load meetings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const socket = getSocket();
    socket.on('meeting:created', (meeting: any) => {
      if (!cancelled) {
        const mapped = mapMeeting(meeting);
        setItems((prev) => [...prev, mapped]);
      }
    });
    socket.on('meeting:updated', (meeting: any) => {
      if (!cancelled) {
        const mapped = mapMeeting(meeting);
        setItems((prev) => prev.map((m) => (m.id === mapped.id ? mapped : m)));
      }
    });
    socket.on('meeting:deleted', ({ id }: { id: string }) => {
      if (!cancelled) {
        setItems((prev) => prev.filter((m) => m.id !== id));
      }
    });

    return () => {
      cancelled = true;
      socket.off('meeting:created');
      socket.off('meeting:updated');
      socket.off('meeting:deleted');
    };
  }, []);

  // Listen for active rooms
  useEffect(() => {
    const socket = getSocket();

    // Request active rooms on mount
    socket.emit("rooms:get-active");

    // Listen for room updates
    const onActiveRooms = (rooms: ActiveRoom[]) => {
      setActiveRooms(rooms || []);
    };

    const onParticipantJoined = (data: { roomId: string; participant: { peerId: string; name: string } }) => {
      setActiveRooms(prev => {
        const arr = prev || [];
        const roomIndex = arr.findIndex(r => r.roomId === data.roomId);
        if (roomIndex >= 0) {
          const updated = [...arr];
          if (!updated[roomIndex].participants.some(p => p.peerId === data.participant.peerId)) {
            updated[roomIndex].participants.push(data.participant);
          }
          return updated;
        } else {
          // New room
          return [...arr, {
            roomId: data.roomId,
            name: data.roomId === "quick-huddle" ? "Quick Huddle" : `Meeting ${data.roomId.slice(0, 8)}`,
            participants: [data.participant],
            createdAt: new Date(),
          }];
        }
      });
    };

    const onParticipantLeft = (data: { roomId: string; peerId: string }) => {
      setActiveRooms(prev => {
        const arr = prev || [];
        return arr.map(room => {
          if (room.roomId === data.roomId) {
            const newParticipants = room.participants.filter(p => p.peerId !== data.peerId);
            return { ...room, participants: newParticipants };
          }
          return room;
        }).filter(room => room.participants.length > 0); // Remove empty rooms
      });
    };

    socket.on("rooms:active", onActiveRooms);
    socket.on("room:participant:joined", onParticipantJoined);
    socket.on("room:participant:left", onParticipantLeft);

    return () => {
      socket.off("rooms:active", onActiveRooms);
      socket.off("room:participant:joined", onParticipantJoined);
      socket.off("room:participant:left", onParticipantLeft);
    };
  }, []);

  const filteredMeetings = items.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.team.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinRoom = (roomId: string) => {
    navigate(`/meeting-lobby/${roomId}`);
  };

  const handleStartQuickHuddle = () => {
    navigate("/meeting-lobby/quick-huddle");
  };

  return (
    <div className="flex flex-col h-screen">
      <CreateMeetingDialog open={showCreateMeeting} onOpenChange={setShowCreateMeeting} />

      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b shrink-0">
        <h1 className="text-lg font-semibold text-foreground">Meetings</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search meetings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-8 w-48 text-sm" />
          </div>
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />Filter</Button>
          <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={handleStartQuickHuddle}>
            <Zap className="w-4 h-4 mr-2" />Quick Huddle
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCreateMeeting(true)}>
            <Plus className="w-4 h-4 mr-2" />Schedule
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Active Rooms Section */}
        {activeRooms?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-medium text-muted-foreground">Active Rooms</h2>
              <Badge className="bg-green-500/20 text-green-600 text-xs">{activeRooms.length} live</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {activeRooms.map((room) => (
                <ActiveRoomCard
                  key={room.roomId}
                  room={room}
                  onJoin={() => handleJoinRoom(room.roomId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick Huddle Prompt - Show if no active rooms */}
        {(!activeRooms || activeRooms.length === 0) && (
          <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Start a Quick Huddle</h3>
                  <p className="text-sm text-muted-foreground">Jump into a meeting instantly. Others can join from here.</p>
                </div>
              </div>
              <Button className="bg-green-500 hover:bg-green-600" onClick={handleStartQuickHuddle}>
                <Phone className="w-4 h-4 mr-2" />
                Start Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Scheduled Meetings */}
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All ({filteredMeetings.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({filteredMeetings.filter(m => m.status !== "ended").length})</TabsTrigger>
            <TabsTrigger value="past">Past ({filteredMeetings.filter(m => m.status === "ended").length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Loading meetings...</p>}
            {error && !loading && (
              <p className="text-sm text-destructive">Failed to load meetings: {error}</p>
            )}
            {!loading && !error && filteredMeetings.map((m, i) => (
              <MeetingCard key={m.id} meeting={m} index={i} />
            ))}
          </TabsContent>
          <TabsContent value="upcoming" className="space-y-3">
            {filteredMeetings.filter(m => m.status !== "ended").map((m, i) => <MeetingCard key={m.id} meeting={m} index={i} />)}
          </TabsContent>
          <TabsContent value="past" className="space-y-3">
            {filteredMeetings.filter(m => m.status === "ended").map((m, i) => <MeetingCard key={m.id} meeting={m} index={i} />)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
