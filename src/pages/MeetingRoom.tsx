import { useState } from "react";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  PhoneOff,
  Users,
  MessageSquare,
  Hand,
  MoreHorizontal,
  Shield,
  Lock,
  UserMinus,
  Volume2,
  VolumeX,
  ThumbsUp,
  Smile,
  Settings,
  Maximize,
  ChevronRight,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

interface Participant {
  id: number;
  name: string;
  initials: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  isHost: boolean;
}

const initialParticipants: Participant[] = [
  { id: 1, name: "สมชาย K. (You)", initials: "SK", isMuted: false, isCameraOn: true, isHandRaised: false, isScreenSharing: false, isSpeaking: true, isHost: true },
  { id: 2, name: "อริสา P.", initials: "AP", isMuted: false, isCameraOn: true, isHandRaised: false, isScreenSharing: false, isSpeaking: false, isHost: false },
  { id: 3, name: "จิรวัฒน์ W.", initials: "JW", isMuted: true, isCameraOn: false, isHandRaised: true, isScreenSharing: false, isSpeaking: false, isHost: false },
  { id: 4, name: "พิมพ์ L.", initials: "PL", isMuted: false, isCameraOn: true, isHandRaised: false, isScreenSharing: false, isSpeaking: false, isHost: false },
  { id: 5, name: "ธนา S.", initials: "TS", isMuted: true, isCameraOn: true, isHandRaised: false, isScreenSharing: false, isSpeaking: false, isHost: false },
  { id: 6, name: "นภา M.", initials: "NM", isMuted: false, isCameraOn: true, isHandRaised: false, isScreenSharing: false, isSpeaking: false, isHost: false },
];

const chatMessages = [
  { id: 1, sender: "อริสา P.", time: "10:05", text: "ขอ share หน้าจอสักครู่ค่ะ" },
  { id: 2, sender: "จิรวัฒน์ W.", time: "10:06", text: "ยกมือถามเรื่อง Sprint goal ครับ" },
  { id: 3, sender: "พิมพ์ L.", time: "10:08", text: "เห็นด้วยกับ proposal นี้ค่ะ 👍" },
  { id: 4, sender: "สมชาย K.", time: "10:10", text: "OK ไปต่อ agenda ถัดไปเลยครับ" },
];

export default function MeetingRoom() {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [participants] = useState(initialParticipants);

  const gridCols =
    participants.length <= 2
      ? "grid-cols-1 md:grid-cols-2"
      : participants.length <= 4
      ? "grid-cols-2"
      : participants.length <= 6
      ? "grid-cols-2 md:grid-cols-3"
      : "grid-cols-3 md:grid-cols-4";

  return (
    <div className="flex flex-col h-screen bg-meeting-bg">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-primary-foreground">Sprint Planning</h2>
          <Badge className="bg-success text-success-foreground text-xs animate-pulse-soft">
            LIVE
          </Badge>
          <span className="text-xs text-muted-foreground">42:15</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary-foreground h-8 w-8">
            <Maximize className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary-foreground h-8 w-8">
            <Settings className="w-4 h-4" />
          </Button>
          <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
            <Lock className="w-3 h-3 mr-1" />
            Locked
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-3">
          <div className={cn("grid gap-2 h-full", gridCols)}>
            {participants.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "relative rounded-xl bg-meeting-tile overflow-hidden flex items-center justify-center group",
                  p.isSpeaking && "ring-2 ring-primary"
                )}
              >
                {/* Video placeholder */}
                {p.isCameraOn ? (
                  <div className="absolute inset-0 bg-gradient-to-b from-meeting-tile to-meeting-bg/50" />
                ) : null}
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/20 text-primary-foreground text-xl">
                    {p.initials}
                  </AvatarFallback>
                </Avatar>

                {/* Name overlay */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                  <span className="text-xs text-primary-foreground bg-meeting-bg/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    {p.name}
                    {p.isHost && " ⭐"}
                  </span>
                </div>

                {/* Status icons */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {p.isHandRaised && (
                    <span className="w-6 h-6 rounded-full bg-warning flex items-center justify-center">
                      <Hand className="w-3.5 h-3.5 text-warning-foreground" />
                    </span>
                  )}
                  {p.isMuted && (
                    <span className="w-6 h-6 rounded-full bg-destructive/80 flex items-center justify-center">
                      <MicOff className="w-3.5 h-3.5 text-destructive-foreground" />
                    </span>
                  )}
                  {!p.isCameraOn && (
                    <span className="w-6 h-6 rounded-full bg-meeting-controls flex items-center justify-center">
                      <VideoOff className="w-3.5 h-3.5 text-muted-foreground" />
                    </span>
                  )}
                </div>

                {/* Host controls on hover */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground/70 hover:text-primary-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel - Participants */}
        {showParticipants && (
          <div className="w-72 bg-meeting-controls border-l border-sidebar-border flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
              <h3 className="text-sm font-medium text-primary-foreground">
                Participants ({participants.length})
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setShowParticipants(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
              {/* Waiting room */}
              <div className="pb-2 mb-2 border-b border-sidebar-border">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Waiting Room (1)</p>
                <div className="flex items-center justify-between p-2 rounded-lg bg-meeting-bg/50">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-warning/20 text-warning text-xs">GS</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-primary-foreground">Guest User</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="default" className="h-6 px-2 text-xs">Admit</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-destructive">Deny</Button>
                  </div>
                </div>
              </div>
              {/* In meeting */}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">In Meeting</p>
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-meeting-bg/50 transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/20 text-primary-foreground text-xs">{p.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary-foreground truncate">
                      {p.name} {p.isHost && <Shield className="w-3 h-3 inline text-warning" />}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {p.isHandRaised && <Hand className="w-3.5 h-3.5 text-warning" />}
                    {p.isMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-destructive" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-success" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Host actions */}
            <div className="p-3 border-t border-sidebar-border space-y-1.5">
              <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 text-muted-foreground">
                <VolumeX className="w-3.5 h-3.5" /> Mute All
              </Button>
              <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 text-muted-foreground">
                <Lock className="w-3.5 h-3.5" /> Lock Meeting
              </Button>
            </div>
          </div>
        )}

        {/* Side Panel - Chat */}
        {showChat && (
          <div className="w-72 bg-meeting-controls border-l border-sidebar-border flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
              <h3 className="text-sm font-medium text-primary-foreground">Meeting Chat</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setShowChat(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
              {chatMessages.map((msg) => (
                <div key={msg.id}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium text-primary-foreground">{msg.sender}</span>
                    <span className="text-xs text-muted-foreground">{msg.time}</span>
                  </div>
                  <p className="text-sm text-sidebar-foreground">{msg.text}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-sidebar-border">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-meeting-bg border-sidebar-border text-primary-foreground text-sm h-8"
                />
                <Button size="icon" className="h-8 w-8 shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 shrink-0">
        <div className="flex items-center gap-2 bg-meeting-controls rounded-xl px-4 py-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full h-10 w-10 transition-colors",
              isMuted ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "text-primary-foreground hover:bg-meeting-tile"
            )}
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full h-10 w-10 transition-colors",
              !isCameraOn ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "text-primary-foreground hover:bg-meeting-tile"
            )}
            onClick={() => setIsCameraOn(!isCameraOn)}
          >
            {isCameraOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          <div className="w-px h-6 bg-sidebar-border mx-1" />

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full h-10 w-10 transition-colors",
              isScreenSharing ? "bg-primary text-primary-foreground" : "text-primary-foreground hover:bg-meeting-tile"
            )}
            onClick={() => setIsScreenSharing(!isScreenSharing)}
          >
            <Monitor className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full h-10 w-10 transition-colors",
              isHandRaised ? "bg-warning text-warning-foreground" : "text-primary-foreground hover:bg-meeting-tile"
            )}
            onClick={() => setIsHandRaised(!isHandRaised)}
          >
            <Hand className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 text-primary-foreground hover:bg-meeting-tile"
          >
            <ThumbsUp className="w-5 h-5" />
          </Button>

          <div className="w-px h-6 bg-sidebar-border mx-1" />

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full h-10 w-10 transition-colors",
              showParticipants ? "bg-primary text-primary-foreground" : "text-primary-foreground hover:bg-meeting-tile"
            )}
            onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
          >
            <Users className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full h-10 w-10 transition-colors relative",
              showChat ? "bg-primary text-primary-foreground" : "text-primary-foreground hover:bg-meeting-tile"
            )}
            onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>

          <div className="w-px h-6 bg-sidebar-border mx-1" />

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            asChild
          >
            <Link to="/">
              <PhoneOff className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
