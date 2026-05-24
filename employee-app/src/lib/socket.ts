import { io, Socket } from 'socket.io-client';

const getSocketURL = (): string => {
  const hostname = window.location.hostname;
  if (hostname.includes('vercel.app')) {
    return 'https://backend-rudvay1.vercel.app';
  }
  return 'http://localhost:5001';
};

let instance: Socket | null = null;

export const getSocket = (token: string): Socket => {
  if (instance && instance.connected) return instance;
  if (instance) instance.disconnect();

  instance = io(getSocketURL(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  return instance;
};

export const disconnectSocket = () => {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
};
