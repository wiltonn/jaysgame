import { Socket } from 'socket.io';
import { RoomManager } from '../managers/RoomManager';

/**
 * Handle socket connection events
 */
export function handleConnection(socket: Socket, roomManager: RoomManager): void {
  const user = socket.data.user;

  console.info(`✓ Client connected: ${socket.id} (user: ${user?.userId}, role: ${user?.role})`);

  // Send connection acknowledgment
  socket.emit('connected', {
    socketId: socket.id,
    userId: user?.userId,
    timestamp: Date.now(),
  });
}

/**
 * Handle socket disconnection events
 */
export function handleDisconnect(socket: Socket, roomManager: RoomManager): void {
  const user = socket.data.user;
  const matchId = roomManager.getCurrentMatch(socket);

  console.info(`✗ Client disconnected: ${socket.id} (user: ${user?.userId})`);

  // Clean up room associations
  roomManager.handleDisconnect(socket);

  // If player was in a match, notify others (they disconnected, not left)
  if (matchId) {
    roomManager.broadcastToMatchExcept(socket, matchId, 'player:disconnected', {
      socketId: socket.id,
      userId: user?.userId,
      timestamp: Date.now(),
    });
  }
}

/**
 * Handle socket errors
 */
export function handleError(socket: Socket, error: Error): void {
  console.error(`Socket error: ${socket.id}`, error.message);

  // Send error to client
  socket.emit('error', {
    message: 'An error occurred',
    timestamp: Date.now(),
  });
}
