import type { Action } from './poker';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export type PlayerRole = 'human' | 'ai_aggressive' | 'ai_conservative';

export type GameFormat =
  | 'cash'
  | 'single-hand'
  | 'heads-up'
  | 'three-handed'
  | 'tournament';

export interface GameFormatConfig {
  id: GameFormat;
  label: string;
  description: string;
  activeSeats: number[];
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  persistsCredits: boolean;
  resetStacksEachHand: boolean;
  blindLevelHands: number;
  trainerGoal: string;
  trainerGoalDetail: string;
}

export type AgentId =
  | 'dealer'
  | 'coach'
  | 'report'
  | 'ai_aggressive'
  | 'ai_conservative';

export type VisibilityScope =
  | 'visible_table'
  | 'human_and_visible_table'
  | 'own_hand_and_visible_table'
  | 'full_history';

export interface ActionLogEntry {
  seat: number;
  player: string;
  action: Action;
  betSize?: number;
  street: Street;
  timestamp: number;
  rationale?: string;
  thinkingProcess?: string[];
  decisionGrade?: DecisionGrade;
}

export interface SeatView {
  seat: number;
  label: string;
  role: PlayerRole;
  stack: number;
  betSize: number;
  holeCards: string[] | null;
  isActive: boolean;
  isToAct: boolean;
  isButton: boolean;
}

export interface TableView {
  handInProgress: boolean;
  street: Street | null;
  communityCards: string[];
  seats: SeatView[];
  pots: { size: number; eligiblePlayers: number[] }[];
  humanToAct: boolean;
  legalActions: Action[];
  chipRange?: { min: number; max: number };
  winners: WinnerView[] | null;
}

export interface AgentCharacteristic {
  label: string;
  value: string;
  score: number;
}

export interface AgentMemorySnapshot {
  agentId: AgentId;
  label: string;
  scope: VisibilityScope;
  shortTerm: string[];
  longTerm: string[];
  characteristics: AgentCharacteristic[];
  decisionsThisHand: number;
}

export interface AgentDecisionTrace {
  id: string;
  agentId: AgentId;
  label: string;
  seat?: number;
  street: Street | null;
  action?: Action;
  betSize?: number;
  observation: string[];
  shortTerm: string[];
  rationale: string;
  thinkingProcess: string[];
  visibleCards: string[];
  timestamp: number;
}

export interface PlayerRecord {
  seat: number;
  label: string;
  role: PlayerRole;
  startingCredit: number;
  credits: number;
  handsPlayed: number;
  wins: number;
  voluntaryActions: number;
  aggressiveActions: number;
  folds: number;
  net: number;
  recentResults: number[];
}

export interface WinnerView {
  seat: number;
  label: string;
  handName: string;
  cards: string[];
}

export interface CoachAdvice {
  summary: string;
  options: { action: Action; label: string; rationale: string }[];
  equity?: string;
  thinkingProcess: string[];
}

export interface HandReport {
  highlights: string[];
  improvements: string[];
  summary: string;
  timeline: string[];
  decisionReviews: string[];
  thinkingProcess: string[];
  nextAction: TrainingNextAction;
}

export type DecisionGradeRating = 'strong' | 'reasonable' | 'risky' | 'leak';

export interface DecisionGrade {
  rating: DecisionGradeRating;
  score: number;
  summary: string;
  coachingPoint: string;
  recommendedAction?: Action;
  recommendedLabel: string;
  tags: string[];
  drillResult?: DrillResult;
  drillNote?: string;
}

export interface StreetTrainingStats {
  decisions: number;
  strong: number;
  reasonable: number;
  risky: number;
  leaks: number;
}

export interface RecentDecisionGrade {
  street: Street;
  action: Action;
  rating: DecisionGradeRating;
  score: number;
  summary: string;
  drillResult?: DrillResult;
  drillNote?: string;
}

export type TrainingNextActionKind =
  | 'repeat-drill'
  | 'switch-drill'
  | 'review-risky-action'
  | 'play-baseline-hand';

export interface TrainingNextAction {
  kind: TrainingNextActionKind;
  title: string;
  detail: string;
  cta: string;
  drillId?: TrainingDrillId;
  street?: Street;
  action?: Action;
}

export type TrainingDrillId =
  | 'baseline'
  | 'discipline-folds'
  | 'defend-pressure'
  | 'value-pressure'
  | 'avoid-passive'
  | 'selective-bluff';

export type DrillResult = 'hit' | 'miss' | 'neutral';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface TrainingDrill {
  id: TrainingDrillId;
  label: string;
  focus: string;
  goal: string;
  instruction: string;
}

export interface TrainingScenario {
  id: string;
  drillId: TrainingDrillId;
  label: string;
  objective: string;
  heroCards: [string, string];
  opponentCards?: Record<number, [string, string]>;
  boardRunout?: string[];
}

export interface DrillProgress {
  decisions: number;
  hits: number;
  misses: number;
  streak: number;
  bestStreak: number;
}

export interface TrainingProfile {
  version: 1;
  totalDecisions: number;
  strongDecisions: number;
  reasonableDecisions: number;
  riskyDecisions: number;
  leaks: number;
  aggressionOpportunities: number;
  aggressionTaken: number;
  facedBets: number;
  foldsFacingBet: number;
  callsFacingBet: number;
  raisesFacingBet: number;
  vpipActions: number;
  passiveWarnings: number;
  looseCallWarnings: number;
  overfoldWarnings: number;
  activeDrillId: TrainingDrillId;
  drillProgress: Record<TrainingDrillId, DrillProgress>;
  currentGoal: string;
  currentGoalDetail: string;
  nextAction: TrainingNextAction;
  recentGrades: RecentDecisionGrade[];
  byStreet: Record<Street, StreetTrainingStats>;
}

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise';

export interface AgentProfile {
  stackSize: number;
  aggression: number;
  lossAversion: number;
  bluffIndex: number;
  position: 'early' | 'middle' | 'late' | 'blinds';
  recentHistory: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
