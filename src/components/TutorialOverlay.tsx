import { useEffect, useRef, useState } from 'react';

interface TutorialOverlayProps {
  onClose: () => void;
}

interface TutorialStep {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    eyebrow: 'Welcome',
    title: 'Train one decision at a time',
    body: 'Poker Coach is a Texas Holdem trainer. Play hands, get graded decisions, then use drills to tighten your next session.',
    bullets: [
      'Start at the table and play normal hands.',
      'Use Training to pick a focused drill.',
      'Your progress persists across sessions.',
    ],
  },
  {
    eyebrow: 'During a hand',
    title: 'Use help only when it matters',
    body: 'When it is your turn, Quick Hint explains legal options and the Assistant can answer short in-hand questions.',
    bullets: [
      'Quick Hint uses your cards and the public board.',
      'Assistant stays scoped to what a player should know.',
      'Action buttons stay disabled when it is not your turn.',
    ],
  },
  {
    eyebrow: 'Trainer Agent',
    title: 'Pick a drill before you play',
    body: 'Drills turn random hands into targeted practice. The trainer scores whether each decision hits or misses the active focus.',
    bullets: [
      'Fold Weak Continues trains discipline facing bets.',
      'Value Bet Strong Hands trains pressure with strong holdings.',
      'Recent Grades show exactly what happened.',
    ],
  },
  {
    eyebrow: 'Replay',
    title: 'Review every action after it happens',
    body: 'Action Replay records player and agent actions. Select a timeline item to inspect the reasoning, grade, and trainer note.',
    bullets: [
      'Grades attach directly to your decisions.',
      'Agent traces show scoped public reasoning.',
      'Pro Coach unlocks after a hand completes.',
    ],
  },
  {
    eyebrow: 'Adaptive table',
    title: 'Opponents react to your leaks',
    body: 'Ace and Rock adjust when your training profile shows patterns like overfolding, loose calls, or passive lines.',
    bullets: [
      'Opponent Read tells you how the table is adjusting.',
      'The goal is to expose leaks, not make perfect poker bots.',
      'Start with Baseline Discipline if you are unsure.',
    ],
  },
];

export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const panelRef = useRef<HTMLElement | null>(null);
  const step = TUTORIAL_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [stepIndex]);

  return (
    <div className="tutorial" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial__backdrop" />
      <section className="tutorial__panel" ref={panelRef}>
        <div className="tutorial__top">
          <span>{step.eyebrow}</span>
          <button type="button" className="tutorial__skip" onClick={onClose}>
            Skip
          </button>
        </div>

        <div className="tutorial__progress" aria-label={`Tutorial step ${stepIndex + 1} of ${TUTORIAL_STEPS.length}`}>
          {TUTORIAL_STEPS.map((item, index) => (
            <span
              key={item.title}
              className={index <= stepIndex ? 'tutorial__progress-dot tutorial__progress-dot--active' : 'tutorial__progress-dot'}
            />
          ))}
        </div>

        <h2 id="tutorial-title">{step.title}</h2>
        <p>{step.body}</p>

        <ul className="tutorial__bullets">
          {step.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        <div className="tutorial__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}
            disabled={isFirst}
          >
            Back
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              if (isLast) {
                onClose();
                return;
              }
              setStepIndex((index) => Math.min(index + 1, TUTORIAL_STEPS.length - 1));
            }}
          >
            {isLast ? 'Start Training' : 'Next'}
          </button>
        </div>
      </section>
    </div>
  );
}
