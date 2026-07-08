## Summary

Status: Implemented locally.

Move beyond random hands by adding scenario drills that can create or select
hands matching a training objective.

## Acceptance Criteria

- Define `TrainingScenario` or `DrillScenario` fixtures.
- Support common spots such as weak hand facing pressure, playable defend,
  value-bet opportunity, passive-line trap, and selective bluff spot.
- Let selected drills bias or force the next hand scenario.
- Keep scenarios deterministic enough for tests.
- Avoid breaking the normal cash-game random hand flow.

## Notes

Suggested files:

- `src/agents/drills.ts`
- `src/game/GameSession.ts`
- `src/game/cards.ts`
- `src/__tests__/trainingProfile.test.ts`
