import { useState } from 'react';

import type { ChatMessage, SkillLevel, TableView } from '../types/game';
import { NewUserGuidance } from './NewUserGuidance';

interface CoachReviewPanelProps {
  view: TableView | null;
  history: ChatMessage[];
  disabled?: boolean;
  skillLevel: SkillLevel;
  onReview: () => Promise<string>;
  onChat: (message: string) => Promise<string>;
}

const PRO_COACH_GUIDANCE: Record<SkillLevel, string[]> = {
  beginner: [
    'Finish the hand first so the review can see every street and showdown card.',
    'Ask about one decision at a time: fold, call, raise, bet size, or hand strength.',
  ],
  intermediate: [
    'Finish the hand first so the review can compare each street and opponent action.',
    'Ask follow-ups about bet sizing, missed value, bluffs, or range reads.',
  ],
  advanced: [
    'Use Pro Coach for compact street-by-street range, sizing, and exploit review.',
  ],
};

export function CoachReviewPanel({
  view,
  history,
  disabled,
  skillLevel,
  onReview,
  onChat,
}: CoachReviewPanelProps) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const handComplete = Boolean(view && !view.handInProgress);

  const runReview = async () => {
    if (!handComplete || pending || disabled) return;
    setPending(true);
    try {
      await onReview();
    } finally {
      setPending(false);
    }
  };

  const submit = async () => {
    if (!draft.trim() || !handComplete || pending || disabled) return;
    setPending(true);
    try {
      await onChat(draft.trim());
      setDraft('');
    } finally {
      setPending(false);
    }
  };

  return (
    <aside className="coach-review-panel">
      <h3>Pro Coach</h3>
      <p className="coach-review-panel__hint">
        Post-hand review only — full card visibility and street breakdown.
      </p>
      <NewUserGuidance
        title="Using Pro Coach"
        storageKey="pro-coach"
        items={PRO_COACH_GUIDANCE[skillLevel]}
      />
      <button
        type="button"
        className="btn btn--coach"
        onClick={() => void runReview()}
        disabled={!handComplete || disabled || pending}
      >
        {pending ? 'Reviewing...' : 'Get Street Review'}
      </button>
      <div className="coach-review-panel__chat">
        {history.length === 0 ? (
          <p className="coach-review-panel__empty">
            {handComplete
              ? 'Request a review once the hand is complete.'
              : 'Finish the hand to unlock Pro Coach.'}
          </p>
        ) : (
          history.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === 'user'
                  ? 'coach-review-panel__message coach-review-panel__message--user'
                  : 'coach-review-panel__message'
              }
            >
              {message.content}
            </div>
          ))
        )}
      </div>
      <div className="coach-review-panel__composer">
        <input
          type="text"
          value={draft}
          placeholder="Why was my turn bet too small?"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void submit();
            }
          }}
          disabled={!handComplete || disabled || pending}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!handComplete || disabled || pending}
        >
          Ask
        </button>
      </div>
    </aside>
  );
}
