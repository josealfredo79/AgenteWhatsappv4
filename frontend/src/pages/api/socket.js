// WebSocket server para Next.js API (experimental, solo para desarrollo)
import { Server } from 'socket.io';

let io;

export default function handler(req, res) {
  if (!res.socket.server.io) {
    io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    res.socket.server.io = io;
    io.on('connection', (socket) => {
      console.log('Cliente WebSocket conectado');
      // Ejemplo: emitir mensaje de prueba
      socket.emit('server-message', { msg: 'Conexión WebSocket exitosa' });
      // Aquí puedes manejar eventos personalizados para el dashboard
    });
  }
  res.end();
}

export { io };
