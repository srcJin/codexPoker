import assert from 'node:assert/strict';

import {
  buildScenarioDeckOrder,
  createDeck,
  deal,
  hasNoDuplicates,
  shortToCard,
  shuffle,
} from '../game/cards';

export function runCardsTests(): void {
  const deck = createDeck();
  assert.equal(deck.length, 52);

  const original = deck.map((card) => `${card.rank}${card.suit}`).join(',');
  shuffle(deck);
  const shuffled = deck.map((card) => `${card.rank}${card.suit}`).join(',');
  assert.equal(deck.length, 52);
  assert.equal(shuffled.split(',').sort().join(','), original.split(',').sort().join(','));

  const fresh = createDeck();
  const hole = deal(fresh, 2);
  const flop = deal(fresh, 3);
  assert.equal(hole.length, 2);
  assert.equal(flop.length, 3);
  assert.equal(hasNoDuplicates(hole, flop), true);
  assert.equal(hasNoDuplicates(hole, [...flop, hole[0]]), false);

  const scenarioDeck = buildScenarioDeckOrder([0, 2], {
    id: 'test-scenario',
    drillId: 'discipline-folds',
    label: 'Test scenario',
    objective: 'Verify deterministic draw ordering.',
    heroCards: ['3c', '9h'],
    opponentCards: { 2: ['As', 'Ad'] },
    boardRunout: ['2d', '7s', 'Js'],
  });
  assert.equal(scenarioDeck.length, 52);
  assert.equal(hasNoDuplicates(scenarioDeck.map(shortToCard)), true);

  const drawStack = [...scenarioDeck];
  assert.deepEqual(
    [
      drawStack.pop(),
      drawStack.pop(),
      drawStack.pop(),
      drawStack.pop(),
      drawStack.pop(),
      drawStack.pop(),
      drawStack.pop(),
    ],
    ['3c', '9h', 'As', 'Ad', '2d', '7s', 'Js'],
  );
}
