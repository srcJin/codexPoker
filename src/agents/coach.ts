import { TexasHoldem } from 'poker-odds-calc';

import { HUMAN_SEAT } from '../game/constants';
import type { CoachAdvice, SkillLevel, TableView } from '../types/game';

const ACTION_LABELS: Record<SkillLevel, Record<string, string>> = {
  beginner: {
    fold: 'Fold — leave this hand and save chips',
    check: 'Check — stay in without adding chips when nobody bet',
    call: 'Call — match the bet to keep playing',
    bet: 'Bet — put chips in first on this street',
    raise: 'Raise — increase the bet after someone else bet',
  },
  intermediate: {
    fold: 'Fold — exit the hand and lose your current bet',
    check: 'Check — pass action without putting more chips in',
    call: 'Call — match the current bet to stay in',
    bet: 'Bet — open the betting on this street',
    raise: 'Raise — increase the bet and apply pressure',
  },
  advanced: {
    fold: 'Fold — release a weak range segment',
    check: 'Check — preserve range and pot control',
    call: 'Call — continue with enough equity or implied odds',
    bet: 'Bet — deny equity or extract value',
    raise: 'Raise — polarize, build value, or apply fold equity',
  },
};

function tryCalculateEquity(
  humanCards: string[],
  opponents: string[][],
  board: string[],
): string | undefined {
  try {
    const calc = new TexasHoldem();
    calc.addPlayer(humanCards);
    for (const opp of opponents) {
      calc.addPlayer(opp);
    }
    if (board.length > 0) {
      calc.setBoard(board);
    }
    const result = calc.calculate();
    const players = result.getPlayers();
    const human = players[0];
    if (!human) return undefined;
    return `${human.getWinsPercentageString()} win / ${human.getTiesPercentageString()} tie`;
  } catch {
    return undefined;
  }
}

function buildRationale(
  action: string,
  view: TableView,
  skillLevel: SkillLevel,
  equity?: string,
): string {
  const pot = view.pots.reduce((sum, p) => sum + p.size, 0);
  const street = view.street ?? 'preflop';

  if (skillLevel === 'beginner') {
    switch (action) {
      case 'fold':
        return equity
          ? `Your equity estimate is ${equity}. Fold when the price is too high for your chance to win.`
          : 'Fold when calling costs too much for a weak hand.';
      case 'check':
        return 'Checking keeps the hand going for free when nobody has bet.';
      case 'call':
        return pot > 0
          ? `Pot is $${pot}. Call only when your hand chance is worth the price.`
          : 'Calling matches the bet and keeps your hand alive.';
      case 'bet':
      case 'raise':
        return equity
          ? `With ${equity} equity, aggression can build value or make opponents fold.`
          : 'Bet or raise when your hand is strong enough or a bluff has a clear reason.';
      default:
        return 'Start with hand strength, price, and position.';
    }
  }

  if (skillLevel === 'advanced') {
    switch (action) {
      case 'fold':
        return equity
          ? `${equity} is not enough if the calling price and reverse implied odds are poor.`
          : 'Fold the bottom of range when price, blockers, and realization are weak.';
      case 'check':
        return 'Checking protects range and realizes equity when betting has thin value or poor fold equity.';
      case 'call':
        return pot > 0
          ? `$${pot} pot on ${street}; call if equity realization and implied odds justify the continue.`
          : 'Call when your range wants to continue without reopening action.';
      case 'bet':
      case 'raise':
        return equity
          ? `${equity} supports pressure when worse calls or better folds often enough.`
          : 'Aggression needs a value target, blocker story, or credible fold-equity node.';
      default:
        return 'Consider range advantage, blockers, SPR, and position.';
    }
  }

  switch (action) {
    case 'fold':
      return equity
        ? `Your equity is ${equity}. Folding saves chips when you're behind.`
        : 'Folding is correct when pot odds do not justify continuing.';
    case 'check':
      return 'Checking lets you see the next card for free when no bet is facing you.';
    case 'call':
      return pot > 0
        ? `Pot is $${pot} on the ${street}. Calling keeps you in to realize your equity.`
        : 'Calling matches the bet and keeps your hand alive.';
    case 'bet':
    case 'raise':
      return equity
        ? `With ${equity} equity, betting builds the pot or folds out weaker hands.`
        : 'Aggression can win the pot immediately or charge draws.';
    default:
      return 'Consider position, stack size, and opponent tendencies.';
  }
}

/** Coach agent: explains legal options before the player acts. */
export function getCoachAdvice(view: TableView, skillLevel: SkillLevel = 'intermediate'): CoachAdvice {
  const human = view.seats.find((s) => s.seat === HUMAN_SEAT);
  const humanCards = human?.holeCards?.filter((c) => c !== 'back') ?? [];
  const opponentCards = view.seats
    .filter((s) => s.seat !== HUMAN_SEAT && s.holeCards)
    .map((s) => s.holeCards!.filter((c) => c !== 'back'));

  const equity =
    humanCards.length === 2
      ? tryCalculateEquity(humanCards, opponentCards, view.communityCards)
      : undefined;

  const options = view.legalActions.map((action) => ({
    action,
    label: ACTION_LABELS[skillLevel][action] ?? action,
    rationale: buildRationale(action, view, skillLevel, equity),
  }));

  const street = view.street ?? 'preflop';
  const pot = view.pots.reduce((sum, p) => sum + p.size, 0);

  let summary = skillLevel === 'advanced'
    ? `${street}: ${humanCards.join(' ') || 'your hand'}; pot $${pot}.`
    : `You're on the ${street} with ${humanCards.join(' ') || 'your hand'}.`;
  if (view.communityCards.length > 0) {
    summary += ` Board: ${view.communityCards.join(' ')}.`;
  }
  if (skillLevel !== 'advanced') {
    summary += ` Pot: $${pot}.`;
  }
  if (equity) {
    summary += skillLevel === 'beginner'
      ? ` Equity means your estimated chance to win or tie: ${equity}.`
      : ` Estimated equity: ${equity}.`;
  }
  summary += ` Legal actions: ${view.legalActions.join(', ')}.`;

  const thinkingProcess = skillLevel === 'advanced'
    ? [
        'Used visible cards, legal actions, public pots, stacks, and local equity.',
        'Mapped options through range pressure, value, and realization.',
      ]
    : [
        'Read only the human hand, legal actions, visible board, public pots, and public stacks.',
        equity
          ? `Used the local equity estimate (${equity}) as one input.`
          : 'Skipped equity because the required visible card inputs were incomplete.',
        skillLevel === 'beginner'
          ? 'Translated each legal action into plain-language tradeoffs.'
          : 'Mapped each legal action to a learning-oriented recommendation.',
      ];

  return {
    summary,
    options,
    equity,
    thinkingProcess,
  };
}

/** Immediate feedback after the player acts. */
export function getCoachFeedback(
  action: string,
  view: TableView,
  skillLevel: SkillLevel = 'intermediate',
): string {
  const advice = getCoachAdvice({
    ...view,
    legalActions: view.legalActions.length ? view.legalActions : [action as typeof view.legalActions[number]],
  }, skillLevel);

  const recommended = advice.options.find((o) =>
    o.action === 'raise' || o.action === 'bet'
      ? advice.equity && parseFloat(advice.equity) > 40
      : o.action === 'call',
  );

  if (!recommended) {
    return skillLevel === 'advanced'
      ? `You chose to ${action}. Track range realization, position, and pot geometry.`
      : `You chose to ${action}. Reasonable line — stay aware of position and pot size.`;
  }

  if (recommended.action === action) {
    return `Good ${action}! ${recommended.rationale}`;
  }

  return `You ${action}ed. Coach note: ${recommended.action} was also strong here — ${recommended.rationale}`;
}
