import { PrismaClient } from '@prisma/client';
import { MatchPhase } from '@jaysgame/shared';
import type { MatchState, PlayerScore, Question } from '@jaysgame/shared';
import { redisClient } from '../config/redis';
import { io } from '../index';
import { formatQuestion, validateQuestion } from './question.service';
import { generateRevealPayload, updateLineScore } from './reveal.service';

const prisma = new PrismaClient();

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  lobby: ['question'],
  question: ['reveal'],
  reveal: ['question', 'stretch', 'postgame'],
  stretch: ['question'],
  postgame: [],
};

/**
 * Match State Machine Service
 * Manages match flow through different phases
 */
export class MatchStateMachine {
  private matchId: string;
  private state: MatchState | null = null;

  constructor(matchId: string) {
    this.matchId = matchId;
  }

  /**
   * Load current state from Redis
   */
  async loadState(): Promise<MatchState> {
    const stateJson = await redisClient.get(`match:${this.matchId}:state`);
    if (!stateJson) {
      throw new Error('Match state not found');
    }

    this.state = JSON.parse(stateJson) as MatchState;
    return this.state;
  }

  /**
   * Save state to Redis
   */
  async saveState(): Promise<void> {
    if (!this.state) {
      throw new Error('No state to save');
    }

    await redisClient.setex(
      `match:${this.matchId}:state`,
      86400, // 24 hours
      JSON.stringify(this.state)
    );
  }

  /**
   * Transition to a new phase
   */
  async transition(newPhase: MatchPhase): Promise<void> {
    await this.loadState();

    const currentPhase = this.state!.phase;
    const allowedTransitions = VALID_TRANSITIONS[currentPhase];

    if (!allowedTransitions.includes(newPhase)) {
      throw new Error(
        `Invalid state transition: ${currentPhase} -> ${newPhase}. Allowed: ${allowedTransitions.join(', ')}`
      );
    }

    this.state!.phase = newPhase;
    await this.saveState();

    // Broadcast state update to all clients in match
    io.to(this.matchId).emit('state:update', this.state);
  }

  /**
   * Start match (lobby -> question)
   */
  async startMatch(): Promise<void> {
    await this.loadState();

    if (this.state!.phase !== MatchPhase.LOBBY) {
      throw new Error('Match can only be started from lobby phase');
    }

    // Load match and pack data
    const match = await prisma.match.findUnique({
      where: { id: this.matchId },
      include: { pack: true },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    // Update match status in database
    await prisma.match.update({
      where: { id: this.matchId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    // Move to first question
    this.state!.inning = 0;
    this.state!.questionIdx = 0;
    this.state!.phase = MatchPhase.QUESTION;

    // Get first question
    const innings = match.pack.innings as unknown as Array<{
      theme: string;
      questions: Question[];
    }>;
    const question = innings[0].questions[0];
    const settings = match.settings as { timerSec: number };

    // Validate question before showing
    const validation = validateQuestion(question);
    if (!validation.valid) {
      throw new Error(`Invalid question: ${validation.error}`);
    }

    this.state!.question = formatQuestion({
      matchId: this.matchId,
      question,
      inning: 0,
      questionIdx: 0,
      timerSec: settings.timerSec,
    });
    this.state!.endsAt = Date.now() + settings.timerSec * 1000;

    await this.saveState();

    // Broadcast state update and question
    io.to(this.matchId).emit('state:update', this.state);
    io.to(this.matchId).emit('question:show', {
      question: this.state!.question,
      endsAt: this.state!.endsAt,
    });
  }

  /**
   * Show next question
   */
  async nextQuestion(): Promise<void> {
    await this.loadState();

    // Load match and pack
    const match = await prisma.match.findUnique({
      where: { id: this.matchId },
      include: { pack: true },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    const innings = match.pack.innings as unknown as Array<{
      theme: string;
      questions: Question[];
    }>;
    const currentInning = this.state!.inning;
    const currentQuestionIdx = this.state!.questionIdx;

    // Check if we need to move to next inning
    if (currentQuestionIdx + 1 >= innings[currentInning].questions.length) {
      // Move to next inning
      if (currentInning + 1 >= innings.length) {
        // Game over
        await this.endMatch();
        return;
      }

      // Check for 7th inning stretch (index 6)
      if (currentInning === 6) {
        await this.triggerStretch();
        return;
      }

      // Move to next inning, first question
      this.state!.inning = currentInning + 1;
      this.state!.questionIdx = 0;
    } else {
      // Move to next question in same inning
      this.state!.questionIdx = currentQuestionIdx + 1;
    }

    // Load new question
    const question = innings[this.state!.inning].questions[this.state!.questionIdx] as Question;
    const settings = match.settings as { timerSec: number };

    // Validate question before showing
    const validation = validateQuestion(question);
    if (!validation.valid) {
      throw new Error(`Invalid question: ${validation.error}`);
    }

    this.state!.phase = MatchPhase.QUESTION;
    this.state!.question = formatQuestion({
      matchId: this.matchId,
      question,
      inning: this.state!.inning,
      questionIdx: this.state!.questionIdx,
      timerSec: settings.timerSec,
    });
    this.state!.endsAt = Date.now() + settings.timerSec * 1000;

    await this.saveState();

    // Broadcast
    io.to(this.matchId).emit('state:update', this.state);
    io.to(this.matchId).emit('question:show', {
      question: this.state!.question,
      endsAt: this.state!.endsAt,
    });
  }

  /**
   * Reveal current question answer
   */
  async revealAnswer(): Promise<void> {
    await this.loadState();

    if (this.state!.phase !== MatchPhase.QUESTION) {
      throw new Error('Can only reveal answer during question phase');
    }

    const currentQuestion = this.state!.question;
    if (!currentQuestion) {
      throw new Error('No current question to reveal');
    }

    // Load match to get question details
    const match = await prisma.match.findUnique({
      where: { id: this.matchId },
      include: { pack: true },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    const innings = match.pack.innings as unknown as Array<{
      theme: string;
      questions: Question[];
    }>;
    const question = innings[this.state!.inning].questions[this.state!.questionIdx];

    // Generate reveal payload
    const revealPayload = await generateRevealPayload(this.matchId, currentQuestion.id, question);

    // Update line score for this inning
    const inningRuns = await updateLineScore(this.matchId, this.state!.inning);
    this.state!.lineScore[this.state!.inning] = inningRuns;

    // Transition to reveal phase
    this.state!.phase = MatchPhase.REVEAL;
    this.state!.endsAt = undefined;

    await this.saveState();

    // Broadcast reveal to all players
    io.to(this.matchId).emit('state:update', this.state);
    io.to(this.matchId).emit('question:reveal', revealPayload);
  }

  /**
   * Trigger 7th inning stretch
   */
  async triggerStretch(): Promise<void> {
    await this.loadState();

    this.state!.phase = MatchPhase.STRETCH;
    this.state!.endsAt = Date.now() + 30000; // 30 seconds

    await this.saveState();

    // Broadcast stretch
    io.to(this.matchId).emit('state:update', this.state);
    io.to(this.matchId).emit('stretch:start', {
      clipUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Example - should come from pack
      durationSec: 30,
    });

    // Auto-advance after stretch
    setTimeout(async () => {
      this.state!.inning = 7; // Move to 8th inning (index 7)
      this.state!.questionIdx = 0;
      await this.nextQuestion();
    }, 30000);
  }

  /**
   * End match
   */
  async endMatch(): Promise<void> {
    await this.loadState();

    this.state!.phase = MatchPhase.POSTGAME;
    this.state!.question = undefined;
    this.state!.endsAt = undefined;

    await this.saveState();

    // Update match status in database
    await prisma.match.update({
      where: { id: this.matchId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });

    // Determine MVP
    const leaderboard = this.state!.leaderboard;
    const mvp = leaderboard.length > 0 ? leaderboard[0] : null;

    // Broadcast match end
    io.to(this.matchId).emit('state:update', this.state);
    io.to(this.matchId).emit('match:end', {
      finalScores: leaderboard,
      mvp: mvp?.playerId || '',
      shareCardUrl: undefined, // TODO: Generate share card
    });
  }

  /**
   * Pause match (host control)
   */
  async pauseMatch(): Promise<void> {
    await this.loadState();

    // Store pause state in Redis
    await redisClient.set(`match:${this.matchId}:paused`, 'true', 'EX', 3600);

    // Broadcast pause event
    io.to(this.matchId).emit('match:paused', {
      timestamp: Date.now(),
    });
  }

  /**
   * Resume match (host control)
   */
  async resumeMatch(): Promise<void> {
    await this.loadState();

    // Remove pause state
    await redisClient.del(`match:${this.matchId}:paused`);

    // Recalculate timer if in question phase
    if (this.state!.phase === MatchPhase.QUESTION && this.state!.endsAt) {
      const match = await prisma.match.findUnique({
        where: { id: this.matchId },
      });

      if (match) {
        const settings = match.settings as { timerSec: number };
        this.state!.endsAt = Date.now() + settings.timerSec * 1000;
        await this.saveState();
      }
    }

    // Broadcast resume event
    io.to(this.matchId).emit('match:resumed', {
      timestamp: Date.now(),
      endsAt: this.state!.endsAt,
    });
  }

  /**
   * Skip to next question (host control)
   */
  async skipQuestion(): Promise<void> {
    await this.loadState();

    if (this.state!.phase === MatchPhase.QUESTION || this.state!.phase === MatchPhase.REVEAL) {
      await this.nextQuestion();
    } else {
      throw new Error('Can only skip during question or reveal phase');
    }
  }

  /**
   * Update leaderboard
   */
  async updateLeaderboard(players: PlayerScore[]): Promise<void> {
    await this.loadState();

    // Sort by runs (desc), then by totalTimeMs (asc)
    this.state!.leaderboard = players.sort((a, b) => {
      if (b.runs !== a.runs) return b.runs - a.runs;
      return a.totalTimeMs - b.totalTimeMs;
    });

    await this.saveState();

    // Broadcast leaderboard update
    io.to(this.matchId).emit('score:update', {
      leaderboard: this.state!.leaderboard,
      lineScore: this.state!.lineScore,
    });
  }

  /**
   * Update line score for an inning
   */
  async updateLineScore(inning: number, runs: number): Promise<void> {
    await this.loadState();

    this.state!.lineScore[inning] = runs;
    await this.saveState();
  }
}
