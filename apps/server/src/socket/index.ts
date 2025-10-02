import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { env } from '../config/env';
import { redisClient, redisSubscriber } from '../config/redis';
import { authenticateSocket } from './middleware/auth.middleware';
import { RoomManager } from './managers/RoomManager';
import { registerSocketHandlers } from './handlers';

/**
 * Initialize Socket.IO server with:
 * - CORS configuration
 * - Redis adapter for scalability
 * - JWT authentication middleware
 * - Room management
 * - Event handlers
 */
export function initializeSocket(httpServer: HTTPServer): SocketIOServer {
  // Create Socket.IO server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    // Connection settings
    pingTimeout: 60000,
    pingInterval: 25000,
    // Allow reconnection
    allowEIO3: true,
  });

  // Attach Redis adapter for scalability
  io.adapter(createAdapter(redisClient, redisSubscriber));
  console.info('✓ Socket.IO Redis adapter initialized');

  // Apply authentication middleware
  io.use(authenticateSocket);
  console.info('✓ Socket.IO authentication middleware registered');

  // Initialize room manager
  const roomManager = new RoomManager(io);

  // Register connection handlers
  io.on('connection', (socket) => {
    registerSocketHandlers(socket, roomManager);
  });

  console.info('✓ Socket.IO server initialized');

  return io;
}
