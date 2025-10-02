import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { initializeSocket } from './socket';

const app = createApp();
const httpServer = createServer(app);

// Initialize Socket.IO with Redis adapter, auth, and handlers
const io = initializeSocket(httpServer);

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
