## Summary

Add a session-level report after several hands so users can see progress,
recurring leaks, and what to train next.

## Acceptance Criteria

- Track a session window across 5-10 hands.
- Report biggest leak, best decision, worst decision, drill hit rate, and
  opponent exploit mode used most often.
- Recommend the next drill.
- Work with local deterministic fallback when the LLM backend is unavailable.
- Optionally upgrade the report through the backend when available.

## Notes

Suggested files:

- `src/agents/report.ts`
- `src/agents/trainingProfile.ts`
- `src/components/SessionReview.tsx`
- `src/hooks/useGame.ts`
