import { TokenPayload } from '../utils/auth';

/**
 * Extend Socket.IO types to include custom data
 */
declare module 'socket.io' {
  interface Socket {
    data: {
      user?: TokenPayload;
      matchId?: string;
    };
  }
}

export {};
