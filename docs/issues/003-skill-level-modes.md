## Summary

Status: Implemented locally.

Add Beginner, Intermediate, and Advanced modes that tune coaching language,
guidance density, and drill recommendations.

## Acceptance Criteria

- Add a skill-level selector persisted in `localStorage`.
- Beginner mode explains terms and recommends low-risk drills.
- Intermediate mode keeps concise strategy explanations.
- Advanced mode reduces helper copy and exposes more technical concepts.
- Coach, Trainer Agent, and Pro Coach copy should respect the selected level.

## Notes

Suggested files:

- `src/types/game.ts`
- `src/hooks/useGame.ts`
- `src/agents/coach.ts`
- `src/agents/trainingProfile.ts`
