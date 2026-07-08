## Summary

Status: Implemented locally.

Add lightweight in-context guidance and a glossary so new players understand
poker terms and app-specific coaching features without leaving the table.

## Acceptance Criteria

- Add a glossary panel for terms like pot odds, equity, VPIP, aggression,
  value bet, bluff, range, position, and fold equity.
- Add restrained helper copy in the lobby, Trainer Agent, Action Replay, Coach,
  and Pro Coach areas.
- Let users collapse/hide guidance.
- Avoid large instructional blocks inside the main play surface.

## Notes

Suggested files:

- `src/components/GlossaryPanel.tsx`
- `src/components/NewUserGuidance.tsx`
- `src/App.css`
