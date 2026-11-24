/**
 * A tiny stand-in for socket.io used in demo mode.
 *
 * It implements just enough of the Socket surface for the app (on/off/emit/
 * connected/.io) and pushes realistic presence, room and chat events without
 * any server.
 */
import { DEMO_USER_ID } from "./seed";
import { getDemoDb, saveDemoDb, uid } from "./db";
import { subscribeDemoSocket } from "./api";

type Handler = (...args: any[]) => void;

const online = new Set<string>(["u1", "u2", "u3", "u5", "u6", "u8", "u9", "u12"]);

export class DemoIoSocket {
  connected = true;
  id = "demo-socket";
  auth: Record<string, any> = {};
  io = {
    on: (event: string, handler: Handler) => this.on(`io:${event}`, handler),
    off: (event: string, handler?: Handler) => this.off(`io:${event}`, handler),
    engine: { on: () => {}, off: () => {} },
  };

  private handlers = new Map<string, Set<Handler>>();
  private cleanup: (() => void) | null = null;
  private meetingRooms = new Map<string, any[]>();

  constructor() {
    this.cleanup = subscribeDemoSocket(({ event, payload }) => {
      // Relay REST-driven events to page listeners.
      this.dispatch(event, payload);
    });

    // Announce the connection on the next tick so late listeners catch it.
    setTimeout(() => {
      this.dispatch("connect");
      this.emitPresence();
      this.emitRooms();
    }, 0);
  }

  private dispatch(event: string, payload?: any) {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of Array.from(set)) {
      try {
        h(payload);
      } catch (err) {
        console.warn(`[demo socket] handler for ${event} failed`, err);
      }
    }
  }

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return this;
  }

  off(event: string, handler?: Handler) {
    if (!handler) this.handlers.delete(event);
    else this.handlers.get(event)?.delete(handler);
    return this;
  }

  once(event: string, handler: Handler) {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      handler(...args);
    };
    return this.on(event, wrapper);
  }

  private emitPresence() {
    const db = getDemoDb();
    const users = db.users
      .filter((u: any) => online.has(u.id))
      .map((u: any) => ({ userId: u.id, name: u.name, avatar: u.avatar }));
    this.dispatch("presence:update", users);
  }

  private emitRooms() {
    const db = getDemoDb();
    const rooms = db.meetings
      .filter((m: any) => m.status === "live" && (m.participants || []).length > 0)
      .map((m: any) => ({
        roomId: m.id,
        name: m.title,
        participants: (m.participants || []).map((p: any, i: number) => ({
          peerId: `peer-${p.userId || i}`,
          name: p.user?.name || db.users.find((u: any) => u.id === p.userId)?.name || "Guest",
          userId: p.userId,
          avatar: p.user?.avatar,
        })),
        createdAt: new Date(m.startTime),
      }));

    for (const [roomId, participants] of this.meetingRooms.entries()) {
      const meeting = db.meetings.find((m: any) => m.id === roomId || m.meetingCode === roomId);
      rooms.push({
        roomId,
        name: meeting?.title || "Quick Huddle",
        participants,
        createdAt: new Date(),
      });
    }

    this.dispatch("rooms:active", rooms);
  }

  emit(event: string, payload?: any) {
    switch (event) {
      case "presence:online": {
        if (payload?.userId) online.add(payload.userId);
        this.emitPresence();
        return this;
      }
      case "presence:get": {
        this.emitPresence();
        return this;
      }
      case "rooms:get-active": {
        this.emitRooms();
        return this;
      }
      case "dm:send": {
        const db = getDemoDb();
        const msg = payload || {};
        const row = {
          id: msg.id || uid("dm"),
          senderId: msg.senderId || DEMO_USER_ID,
          receiverId: msg.receiverId,
          text: msg.text || "",
          attachments: msg.attachments || null,
          mentions: msg.mentions || [],
          createdAt: msg.createdAt || new Date().toISOString(),
        };
        db.dm.push(row as any);
        saveDemoDb();
        this.dispatch("dm:message", {
          ...row,
          senderName: msg.senderName,
          senderAvatar: msg.senderAvatar,
        });
        return this;
      }
      case "meeting:join": {
        const roomId = payload?.meetingId || "quick-huddle";
        const list = this.meetingRooms.get(roomId) || [];
        const peer = { peerId: payload?.peerId, name: payload?.peerName, userId: payload?.userId, avatar: payload?.peerAvatar };
        if (peer.peerId && !list.some((p) => p.peerId === peer.peerId)) list.push(peer);
        this.meetingRooms.set(roomId, list);
        this.dispatch("meeting:participants", list);
        this.emitRooms();
        return this;
      }
      case "meeting:participant:update": {
        // Mirror our own state change back so hand-raise notifications work.
        if (payload?.peerId) this.dispatch("meeting:participant:update", payload);
        return this;
      }
      case "meeting:leave": {
        const roomId = payload?.meetingId;
        const list = (this.meetingRooms.get(roomId) || []).filter((p) => p.peerId !== payload?.peerId);
        this.meetingRooms.set(roomId, list);
        this.dispatch("meeting:participant:left", { peerId: payload?.peerId });
        this.emitRooms();
        return this;
      }
      case "meeting:chat:send": {
        const msg = payload?.message || {};
        this.dispatch("meeting:chat:message", {
          ...msg,
          sender: msg.senderName || "You",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
        return this;
      }
      case "meeting:rejoin":
      case "typing:start":
      case "typing:stop":
      default:
        return this;
    }
  }

  connect() {
    this.connected = true;
    this.dispatch("connect");
    this.emitPresence();
    this.emitRooms();
    return this;
  }

  disconnect() {
    this.connected = false;
    this.dispatch("disconnect", "io client disconnect");
    this.cleanup?.();
    this.cleanup = null;
    this.handlers.clear();
    return this;
  }
}
