## Summary

Status: Implemented locally.

After a hand or meaningful drill result, show a clear next action so the app
feels more like a coach guiding the session.

## Acceptance Criteria

- Recommend one next step after each hand.
- Recommendation options should include repeating the current drill, switching
  drills, reviewing the last risky action, or playing another baseline hand.
- Show the recommendation in Hand Summary and Trainer Agent.
- Keep recommendations deterministic when LLM backend is unavailable.

## Notes

Suggested files:

- `src/agents/trainingProfile.ts`
- `src/agents/report.ts`
- `src/components/HandSummary.tsx`
- `src/components/TrainingPanel.tsx`
