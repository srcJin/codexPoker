import type { Card } from '../types/poker';
import type { TrainingScenario } from '../types/game';

const SUIT_TO_CHAR: Record<Card['suit'], string> = {
  clubs: 'c',
  diamonds: 'd',
  hearts: 'h',
  spades: 's',
};

const CHAR_TO_SUIT: Record<string, Card['suit']> = {
  c: 'clubs',
  d: 'diamonds',
  h: 'hearts',
  s: 'spades',
};

export function cardToShort(card: Card): string {
  return `${card.rank}${SUIT_TO_CHAR[card.suit]}`;
}

export function cardsToShort(cards: Card[]): string[] {
  return cards.map(cardToShort);
}

export function shortToCard(short: string): Card {
  const rank = short.slice(0, -1) as Card['rank'];
  const suit = CHAR_TO_SUIT[short.slice(-1)];
  return { rank, suit };
}

const ALL_SUITS: Card['suit'][] = ['clubs', 'diamonds', 'hearts', 'spades'];
const ALL_RANKS: Card['rank'][] = [
  '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A',
];

function cardKey(card: Card): string {
  return `${card.rank}-${card.suit}`;
}

function shortCardKey(short: string): string {
  return cardKey(shortToCard(short));
}

/** Creates a standard 52-card deck. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function takeScenarioCard(
  short: string,
  available: Set<string>,
  drawOrder: string[],
): void {
  const key = shortCardKey(short);
  if (!available.has(key)) {
    throw new Error(`Scenario card ${short} is duplicated or is not in the deck`);
  }

  available.delete(key);
  drawOrder.push(short);
}

function takeFallbackCard(available: Set<string>, drawOrder: string[]): void {
  const next = available.values().next().value;
  if (!next) {
    throw new Error('Scenario deck has no fallback cards remaining');
  }

  available.delete(next);
  const [rank, suit] = next.split('-');
  drawOrder.push(`${rank}${SUIT_TO_CHAR[suit as Card['suit']]}`);
}

export function buildScenarioDeckOrder(
  activeSeats: number[],
  scenario: TrainingScenario,
): string[] {
  const fullDeck = createDeck();
  const available = new Set(fullDeck.map(cardKey));
  const drawOrder: string[] = [];
  const sortedSeats = [...activeSeats].sort((a, b) => a - b);

  for (const seat of sortedSeats) {
    const cards = seat === 0
      ? scenario.heroCards
      : scenario.opponentCards?.[seat];

    if (cards) {
      takeScenarioCard(cards[0], available, drawOrder);
      takeScenarioCard(cards[1], available, drawOrder);
    } else {
      takeFallbackCard(available, drawOrder);
      takeFallbackCard(available, drawOrder);
    }
  }

  for (const card of scenario.boardRunout ?? []) {
    takeScenarioCard(card, available, drawOrder);
  }

  const remaining = fullDeck
    .map(cardToShort)
    .filter((short) => available.has(shortCardKey(short)));

  return [...remaining, ...drawOrder.reverse()];
}

/** Fisher–Yates shuffle (mutates deck in place). */
export function shuffle(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Removes and returns `count` cards from the deck. */
export function deal(deck: Card[], count: number): Card[] {
  if (count > deck.length) {
    throw new Error(`Cannot deal ${count} cards from deck of ${deck.length}`);
  }
  return deck.splice(0, count);
}

/** Returns true when no card appears more than once across all dealt groups. */
export function hasNoDuplicates(...groups: Card[][]): boolean {
  const seen = new Set<string>();
  for (const group of groups) {
    for (const card of group) {
      const key = cardKey(card);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
    }
  }
  return true;
}
