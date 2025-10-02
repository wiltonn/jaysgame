import { Socket } from 'socket.io';
import { RoomManager } from '../managers/RoomManager';
import { handleConnection, handleDisconnect, handleError } from './connection.handler';
import { registerPlayerHandlers } from './player.handler';
import { registerHostHandlers } from './host.handler';

/**
 * Register all socket event handlers for a connected client
 */
export function registerSocketHandlers(socket: Socket, roomManager: RoomManager): void {
  // Handle connection
  handleConnection(socket, roomManager);

  // Register player event handlers
  registerPlayerHandlers(socket, roomManager);

  // Register host event handlers
  registerHostHandlers(socket, roomManager);

  // Handle disconnection
  socket.on('disconnect', () => {
    handleDisconnect(socket, roomManager);
  });

  // Handle errors
  socket.on('error', (error: Error) => {
    handleError(socket, error);
  });
}
