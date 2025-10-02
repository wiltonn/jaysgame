import { Socket } from 'socket.io';
import { RoomManager } from '../managers/RoomManager';
import { MatchStateMachine } from '../../services/state-machine.service';
import type { HostActionPayload } from '@jaysgame/shared';

/**
 * Register host-related event handlers
 */
export function registerHostHandlers(socket: Socket, roomManager: RoomManager): void {
  /**
   * host:start - Start match
   */
  socket.on('host:start', async (payload: { matchId: string }) => {
    try {
      const { matchId } = payload;

      console.info(`Host starting match: ${matchId} (socket: ${socket.id})`);

      // Create state machine instance
      const stateMachine = new MatchStateMachine(matchId);

      // Start the match
      await stateMachine.startMatch();

      // Acknowledge to host
      socket.emit('host:start:success', {
        matchId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error starting match:', error);
      socket.emit('host:start:error', {
        error: error instanceof Error ? error.message : 'Failed to start match',
      });
    }
  });

  /**
   * host:action - Control match flow
   */
  socket.on('host:action', async (payload: HostActionPayload) => {
    try {
      const { matchId, action } = payload;

      console.info(`Host action: ${action} for match ${matchId} (socket: ${socket.id})`);

      const stateMachine = new MatchStateMachine(matchId);

      switch (action) {
        case 'pause':
          await stateMachine.pauseMatch();
          break;

        case 'resume':
          await stateMachine.resumeMatch();
          break;

        case 'skip':
          await stateMachine.skipQuestion();
          break;

        case 'reveal':
          await stateMachine.revealAnswer();
          break;

        case 'stretch':
          await stateMachine.triggerStretch();
          break;

        case 'start':
          await stateMachine.startMatch();
          break;

        default:
          throw new Error(`Unknown host action: ${action}`);
      }

      // Acknowledge to host
      socket.emit('host:action:success', {
        matchId,
        action,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error processing host action:', error);
      socket.emit('host:action:error', {
        error: error instanceof Error ? error.message : 'Failed to process host action',
      });
    }
  });
}
