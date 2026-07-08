import type { GameFormat, GameFormatConfig, PlayerRole } from '../types/game';

export const HUMAN_SEAT = 0;
export const AI_AGGRESSIVE_SEAT = 2;
export const AI_CONSERVATIVE_SEAT = 4;

export const TABLE_SEATS = 6;
export const STARTING_STACK = 100;

export const SEAT_CONFIG: Record<
  number,
  { label: string; role: PlayerRole }
> = {
  [HUMAN_SEAT]: { label: 'You', role: 'human' },
  [AI_AGGRESSIVE_SEAT]: { label: 'Ace (Aggro)', role: 'ai_aggressive' },
  [AI_CONSERVATIVE_SEAT]: { label: 'Rock (Tight)', role: 'ai_conservative' },
};

export const ACTIVE_SEATS = [
  HUMAN_SEAT,
  AI_AGGRESSIVE_SEAT,
  AI_CONSERVATIVE_SEAT,
] as const;

export const DEFAULT_GAME_FORMAT: GameFormat = 'cash';

export const GAME_FORMATS: GameFormatConfig[] = [
  {
    id: 'cash',
    label: 'Cash Game Training',
    description: 'Persistent 3-handed credits, current default table feel.',
    activeSeats: [HUMAN_SEAT, AI_AGGRESSIVE_SEAT, AI_CONSERVATIVE_SEAT],
    startingStack: STARTING_STACK,
    smallBlind: 1,
    bigBlind: 2,
    persistsCredits: true,
    resetStacksEachHand: false,
    blindLevelHands: 0,
    trainerGoal: 'Build cash-game discipline',
    trainerGoalDetail: 'Protect long-term credits while choosing profitable fold, call, and pressure spots.',
  },
  {
    id: 'single-hand',
    label: 'Single Hand Drill',
    description: 'One fresh 3-handed spot at a time with immediate review.',
    activeSeats: [HUMAN_SEAT, AI_AGGRESSIVE_SEAT, AI_CONSERVATIVE_SEAT],
    startingStack: STARTING_STACK,
    smallBlind: 1,
    bigBlind: 2,
    persistsCredits: false,
    resetStacksEachHand: true,
    blindLevelHands: 0,
    trainerGoal: 'Solve one hand cleanly',
    trainerGoalDetail: 'Ignore long-term stack pressure and focus on the best decision in this exact spot.',
  },
  {
    id: 'heads-up',
    label: 'Heads-Up',
    description: 'Human versus Ace only, with more frequent blind defense.',
    activeSeats: [HUMAN_SEAT, AI_AGGRESSIVE_SEAT],
    startingStack: STARTING_STACK,
    smallBlind: 1,
    bigBlind: 2,
    persistsCredits: false,
    resetStacksEachHand: false,
    blindLevelHands: 0,
    trainerGoal: 'Defend heads-up ranges',
    trainerGoalDetail: 'Play wider ranges, defend blinds more often, and punish overly passive lines.',
  },
  {
    id: 'three-handed',
    label: '3-Handed Table',
    description: 'Fresh 3-handed table without persistent cash-game record pressure.',
    activeSeats: [HUMAN_SEAT, AI_AGGRESSIVE_SEAT, AI_CONSERVATIVE_SEAT],
    startingStack: STARTING_STACK,
    smallBlind: 1,
    bigBlind: 2,
    persistsCredits: false,
    resetStacksEachHand: false,
    blindLevelHands: 0,
    trainerGoal: 'Read a short-handed table',
    trainerGoalDetail: 'Balance cash-game discipline against wider short-handed ranges from Ace and Rock.',
  },
  {
    id: 'tournament',
    label: 'Tournament Stack Mode',
    description: 'Fixed stack, higher blinds, and blind pressure every three hands.',
    activeSeats: [HUMAN_SEAT, AI_AGGRESSIVE_SEAT, AI_CONSERVATIVE_SEAT],
    startingStack: 60,
    smallBlind: 2,
    bigBlind: 4,
    persistsCredits: false,
    resetStacksEachHand: false,
    blindLevelHands: 3,
    trainerGoal: 'Survive blind pressure',
    trainerGoalDetail: 'Preserve fold equity, avoid thin calls, and look for profitable all-in pressure before stacks shrink.',
  },
];

export function getGameFormatConfig(format: GameFormat): GameFormatConfig {
  return GAME_FORMATS.find((item) => item.id === format) ?? GAME_FORMATS[0];
}

export function normalizeGameFormat(value: unknown): GameFormat {
  return GAME_FORMATS.some((item) => item.id === value)
    ? value as GameFormat
    : DEFAULT_GAME_FORMAT;
}

export const HAND_RANKING_NAMES = [
  'High Card',
  'Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
  'Royal Flush',
] as const;
