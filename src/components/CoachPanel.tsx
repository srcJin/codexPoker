import type { CoachAdvice, SkillLevel } from '../types/game';
import { NewUserGuidance } from './NewUserGuidance';

interface CoachPanelProps {
  advice: CoachAdvice | null;
  feedback: string | null;
  skillLevel: SkillLevel;
}

const COACH_GUIDANCE: Record<SkillLevel, string[]> = {
  beginner: [
    'Coach advice is in-hand and uses your current cards, board, pot, and legal actions.',
    'Equity means your estimated chance to win or tie; pot odds are the price of calling.',
  ],
  intermediate: [
    'Coach advice is a quick in-hand read, not a full post-hand audit.',
    'Compare the options against your active drill before choosing.',
  ],
  advanced: [
    'Use Coach for a compact range, equity, and pressure check before acting.',
  ],
};

export function CoachPanel({ advice, feedback, skillLevel }: CoachPanelProps) {
  if (!advice && !feedback) {
    return (
      <aside className="coach-panel coach-panel--empty">
        <h3>Coach</h3>
        <p>Use <strong>Quick Hint</strong> when facing a decision.</p>
        <NewUserGuidance
          title="Coach scope"
          storageKey="coach-empty"
          items={COACH_GUIDANCE[skillLevel]}
        />
      </aside>
    );
  }

  return (
    <aside className="coach-panel">
      <h3>Coach</h3>
      <NewUserGuidance
        title="Coach scope"
        storageKey="coach-active"
        items={COACH_GUIDANCE[skillLevel]}
      />
      {feedback && (
        <div className="coach-panel__feedback">
          <span className="coach-panel__label">Feedback</span>
          <p>{feedback}</p>
        </div>
      )}
      {advice && (
        <>
          <p className="coach-panel__summary">{advice.summary}</p>
          {advice.equity && (
            <p className="coach-panel__equity">Equity: {advice.equity}</p>
          )}
          {advice.thinkingProcess.length > 0 && (
            <div className="coach-panel__thinking">
              <span className="coach-panel__label">Visible reasoning</span>
              <ol>
                {advice.thinkingProcess.map((step, index) => (
                  <li key={`${index}-${step}`}>{step}</li>
                ))}
              </ol>
            </div>
          )}
          <ul className="coach-panel__options">
            {advice.options.map((opt) => (
              <li key={opt.action}>
                <strong>{opt.action.toUpperCase()}</strong> — {opt.label}
                <br />
                <span>{opt.rationale}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
