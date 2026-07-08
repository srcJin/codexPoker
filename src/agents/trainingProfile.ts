import type {
  DecisionGrade,
  DecisionGradeRating,
  DrillProgress,
  ActionLogEntry,
  SkillLevel,
  Street,
  StreetTrainingStats,
  TableView,
  TrainingNextAction,
  TrainingDrillId,
  TrainingProfile,
} from '../types/game';
import type { Action } from '../types/poker';
import { HUMAN_SEAT } from '../game/constants';
import { DEFAULT_DRILL_ID, evaluateDrillDecision, getTrainingDrill, TRAINING_DRILLS } from './drills';

const RANK_VALUES: Record<string, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

function emptyStreetStats(): StreetTrainingStats {
  return {
    decisions: 0,
    strong: 0,
    reasonable: 0,
    risky: 0,
    leaks: 0,
  };
}

function createStreetStats(): Record<Street, StreetTrainingStats> {
  return {
    preflop: emptyStreetStats(),
    flop: emptyStreetStats(),
    turn: emptyStreetStats(),
    river: emptyStreetStats(),
  };
}

function emptyDrillProgress(): DrillProgress {
  return {
    decisions: 0,
    hits: 0,
    misses: 0,
    streak: 0,
    bestStreak: 0,
  };
}

function createDrillProgress(): Record<TrainingDrillId, DrillProgress> {
  return TRAINING_DRILLS.reduce((progress, drill) => {
    progress[drill.id] = emptyDrillProgress();
    return progress;
  }, {} as Record<TrainingDrillId, DrillProgress>);
}

function normalizeDrillId(value: unknown): TrainingDrillId {
  return TRAINING_DRILLS.some((drill) => drill.id === value)
    ? value as TrainingDrillId
    : DEFAULT_DRILL_ID;
}

function baselineNextAction(): TrainingNextAction {
  return {
    kind: 'play-baseline-hand',
    title: 'Play one baseline hand',
    detail: 'Start with Baseline Discipline and collect a few graded decisions before switching focus.',
    cta: 'Play Baseline',
    drillId: DEFAULT_DRILL_ID,
  };
}

export function createTrainingProfile(): TrainingProfile {
  return {
    version: 1,
    totalDecisions: 0,
    strongDecisions: 0,
    reasonableDecisions: 0,
    riskyDecisions: 0,
    leaks: 0,
    aggressionOpportunities: 0,
    aggressionTaken: 0,
    facedBets: 0,
    foldsFacingBet: 0,
    callsFacingBet: 0,
    raisesFacingBet: 0,
    vpipActions: 0,
    passiveWarnings: 0,
    looseCallWarnings: 0,
    overfoldWarnings: 0,
    activeDrillId: DEFAULT_DRILL_ID,
    drillProgress: createDrillProgress(),
    currentGoal: 'Build disciplined baseline',
    currentGoalDetail: 'Take the highest-equity option and avoid large pots with weak holdings.',
    nextAction: baselineNextAction(),
    recentGrades: [],
    byStreet: createStreetStats(),
  };
}

export function normalizeTrainingProfile(value: unknown): TrainingProfile {
  if (!value || typeof value !== 'object') {
    return createTrainingProfile();
  }

  const candidate = value as Partial<TrainingProfile>;
  if (candidate.version !== 1) {
    return createTrainingProfile();
  }

  const baseline = createTrainingProfile();
  return {
    ...baseline,
    ...candidate,
    activeDrillId: normalizeDrillId(candidate.activeDrillId),
    nextAction: normalizeNextAction(candidate.nextAction, baseline.nextAction),
    drillProgress: TRAINING_DRILLS.reduce((progress, drill) => {
      progress[drill.id] = {
        ...baseline.drillProgress[drill.id],
        ...candidate.drillProgress?.[drill.id],
      };
      return progress;
    }, {} as Record<TrainingDrillId, DrillProgress>),
    recentGrades: Array.isArray(candidate.recentGrades) ? candidate.recentGrades.slice(-8) : [],
    byStreet: {
      preflop: { ...baseline.byStreet.preflop, ...candidate.byStreet?.preflop },
      flop: { ...baseline.byStreet.flop, ...candidate.byStreet?.flop },
      turn: { ...baseline.byStreet.turn, ...candidate.byStreet?.turn },
      river: { ...baseline.byStreet.river, ...candidate.byStreet?.river },
    },
  };
}

function normalizeNextAction(
  value: unknown,
  fallback: TrainingNextAction,
): TrainingNextAction {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const candidate = value as Partial<TrainingNextAction>;
  const validKinds = new Set<TrainingNextAction['kind']>([
    'repeat-drill',
    'switch-drill',
    'review-risky-action',
    'play-baseline-hand',
  ]);

  if (!candidate.kind || !validKinds.has(candidate.kind) || !candidate.title || !candidate.detail || !candidate.cta) {
    return fallback;
  }

  return {
    kind: candidate.kind,
    title: candidate.title,
    detail: candidate.detail,
    cta: candidate.cta,
    drillId: candidate.drillId ? normalizeDrillId(candidate.drillId) : undefined,
    street: candidate.street,
    action: candidate.action,
  };
}

function humanCards(view: TableView): string[] {
  return view.seats.find((seat) => seat.seat === HUMAN_SEAT)?.holeCards?.filter((card) => card !== 'back') ?? [];
}

function cardRanks(cards: string[]): string[] {
  return cards.map((card) => card[0]).filter(Boolean);
}

function privateHandScore(cards: string[]): number {
  if (cards.length < 2) return 0;

  const ranks = cardRanks(cards);
  const first = RANK_VALUES[ranks[0]] ?? 0;
  const second = RANK_VALUES[ranks[1]] ?? 0;
  const high = Math.max(first, second);
  const low = Math.min(first, second);
  const suited = cards[0][1] === cards[1][1];
  const connected = Math.abs(high - low) <= 1;
  const pair = ranks[0] === ranks[1];

  return high * 2 + low + (pair ? 22 : 0) + (suited ? 4 : 0) + (connected ? 3 : 0);
}

function boardFitScore(cards: string[], board: string[]): number {
  if (board.length === 0 || cards.length < 2) return 0;

  const ranks = cardRanks([...cards, ...board]);
  const rankCounts = new Map<string, number>();
  for (const rank of ranks) {
    rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1);
  }

  const bestMatch = Math.max(...Array.from(rankCounts.values()));
  const aceOrKing = cards.some((card) => card[0] === 'A' || card[0] === 'K') ? 3 : 0;
  return (bestMatch >= 3 ? 18 : bestMatch === 2 ? 10 : 0) + aceOrKing;
}

function recommendAction(view: TableView, strength: number): Action | undefined {
  const actions = view.legalActions;
  const facingBet = actions.includes('call');
  const canApplyPressure = actions.includes('raise') || actions.includes('bet');
  const pressureAction: Action = actions.includes('raise') ? 'raise' : 'bet';
  const strong = strength >= 40;
  const playable = strength >= 29;

  if (facingBet) {
    if (strong && canApplyPressure) return pressureAction;
    if (playable && actions.includes('call')) return 'call';
    if (actions.includes('fold')) return 'fold';
  }

  if (canApplyPressure && strong) return pressureAction;
  if (actions.includes('check')) return 'check';
  if (actions.includes('call') && playable) return 'call';
  return actions[0];
}

function gradeFromScore(score: number): DecisionGradeRating {
  if (score >= 80) return 'strong';
  if (score >= 62) return 'reasonable';
  if (score >= 42) return 'risky';
  return 'leak';
}

function actionName(action?: Action): string {
  return action ? action[0].toUpperCase() + action.slice(1) : 'No clear action';
}

export function gradeHumanDecision(
  action: Action,
  betSize: number | undefined,
  view: TableView,
  activeDrillId: TrainingDrillId = DEFAULT_DRILL_ID,
): DecisionGrade {
  const cards = humanCards(view);
  const strength = privateHandScore(cards) + boardFitScore(cards, view.communityCards);
  const pot = view.pots.reduce((sum, potView) => sum + potView.size, 0);
  const street = view.street ?? 'preflop';
  const facingBet = view.legalActions.includes('call');
  const canApplyPressure = view.legalActions.includes('raise') || view.legalActions.includes('bet');
  const recommendedAction = recommendAction(view, strength);
  const tags: string[] = [];

  let score = action === recommendedAction ? 86 : 66;
  let summary = `${actionName(action)} is a workable ${street} decision.`;
  let coachingPoint = `Recommended line: ${actionName(recommendedAction)} with hand-strength score ${strength}.`;

  if (action === recommendedAction) {
    summary = `${actionName(action)} matches the trainer recommendation.`;
    coachingPoint = 'Keep anchoring your decisions to hand strength, price, and fold equity.';
  } else if (facingBet && recommendedAction === 'fold' && (action === 'call' || action === 'raise')) {
    score = betSize && pot > 0 && betSize > pot * 0.45 ? 34 : 46;
    summary = `${actionName(action)} continues with a low-strength hand facing pressure.`;
    coachingPoint = 'Tighten your continue range when the price is high and your hand has poor equity.';
    tags.push('loose-call');
  } else if (facingBet && (recommendedAction === 'call' || recommendedAction === 'raise') && action === 'fold') {
    score = strength >= 40 ? 30 : 48;
    summary = 'Fold gives up a playable or strong continuing spot.';
    coachingPoint = 'Defend more often when your range has enough equity against the bet.';
    tags.push('overfold');
  } else if (canApplyPressure && recommendedAction !== 'fold' && (action === 'check' || action === 'call')) {
    score = strength >= 40 ? 58 : 67;
    summary = `${actionName(action)} controls the pot but misses some pressure value.`;
    coachingPoint = 'Look for value bets and raises when your hand can charge worse holdings.';
    tags.push('passive');
  } else if (!facingBet && strength < 29 && (action === 'bet' || action === 'raise')) {
    score = 43;
    summary = 'Aggression with a weak holding creates avoidable variance.';
    coachingPoint = 'Bluff selectively; prefer hands with blockers, draw equity, or a clear fold target.';
    tags.push('thin-aggression');
  }

  const baseGrade: DecisionGrade = {
    rating: gradeFromScore(score),
    score,
    summary,
    coachingPoint,
    recommendedAction,
    recommendedLabel: actionName(recommendedAction),
    tags,
  };

  const drillResult = evaluateDrillDecision(activeDrillId, baseGrade, action, view);
  const adjustedScore = Math.max(0, Math.min(100, baseGrade.score + drillResult.scoreAdjustment));
  const drill = getTrainingDrill(activeDrillId);

  return {
    ...baseGrade,
    score: adjustedScore,
    rating: gradeFromScore(adjustedScore),
    drillResult: drillResult.result,
    drillNote: `${drill.label}: ${drillResult.note}`,
  };
}

function nextGoal(profile: TrainingProfile): Pick<TrainingProfile, 'currentGoal' | 'currentGoalDetail'> {
  const activeDrill = getTrainingDrill(profile.activeDrillId);
  const activeProgress = profile.drillProgress[profile.activeDrillId];
  if (profile.activeDrillId !== DEFAULT_DRILL_ID && activeProgress.decisions < 5) {
    return {
      currentGoal: activeDrill.label,
      currentGoalDetail: activeDrill.instruction,
    };
  }

  if (profile.activeDrillId !== DEFAULT_DRILL_ID && activeProgress.streak >= 3) {
    return {
      currentGoal: `${activeDrill.label} streak`,
      currentGoalDetail: `You have hit ${activeProgress.streak} drill spots in a row. Keep the focus until the next session review.`,
    };
  }

  const total = Math.max(profile.totalDecisions, 1);
  const leakRate = profile.leaks / total;
  const passiveRate = profile.passiveWarnings / total;
  const looseRate = profile.looseCallWarnings / total;
  const overfoldRate = profile.overfoldWarnings / total;

  if (looseRate >= 0.25) {
    return {
      currentGoal: 'Stop loose continues',
      currentGoalDetail: 'When facing bets, fold weak holdings unless the price and equity are clearly favorable.',
    };
  }

  if (overfoldRate >= 0.22) {
    return {
      currentGoal: 'Defend playable equity',
      currentGoalDetail: 'Continue with medium-plus hands more often instead of surrendering every pressure spot.',
    };
  }

  if (passiveRate >= 0.25) {
    return {
      currentGoal: 'Apply value pressure',
      currentGoalDetail: 'Bet or raise strong hands when opponents can call with worse or fold better equity.',
    };
  }

  if (leakRate <= 0.12 && profile.totalDecisions >= 6) {
    return {
      currentGoal: 'Train mixed strategy spots',
      currentGoalDetail: 'Start identifying selective bluffs and thinner value bets after your baseline decisions hold.',
    };
  }

  return {
    currentGoal: 'Build disciplined baseline',
    currentGoalDetail: 'Take the highest-equity option and avoid large pots with weak holdings.',
  };
}

function nextActionForRiskyGrade(grade: DecisionGrade, view: TableView, action: Action): TrainingNextAction | null {
  if (grade.rating !== 'risky' && grade.rating !== 'leak') {
    return null;
  }

  return {
    kind: 'review-risky-action',
    title: `Review the ${view.street ?? 'preflop'} ${action}`,
    detail: `${grade.summary} Re-read the replay note before playing the next hand.`,
    cta: 'Review Replay',
    drillId: grade.tags.includes('loose-call')
      ? 'discipline-folds'
      : grade.tags.includes('overfold')
        ? 'defend-pressure'
        : grade.tags.includes('passive')
          ? 'value-pressure'
          : undefined,
    street: view.street ?? 'preflop',
    action,
  };
}

function nextActionForDrillResult(profile: TrainingProfile, grade: DecisionGrade): TrainingNextAction | null {
  const drill = getTrainingDrill(profile.activeDrillId);

  if (grade.drillResult === 'miss') {
    return {
      kind: 'repeat-drill',
      title: `Repeat ${drill.label}`,
      detail: grade.drillNote ?? `Repeat the current drill until this spot is stable.`,
      cta: 'Repeat Drill',
      drillId: profile.activeDrillId,
    };
  }

  const activeProgress = profile.drillProgress[profile.activeDrillId];
  if (grade.drillResult === 'hit' && activeProgress.streak >= 3) {
    return {
      kind: 'repeat-drill',
      title: `Keep ${drill.label}`,
      detail: `You have a ${activeProgress.streak}-decision drill streak. Play one more hand to confirm it holds.`,
      cta: 'Play One More',
      drillId: profile.activeDrillId,
    };
  }

  return null;
}

export function recommendNextActionAfterDecision(
  profile: TrainingProfile,
  grade: DecisionGrade,
  view: TableView,
  action: Action,
): TrainingNextAction {
  const normalized = normalizeTrainingProfile(profile);
  const riskyAction = nextActionForRiskyGrade(grade, view, action);
  if (riskyAction) {
    return riskyAction;
  }

  const drillAction = nextActionForDrillResult(normalized, grade);
  if (drillAction) {
    return drillAction;
  }

  const recommendedDrillId = drillIdForProfileLeak(normalized);
  if (recommendedDrillId && recommendedDrillId !== normalized.activeDrillId) {
    const drill = getTrainingDrill(recommendedDrillId);
    return {
      kind: 'switch-drill',
      title: `Switch to ${drill.label}`,
      detail: drill.instruction,
      cta: 'Use Drill',
      drillId: recommendedDrillId,
    };
  }

  if (normalized.activeDrillId === DEFAULT_DRILL_ID) {
    return baselineNextAction();
  }

  const activeDrill = getTrainingDrill(normalized.activeDrillId);
  return {
    kind: 'repeat-drill',
    title: `Repeat ${activeDrill.label}`,
    detail: 'Play another hand with the current drill active so the trainer can confirm the pattern.',
    cta: 'Repeat Drill',
    drillId: normalized.activeDrillId,
  };
}

function drillIdForProfileLeak(profile: TrainingProfile): TrainingDrillId | null {
  const total = Math.max(profile.totalDecisions, 1);
  const looseRate = profile.looseCallWarnings / total;
  const overfoldRate = profile.overfoldWarnings / total;
  const passiveRate = profile.passiveWarnings / total;

  if (looseRate >= 0.2) {
    return 'discipline-folds';
  }

  if (overfoldRate >= 0.18) {
    return 'defend-pressure';
  }

  if (passiveRate >= 0.18) {
    return 'value-pressure';
  }

  return null;
}

export function recommendNextActionAfterHand(
  profile: TrainingProfile,
  actionLog: ActionLogEntry[],
): TrainingNextAction {
  const normalized = normalizeTrainingProfile(profile);
  const humanGrades = actionLog
    .filter((entry) => entry.seat === HUMAN_SEAT && entry.decisionGrade)
    .map((entry) => ({
      entry,
      grade: entry.decisionGrade as DecisionGrade,
    }));

  const risky = humanGrades.findLast(({ grade }) => grade.rating === 'leak' || grade.rating === 'risky');
  if (risky) {
    return {
      kind: 'review-risky-action',
      title: `Review ${risky.entry.street} ${risky.entry.action}`,
      detail: `${risky.grade.summary} Use Action Replay before starting the next hand.`,
      cta: 'Review Replay',
      drillId: risky.grade.tags.includes('loose-call')
        ? 'discipline-folds'
        : risky.grade.tags.includes('overfold')
          ? 'defend-pressure'
          : risky.grade.tags.includes('passive')
            ? 'value-pressure'
            : undefined,
      street: risky.entry.street,
      action: risky.entry.action,
    };
  }

  const missedDrill = humanGrades.findLast(({ grade }) => grade.drillResult === 'miss');
  if (missedDrill) {
    const drill = getTrainingDrill(normalized.activeDrillId);
    return {
      kind: 'repeat-drill',
      title: `Repeat ${drill.label}`,
      detail: missedDrill.grade.drillNote ?? 'Repeat the current drill because the last hand missed its target.',
      cta: 'Repeat Drill',
      drillId: normalized.activeDrillId,
    };
  }

  return normalized.nextAction;
}

export function updateTrainingProfile(
  current: TrainingProfile,
  grade: DecisionGrade,
  view: TableView,
  action: Action,
): TrainingProfile {
  const profile = normalizeTrainingProfile(current);
  const street = view.street ?? 'preflop';
  const canApplyPressure = view.legalActions.includes('raise') || view.legalActions.includes('bet');
  const facingBet = view.legalActions.includes('call');
  const aggressive = action === 'bet' || action === 'raise';
  const voluntary = action === 'call' || aggressive;
  const drillResult = grade.drillResult ?? 'neutral';
  const currentDrillProgress = profile.drillProgress[profile.activeDrillId];
  const nextStreak = drillResult === 'hit'
    ? currentDrillProgress.streak + 1
    : drillResult === 'miss'
      ? 0
      : currentDrillProgress.streak;

  const byStreet = {
    ...profile.byStreet,
    [street]: {
      ...profile.byStreet[street],
      decisions: profile.byStreet[street].decisions + 1,
      strong: profile.byStreet[street].strong + (grade.rating === 'strong' ? 1 : 0),
      reasonable: profile.byStreet[street].reasonable + (grade.rating === 'reasonable' ? 1 : 0),
      risky: profile.byStreet[street].risky + (grade.rating === 'risky' ? 1 : 0),
      leaks: profile.byStreet[street].leaks + (grade.rating === 'leak' ? 1 : 0),
    },
  };

  const nextProfile: TrainingProfile = {
    ...profile,
    totalDecisions: profile.totalDecisions + 1,
    strongDecisions: profile.strongDecisions + (grade.rating === 'strong' ? 1 : 0),
    reasonableDecisions: profile.reasonableDecisions + (grade.rating === 'reasonable' ? 1 : 0),
    riskyDecisions: profile.riskyDecisions + (grade.rating === 'risky' ? 1 : 0),
    leaks: profile.leaks + (grade.rating === 'leak' ? 1 : 0),
    aggressionOpportunities: profile.aggressionOpportunities + (canApplyPressure ? 1 : 0),
    aggressionTaken: profile.aggressionTaken + (canApplyPressure && aggressive ? 1 : 0),
    facedBets: profile.facedBets + (facingBet ? 1 : 0),
    foldsFacingBet: profile.foldsFacingBet + (facingBet && action === 'fold' ? 1 : 0),
    callsFacingBet: profile.callsFacingBet + (facingBet && action === 'call' ? 1 : 0),
    raisesFacingBet: profile.raisesFacingBet + (facingBet && aggressive ? 1 : 0),
    vpipActions: profile.vpipActions + (voluntary ? 1 : 0),
    passiveWarnings: profile.passiveWarnings + (grade.tags.includes('passive') ? 1 : 0),
    looseCallWarnings: profile.looseCallWarnings + (grade.tags.includes('loose-call') ? 1 : 0),
    overfoldWarnings: profile.overfoldWarnings + (grade.tags.includes('overfold') ? 1 : 0),
    drillProgress: {
      ...profile.drillProgress,
      [profile.activeDrillId]: {
        decisions: currentDrillProgress.decisions + (drillResult === 'neutral' ? 0 : 1),
        hits: currentDrillProgress.hits + (drillResult === 'hit' ? 1 : 0),
        misses: currentDrillProgress.misses + (drillResult === 'miss' ? 1 : 0),
        streak: nextStreak,
        bestStreak: Math.max(currentDrillProgress.bestStreak, nextStreak),
      },
    },
    recentGrades: [
      ...profile.recentGrades,
      {
        street,
        action,
        rating: grade.rating,
        score: grade.score,
        summary: grade.summary,
        drillResult: grade.drillResult,
        drillNote: grade.drillNote,
      },
    ].slice(-8),
    byStreet,
  };

  return {
    ...nextProfile,
    ...nextGoal(nextProfile),
    nextAction: recommendNextActionAfterDecision(nextProfile, grade, view, action),
  };
}

export function setActiveTrainingDrill(
  current: TrainingProfile,
  drillId: TrainingDrillId,
): TrainingProfile {
  const profile = normalizeTrainingProfile(current);
  const activeDrillId = normalizeDrillId(drillId);
  const nextProfile = {
    ...profile,
    activeDrillId,
  };

  return {
    ...nextProfile,
    ...nextGoal(nextProfile),
    nextAction: activeDrillId === DEFAULT_DRILL_ID
      ? baselineNextAction()
      : {
          kind: 'repeat-drill',
          title: `Play ${getTrainingDrill(activeDrillId).label}`,
          detail: getTrainingDrill(activeDrillId).instruction,
          cta: 'Play Drill',
          drillId: activeDrillId,
        },
  };
}

export function recommendTrainingDrillForSkillLevel(
  current: TrainingProfile,
  skillLevel: SkillLevel,
): TrainingDrillId {
  const profile = normalizeTrainingProfile(current);
  const total = Math.max(profile.totalDecisions, 1);
  const looseRate = profile.looseCallWarnings / total;
  const overfoldRate = profile.overfoldWarnings / total;
  const passiveRate = profile.passiveWarnings / total;

  if (skillLevel === 'beginner') {
    if (looseRate >= 0.18) {
      return 'discipline-folds';
    }

    if (overfoldRate >= 0.22 && profile.totalDecisions >= 4) {
      return 'defend-pressure';
    }

    return 'baseline';
  }

  if (skillLevel === 'advanced') {
    if (passiveRate >= 0.18) {
      return 'avoid-passive';
    }

    if (looseRate <= 0.12 && overfoldRate <= 0.12 && profile.totalDecisions >= 6) {
      return 'selective-bluff';
    }

    return 'value-pressure';
  }

  if (passiveRate >= 0.22) {
    return 'value-pressure';
  }

  if (overfoldRate >= 0.18) {
    return 'defend-pressure';
  }

  if (looseRate >= 0.18) {
    return 'discipline-folds';
  }

  return profile.activeDrillId === 'baseline' ? 'defend-pressure' : profile.activeDrillId;
}
