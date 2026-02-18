import { io, Socket } from 'socket.io-client';
import { auth } from './auth';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let virtualOfficeSocket: Socket | null = null;

export const getVirtualOfficeSocket = (): Socket => {
  if (!virtualOfficeSocket) {
    const token = auth.getToken();
    virtualOfficeSocket = io(`${API_BASE}/virtual-office`, {
      transports: ['websocket'],
      reconnection: true,
      auth: {
        token,
      },
    });
  }
  return virtualOfficeSocket;
};

export const disconnectVirtualOfficeSocket = () => {
  if (virtualOfficeSocket) {
    virtualOfficeSocket.disconnect();
    virtualOfficeSocket = null;
  }
};
