import { io, Socket } from "socket.io-client";
import { DEMO_MODE } from "./demo/config";
import { DemoIoSocket } from "./demo/socket";

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000");

let socket: Socket | null = null;
let demoSocket: DemoIoSocket | null = null;

export const getSocket = (): Socket => {
  if (DEMO_MODE) {
    if (!demoSocket) demoSocket = new DemoIoSocket();
    return demoSocket as unknown as Socket;
  }

  if (!socket) {
    const token = localStorage.getItem("collabhub_token");

    console.log("[Socket] Connecting to:", API_BASE);

    // Use polling only for ngrok - websocket fails with "Invalid frame header"
    const isNgrok = API_BASE.includes("ngrok");

    socket = io(API_BASE, {
      transports: isNgrok ? ["polling"] : ["polling", "websocket"],
      upgrade: !isNgrok, // Disable upgrade for ngrok
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 30000,
      auth: token ? { token } : undefined,
      path: "/socket.io/",
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected via polling, id:", socket?.id);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connect error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    // Refresh auth token from localStorage before each reconnect attempt
    // This picks up tokens refreshed by the REST API layer
    socket.on("reconnect_attempt", () => {
      const freshToken = localStorage.getItem("collabhub_token");
      if (socket && freshToken) {
        socket.auth = { token: freshToken };
      }
    });
  }
  return socket;
};

/** Update socket auth token (call after REST token refresh) */
export const updateSocketAuth = () => {
  if (DEMO_MODE) return;
  if (socket) {
    const freshToken = localStorage.getItem("collabhub_token");
    if (freshToken) {
      socket.auth = { token: freshToken };
    }
  }
};

export const disconnectSocket = () => {
  if (demoSocket) {
    demoSocket.disconnect();
    demoSocket = null;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
