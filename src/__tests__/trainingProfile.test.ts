import assert from 'node:assert/strict';

import {
  createTrainingProfile,
  gradeHumanDecision,
  recommendTrainingDrillForSkillLevel,
  setActiveTrainingDrill,
  updateTrainingProfile,
} from '../agents/trainingProfile';
import { normalizeSkillLevel } from '../agents/skillLevel';
import { HUMAN_SEAT } from '../game/constants';
import type { TableView } from '../types/game';

function decisionView(): TableView {
  return {
    handInProgress: true,
    street: 'preflop',
    communityCards: [],
    seats: [
      {
        seat: HUMAN_SEAT,
        label: 'You',
        role: 'human',
        stack: 98,
        betSize: 2,
        holeCards: ['3c', '9h'],
        isActive: true,
        isToAct: true,
        isButton: true,
      },
      {
        seat: 1,
        label: 'Ace',
        role: 'ai_aggressive',
        stack: 100,
        betSize: 4,
        holeCards: ['back', 'back'],
        isActive: true,
        isToAct: false,
        isButton: false,
      },
    ],
    pots: [{ size: 6, eligiblePlayers: [0, 1] }],
    humanToAct: true,
    legalActions: ['fold', 'call', 'raise'],
    chipRange: { min: 4, max: 20 },
    winners: null,
  };
}

export function runTrainingProfileTests(): void {
  const view = decisionView();
  const profile = setActiveTrainingDrill(createTrainingProfile(), 'discipline-folds');

  const looseCall = gradeHumanDecision('call', 4, view, profile.activeDrillId);
  assert.equal(looseCall.drillResult, 'miss');
  assert.match(looseCall.drillNote ?? '', /Fold Weak Continues/);
  assert.equal(looseCall.tags.includes('loose-call'), true);

  const afterMiss = updateTrainingProfile(profile, looseCall, view, 'call');
  assert.equal(afterMiss.drillProgress['discipline-folds'].decisions, 1);
  assert.equal(afterMiss.drillProgress['discipline-folds'].misses, 1);
  assert.equal(afterMiss.drillProgress['discipline-folds'].streak, 0);
  assert.equal(afterMiss.nextAction.kind, 'review-risky-action');
  assert.equal(afterMiss.nextAction.drillId, 'discipline-folds');

  const disciplinedFold = gradeHumanDecision('fold', undefined, view, afterMiss.activeDrillId);
  assert.equal(disciplinedFold.drillResult, 'hit');

  const afterHit = updateTrainingProfile(afterMiss, disciplinedFold, view, 'fold');
  assert.equal(afterHit.drillProgress['discipline-folds'].decisions, 2);
  assert.equal(afterHit.drillProgress['discipline-folds'].hits, 1);
  assert.equal(afterHit.drillProgress['discipline-folds'].streak, 1);

  assert.equal(normalizeSkillLevel('advanced'), 'advanced');
  assert.equal(normalizeSkillLevel('unknown'), 'beginner');
  assert.equal(recommendTrainingDrillForSkillLevel(createTrainingProfile(), 'beginner'), 'baseline');
  assert.equal(recommendTrainingDrillForSkillLevel(createTrainingProfile(), 'advanced'), 'value-pressure');
}
