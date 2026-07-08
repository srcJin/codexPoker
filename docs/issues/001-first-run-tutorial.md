## Summary

Status: Implemented locally.

Create a guided first-run tutorial that explains the app flow, agents, grading,
drills, and opponent adaptation before a new user plays their first hand.

## Acceptance Criteria

- Show tutorial automatically for first-time users.
- Persist completion in `localStorage`.
- Provide `Next`, `Back`, `Skip`, and `Restart Tutorial` controls.
- Cover table actions, Quick Hint, Assistant, Trainer Agent, Action Replay,
  Pro Coach, and drill selection.
- Keep tutorial copy concise and non-blocking.

## Notes

Suggested files:

- `src/components/TutorialOverlay.tsx`
- `src/hooks/useOnboarding.ts`
- `src/types/game.ts`
