import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';

const app = createApp();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.info('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.info('Client disconnected:', socket.id);
  });
});

// Export io for use in other modules
export { io };

// Start server
httpServer.listen(env.PORT, () => {
  console.info(`
🚀 Server running on port ${env.PORT}
📡 Environment: ${env.NODE_ENV}
🌐 CORS origin: ${env.CORS_ORIGIN}
  `);
});
