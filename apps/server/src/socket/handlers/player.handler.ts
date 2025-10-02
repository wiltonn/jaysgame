import { Socket } from 'socket.io';
import { RoomManager } from '../managers/RoomManager';
import { joinMatch, leaveMatch, getPlayerById } from '../../services/player.service';
import { submitAnswer } from '../../services/answer.service';
import { MatchStateMachine } from '../../services/state-machine.service';
import type {
  PlayerJoinPayload,
  AnswerSubmitPayload,
  MatchSettings,
  Question,
} from '@jaysgame/shared';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Register player-related event handlers
 */
export function registerPlayerHandlers(socket: Socket, roomManager: RoomManager): void {
  /**
   * player:join - Player joins a match
   */
  socket.on('player:join', async (payload: PlayerJoinPayload) => {
    try {
      const { matchId, nickname, avatar, cityOptIn, city } = payload;

      console.info(`Player joining: ${nickname} → match ${matchId} (socket: ${socket.id})`);

      // Validate payload
      if (!matchId || !nickname) {
        socket.emit('player:join:error', {
          error: 'Match ID and nickname are required',
        });
        return;
      }

      // Join match (creates player or reconnects)
      const result = await joinMatch({
        matchId,
        nickname: nickname.trim(),
        avatar,
        cityOptIn,
        city,
        socketId: socket.id,
      });

      // Join Socket.IO room for match
      await roomManager.joinMatch(socket, matchId);

      // Broadcast to all players in match (including joiner)
      roomManager.broadcastToMatch(matchId, 'player:joined', {
        player: result.player,
      });

      // Send full state to joining player
      socket.emit('player:join:success', {
        player: result.player,
        state: result.state,
      });

      // Broadcast updated state to all
      roomManager.broadcastToMatch(matchId, 'state:update', result.state);

      console.info(`✓ Player joined: ${nickname} (${result.player.id})`);
    } catch (error) {
      console.error('Error joining match:', error);
      socket.emit('player:join:error', {
        error: error instanceof Error ? error.message : 'Failed to join match',
      });
    }
  });

  /**
   * player:leave - Player explicitly leaves match
   */
  socket.on('player:leave', async (payload: { matchId: string; playerId: string }) => {
    try {
      const { matchId, playerId } = payload;

      console.info(`Player leaving: ${playerId} from match ${matchId}`);

      await leaveMatch(matchId, playerId);

      // Leave Socket.IO room
      const currentMatch = roomManager.getCurrentMatch(socket);
      if (currentMatch === matchId) {
        await roomManager.leaveMatch(socket, matchId);
      }

      // Broadcast to remaining players
      roomManager.broadcastToMatch(matchId, 'player:left', {
        playerId,
        timestamp: Date.now(),
      });

      socket.emit('player:leave:success', {
        matchId,
        playerId,
      });
    } catch (error) {
      console.error('Error leaving match:', error);
      socket.emit('player:leave:error', {
        error: error instanceof Error ? error.message : 'Failed to leave match',
      });
    }
  });

  /**
   * answer:submit - Submit answer to question
   */
  socket.on('answer:submit', async (payload: AnswerSubmitPayload) => {
    try {
      const { matchId, questionId, choice, clientLatencyMs } = payload;

      console.info(`Answer submitted: ${socket.id} → ${choice} (latency: ${clientLatencyMs}ms)`);

      // Get player from socket
      const playerId = socket.data.user?.userId;
      if (!playerId) {
        socket.emit('answer:submit:error', {
          error: 'Player not authenticated',
        });
        return;
      }

      // Validate player exists in match
      const player = await getPlayerById(playerId);
      if (!player || player.matchId !== matchId) {
        socket.emit('answer:submit:error', {
          error: 'Player not found in match',
        });
        return;
      }

      // Load match and question
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { pack: true },
      });

      if (!match) {
        socket.emit('answer:submit:error', {
          error: 'Match not found',
        });
        return;
      }

      // Parse question index from questionId
      const parts = questionId.split('-');
      const inningIdx = parseInt(parts[parts.length - 2], 10);
      const questionIdx = parseInt(parts[parts.length - 1], 10);

      // Get question from pack
      const innings = match.pack.innings as unknown as Array<{
        theme: string;
        questions: Question[];
      }>;
      const question = innings[inningIdx]?.questions[questionIdx];

      if (!question) {
        socket.emit('answer:submit:error', {
          error: 'Question not found',
        });
        return;
      }

      // Submit answer and calculate score
      const settings = match.settings as unknown as MatchSettings;
      const result = await submitAnswer(
        {
          matchId,
          playerId,
          questionId,
          choice,
          clientLatencyMs,
        },
        question,
        settings
      );

      // Acknowledge to player (don't reveal correctness yet)
      socket.emit('answer:submit:success', {
        questionId,
        submitted: true,
        timestamp: Date.now(),
      });

      // Update leaderboard
      const stateMachine = new MatchStateMachine(matchId);
      await stateMachine.loadState();

      // Calculate updated scores for all players
      const players = await prisma.matchPlayer.findMany({
        where: { matchId, leftAt: null },
      });

      const playerScores = await Promise.all(
        players.map(async (p) => {
          const answers = await prisma.matchAnswer.findMany({
            where: { matchId, playerId: p.id },
          });

          const correct = answers.filter((a) => a.isCorrect).length;
          const total = answers.length;
          const runs = answers.reduce((sum, a) => {
            if (!a.isCorrect) return sum;
            return sum + (a.bonusAwarded ? 4 : 1);
          }, 0);
          const totalTimeMs = answers.reduce((sum, a) => sum + a.answerMs, 0);

          return {
            playerId: p.id,
            nickname: p.nickname,
            avatar: p.avatar || undefined,
            runs,
            correct,
            total,
            totalTimeMs,
          };
        })
      );

      // Update leaderboard in state
      await stateMachine.updateLeaderboard(playerScores);

      console.info(
        `✓ Answer recorded: ${player.nickname} → ${result.isCorrect ? 'correct' : 'incorrect'} (${result.runsAwarded} runs)`
      );
    } catch (error) {
      console.error('Error submitting answer:', error);
      socket.emit('answer:submit:error', {
        error: error instanceof Error ? error.message : 'Failed to submit answer',
      });
    }
  });

  // reaction:send - Send emoji reaction (Ticket 4.3)
  socket.on(
    'reaction:send',
    async (payload: { matchId: string; emoji: string; timestamp: number }) => {
      try {
        const { matchId, emoji, timestamp } = payload;

        console.info(`Reaction received: ${emoji} from ${socket.id} in match ${matchId}`);

        // Validate emoji (basic check)
        const allowedEmojis = [
          '💥',
          '🧢',
          '🦜',
          '🔥',
          '⚾',
          '👏',
          '❌',
          '✅',
          '🎉',
          '😂',
          '🤔',
          '👀',
        ];
        if (!allowedEmojis.includes(emoji)) {
          socket.emit('reaction:send:error', {
            error: 'Invalid emoji',
          });
          return;
        }

        // Get player from socket
        const playerId = socket.data.user?.userId;
        if (!playerId) {
          socket.emit('reaction:send:error', {
            error: 'Player not authenticated',
          });
          return;
        }

        // Broadcast reaction to all players in match (including sender)
        roomManager.broadcastToMatch(matchId, 'reaction:broadcast', {
          emoji,
          playerId,
          timestamp,
        });

        console.info(`✓ Reaction broadcast: ${emoji} from ${playerId}`);
      } catch (error) {
        console.error('Error sending reaction:', error);
        socket.emit('reaction:send:error', {
          error: error instanceof Error ? error.message : 'Failed to send reaction',
        });
      }
    }
  );
}
