// Core Types for Fan Playoffs Trivia

// ===== User & Auth =====
export enum Role {
  HOST = 'HOST',
  ADMIN = 'ADMIN',
  CREATOR = 'CREATOR',
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

// ===== Pack & Content =====
export interface PackMeta {
  sport: string;
  team: string;
  locale: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  version: string;
}

export type QuestionType = 'mc' | 'tf' | 'closest' | 'media' | 'map' | 'chain';

export interface BaseQuestion {
  id?: string;
  type: QuestionType;
  text: string;
  mediaUrl?: string;
  clipUrl?: string;
  clipTimestamp?: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'mc';
  choices: string[];
  correctIndex: number;
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'tf';
  correctAnswer: boolean;
}

export interface ClosestQuestion extends BaseQuestion {
  type: 'closest';
  correctValue: number;
  unit?: string;
}

export interface MediaQuestion extends BaseQuestion {
  type: 'media';
  mediaUrl: string;
  choices: string[];
  correctIndex: number;
}

export type Question = MultipleChoiceQuestion | TrueFalseQuestion | ClosestQuestion | MediaQuestion;

export interface Inning {
  theme: string;
  questions: Question[];
}

export interface Pack {
  id: string;
  ownerId: string;
  meta: PackMeta;
  innings: Inning[];
  tags: string[];
  isFeatured: boolean;
  isKidsSafe: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===== Match & Game =====
export enum MatchMode {
  NINE_INNINGS = 'NINE_INNINGS',
  BEST_OF_3 = 'BEST_OF_3',
  BEST_OF_5 = 'BEST_OF_5',
}

export enum MatchStatus {
  LOBBY = 'LOBBY',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export enum MatchPhase {
  LOBBY = 'lobby',
  QUESTION = 'question',
  REVEAL = 'reveal',
  STRETCH = 'stretch',
  POSTGAME = 'postgame',
}

export interface MatchSettings {
  grandSlam: boolean;
  speedBonus: boolean;
  timerSec: number;
  allowReactions: boolean;
  allowHeckles: boolean;
  showMap: boolean;
}

export interface Match {
  id: string;
  hostId: string;
  packId: string;
  joinCode: string;
  mode: MatchMode;
  status: MatchStatus;
  settings: MatchSettings;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

export interface MatchPlayer {
  id: string;
  matchId: string;
  nickname: string;
  avatar?: string;
  city?: string;
  socketId?: string;
  joinedAt: Date;
  leftAt?: Date;
}

export interface MatchAnswer {
  id: string;
  matchId: string;
  playerId: string;
  inningIdx: number;
  questionIdx: number;
  choice: string;
  isCorrect: boolean;
  answerMs: number;
  bonusAwarded: boolean;
  createdAt: Date;
}

// ===== Real-time State =====
export interface PlayerScore {
  playerId: string;
  nickname: string;
  avatar?: string;
  runs: number;
  correct: number;
  total: number;
  totalTimeMs: number;
}

export interface QuestionPayload {
  id: string;
  type: QuestionType;
  text: string;
  choices?: string[];
  mediaUrl?: string;
  timerSec: number;
  inning: number;
  questionIdx: number;
}

export interface MatchState {
  matchId: string;
  phase: MatchPhase;
  inning: number;
  questionIdx: number;
  question?: QuestionPayload;
  endsAt?: number;
  lineScore: (number | null)[];
  leaderboard: PlayerScore[];
  players: MatchPlayer[];
}

// ===== Socket Events =====

// Client → Server
export interface PlayerJoinPayload {
  matchId: string;
  nickname: string;
  avatar?: string;
  cityOptIn: boolean;
  city?: string;
}

export interface AnswerSubmitPayload {
  matchId: string;
  questionId: string;
  choice: string;
  clientLatencyMs: number;
}

export interface ReactionSendPayload {
  matchId: string;
  emoji: string;
}

export type HostAction = 'start' | 'pause' | 'resume' | 'skip' | 'reveal' | 'stretch';

export interface HostActionPayload {
  matchId: string;
  action: HostAction;
}

// Server → Client
export interface PlayerJoinedPayload {
  player: MatchPlayer;
}

export interface PlayerLeftPayload {
  playerId: string;
}

export interface QuestionShowPayload {
  question: QuestionPayload;
  endsAt: number;
}

export interface QuestionRevealPayload {
  questionId: string;
  correctAnswer: string;
  correctIndex?: number;
  clipUrl?: string;
  playerResults: Array<{
    playerId: string;
    nickname: string;
    isCorrect: boolean;
    runsAwarded: number;
  }>;
}

export interface ScoreUpdatePayload {
  leaderboard: PlayerScore[];
  lineScore: (number | null)[];
}

export interface ReactionBroadcastPayload {
  playerId: string;
  nickname: string;
  emoji: string;
}

export interface StretchStartPayload {
  clipUrl: string;
  durationSec: number;
}

export interface MatchEndPayload {
  finalScores: PlayerScore[];
  mvp: string;
  shareCardUrl?: string;
}

// ===== Analytics =====
export type AnalyticsEventType =
  | 'match_created'
  | 'player_joined'
  | 'question_shown'
  | 'answer_submitted'
  | 'correct'
  | 'incorrect'
  | 'reaction_sent'
  | 'stretch_participated'
  | 'match_completed'
  | 'drop_off';

export interface AnalyticsEvent {
  id: string;
  matchId?: string;
  playerId?: string;
  eventType: AnalyticsEventType;
  payload: Record<string, unknown>;
  createdAt: Date;
}

// ===== API Responses =====
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateMatchResponse {
  matchId: string;
  joinCode: string;
  qrCodeUrl: string;
}

export interface PackImportResponse {
  packId: string;
  meta: PackMeta;
  warnings?: string[];
}
