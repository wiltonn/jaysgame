import { PrismaClient } from '@prisma/client';
import type { Match as PrismaMatch, MatchMode, MatchStatus } from '@prisma/client';
import { redisClient } from '../config/redis';
import { generateJoinCode } from '../utils/join-code';
import { generateMatchQRCode, getJoinUrl } from '../utils/qrcode';
import type { MatchSettings } from '@jaysgame/shared';

const prisma = new PrismaClient();

export interface CreateMatchRequest {
  packId: string;
  mode?: MatchMode;
  settings?: Partial<MatchSettings>;
}

export interface CreateMatchResponse {
  matchId: string;
  joinCode: string;
  joinUrl: string;
  qrCodeUrl: string;
}

/**
 * Default match settings
 */
const DEFAULT_MATCH_SETTINGS: MatchSettings = {
  grandSlam: true,
  speedBonus: false,
  timerSec: 20,
  allowReactions: true,
  allowHeckles: true,
  showMap: true,
};

/**
 * Create a new match
 */
export async function createMatch(
  hostId: string,
  request: CreateMatchRequest
): Promise<CreateMatchResponse> {
  // Verify pack exists
  const pack = await prisma.pack.findUnique({
    where: { id: request.packId },
  });

  if (!pack) {
    throw new Error('Pack not found');
  }

  // Generate unique join code
  let joinCode: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    joinCode = generateJoinCode();
    const existing = await prisma.match.findUnique({
      where: { joinCode },
    });

    if (!existing) break;

    attempts++;
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique join code. Please try again.');
    }
  } while (attempts < maxAttempts);

  // Merge settings with defaults
  const settings: MatchSettings = {
    ...DEFAULT_MATCH_SETTINGS,
    ...request.settings,
  };

  // Create match in database
  const match = await prisma.match.create({
    data: {
      hostId,
      packId: request.packId,
      joinCode,
      mode: request.mode || 'NINE_INNINGS',
      status: 'LOBBY',
      settings: settings as object,
    },
  });

  // Initialize match state in Redis
  await initializeMatchState(match.id, pack.innings as object);

  // Generate QR code
  const qrCodeUrl = await generateMatchQRCode(joinCode);
  const joinUrl = getJoinUrl(joinCode);

  return {
    matchId: match.id,
    joinCode,
    joinUrl,
    qrCodeUrl,
  };
}

/**
 * Initialize match state in Redis
 */
async function initializeMatchState(matchId: string, innings: object): Promise<void> {
  const inningsArray = innings as Array<{ theme: string; questions: unknown[] }>;

  const initialState = {
    matchId,
    phase: 'lobby',
    inning: 0,
    questionIdx: 0,
    lineScore: Array(inningsArray.length).fill(null),
    leaderboard: [],
    players: [],
  };

  // Store state with 24-hour expiration
  await redisClient.setex(
    `match:${matchId}:state`,
    86400, // 24 hours
    JSON.stringify(initialState)
  );
}

/**
 * Get match by ID
 */
export async function getMatchById(matchId: string): Promise<PrismaMatch | null> {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      host: {
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
        },
      },
      pack: {
        select: {
          id: true,
          meta: true,
          tags: true,
        },
      },
    },
  });
}

/**
 * Get match by join code
 */
export async function getMatchByJoinCode(
  joinCode: string
): Promise<(PrismaMatch & { pack: { id: string; meta: object } }) | null> {
  return prisma.match.findUnique({
    where: { joinCode },
    include: {
      pack: {
        select: {
          id: true,
          meta: true,
        },
      },
    },
  }) as Promise<(PrismaMatch & { pack: { id: string; meta: object } }) | null>;
}

/**
 * Get matches hosted by user
 */
export async function getUserMatches(hostId: string): Promise<PrismaMatch[]> {
  return prisma.match.findMany({
    where: { hostId },
    include: {
      pack: {
        select: {
          id: true,
          meta: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // Limit to recent 50 matches
  });
}

/**
 * Update match status
 */
export async function updateMatchStatus(
  matchId: string,
  status: MatchStatus
): Promise<PrismaMatch> {
  const updateData: {
    status: MatchStatus;
    startedAt?: Date;
    endedAt?: Date;
  } = { status };

  if (status === 'IN_PROGRESS') {
    updateData.startedAt = new Date();
  } else if (status === 'COMPLETED' || status === 'ABANDONED') {
    updateData.endedAt = new Date();
  }

  return prisma.match.update({
    where: { id: matchId },
    data: updateData,
  });
}

/**
 * Delete match (cancel)
 */
export async function deleteMatch(matchId: string, hostId: string): Promise<void> {
  // Verify ownership
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.hostId !== hostId) {
    throw new Error('Unauthorized: You do not host this match');
  }

  if (match.status === 'IN_PROGRESS') {
    throw new Error('Cannot delete a match in progress. Abandon it first.');
  }

  // Delete match state from Redis
  await redisClient.del(`match:${matchId}:state`);

  // Delete match from database (cascade will delete players and answers)
  await prisma.match.delete({
    where: { id: matchId },
  });
}

/**
 * Get match state from Redis
 */
export async function getMatchState(matchId: string): Promise<object | null> {
  const stateJson = await redisClient.get(`match:${matchId}:state`);
  if (!stateJson) {
    return null;
  }

  try {
    return JSON.parse(stateJson);
  } catch (error) {
    console.error('Error parsing match state from Redis:', error);
    return null;
  }
}

/**
 * Update match state in Redis
 */
export async function updateMatchState(matchId: string, state: object): Promise<void> {
  await redisClient.setex(
    `match:${matchId}:state`,
    86400, // 24 hours
    JSON.stringify(state)
  );
}

/**
 * Get match summary (post-game statistics)
 */
export async function getMatchSummary(matchId: string): Promise<object> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      pack: true,
      players: {
        include: {
          answers: true,
        },
      },
    },
  });

  if (!match) {
    throw new Error('Match not found');
  }

  // Calculate statistics
  const playerStats = match.players.map((player) => {
    const correctAnswers = player.answers.filter((a) => a.isCorrect).length;
    const totalAnswers = player.answers.length;
    const totalRuns = player.answers.reduce((sum, a) => {
      if (!a.isCorrect) return sum;
      return sum + (a.bonusAwarded ? 4 : 1);
    }, 0);
    const avgAnswerTime =
      player.answers.reduce((sum, a) => sum + a.answerMs, 0) / (totalAnswers || 1);

    return {
      playerId: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      city: player.city,
      runs: totalRuns,
      correct: correctAnswers,
      total: totalAnswers,
      accuracy: totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0,
      avgAnswerTime: Math.round(avgAnswerTime),
    };
  });

  // Sort by runs (descending), then by average answer time (ascending)
  playerStats.sort((a, b) => {
    if (b.runs !== a.runs) return b.runs - a.runs;
    return a.avgAnswerTime - b.avgAnswerTime;
  });

  // Determine MVP
  const mvp = playerStats.length > 0 ? playerStats[0] : null;

  return {
    matchId: match.id,
    status: match.status,
    mode: match.mode,
    pack: {
      title: (match.pack.meta as { title: string }).title,
      sport: (match.pack.meta as { sport: string }).sport,
      team: (match.pack.meta as { team: string }).team,
    },
    duration:
      match.startedAt && match.endedAt
        ? Math.round((match.endedAt.getTime() - match.startedAt.getTime()) / 1000)
        : null,
    playerCount: match.players.length,
    players: playerStats,
    mvp,
    createdAt: match.createdAt,
    startedAt: match.startedAt,
    endedAt: match.endedAt,
  };
}
