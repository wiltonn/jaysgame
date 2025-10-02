import { PrismaClient } from '@prisma/client';
import type { Question, MatchSettings, AnswerSubmitPayload } from '@jaysgame/shared';
import { redisClient } from '../config/redis';
import { isAnswerCorrect, getCorrectAnswer } from './question.service';

const prisma = new PrismaClient();

export interface SubmitAnswerRequest extends AnswerSubmitPayload {
  playerId: string;
}

export interface SubmitAnswerResult {
  isCorrect: boolean;
  correctAnswer: string | number | boolean;
  runsAwarded: number;
  bonusAwarded: boolean;
  answerMs: number;
}

/**
 * Calculate runs awarded for a correct answer
 */
function calculateRuns(
  isCorrect: boolean,
  answerMs: number,
  settings: MatchSettings,
  isGrandSlam: boolean
): { runs: number; bonusAwarded: boolean } {
  if (!isCorrect) {
    return { runs: 0, bonusAwarded: false };
  }

  // Base run for correct answer
  let runs = 1;
  let bonusAwarded = false;

  // Grand Slam bonus (4 runs instead of 1)
  if (settings.grandSlam && isGrandSlam) {
    runs = 4;
    bonusAwarded = true;
  }
  // Speed bonus (4 runs for answering in first 25% of timer)
  else if (settings.speedBonus) {
    const speedThreshold = settings.timerSec * 1000 * 0.25; // First 25% of timer
    if (answerMs <= speedThreshold) {
      runs = 4;
      bonusAwarded = true;
    }
  }

  return { runs, bonusAwarded };
}

/**
 * Check if this is a grand slam (first correct answer)
 */
async function isGrandSlam(
  matchId: string,
  inningIdx: number,
  questionIdx: number
): Promise<boolean> {
  const existingAnswers = await prisma.matchAnswer.findMany({
    where: {
      matchId,
      inningIdx,
      questionIdx,
      isCorrect: true,
    },
  });

  return existingAnswers.length === 0;
}

/**
 * Submit an answer to a question
 */
export async function submitAnswer(
  request: SubmitAnswerRequest,
  question: Question,
  settings: MatchSettings
): Promise<SubmitAnswerResult> {
  const { matchId, playerId, questionId, choice, clientLatencyMs } = request;

  // Parse question metadata from questionId (format: matchId-inning-questionIdx)
  const parts = questionId.split('-');
  const inningIdx = parseInt(parts[parts.length - 2], 10);
  const questionIdx = parseInt(parts[parts.length - 1], 10);

  // Check if answer is correct
  const correct = isAnswerCorrect(question, choice);

  // Check for grand slam
  const grandSlam = await isGrandSlam(matchId, inningIdx, questionIdx);

  // Calculate runs awarded
  const { runs: runsAwarded, bonusAwarded } = calculateRuns(
    correct,
    clientLatencyMs,
    settings,
    grandSlam
  );

  // Store answer in database
  await prisma.matchAnswer.create({
    data: {
      matchId,
      playerId,
      inningIdx,
      questionIdx,
      choice,
      isCorrect: correct,
      answerMs: clientLatencyMs,
      bonusAwarded,
    },
  });

  // Cache answer in Redis for quick access during reveal
  const cacheKey = `match:${matchId}:answers:${inningIdx}:${questionIdx}`;
  const answerData = {
    playerId,
    choice,
    isCorrect: correct,
    runsAwarded,
    bonusAwarded,
    answerMs: clientLatencyMs,
  };

  await redisClient.sadd(cacheKey, JSON.stringify(answerData));
  await redisClient.expire(cacheKey, 86400); // 24 hours

  // Get correct answer for response
  const correctAnswer = getCorrectAnswer(question);

  return {
    isCorrect: correct,
    correctAnswer,
    runsAwarded,
    bonusAwarded,
    answerMs: clientLatencyMs,
  };
}

/**
 * Get all answers for a specific question
 */
export async function getQuestionAnswers(
  matchId: string,
  inningIdx: number,
  questionIdx: number
): Promise<
  Array<{
    playerId: string;
    nickname: string;
    choice: string;
    isCorrect: boolean;
    runsAwarded: number;
    bonusAwarded: boolean;
    answerMs: number;
  }>
> {
  // Try cache first
  const cacheKey = `match:${matchId}:answers:${inningIdx}:${questionIdx}`;
  const cachedAnswers = await redisClient.smembers(cacheKey);

  if (cachedAnswers.length > 0) {
    // Parse cached answers and get player nicknames
    const answers = await Promise.all(
      cachedAnswers.map(async (answerJson) => {
        const answer = JSON.parse(answerJson);
        const player = await prisma.matchPlayer.findUnique({
          where: { id: answer.playerId },
          select: { nickname: true },
        });

        return {
          playerId: answer.playerId,
          nickname: player?.nickname || 'Unknown',
          choice: answer.choice,
          isCorrect: answer.isCorrect,
          runsAwarded: answer.runsAwarded,
          bonusAwarded: answer.bonusAwarded,
          answerMs: answer.answerMs,
        };
      })
    );

    return answers;
  }

  // Fallback to database
  const dbAnswers = await prisma.matchAnswer.findMany({
    where: {
      matchId,
      inningIdx,
      questionIdx,
    },
    include: {
      player: {
        select: {
          nickname: true,
        },
      },
    },
  });

  return dbAnswers.map((answer) => ({
    playerId: answer.playerId,
    nickname: answer.player.nickname,
    choice: answer.choice,
    isCorrect: answer.isCorrect,
    runsAwarded: answer.bonusAwarded ? 4 : answer.isCorrect ? 1 : 0,
    bonusAwarded: answer.bonusAwarded,
    answerMs: answer.answerMs,
  }));
}

/**
 * Calculate total runs scored in an inning
 */
export async function calculateInningRuns(matchId: string, inningIdx: number): Promise<number> {
  const answers = await prisma.matchAnswer.findMany({
    where: {
      matchId,
      inningIdx,
      isCorrect: true,
    },
  });

  return answers.reduce((total, answer) => {
    return total + (answer.bonusAwarded ? 4 : 1);
  }, 0);
}
