## Summary

Status: Implemented locally.

Support multiple Texas Hold'em training formats from the lobby so players can
choose the kind of session they want.

## Initial Formats

- Cash Game Training: current persistent credit mode.
- Single Hand Drill: one hand, immediate review, no long-term stack pressure.
- Heads-Up: human vs Ace only.
- 3-Handed Table: current human + Ace + Rock mode.
- Tournament Stack Mode: fixed stack, escalating blind pressure, survival goals.

## Acceptance Criteria

- Add `GameFormat` type and format config.
- Add a format selector in the lobby.
- Pass format config into `GameSession`.
- Adjust active seats, starting stacks, blinds, and trainer goals by format.
- Preserve current 3-handed behavior as the default.

## Notes

Suggested files:

- `src/game/GameSession.ts`
- `src/game/constants.ts`
- `src/types/game.ts`
- `src/components/FormatSelector.tsx`
