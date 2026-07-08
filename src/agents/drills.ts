import type {
  DecisionGrade,
  DrillResult,
  TableView,
  TrainingDrill,
  TrainingDrillId,
  TrainingScenario,
} from '../types/game';
import type { Action } from '../types/poker';
import { AI_AGGRESSIVE_SEAT, AI_CONSERVATIVE_SEAT } from '../game/constants';

export const TRAINING_DRILLS: TrainingDrill[] = [
  {
    id: 'baseline',
    label: 'Baseline Discipline',
    focus: 'All streets',
    goal: 'Make the trainer-recommended decision and avoid obvious leaks.',
    instruction: 'Use hand strength, price, position, and fold equity as the default checklist.',
  },
  {
    id: 'discipline-folds',
    label: 'Fold Weak Continues',
    focus: 'Facing bets',
    goal: 'Fold weak hands instead of calling because the price feels small.',
    instruction: 'When the trainer recommends fold, pass on weak continues and preserve stack.',
  },
  {
    id: 'defend-pressure',
    label: 'Defend Playable Equity',
    focus: 'Facing bets',
    goal: 'Continue with playable hands instead of overfolding to pressure.',
    instruction: 'When equity is playable, call or raise instead of surrendering too often.',
  },
  {
    id: 'value-pressure',
    label: 'Value Bet Strong Hands',
    focus: 'Betting opportunity',
    goal: 'Bet or raise strong hands when worse hands can continue.',
    instruction: 'Do not miss value: apply pressure when the trainer recommends bet or raise.',
  },
  {
    id: 'avoid-passive',
    label: 'Avoid Passive Lines',
    focus: 'Initiative spots',
    goal: 'Reduce checks and calls that miss profitable pressure.',
    instruction: 'Look for initiative when checking or calling would give away value.',
  },
  {
    id: 'selective-bluff',
    label: 'Selective Bluffing',
    focus: 'Low-strength aggression',
    goal: 'Avoid random bluffs without equity, blockers, or a credible fold target.',
    instruction: 'Bluff less often with air; prefer disciplined checks and folds.',
  },
];

export const DEFAULT_DRILL_ID: TrainingDrillId = 'baseline';

export const TRAINING_SCENARIOS: TrainingScenario[] = [
  {
    id: 'weak-facing-pressure',
    drillId: 'discipline-folds',
    label: 'Weak hand facing pressure',
    objective: 'Start with a weak offsuit hand facing blind pressure so folding is a live discipline decision.',
    heroCards: ['3c', '9h'],
    opponentCards: {
      [AI_AGGRESSIVE_SEAT]: ['As', 'Kd'],
      [AI_CONSERVATIVE_SEAT]: ['Qh', 'Qs'],
    },
    boardRunout: ['2d', '7s', 'Jc', '4h', 'Kc'],
  },
  {
    id: 'playable-blind-defend',
    drillId: 'defend-pressure',
    label: 'Playable defend versus pressure',
    objective: 'Give the player a suited broadway hand that should not auto-fold to ordinary pressure.',
    heroCards: ['Ah', 'Jh'],
    opponentCards: {
      [AI_AGGRESSIVE_SEAT]: ['8c', '8d'],
      [AI_CONSERVATIVE_SEAT]: ['Ks', 'Qc'],
    },
    boardRunout: ['Th', '4h', '2s', '7d', 'Ac'],
  },
  {
    id: 'premium-value-pressure',
    drillId: 'value-pressure',
    label: 'Premium value-pressure hand',
    objective: 'Force a strong starting hand so betting or raising for value is available early.',
    heroCards: ['As', 'Ad'],
    opponentCards: {
      [AI_AGGRESSIVE_SEAT]: ['Kc', 'Qc'],
      [AI_CONSERVATIVE_SEAT]: ['9h', '9d'],
    },
    boardRunout: ['Ah', '7c', '2d', 'Ts', '3h'],
  },
  {
    id: 'initiative-top-pair',
    drillId: 'avoid-passive',
    label: 'Initiative with top-pair potential',
    objective: 'Create a hand that can make a strong pair and rewards looking for initiative instead of checking behind.',
    heroCards: ['Kh', 'Qh'],
    opponentCards: {
      [AI_AGGRESSIVE_SEAT]: ['Jc', 'Tc'],
      [AI_CONSERVATIVE_SEAT]: ['8s', '8d'],
    },
    boardRunout: ['Ks', '7h', '2c', '4d', 'Qd'],
  },
  {
    id: 'low-equity-bluff-filter',
    drillId: 'selective-bluff',
    label: 'Low-equity bluff filter',
    objective: 'Start with a marginal suited connector so the player practices avoiding unsupported aggression.',
    heroCards: ['8s', '6s'],
    opponentCards: {
      [AI_AGGRESSIVE_SEAT]: ['Ac', 'Td'],
      [AI_CONSERVATIVE_SEAT]: ['Jh', 'Jd'],
    },
    boardRunout: ['Kc', '9d', '3h', '2s', 'Qd'],
  },
];

export function getTrainingDrill(id: TrainingDrillId): TrainingDrill {
  return TRAINING_DRILLS.find((drill) => drill.id === id) ?? TRAINING_DRILLS[0];
}

export function getTrainingScenarioForDrill(drillId: TrainingDrillId): TrainingScenario | undefined {
  return TRAINING_SCENARIOS.find((scenario) => scenario.drillId === drillId);
}

function isPressureAction(action: Action): boolean {
  return action === 'bet' || action === 'raise';
}

export function evaluateDrillDecision(
  drillId: TrainingDrillId,
  grade: DecisionGrade,
  action: Action,
  view: TableView,
): { result: DrillResult; note: string; scoreAdjustment: number } {
  const facingBet = view.legalActions.includes('call');
  const canApplyPressure = view.legalActions.includes('raise') || view.legalActions.includes('bet');
  const recommendedPressure =
    grade.recommendedAction === 'bet' || grade.recommendedAction === 'raise';

  switch (drillId) {
    case 'discipline-folds':
      if (!facingBet || grade.recommendedAction !== 'fold') {
        return {
          result: 'neutral',
          note: 'No weak facing-bet fold spot appeared on this decision.',
          scoreAdjustment: 0,
        };
      }
      return action === 'fold'
        ? {
            result: 'hit',
            note: 'Drill hit: you folded the weak continue spot.',
            scoreAdjustment: 6,
          }
        : {
            result: 'miss',
            note: 'Drill miss: this was the weak continue the drill is trying to remove.',
            scoreAdjustment: -8,
          };

    case 'defend-pressure':
      if (!facingBet || grade.recommendedAction === 'fold') {
        return {
          result: 'neutral',
          note: 'No playable defend spot appeared on this decision.',
          scoreAdjustment: 0,
        };
      }
      return action !== 'fold'
        ? {
            result: 'hit',
            note: 'Drill hit: you defended playable equity instead of overfolding.',
            scoreAdjustment: 5,
          }
        : {
            result: 'miss',
            note: 'Drill miss: the trainer wanted a continue against pressure.',
            scoreAdjustment: -8,
          };

    case 'value-pressure':
      if (!canApplyPressure || !recommendedPressure) {
        return {
          result: 'neutral',
          note: 'No clear value-pressure opportunity appeared on this decision.',
          scoreAdjustment: 0,
        };
      }
      return isPressureAction(action)
        ? {
            result: 'hit',
            note: 'Drill hit: you applied pressure with a strong enough hand.',
            scoreAdjustment: 6,
          }
        : {
            result: 'miss',
            note: 'Drill miss: this was a value spot where checking or calling left chips behind.',
            scoreAdjustment: -7,
          };

    case 'avoid-passive':
      if (!grade.tags.includes('passive')) {
        return {
          result: isPressureAction(action) ? 'hit' : 'neutral',
          note: isPressureAction(action)
            ? 'Drill hit: you chose initiative instead of drifting passive.'
            : 'No passive leak was detected on this decision.',
          scoreAdjustment: isPressureAction(action) ? 3 : 0,
        };
      }
      return {
        result: 'miss',
        note: 'Drill miss: this decision matched your passive-line leak.',
        scoreAdjustment: -6,
      };

    case 'selective-bluff':
      if (!grade.tags.includes('thin-aggression')) {
        return {
          result: isPressureAction(action) ? 'neutral' : 'hit',
          note: isPressureAction(action)
            ? 'Aggression was not flagged as a random bluff in this spot.'
            : 'Drill hit: you avoided unsupported aggression.',
          scoreAdjustment: isPressureAction(action) ? 0 : 3,
        };
      }
      return {
        result: 'miss',
        note: 'Drill miss: this aggression looked unsupported by the hand context.',
        scoreAdjustment: -7,
      };

    case 'baseline':
    default:
      return grade.rating === 'strong' || grade.rating === 'reasonable'
        ? {
            result: 'hit',
            note: 'Baseline hit: this decision avoided the major leak categories.',
            scoreAdjustment: 0,
          }
        : {
            result: 'miss',
            note: 'Baseline miss: this decision triggered a risky or leak grade.',
            scoreAdjustment: 0,
          };
  }
}
