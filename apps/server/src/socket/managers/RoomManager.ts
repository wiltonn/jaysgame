import { Server, Socket } from 'socket.io';

/**
 * Manages Socket.IO rooms for matches
 * Handles joining, leaving, and broadcasting to match rooms
 */
export class RoomManager {
  private io: Server;
  // Map socketId -> matchId for quick lookups
  private socketToMatch: Map<string, string>;

  constructor(io: Server) {
    this.io = io;
    this.socketToMatch = new Map();
  }

  /**
   * Join a match room
   */
  async joinMatch(socket: Socket, matchId: string): Promise<void> {
    // Leave previous match if any
    const previousMatchId = this.socketToMatch.get(socket.id);
    if (previousMatchId) {
      await this.leaveMatch(socket, previousMatchId);
    }

    // Join new match room
    await socket.join(matchId);
    this.socketToMatch.set(socket.id, matchId);
    socket.data.matchId = matchId;

    console.info(`Socket ${socket.id} joined match ${matchId}`);
  }

  /**
   * Leave a match room
   */
  async leaveMatch(socket: Socket, matchId: string): Promise<void> {
    await socket.leave(matchId);
    this.socketToMatch.delete(socket.id);
    socket.data.matchId = undefined;

    console.info(`Socket ${socket.id} left match ${matchId}`);
  }

  /**
   * Get current match for a socket
   */
  getCurrentMatch(socket: Socket): string | undefined {
    return this.socketToMatch.get(socket.id);
  }

  /**
   * Get all sockets in a match room
   */
  async getMatchSockets(matchId: string): Promise<number> {
    const sockets = await this.io.in(matchId).fetchSockets();
    return sockets.length;
  }

  /**
   * Get player count in a match
   */
  async getMatchPlayerCount(matchId: string): Promise<number> {
    return this.getMatchSockets(matchId);
  }

  /**
   * Broadcast event to all sockets in a match
   */
  broadcastToMatch(matchId: string, event: string, data: unknown): void {
    this.io.to(matchId).emit(event, data);
  }

  /**
   * Broadcast event to all sockets in a match except sender
   */
  broadcastToMatchExcept(socket: Socket, matchId: string, event: string, data: unknown): void {
    socket.to(matchId).emit(event, data);
  }

  /**
   * Clean up socket on disconnect
   */
  handleDisconnect(socket: Socket): void {
    const matchId = this.socketToMatch.get(socket.id);
    if (matchId) {
      this.socketToMatch.delete(socket.id);
      console.info(`Socket ${socket.id} disconnected from match ${matchId}`);
    }
  }
}
