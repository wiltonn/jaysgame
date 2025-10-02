import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { verifyToken } from '../../utils/auth';

/**
 * Socket.IO middleware to authenticate connections using JWT
 * Token can be provided via:
 * - Query parameter: ?token=xxx
 * - Auth object: { auth: { token: 'xxx' } }
 */
export function authenticateSocket(socket: Socket, next: (err?: ExtendedError) => void): void {
  try {
    // Extract token from query or auth
    const token =
      (socket.handshake.query.token as string) || (socket.handshake.auth?.token as string);

    if (!token) {
      return next(new Error('Authentication required. Please provide a valid token.'));
    }

    // Verify JWT token
    const payload = verifyToken(token);

    // Attach user data to socket
    socket.data.user = payload;

    console.info(`Socket authenticated: ${socket.id} (user: ${payload.userId})`);
    next();
  } catch (error) {
    console.warn(`Socket authentication failed: ${socket.id}`, error);
    next(new Error('Invalid or expired token'));
  }
}
