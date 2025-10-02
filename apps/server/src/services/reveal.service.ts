import { PrismaClient } from '@prisma/client';
import type { Question, QuestionRevealPayload } from '@jaysgame/shared';
import { getQuestionAnswers, calculateInningRuns } from './answer.service';
import { getCorrectAnswer } from './question.service';

const prisma = new PrismaClient();

/**
 * Handle "closest" question reveal
 * Awards runs to player(s) with answer closest to correct value
 */
async function handleClosestQuestion(
  matchId: string,
  inningIdx: number,
  questionIdx: number,
  question: Question
): Promise<void> {
  if (question.type !== 'closest') {
    throw new Error('Question is not a closest question');
  }

  const correctValue = question.correctValue;

  // Get all answers for this question
  const answers = await prisma.matchAnswer.findMany({
    where: {
      matchId,
      inningIdx,
      questionIdx,
    },
  });

  if (answers.length === 0) {
    return; // No answers to process
  }

  // Find the answer(s) closest to the correct value
  let minDistance = Infinity;
  const closestAnswerIds: string[] = [];

  for (const answer of answers) {
    const numericAnswer = parseFloat(answer.choice);
    if (isNaN(numericAnswer)) {
      continue; // Invalid numeric answer
    }

    const distance = Math.abs(correctValue - numericAnswer);

    if (distance < minDistance) {
      minDistance = distance;
      closestAnswerIds.length = 0; // Clear previous winners
      closestAnswerIds.push(answer.id);
    } else if (distance === minDistance) {
      closestAnswerIds.push(answer.id); // Tie
    }
  }

  // Update the closest answer(s) as correct
  if (closestAnswerIds.length > 0) {
    await prisma.matchAnswer.updateMany({
      where: {
        id: { in: closestAnswerIds },
      },
      data: {
        isCorrect: true,
        bonusAwarded: false,
      },
    });
  }
}

/**
 * Generate reveal payload for a question
 */
export async function generateRevealPayload(
  matchId: string,
  questionId: string,
  question: Question
): Promise<QuestionRevealPayload> {
  // Parse question metadata from questionId
  const parts = questionId.split('-');
  const inningIdx = parseInt(parts[parts.length - 2], 10);
  const questionIdx = parseInt(parts[parts.length - 1], 10);

  // Handle closest questions specially
  if (question.type === 'closest') {
    await handleClosestQuestion(matchId, inningIdx, questionIdx, question);
  }

  // Get all answers
  const answers = await getQuestionAnswers(matchId, inningIdx, questionIdx);

  // Get correct answer
  const correctAnswer = getCorrectAnswer(question);
  const correctIndex =
    question.type === 'mc' || question.type === 'media' ? question.correctIndex : undefined;

  // Get clip URL if available
  const clipUrl = question.clipUrl;

  // Format player results
  const playerResults = answers.map((answer) => ({
    playerId: answer.playerId,
    nickname: answer.nickname,
    isCorrect: answer.isCorrect,
    runsAwarded: answer.runsAwarded,
  }));

  return {
    questionId,
    correctAnswer: correctAnswer.toString(),
    correctIndex,
    clipUrl,
    playerResults,
  };
}

/**
 * Update line score for an inning after reveal
 */
export async function updateLineScore(matchId: string, inningIdx: number): Promise<number> {
  const runs = await calculateInningRuns(matchId, inningIdx);
  return runs;
}
