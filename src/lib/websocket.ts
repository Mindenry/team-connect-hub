import { io, Socket } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = localStorage.getItem('collabhub_token');

    socket = io(API_BASE, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
      auth: token ? { token } : undefined,
    });

    // Refresh auth token from localStorage before each reconnect attempt
    // This picks up tokens refreshed by the REST API layer
    socket.on('reconnect_attempt', () => {
      const freshToken = localStorage.getItem('collabhub_token');
      if (socket && freshToken) {
        socket.auth = { token: freshToken };
      }
    });
  }
  return socket;
};

/** Update socket auth token (call after REST token refresh) */
export const updateSocketAuth = () => {
  if (socket) {
    const freshToken = localStorage.getItem('collabhub_token');
    if (freshToken) {
      socket.auth = { token: freshToken };
    }
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
