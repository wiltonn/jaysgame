import type { PackData, PackMeta, Inning, Question } from '../validation/pack.validation';

/**
 * CSV Format:
 * - First row: metadata (sport,team,locale,title,difficulty,version)
 * - Blank row
 * - For each inning:
 *   - Inning row: INNING,<theme>
 *   - Question rows: <type>,<text>,<...type-specific fields>
 *   - Blank row to separate innings
 *
 * Example:
 * sport,team,locale,title,difficulty,version
 * baseball,Blue Jays,en-US,Blue Jays Trivia,medium,1.0.0
 *
 * INNING,Historic Moments
 * mc,What year did the Blue Jays win their first World Series?,1991,1992,1993,1994,1
 * tf,The Blue Jays have won back-to-back World Series.,true
 *
 * INNING,Players & Stats
 * closest,How many home runs did Jose Bautista hit in 2015?,40,home runs
 */

/**
 * Parse CSV string into structured pack data
 */
export function parsePackCSV(csvContent: string): PackData {
  const lines = csvContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV file is too short. Must contain metadata and at least one inning.');
  }

  // Parse metadata (first row)
  const metaRow = parseCSVLine(lines[0]);
  if (metaRow.length !== 6) {
    throw new Error('Metadata row must have 6 fields: sport,team,locale,title,difficulty,version');
  }

  const meta: PackMeta = {
    sport: metaRow[0],
    team: metaRow[1],
    locale: metaRow[2],
    title: metaRow[3],
    difficulty: metaRow[4] as 'easy' | 'medium' | 'hard' | 'mixed',
    version: metaRow[5],
  };

  // Parse innings and questions
  const innings: Inning[] = [];
  let currentInning: Inning | null = null;
  let lineIdx = 1;

  while (lineIdx < lines.length) {
    const row = parseCSVLine(lines[lineIdx]);

    if (row[0] === 'INNING') {
      // Save previous inning if exists
      if (currentInning) {
        innings.push(currentInning);
      }

      // Start new inning
      if (row.length < 2) {
        throw new Error(`Line ${lineIdx + 1}: INNING row must have a theme`);
      }
      currentInning = {
        theme: row[1],
        questions: [],
      };
    } else if (currentInning) {
      // Parse question
      try {
        const question = parseQuestionRow(row);
        currentInning.questions.push(question);
      } catch (error) {
        throw new Error(
          `Line ${lineIdx + 1}: ${error instanceof Error ? error.message : 'Invalid question format'}`
        );
      }
    } else {
      throw new Error(`Line ${lineIdx + 1}: Expected INNING row but got question data`);
    }

    lineIdx++;
  }

  // Add last inning
  if (currentInning) {
    innings.push(currentInning);
  }

  if (innings.length === 0) {
    throw new Error('CSV must contain at least one inning');
  }

  return {
    meta,
    innings,
    tags: [],
    isKidsSafe: false,
  };
}

/**
 * Parse a single CSV line, respecting quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse question row based on type
 */
function parseQuestionRow(row: string[]): Question {
  const type = row[0];

  switch (type) {
    case 'mc': {
      // Format: mc,<text>,<choice1>,<choice2>,...,<correctIndex>
      if (row.length < 5) {
        throw new Error(
          'Multiple choice question must have text, at least 2 choices, and correct index'
        );
      }

      const text = row[1];
      const correctIndex = parseInt(row[row.length - 1], 10);
      const choices = row.slice(2, row.length - 1);

      if (isNaN(correctIndex)) {
        throw new Error('Correct index must be a number');
      }

      return {
        type: 'mc',
        text,
        choices,
        correctIndex,
      };
    }

    case 'tf': {
      // Format: tf,<text>,<correctAnswer>
      if (row.length !== 3) {
        throw new Error('True/False question must have text and correct answer (true/false)');
      }

      const text = row[1];
      const correctAnswer = row[2].toLowerCase() === 'true';

      return {
        type: 'tf',
        text,
        correctAnswer,
      };
    }

    case 'closest': {
      // Format: closest,<text>,<correctValue>[,<unit>]
      if (row.length < 3) {
        throw new Error('Closest question must have text and correct value');
      }

      const text = row[1];
      const correctValue = parseFloat(row[2]);
      const unit = row[3] || undefined;

      if (isNaN(correctValue)) {
        throw new Error('Correct value must be a number');
      }

      return {
        type: 'closest',
        text,
        correctValue,
        unit,
      };
    }

    case 'media': {
      // Format: media,<text>,<mediaUrl>,<choice1>,<choice2>,...,<correctIndex>
      if (row.length < 6) {
        throw new Error(
          'Media question must have text, media URL, at least 2 choices, and correct index'
        );
      }

      const text = row[1];
      const mediaUrl = row[2];
      const correctIndex = parseInt(row[row.length - 1], 10);
      const choices = row.slice(3, row.length - 1);

      if (isNaN(correctIndex)) {
        throw new Error('Correct index must be a number');
      }

      return {
        type: 'media',
        text,
        mediaUrl,
        choices,
        correctIndex,
      };
    }

    default:
      throw new Error(`Unknown question type: ${type}. Must be mc, tf, closest, or media`);
  }
}

/**
 * Generate CSV preview (first 5 questions)
 */
export function generatePackPreview(pack: PackData): string {
  const preview: string[] = [];
  let questionCount = 0;
  const maxQuestions = 5;

  preview.push(`Title: ${pack.meta.title}`);
  preview.push(`Sport: ${pack.meta.sport} | Team: ${pack.meta.team}`);
  preview.push(`Difficulty: ${pack.meta.difficulty} | Innings: ${pack.innings.length}`);
  preview.push('');

  for (const inning of pack.innings) {
    if (questionCount >= maxQuestions) break;

    preview.push(`Inning: ${inning.theme} (${inning.questions.length} questions)`);

    for (const question of inning.questions) {
      if (questionCount >= maxQuestions) break;

      preview.push(`  [${question.type.toUpperCase()}] ${question.text}`);
      questionCount++;
    }

    if (questionCount < maxQuestions) {
      preview.push('');
    }
  }

  const totalQuestions = pack.innings.reduce((sum, inning) => sum + inning.questions.length, 0);
  if (totalQuestions > maxQuestions) {
    preview.push(`... and ${totalQuestions - maxQuestions} more questions`);
  }

  return preview.join('\n');
}
