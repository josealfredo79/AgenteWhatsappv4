// Servidor Node.js para Next.js + Socket.io
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

console.log('🚀 Iniciando servidor...');
console.log('📍 NODE_ENV:', process.env.NODE_ENV);
console.log('📍 PORT:', process.env.PORT);

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log('✅ Next.js preparado correctamente');
  
  // MCP (Model Context Protocol) - endpoints mínimos embebidos
  const handleMCP = async (req, res) => {
    if (req.method === 'GET' && req.url === '/mcp/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
      return true;
    }

    if (req.method === 'POST' && req.url === '/mcp/v1/context') {
      try {
        let body = '';
        for await (const chunk of req) body += chunk;
        const payload = body ? JSON.parse(body) : {};
        console.log('MCP context received:', payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, received: Array.isArray(payload) ? payload.length : 1 }));
        return true;
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'invalid_json', message: err.message }));
        return true;
      }
    }

    return false;
  };

  const server = createServer(async (req, res) => {
    // Primero intentamos manejar rutas MCP
    const handled = await handleMCP(req, res);
    if (!handled) {
      // Si no es ruta MCP, delegar a Next.js
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }
  });

  const io = new Server(server, {
    path: '/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Cliente conectado a Socket.io');
    socket.emit('server-message', { msg: 'Conexión Socket.io exitosa' });
  });

  const PORT = process.env.PORT || 5000;
  const HOST = process.env.HOST || '0.0.0.0';

  console.log('🔍 DEBUG: process.env.PORT =', process.env.PORT);
  console.log('🔍 DEBUG: PORT final =', PORT);
  console.log('🔍 DEBUG: HOST =', HOST);

  server.listen(PORT, HOST, (err) => {
    if (err) {
      console.error('❌ Error al iniciar el servidor:', err);
      throw err;
    }
    console.log(`✅ Servidor Next.js + Socket.io + MCP listo en http://${HOST}:${PORT}`);
  });
}).catch((err) => {
  console.error('❌ Error al preparar Next.js:', err);
  process.exit(1);
});

// Capturar errores no manejados
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
