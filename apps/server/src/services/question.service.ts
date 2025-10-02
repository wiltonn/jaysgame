import type { QuestionPayload, Question, QuestionType } from '@jaysgame/shared';

export interface FormatQuestionOptions {
  matchId: string;
  question: Question;
  inning: number;
  questionIdx: number;
  timerSec: number;
}

/**
 * Format a question for broadcasting to clients
 */
export function formatQuestion(options: FormatQuestionOptions): QuestionPayload {
  const { matchId, question, inning, questionIdx, timerSec } = options;

  const basePayload: QuestionPayload = {
    id: `${matchId}-${inning}-${questionIdx}`,
    type: question.type as QuestionType,
    text: question.text,
    timerSec,
    inning,
    questionIdx,
  };

  // Add type-specific fields
  switch (question.type) {
    case 'mc':
    case 'media':
      basePayload.choices = question.choices;
      if (question.type === 'media') {
        basePayload.mediaUrl = question.mediaUrl;
      }
      break;

    case 'tf':
      // True/False questions send as choices for consistent UI
      basePayload.choices = ['True', 'False'];
      break;

    case 'closest':
      // Closest questions don't send choices
      break;

    default:
      // Handle any future question types
      break;
  }

  // Add optional media URL if present
  if (question.mediaUrl && question.type !== 'media') {
    basePayload.mediaUrl = question.mediaUrl;
  }

  return basePayload;
}

/**
 * Validate that a question can be shown
 */
export function validateQuestion(question: Question): { valid: boolean; error?: string } {
  if (!question.text || question.text.trim().length === 0) {
    return { valid: false, error: 'Question text is required' };
  }

  switch (question.type) {
    case 'mc':
      if (!question.choices || question.choices.length < 2) {
        return { valid: false, error: 'Multiple choice questions require at least 2 choices' };
      }
      if (question.correctIndex < 0 || question.correctIndex >= question.choices.length) {
        return { valid: false, error: 'Invalid correct index for multiple choice question' };
      }
      break;

    case 'media':
      if (!question.mediaUrl) {
        return { valid: false, error: 'Media questions require a mediaUrl' };
      }
      if (!question.choices || question.choices.length < 2) {
        return { valid: false, error: 'Media questions require at least 2 choices' };
      }
      if (question.correctIndex < 0 || question.correctIndex >= question.choices.length) {
        return { valid: false, error: 'Invalid correct index for media question' };
      }
      break;

    case 'tf':
      if (typeof question.correctAnswer !== 'boolean') {
        return { valid: false, error: 'True/False questions require a boolean correctAnswer' };
      }
      break;

    case 'closest':
      if (typeof question.correctValue !== 'number') {
        return { valid: false, error: 'Closest questions require a numeric correctValue' };
      }
      break;

    default: {
      // This should never happen at runtime, but we handle it for safety
      const unknownType = (question as { type: string }).type;
      return { valid: false, error: `Unknown question type: ${unknownType}` };
    }
  }

  return { valid: true };
}

/**
 * Get the correct answer for a question
 */
export function getCorrectAnswer(question: Question): string | number | boolean {
  switch (question.type) {
    case 'mc':
    case 'media':
      return question.choices[question.correctIndex];

    case 'tf':
      return question.correctAnswer;

    case 'closest':
      return question.correctValue;
  }
}

/**
 * Check if an answer is correct
 */
export function isAnswerCorrect(question: Question, answer: string): boolean {
  switch (question.type) {
    case 'mc':
    case 'media':
      return question.choices[question.correctIndex] === answer;

    case 'tf':
      return answer.toLowerCase() === question.correctAnswer.toString().toLowerCase();

    case 'closest':
      // For closest questions, we can't determine correctness until all answers are in
      // This will be handled in the reveal phase
      return false;
  }
}
