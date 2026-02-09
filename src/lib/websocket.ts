import { io, Socket } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(API_BASE, {
      transports: ['websocket'],
      reconnection: true,
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

