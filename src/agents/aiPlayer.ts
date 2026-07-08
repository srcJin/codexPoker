import type { Action } from '../types/poker';
import {
  AI_AGGRESSIVE_SEAT,
  AI_CONSERVATIVE_SEAT,
  HUMAN_SEAT,
} from '../game/constants';
import type {
  AgentDecisionTrace,
  AgentMemorySnapshot,
  AgentProfile,
  TableView,
  TrainingProfile,
} from '../types/game';

export interface AIDecision {
  action: Action;
  betSize?: number;
  rationale: string;
  thinkingProcess: string[];
  observation: string[];
}

export interface AIDecisionResult {
  decision: AIDecision;
  trace: AgentDecisionTrace;
}

type Position = 'button' | 'small_blind' | 'big_blind';

interface OpponentAdaptation {
  aggression: number;
  lossAversion: number;
  raiseThreshold: number;
  raiseSizeBonus: number;
  callScoreFloor: number;
  exploitLabel: string;
  notes: string[];
}

const AI_PROFILES: Record<number, AgentProfile> = {
  [AI_AGGRESSIVE_SEAT]: {
    stackSize: 100,
    aggression: 8,
    lossAversion: 3,
    bluffIndex: 6,
    position: 'late',
    recentHistory: 'Won last two pots with aggressive raises.',
  },
  [AI_CONSERVATIVE_SEAT]: {
    stackSize: 100,
    aggression: 2,
    lossAversion: 8,
    bluffIndex: 1,
    position: 'early',
    recentHistory: 'Folded several hands after early losses.',
  },
};

export function getAgentProfile(
  seat: number,
  view: TableView,
  memory: AgentMemorySnapshot,
): AgentProfile {
  const base = AI_PROFILES[seat] ?? {
    stackSize: 100,
    aggression: 5,
    lossAversion: 5,
    bluffIndex: 3,
    position: 'middle' as const,
    recentHistory: 'No notable recent history.',
  };
  const player = view.seats.find((item) => item.seat === seat);
  const button = view.seats.find((item) => item.isButton)?.seat ?? HUMAN_SEAT;
  const tablePosition = getPosition(seat, button, [
    HUMAN_SEAT,
    AI_AGGRESSIVE_SEAT,
    AI_CONSERVATIVE_SEAT,
  ]);

  const positionMap: Record<Position, AgentProfile['position']> = {
    button: 'late',
    small_blind: 'blinds',
    big_blind: 'blinds',
  };

  const recentNet = memory.shortTerm.slice(-2).join(' ');
  const recentHistory = recentNet || base.recentHistory;

  return {
    ...base,
    stackSize: player?.stack ?? base.stackSize,
    position: positionMap[tablePosition],
    recentHistory,
  };
}

function getPosition(seat: number, button: number, activeSeats: number[]): Position {
  const ordered = [...activeSeats].sort((a, b) => a - b);
  const buttonIdx = ordered.indexOf(button);
  const sb = ordered[(buttonIdx + 1) % ordered.length];

  if (seat === button) return 'button';
  if (seat === sb) return 'small_blind';
  return 'big_blind';
}

function handStrength(holeCards: string[]): number {
  if (holeCards.length < 2) {
    return 0;
  }

  const ranks = holeCards.map((c) => c[0]);
  const suited = holeCards[0][1] === holeCards[1][1];
  const rankValues: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    T: 10, J: 11, Q: 12, K: 13, A: 14,
  };
  const v1 = rankValues[ranks[0]] ?? 0;
  const v2 = rankValues[ranks[1]] ?? 0;
  const high = Math.max(v1, v2);
  const low = Math.min(v1, v2);
  let score = high * 2 + low;
  if (ranks[0] === ranks[1]) score += 20;
  if (suited) score += 4;
  if (high - low === 1) score += 3;
  return score;
}

export function summarizeObservation(view: TableView, seat: number, cards: string[]): string[] {
  const pot = view.pots.reduce((sum, p) => sum + p.size, 0);
  const board = view.communityCards.length ? view.communityCards.join(' ') : 'none';
  const player = view.seats.find((item) => item.seat === seat);
  const facing = view.legalActions.includes('call') ? 'facing a bet' : 'not facing a bet';

  return [
    `Hole cards: ${cards.join(' ') || 'unknown'}`,
    `Board: ${board}`,
    `Pot: $${pot}; stack: $${player?.stack ?? 0}; ${facing}`,
    `Legal actions: ${view.legalActions.join(', ')}`,
  ];
}

function pct(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

function buildOpponentAdaptation(
  seat: number,
  profile?: TrainingProfile,
): OpponentAdaptation {
  const isAggressive = seat === AI_AGGRESSIVE_SEAT;
  const total = profile?.totalDecisions ?? 0;
  const foldToPressure = pct(profile?.foldsFacingBet ?? 0, profile?.facedBets ?? 0);
  const looseCallRate = pct(profile?.looseCallWarnings ?? 0, total);
  const passiveRate = pct(profile?.passiveWarnings ?? 0, total);
  const overfoldRate = pct(profile?.overfoldWarnings ?? 0, total);

  const adaptation: OpponentAdaptation = {
    aggression: isAggressive ? 0.75 : 0.25,
    lossAversion: isAggressive ? 0.3 : 0.7,
    raiseThreshold: isAggressive ? 22 : 30,
    raiseSizeBonus: isAggressive ? 6 : 2,
    callScoreFloor: 14,
    exploitLabel: 'baseline strategy',
    notes: ['No stable player leak has been established yet.'],
  };

  if (!profile || total < 2) {
    return adaptation;
  }

  if (isAggressive && (foldToPressure >= 0.45 || overfoldRate >= 0.22)) {
    return {
      ...adaptation,
      aggression: Math.min(0.92, adaptation.aggression + 0.14),
      lossAversion: Math.max(0.18, adaptation.lossAversion - 0.08),
      raiseThreshold: adaptation.raiseThreshold - 5,
      raiseSizeBonus: adaptation.raiseSizeBonus + 2,
      exploitLabel: 'pressure overfolds',
      notes: [
        `Human fold-to-pressure is ${Math.round(foldToPressure * 100)}%.`,
        'Ace widens pressure because the training profile shows surrender under bets.',
      ],
    };
  }

  if (isAggressive && passiveRate >= 0.25) {
    return {
      ...adaptation,
      aggression: Math.min(0.88, adaptation.aggression + 0.1),
      raiseThreshold: adaptation.raiseThreshold - 3,
      exploitLabel: 'attack passive lines',
      notes: [
        `Passive-warning rate is ${Math.round(passiveRate * 100)}%.`,
        'Ace contests more pots because the human misses pressure opportunities.',
      ],
    };
  }

  if (looseCallRate >= 0.2) {
    return {
      ...adaptation,
      aggression: isAggressive ? 0.68 : 0.38,
      lossAversion: isAggressive ? 0.38 : 0.58,
      raiseThreshold: isAggressive ? adaptation.raiseThreshold + 3 : adaptation.raiseThreshold - 4,
      raiseSizeBonus: adaptation.raiseSizeBonus + 3,
      callScoreFloor: 18,
      exploitLabel: 'value bet loose calls',
      notes: [
        `Loose-continue warning rate is ${Math.round(looseCallRate * 100)}%.`,
        'Opponent shifts toward thicker value and larger raises instead of thin bluffs.',
      ],
    };
  }

  if (!isAggressive && foldToPressure >= 0.5) {
    return {
      ...adaptation,
      aggression: 0.34,
      lossAversion: 0.62,
      raiseThreshold: adaptation.raiseThreshold - 5,
      exploitLabel: 'selective pressure',
      notes: [
        `Human fold-to-pressure is ${Math.round(foldToPressure * 100)}%.`,
        'Rock adds selective pressure while staying tighter than Ace.',
      ],
    };
  }

  return {
    ...adaptation,
    notes: [
      `Training sample has ${total} graded decisions.`,
      'Opponent keeps the baseline profile until one leak dominates.',
    ],
  };
}

export function buildAIDecisionTrace(
  decision: AIDecision,
  seat: number,
  view: TableView,
  memory: AgentMemorySnapshot,
  cards: string[],
): AgentDecisionTrace {
  const visibleCards = [
    ...cards,
    ...view.communityCards,
  ];

  return {
    id: `${memory.agentId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    agentId: memory.agentId,
    label: memory.label,
    seat,
    street: view.street,
    action: decision.action,
    betSize: decision.betSize,
    observation: decision.observation,
    shortTerm: memory.shortTerm,
    rationale: decision.rationale,
    thinkingProcess: decision.thinkingProcess,
    visibleCards,
    timestamp: Date.now(),
  };
}

/** AI player agent with configurable aggression and loss aversion. */
export function pickAIAction(
  seat: number,
  view: TableView,
  memory: AgentMemorySnapshot,
  trainingProfile?: TrainingProfile,
): AIDecisionResult {
  const { legalActions: actions, chipRange } = view;
  const player = view.seats.find((item) => item.seat === seat);
  const cards = player?.holeCards?.filter((card) => card !== 'back') ?? [];
  const stack = player?.stack ?? 0;
  const button = view.seats.find((item) => item.isButton)?.seat ?? HUMAN_SEAT;
  const position = getPosition(seat, button, [
    HUMAN_SEAT,
    AI_AGGRESSIVE_SEAT,
    AI_CONSERVATIVE_SEAT,
  ]);

  const adaptation = buildOpponentAdaptation(seat, trainingProfile);
  const { aggression, lossAversion } = adaptation;
  const strength = handStrength(cards);
  const positionBonus = position === 'button' ? 8 : position === 'small_blind' ? 4 : 0;
  const stackPressure = stack < 30 ? -6 : 0;
  const score = strength + positionBonus + stackPressure;

  const canRaise = actions.includes('raise') || actions.includes('bet');
  const raiseThreshold = adaptation.raiseThreshold;
  const observation = summarizeObservation(view, seat, cards);
  const adaptationObservation = `Opponent adaptation: ${adaptation.exploitLabel}`;
  const adaptedObservation = [...observation, adaptationObservation];

  if (canRaise && score >= raiseThreshold && Math.random() < aggression) {
    const min = chipRange?.min ?? 4;
    const raiseSize = Math.min(
      chipRange?.max ?? min,
      min + adaptation.raiseSizeBonus,
    );
    const decision: AIDecision = {
      action: actions.includes('raise') ? 'raise' : 'bet',
      betSize: raiseSize,
      observation: adaptedObservation,
      rationale: `${memory.label} rates private hand strength ${score} with ${position} position and chooses pressure using ${adaptation.exploitLabel}.`,
      thinkingProcess: [
        `Scoped cards produce a hand-strength score of ${score}.`,
        `${position} position adds pressure value.`,
        `Adaptive threshold is ${raiseThreshold}; aggression frequency is ${Math.round(aggression * 100)}%.`,
        ...adaptation.notes,
      ],
    };
    return { decision, trace: buildAIDecisionTrace(decision, seat, view, memory, cards) };
  }

  if (actions.includes('check')) {
    const decision = {
      action: 'check' as const,
      observation: adaptedObservation,
      rationale: `${memory.label} keeps the pot controlled because no call is required while in ${adaptation.exploitLabel} mode.`,
      thinkingProcess: [
        'No chips are required to continue.',
        'Checking preserves stack and keeps options open for the next street.',
        ...adaptation.notes,
      ],
    };
    return { decision, trace: buildAIDecisionTrace(decision, seat, view, memory, cards) };
  }

  if (actions.includes('call')) {
    const callCost = chipRange?.min ?? 2;
    if (score < adaptation.callScoreFloor && callCost > stack * 0.2 * lossAversion) {
      if (actions.includes('fold')) {
        const decision = {
          action: 'fold' as const,
          observation: adaptedObservation,
          rationale: `${memory.label} folds weak private cards because the call cost is too high for its risk profile.`,
          thinkingProcess: [
            `Hand-strength score ${score} is below adaptive continue floor ${adaptation.callScoreFloor}.`,
            `Call cost $${callCost} is too expensive for this memory profile.`,
            ...adaptation.notes,
            'Folding preserves long-term credit.',
          ],
        };
        return { decision, trace: buildAIDecisionTrace(decision, seat, view, memory, cards) };
      }
    }
    const decision = {
      action: 'call' as const,
      observation: adaptedObservation,
      rationale: `${memory.label} continues because hand score ${score} can still realize equity at this price in ${adaptation.exploitLabel} mode.`,
      thinkingProcess: [
        `Hand-strength score ${score} is playable at the current price.`,
        `Call cost $${callCost} is acceptable against stack $${stack}.`,
        ...adaptation.notes,
        'Calling keeps the hand alive without escalating the pot.',
      ],
    };
    return { decision, trace: buildAIDecisionTrace(decision, seat, view, memory, cards) };
  }

  if (actions.includes('fold')) {
    const decision = {
      action: 'fold' as const,
      observation: adaptedObservation,
      rationale: `${memory.label} has no profitable continuing action in its scoped view.`,
      thinkingProcess: [
        'The scoped view does not support check, call, bet, or raise.',
        ...adaptation.notes,
        'Folding is the only low-risk legal action.',
      ],
    };
    return { decision, trace: buildAIDecisionTrace(decision, seat, view, memory, cards) };
  }

  const decision = {
    action: actions[0],
    observation: adaptedObservation,
    rationale: `${memory.label} takes the first legal fallback action from its scoped view.`,
    thinkingProcess: [
      'No preferred strategic branch matched.',
      `Using legal fallback action ${actions[0]}.`,
      ...adaptation.notes,
    ],
  };
  return { decision, trace: buildAIDecisionTrace(decision, seat, view, memory, cards) };
}
