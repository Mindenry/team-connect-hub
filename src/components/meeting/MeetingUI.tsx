import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Participant, LocalParticipant, Track } from "livekit-client";
import { TrackReferenceOrPlaceholder, VideoTrack, AudioTrack, ParticipantTile } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, MonitorOff,
  PhoneOff, Users, MessageSquare, Hand, SmilePlus, Settings,
  Maximize, MoreVertical, LayoutGrid, Type, Shield, Lock, X, Send, ThumbsUp
} from 'lucide-react';

interface MeetingUIProps {
  meetingId?: string;
  meetingCode?: string;
  meetingTitle?: string;
  tracks: TrackReferenceOrPlaceholder[];
  participants: Participant[];
  localParticipant: LocalParticipant;
  isMuted: boolean;
  isCameraOn: boolean;
  toggleMute: () => void;
  toggleCamera: () => void;
  onLeave: () => void;
  socketRef: any;
}

export default function MeetingUI({
  meetingTitle,
  tracks,
  participants,
  localParticipant,
  isMuted,
  isCameraOn,
  toggleMute,
  toggleCamera,
  onLeave,
}: MeetingUIProps) {
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // Dummy chat messages for now, could be wired to socket/LiveKit data channel
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'System', text: 'Welcome to the meeting!', time: 'Now' }
  ]);

  // Merge local and remote participants for the participant list
  const allParticipants = [localParticipant, ...participants.filter(p => p.identity !== localParticipant.identity)];

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden relative font-sans">
      
      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none">
        <div className="flex flex-col text-white pointer-events-auto">
          <h1 className="text-xl font-semibold tracking-wide">{meetingTitle || "General Meeting"}</h1>
          <div className="flex items-center gap-2 mt-1 -ml-1">
            <Button variant="ghost" size="sm" className="h-6 text-xs text-white/80 hover:text-white px-2 justify-start font-medium tracking-wider">
              <Shield className="w-3.5 h-3.5 mr-1" />
              END-TO-END ENCRYPTED
            </Button>
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <span className="text-sm font-medium text-white/90 tabular-nums">12:30</span>
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <span className="text-sm text-white/90 font-medium">abc-defg-hij</span>
          </div>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full w-10 h-10">
            <LayoutGrid className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full w-10 h-10">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden pt-16">
        
        {/* Video Grid */}
        <div className="flex-1 p-4 flex flex-col items-center justify-center bg-meeting-bg relative">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full h-full max-w-6xl mx-auto auto-rows-fr">
            {tracks.filter((t) => t.source === Track.Source.Camera).map((trackReference) => (
              <div key={trackReference.participant.identity} className="relative group rounded-2xl overflow-hidden bg-meeting-tile flex items-center justify-center ring-1 ring-white/10 shadow-lg">
                <ParticipantTile 
                  trackRef={trackReference} 
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* User Info Label */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full ring-1 ring-white/10">
                  <Avatar className="w-5 h-5 border border-white/20 shadow-sm shrink-0">
                    <AvatarImage src={trackReference.participant.metadata || undefined} />
                    <AvatarFallback className="bg-primary/30 text-[10px] text-white">
                      {trackReference.participant.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-white truncate max-w-[150px]">
                    {trackReference.participant.name || trackReference.participant.identity}
                    {trackReference.participant.isLocal && " (You)"}
                  </span>
                </div>
                
                {/* Mute/Audio Status */}
                {!trackReference.participant.isMicrophoneEnabled && (
                  <div className="absolute top-4 right-4 bg-destructive/90 backdrop-blur-md p-2 rounded-full shadow-lg ring-1 ring-white/10">
                    <MicOff className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {/* If no tracks to show, perhaps just standard UI */}
            {tracks.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center text-gray-400">
                <div className="w-24 h-24 rounded-full bg-meeting-tile flex items-center justify-center mb-4">
                  <VideoOff className="w-12 h-12" />
                </div>
                <p>Waiting for others to join...</p>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel - Participants */}
        {showParticipants && (
          <div className="w-80 bg-meeting-controls border-l border-sidebar-border flex flex-col animate-in slide-in-from-right-8 duration-300">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
              <h3 className="text-sm font-medium text-primary-foreground">Participants (1)</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setShowParticipants(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto w-full p-2 space-y-4">
              {/* In meeting */}
              <p className="text-xs font-semibold uppercase text-muted-foreground px-2">In Meeting</p>
              {allParticipants.map((p) => (
                <div key={p.identity} className="flex items-center gap-2 p-2 rounded-lg hover:bg-meeting-bg/50 transition-colors">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={p.metadata || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary-foreground text-xs">{p.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary-foreground truncate">
                      {p.name || p.identity} {p.isLocal && "(You)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!p.isMicrophoneEnabled ? (
                      <MicOff className="w-4 h-4 text-destructive" />
                    ) : (
                      <Mic className="w-4 h-4 text-success" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Host actions */}
            <div className="p-3 border-t border-sidebar-border space-y-2">
              <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 text-muted-foreground">
                <Lock className="w-4 h-4" /> Lock Meeting
              </Button>
            </div>
          </div>
        )}

        {/* Side Panel - Chat */}
        {showChat && (
          <div className="w-80 bg-meeting-controls border-l border-sidebar-border flex flex-col animate-in slide-in-from-right-8 duration-300">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
              <h3 className="text-sm font-medium text-primary-foreground">Meeting Chat</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setShowChat(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary-foreground">{msg.sender}</span>
                    <span className="text-xs text-muted-foreground">{msg.time}</span>
                  </div>
                  <div className="bg-meeting-tile rounded-tr-xl rounded-br-xl rounded-bl-xl p-3 text-sm text-sidebar-foreground inline-block">
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-sidebar-border">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-meeting-bg border-sidebar-border text-primary-foreground text-sm flex-1 rounded-full h-10 px-4"
                />
                <Button size="icon" className="h-10 w-10 rounded-full shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-2 py-4 px-6 shrink-0 bg-meeting-controls border-t border-white/5 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-2 px-4">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full h-12 w-12 transition-all duration-200",
              isMuted ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "text-white hover:bg-white/15"
            )}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full h-12 w-12 transition-all duration-200",
              !isCameraOn ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "text-white hover:bg-white/15"
            )}
            onClick={toggleCamera}
          >
            {!isCameraOn ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </Button>

          <div className="w-px h-8 bg-white/10 mx-2" />

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full h-12 w-12 transition-all duration-200",
              isScreenSharing ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "text-white hover:bg-white/15"
            )}
            onClick={() => setIsScreenSharing(!isScreenSharing)}
          >
            <Monitor className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full h-12 w-12 transition-all duration-200",
              isHandRaised ? "bg-warning text-warning-foreground shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "text-white hover:bg-white/15"
            )}
            onClick={() => setIsHandRaised(!isHandRaised)}
          >
            <Hand className="w-5 h-5" />
          </Button>

          <div className="w-px h-8 bg-white/10 mx-2" />

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full h-12 w-12 transition-colors relative",
              showParticipants ? "bg-white/20 text-white" : "text-white hover:bg-white/15"
            )}
            onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
          >
            <Users className="w-5 h-5" />
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold">
              {allParticipants.length}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full h-12 w-12 transition-colors",
              showChat ? "bg-white/20 text-white" : "text-white hover:bg-white/15"
            )}
            onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
        </div>

        <Button
          onClick={onLeave}
          className="rounded-full h-14 px-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold text-base tracking-wide shadow-[0_0_20px_rgba(239,68,68,0.4)] ml-4"
        >
          <PhoneOff className="w-5 h-5 mr-2" />
          Leave
        </Button>
        
      </div>
    </div>
  );
}
