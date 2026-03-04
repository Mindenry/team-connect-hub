import { io, Socket } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = localStorage.getItem('collabhub_token');

    socket = io(API_BASE, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
      auth: token ? { token } : undefined,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
