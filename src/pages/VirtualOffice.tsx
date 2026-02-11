import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Monitor, Coffee, Video, Headphones, Phone,
  Wifi, WifiOff, Plus, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusIndicator from "@/components/shared/StatusIndicator";
import { auth } from "@/lib/auth";
import { getSocket } from "@/lib/websocket";
import { usePresence } from "@/hooks/usePresence";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface Person {
  id: string;
  name: string;
  initials: string;
  status: "online" | "busy" | "away" | "offline";
  currentRoom: string | null;
  activity: string;
}

interface Room {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  color: string;
  bgColor: string;
  capacity?: number;
}

const rooms: Room[] = [
  { id: "workspace", name: "💻 Open Workspace", icon: Monitor, description: "Focused individual work", color: "text-primary", bgColor: "bg-primary/5 border-primary/20" },
  { id: "meeting-1", name: "🎥 Meeting Room A", icon: Video, description: "Sprint Planning (LIVE)", color: "text-success", bgColor: "bg-success/5 border-success/20" },
  { id: "meeting-2", name: "🎥 Meeting Room B", icon: Video, description: "Available", color: "text-muted-foreground", bgColor: "bg-muted/50 border-border" },
  { id: "huddle", name: "🎧 Huddle Zone", icon: Headphones, description: "Quick calls & pairing", color: "text-info", bgColor: "bg-info/5 border-info/20" },
  { id: "lounge", name: "☕ Break Lounge", icon: Coffee, description: "Relax & social chat", color: "text-warning", bgColor: "bg-warning/5 border-warning/20" },
  { id: "phone", name: "📞 Phone Booth", icon: Phone, description: "Private calls", color: "text-destructive", bgColor: "bg-destructive/5 border-destructive/20" },
];

const container = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const item = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function VirtualOffice() {
  const currentUser = auth.getUser();
  const navigate = useNavigate();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const { isUserOnline, onlineCount } = usePresence();

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`${API_BASE}/users`);
        if (!response.ok) {
          throw new Error(`Failed to load users: ${response.status} ${response.statusText}`);
        }
        const users = await response.json();
        const mapped: Person[] = users.map((u: any) => ({
          id: u.id,
          name: u.name,
          initials: u.name.split(" ").map((n: string) => n[0]).join(""),
          status: u.status || "offline",
          currentRoom: u.currentRoom || null,
          activity: u.activity || "Available",
        }));
        setPeople(mapped);
      } catch (err) {
        console.error("Failed to load users:", err);
        // Set empty array on error to prevent UI issues
        setPeople([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // WebSocket for real-time room changes
  useEffect(() => {
    const socket = getSocket();

    const handleRoomChange = (data: { userId: string; room: string | null }) => {
      setPeople((prev) =>
        prev.map((p) =>
          p.id === data.userId ? { ...p, currentRoom: data.room } : p
        )
      );
    };

    const handleStatusChange = (data: { userId: string; status: string }) => {
      setPeople((prev) =>
        prev.map((p) =>
          p.id === data.userId ? { ...p, status: data.status as Person["status"] } : p
        )
      );
    };

    socket.on("user:room:changed", handleRoomChange);
    socket.on("user:status:changed", handleStatusChange);

    return () => {
      socket.off("user:room:changed", handleRoomChange);
      socket.off("user:status:changed", handleStatusChange);
    };
  }, []);

  const getRoomPeople = (roomId: string) =>
    people.filter((p) => p.currentRoom === roomId);

  // Combine WebSocket presence with user status from database
  const onlinePeople = people.filter((p) => {
    const isOnlineViaPresence = isUserOnline(p.id);
    const isOnlineViaStatus = p.status === "online";
    return isOnlineViaPresence || isOnlineViaStatus;
  });

  const moveToRoom = async (roomId: string) => {
    if (!currentUser || moving) return;

    setMoving(true);
    try {
      const response = await fetch(`${API_BASE}/users/${currentUser.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentRoom: roomId }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update room: ${response.status} ${response.statusText}`);
      }
      
      // Update local state immediately for better UX
      setPeople((prev) =>
        prev.map((p) =>
          p.id === currentUser.id ? { ...p, currentRoom: roomId } : p
        )
      );
    } catch (err) {
      console.error("Failed to move to room:", err);
      // Show error to user (you can add a toast notification here)
    } finally {
      setMoving(false);
    }
  };

  const currentUserRoom = people.find((p) => p.id === currentUser?.id)?.currentRoom;

  return (
    <motion.div
      className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl"
      variants={container}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-5 md:w-6 h-5 md:h-6 text-primary" />
            Virtual Office
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {onlinePeople.length} of {people.length} online · See where everyone is
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Wifi className="w-3 h-3 text-success" /> {onlinePeople.length} online
          </Badge>
          <Badge variant="outline" className="text-xs gap-1">
            <WifiOff className="w-3 h-3 text-muted-foreground" /> {people.length - onlinePeople.length} offline
          </Badge>
        </div>
      </motion.div>

      {/* Floor Plan Grid */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room, idx) => {
          const roomPeople = getRoomPeople(room.id);
          const isSelected = selectedRoom === room.id;
          const isCurrentRoom = currentUserRoom === room.id;

          return (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.06 }}
              whileHover={{ scale: 1.01 }}
            >
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-200 border-2 overflow-hidden",
                  room.bgColor,
                  isSelected && "ring-2 ring-primary shadow-lg",
                  isCurrentRoom && "ring-2 ring-success"
                )}
                onClick={() => setSelectedRoom(isSelected ? null : room.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{room.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      {isCurrentRoom && (
                        <Badge variant="default" className="text-[10px] h-5 bg-success">
                          You're here
                        </Badge>
                      )}
                      {roomPeople.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {roomPeople.length} {room.capacity ? `/ ${room.capacity}` : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{room.description}</p>
                </CardHeader>
                <CardContent className="pb-4">
                  {roomPeople.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">Empty — ready to use</p>
                  ) : (
                    <div className="space-y-2">
                      {roomPeople.map((person, pi) => (
                        <motion.div
                          key={person.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + pi * 0.04 }}
                          className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-card/50 transition-colors"
                        >
                          <div className="relative">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-card text-foreground text-[10px] font-medium">
                                {person.initials}
                              </AvatarFallback>
                            </Avatar>
                            <StatusIndicator status={person.status} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-card" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{person.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{person.activity}</p>
                          </div>
                          {room.id === "meeting-1" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Move to room / Quick actions */}
                  {currentUser && !isCurrentRoom && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 text-xs h-7 gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveToRoom(room.id);
                      }}
                      disabled={moving}
                    >
                      {moving ? "Moving..." : "Move here"}
                    </Button>
                  )}
                  {room.id.startsWith("meeting") && roomPeople.length === 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 text-xs h-7 gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/meeting-lobby/${room.id}`);
                      }}
                    >
                      <Plus className="w-3 h-3" /> Start Meeting
                    </Button>
                  )}
                  {room.id === "huddle" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 text-xs h-7 gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/meeting-lobby/quick-huddle");
                      }}
                    >
                      <Headphones className="w-3 h-3" /> Join Huddle
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Quick Stats Footer */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Online Now", value: `${onlineCount}`, desc: `of ${people.length} members`, trend: "text-success" },
          { label: "In Rooms", value: `${people.filter(p => p.currentRoom).length}`, desc: "Currently in rooms", trend: "text-primary" },
          { label: "Available", value: `${onlinePeople.length}`, desc: "Ready to connect", trend: "text-info" },
          { label: "Offline", value: `${people.length - onlinePeople.length}`, desc: "Not connected", trend: "text-muted-foreground" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
          >
            <Card className="card-hover">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">{stat.label}</p>
                <p className={cn("text-[10px] mt-1", stat.trend)}>{stat.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
