import { z } from 'zod';

/**
 * Pack Metadata Validation
 */
export const packMetaSchema = z.object({
  sport: z.string().min(1, 'Sport is required'),
  team: z.string().min(1, 'Team is required'),
  locale: z.string().min(2, 'Locale must be at least 2 characters'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed'], {
    errorMap: () => ({ message: 'Difficulty must be easy, medium, hard, or mixed' }),
  }),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in format x.y.z'),
});

/**
 * Base Question Schema (shared fields)
 */
const baseQuestionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, 'Question text is required'),
  mediaUrl: z.string().url('Invalid media URL').optional(),
  clipUrl: z.string().url('Invalid clip URL').optional(),
  clipTimestamp: z.string().optional(),
});

/**
 * Multiple Choice Question
 */
const multipleChoiceQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('mc'),
  choices: z.array(z.string()).min(2, 'Must have at least 2 choices').max(6, 'Maximum 6 choices'),
  correctIndex: z.number().int().min(0, 'Correct index must be >= 0'),
});

/**
 * True/False Question
 */
const trueFalseQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('tf'),
  correctAnswer: z.boolean(),
});

/**
 * Closest Question (numerical answer)
 */
const closestQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('closest'),
  correctValue: z.number(),
  unit: z.string().optional(),
});

/**
 * Media Question (image/video with choices)
 */
const mediaQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('media'),
  mediaUrl: z.string().url('Media URL is required for media questions'),
  choices: z.array(z.string()).min(2, 'Must have at least 2 choices').max(6, 'Maximum 6 choices'),
  correctIndex: z.number().int().min(0, 'Correct index must be >= 0'),
});

/**
 * Union of all question types
 */
export const questionSchema = z.discriminatedUnion('type', [
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  closestQuestionSchema,
  mediaQuestionSchema,
]);

/**
 * Inning Schema
 */
export const inningSchema = z.object({
  theme: z.string().min(1, 'Inning theme is required'),
  questions: z
    .array(questionSchema)
    .min(1, 'Each inning must have at least 1 question')
    .max(10, 'Each inning can have maximum 10 questions'),
});

/**
 * Complete Pack Schema
 */
export const packSchema = z.object({
  meta: packMetaSchema,
  innings: z
    .array(inningSchema)
    .min(1, 'Pack must have at least 1 inning')
    .max(9, 'Pack can have maximum 9 innings'),
  tags: z.array(z.string()).optional().default([]),
  isKidsSafe: z.boolean().optional().default(false),
});

/**
 * Pack Import Request Schema
 */
export const packImportRequestSchema = z.object({
  format: z.enum(['json', 'csv'], {
    errorMap: () => ({ message: 'Format must be json or csv' }),
  }),
  data: z.string().min(1, 'Pack data is required'),
});

/**
 * Additional validation functions
 */

/**
 * Validate that correct index is within bounds
 */
export function validateQuestionCorrectIndex(question: z.infer<typeof questionSchema>): boolean {
  if (question.type === 'mc' || question.type === 'media') {
    return question.correctIndex < question.choices.length;
  }
  return true;
}

/**
 * Validate complete pack with custom rules
 */
export function validatePack(pack: z.infer<typeof packSchema>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate correct indices
  pack.innings.forEach((inning, inningIdx) => {
    inning.questions.forEach((question, questionIdx) => {
      if (!validateQuestionCorrectIndex(question)) {
        errors.push(
          `Inning ${inningIdx + 1}, Question ${questionIdx + 1}: Correct index out of bounds`
        );
      }
    });
  });

  // Warn if pack has unusual structure
  if (pack.innings.length < 3) {
    warnings.push('Pack has fewer than 3 innings. Consider adding more content.');
  }

  const totalQuestions = pack.innings.reduce((sum, inning) => sum + inning.questions.length, 0);
  if (totalQuestions < 9) {
    warnings.push(
      'Pack has fewer than 9 questions total. Consider adding more for a complete game.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Type exports
 */
export type PackMeta = z.infer<typeof packMetaSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Inning = z.infer<typeof inningSchema>;
export type PackData = z.infer<typeof packSchema>;
export type PackImportRequest = z.infer<typeof packImportRequestSchema>;
