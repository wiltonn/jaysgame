import { PrismaClient } from '@prisma/client';
import type { MatchPlayer as PrismaMatchPlayer } from '@prisma/client';
import type { MatchState, MatchPlayer } from '@jaysgame/shared';
import { redisClient } from '../config/redis';

const prisma = new PrismaClient();

export interface JoinMatchRequest {
  matchId: string;
  nickname: string;
  avatar?: string;
  cityOptIn: boolean;
  city?: string;
  socketId: string;
}

export interface JoinMatchResult {
  player: MatchPlayer;
  state: MatchState;
}

/**
 * Player joins a match
 */
export async function joinMatch(request: JoinMatchRequest): Promise<JoinMatchResult> {
  const { matchId, nickname, avatar, cityOptIn, city, socketId } = request;

  // Verify match exists and is joinable
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      pack: {
        select: {
          innings: true,
        },
      },
    },
  });

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status === 'COMPLETED' || match.status === 'ABANDONED') {
    throw new Error('Match has ended. Cannot join.');
  }

  // Check for duplicate nickname in this match
  const existingPlayer = await prisma.matchPlayer.findFirst({
    where: {
      matchId,
      nickname,
      leftAt: null, // Only check active players
    },
  });

  if (existingPlayer) {
    // This is a reconnection - update socketId and return existing player
    return reconnectPlayer(matchId, existingPlayer.id, socketId);
  }

  // Create new player
  const player = await prisma.matchPlayer.create({
    data: {
      matchId,
      nickname,
      avatar,
      city: cityOptIn ? city : null,
      socketId,
    },
  });

  // Load current match state from Redis
  const stateJson = await redisClient.get(`match:${matchId}:state`);
  if (!stateJson) {
    throw new Error('Match state not found');
  }

  const state = JSON.parse(stateJson) as MatchState;

  // Add player to state
  const matchPlayer: MatchPlayer = {
    id: player.id,
    matchId: player.matchId,
    nickname: player.nickname,
    avatar: player.avatar || undefined,
    city: player.city || undefined,
    socketId: player.socketId || undefined,
    joinedAt: player.joinedAt,
  };

  state.players.push(matchPlayer);

  // Save updated state
  await redisClient.setex(`match:${matchId}:state`, 86400, JSON.stringify(state));

  return {
    player: matchPlayer,
    state,
  };
}

/**
 * Reconnect a player who left mid-game
 */
export async function reconnectPlayer(
  matchId: string,
  playerId: string,
  newSocketId: string
): Promise<JoinMatchResult> {
  // Update player's socketId
  const player = await prisma.matchPlayer.update({
    where: { id: playerId },
    data: {
      socketId: newSocketId,
      leftAt: null, // Mark as rejoined
    },
  });

  // Load current match state
  const stateJson = await redisClient.get(`match:${matchId}:state`);
  if (!stateJson) {
    throw new Error('Match state not found');
  }

  const state = JSON.parse(stateJson) as MatchState;

  // Update player in state
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex !== -1) {
    state.players[playerIndex].socketId = newSocketId;
  } else {
    // Player not in state, add them
    const matchPlayer: MatchPlayer = {
      id: player.id,
      matchId: player.matchId,
      nickname: player.nickname,
      avatar: player.avatar || undefined,
      city: player.city || undefined,
      socketId: player.socketId || undefined,
      joinedAt: player.joinedAt,
    };
    state.players.push(matchPlayer);
  }

  // Save updated state
  await redisClient.setex(`match:${matchId}:state`, 86400, JSON.stringify(state));

  const matchPlayer: MatchPlayer = {
    id: player.id,
    matchId: player.matchId,
    nickname: player.nickname,
    avatar: player.avatar || undefined,
    city: player.city || undefined,
    socketId: player.socketId || undefined,
    joinedAt: player.joinedAt,
  };

  return {
    player: matchPlayer,
    state,
  };
}

/**
 * Player leaves a match
 */
export async function leaveMatch(matchId: string, playerId: string): Promise<void> {
  // Mark player as left
  await prisma.matchPlayer.update({
    where: { id: playerId },
    data: {
      leftAt: new Date(),
      socketId: null,
    },
  });

  // Load state from Redis
  const stateJson = await redisClient.get(`match:${matchId}:state`);
  if (!stateJson) {
    return; // State doesn't exist, nothing to update
  }

  const state = JSON.parse(stateJson) as MatchState;

  // Remove player from active players list
  state.players = state.players.filter((p) => p.id !== playerId);

  // Save updated state
  await redisClient.setex(`match:${matchId}:state`, 86400, JSON.stringify(state));
}

/**
 * Get player by ID
 */
export async function getPlayerById(playerId: string): Promise<PrismaMatchPlayer | null> {
  return prisma.matchPlayer.findUnique({
    where: { id: playerId },
  });
}

/**
 * Get all players in a match
 */
export async function getMatchPlayers(matchId: string): Promise<PrismaMatchPlayer[]> {
  return prisma.matchPlayer.findMany({
    where: { matchId },
    orderBy: { joinedAt: 'asc' },
  });
}

/**
 * Get player's current score
 */
export async function getPlayerScore(
  matchId: string,
  playerId: string
): Promise<{
  runs: number;
  correct: number;
  total: number;
}> {
  const answers = await prisma.matchAnswer.findMany({
    where: {
      matchId,
      playerId,
    },
  });

  const correct = answers.filter((a) => a.isCorrect).length;
  const total = answers.length;
  const runs = answers.reduce((sum, a) => {
    if (!a.isCorrect) return sum;
    // Award runs: +1 for correct, +4 if bonus (grand slam or speed bonus)
    return sum + (a.bonusAwarded ? 4 : 1);
  }, 0);

  return { runs, correct, total };
}
