// Cliente Socket.io para el dashboard Next.js
import { useEffect } from 'react';
import { io } from 'socket.io-client';

export default function useSocket(onMessage) {
  useEffect(() => {
    const socket = io({ path: '/socket.io' });
    socket.on('connect', () => {
      console.log('Conectado a Socket.io');
    });
    socket.on('server-message', (data) => {
      if (onMessage) onMessage(data);
    });
    // Puedes escuchar otros eventos personalizados aquí
    return () => {
      socket.disconnect();
    };
  }, [onMessage]);
}
