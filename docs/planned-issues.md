# Planned GitHub Issues

`gh` issue creation is currently blocked because the local GitHub CLI token is invalid.
After re-authenticating with `gh auth login -h github.com`, these issues can be
created against `srcJin/PokerCursor`.

## 1. Add First-Run Tutorial Mode

Status: Implemented locally.

Labels: `enhancement`, `ux`, `tutorial`

### Summary

Create a guided first-run tutorial that explains the app flow, agents, grading,
drills, and opponent adaptation before a new user plays their first hand.

### Acceptance Criteria

- Show tutorial automatically for first-time users.
- Persist completion in `localStorage`.
- Provide `Next`, `Back`, `Skip`, and `Restart Tutorial` controls.
- Cover table actions, Quick Hint, Assistant, Trainer Agent, Action Replay,
  Pro Coach, and drill selection.
- Keep tutorial copy concise and non-blocking.

### Notes

Suggested files:

- `src/components/TutorialOverlay.tsx`
- `src/hooks/useOnboarding.ts`
- `src/types/game.ts`

### Command

```bash
gh issue create --repo srcJin/PokerCursor \
  --title "Add first-run tutorial mode" \
  --label "enhancement,ux,tutorial" \
  --body-file docs/issues/001-first-run-tutorial.md
```

## 2. Add New User Guidance and Poker Glossary

Status: Implemented locally.

Labels: `enhancement`, `ux`, `beginner`

### Summary

Add lightweight in-context guidance and a glossary so new players understand
poker terms and app-specific coaching features without leaving the table.

### Acceptance Criteria

- Add a glossary panel for terms like pot odds, equity, VPIP, aggression,
  value bet, bluff, range, position, and fold equity.
- Add restrained helper copy in the lobby, Trainer Agent, Action Replay, Coach,
  and Pro Coach areas.
- Let users collapse/hide guidance.
- Avoid large instructional blocks inside the main play surface.

### Notes

Suggested files:

- `src/components/GlossaryPanel.tsx`
- `src/components/NewUserGuidance.tsx`
- `src/App.css`

### Command

```bash
gh issue create --repo srcJin/PokerCursor \
  --title "Add new user guidance and poker glossary" \
  --label "enhancement,ux,beginner" \
  --body-file docs/issues/002-new-user-guidance-glossary.md
```

## 3. Add Skill Level Modes

Status: Implemented locally.

Labels: `enhancement`, `training`, `ux`

### Summary

Add Beginner, Intermediate, and Advanced modes that tune coaching language,
guidance density, and drill recommendations.

### Acceptance Criteria

- Add a skill-level selector persisted in `localStorage`.
- Beginner mode explains terms and recommends low-risk drills.
- Intermediate mode keeps concise strategy explanations.
- Advanced mode reduces helper copy and exposes more technical concepts.
- Coach, Trainer Agent, and Pro Coach copy should respect the selected level.

### Notes

Suggested files:

- `src/types/game.ts`
- `src/hooks/useGame.ts`
- `src/agents/coach.ts`
- `src/agents/trainingProfile.ts`

### Command

```bash
gh issue create --repo srcJin/PokerCursor \
  --title "Add beginner/intermediate/advanced skill modes" \
  --label "enhancement,training,ux" \
  --body-file docs/issues/003-skill-level-modes.md
```

## 4. Add Texas Hold'em Format Selector

Status: Implemented locally.

Labels: `enhancement`, `gameplay`, `formats`

### Summary

Support multiple Texas Hold'em training formats from the lobby so players can
choose the kind of session they want.

### Initial Formats

- Cash Game Training: current persistent credit mode.
- Single Hand Drill: one hand, immediate review, no long-term stack pressure.
- Heads-Up: human vs Ace only.
- 3-Handed Table: current human + Ace + Rock mode.
- Tournament Stack Mode: fixed stack, escalating blind pressure, survival goals.

### Acceptance Criteria

- Add `GameFormat` type and format config.
- Add a format selector in the lobby.
- Pass format config into `GameSession`.
- Adjust active seats, starting stacks, blinds, and trainer goals by format.
- Preserve current 3-handed behavior as the default.

### Notes

Suggested files:

- `src/game/GameSession.ts`
- `src/game/constants.ts`
- `src/types/game.ts`
- `src/components/FormatSelector.tsx`

### Command

```bash
gh issue create --repo srcJin/PokerCursor \
  --title "Add Texas Hold'em format selector" \
  --label "enhancement,gameplay,formats" \
  --body-file docs/issues/004-texas-holdem-format-selector.md
```

## 5. Add Recommended Next Action After Each Hand

Status: Implemented locally.

Labels: `enhancement`, `training`, `ux`

### Summary

After a hand or meaningful drill result, show a clear next action so the app
feels more like a coach guiding the session.

### Acceptance Criteria

- Recommend one next step after each hand.
- Recommendation options should include repeating the current drill, switching
  drills, reviewing the last risky action, or playing another baseline hand.
- Show the recommendation in Hand Summary and Trainer Agent.
- Keep recommendations deterministic when LLM backend is unavailable.

### Notes

Suggested files:

- `src/agents/trainingProfile.ts`
- `src/agents/report.ts`
- `src/components/HandSummary.tsx`
- `src/components/TrainingPanel.tsx`

### Command

```bash
gh issue create --repo srcJin/PokerCursor \
  --title "Add recommended next action after each hand" \
  --label "enhancement,training,ux" \
  --body-file docs/issues/005-recommended-next-action.md
```

## 6. Add Scenario-Based Drill Engine

Status: Implemented locally.

Labels: `enhancement`, `training`, `gameplay`

### Summary

Move beyond random hands by adding scenario drills that can create or select
hands matching a training objective.

### Acceptance Criteria

- Define `TrainingScenario` or `DrillScenario` fixtures.
- Support common spots such as weak hand facing pressure, playable defend,
  value-bet opportunity, passive-line trap, and selective bluff spot.
- Let selected drills bias or force the next hand scenario.
- Keep scenarios deterministic enough for tests.
- Avoid breaking the normal cash-game random hand flow.

### Notes

Suggested files:

- `src/agents/drills.ts`
- `src/game/GameSession.ts`
- `src/game/cards.ts`
- `src/__tests__/trainingProfile.test.ts`

### Command

```bash
gh issue create --repo srcJin/PokerCursor \
  --title "Add scenario-based drill engine" \
  --label "enhancement,training,gameplay" \
  --body-file docs/issues/006-scenario-drill-engine.md
```

## 7. Add End-of-Session Review

Labels: `enhancement`, `training`, `reporting`

### Summary

Add a session-level report after several hands so users can see progress,
recurring leaks, and what to train next.

### Acceptance Criteria

- Track a session window across 5-10 hands.
- Report biggest leak, best decision, worst decision, drill hit rate, and
  opponent exploit mode used most often.
- Recommend the next drill.
- Work with local deterministic fallback when the LLM backend is unavailable.
- Optionally upgrade the report through the backend when available.

### Notes

Suggested files:

- `src/agents/report.ts`
- `src/agents/trainingProfile.ts`
- `src/components/SessionReview.tsx`
- `src/hooks/useGame.ts`

### Command

```bash
gh issue create --repo srcJin/PokerCursor \
  --title "Add end-of-session training review" \
  --label "enhancement,training,reporting" \
  --body-file docs/issues/007-end-of-session-review.md
```
