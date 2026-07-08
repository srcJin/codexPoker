import { useState } from 'react';
import type { ActionLogEntry, Street } from '../types/game';
import { NewUserGuidance } from './NewUserGuidance';

interface ActionReplayProps {
  entries: ActionLogEntry[];
  currentStreet: Street | null;
}

function actionLabel(entry: ActionLogEntry): string {
  const action = entry.action[0].toUpperCase() + entry.action.slice(1);
  return entry.betSize ? `${action} $${entry.betSize}` : action;
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp);
}

export function ActionReplay({ entries, currentStreet }: ActionReplayProps) {
  const [selectedCursor, setSelectedCursor] = useState(Number.MAX_SAFE_INTEGER);

  const selectedIndex = entries.length === 0
    ? 0
    : Math.min(selectedCursor, entries.length - 1);
  const selectedEntry = entries[selectedIndex];
  const hasPrevious = selectedIndex > 0;
  const hasNext = selectedIndex < entries.length - 1;

  return (
    <section className="action-replay">
      <div className="section-heading">
        <h3>Action Replay</h3>
        <span>{currentStreet ?? 'setup'}</span>
      </div>

      <NewUserGuidance
        title="Reading the replay"
        storageKey="action-replay"
        items={[
          'Use Previous and Next to review the hand one decision at a time.',
          'Grades attach to your decisions so you can separate good process from short-term results.',
          'Visible reasoning summarizes the agent output saved for that action.',
        ]}
      />

      {entries.length === 0 ? (
        <p className="action-replay__empty">Actions will appear once the hand starts moving.</p>
      ) : (
        <>
          <div className="action-replay__controls" aria-label="Replay controls">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setSelectedCursor(Math.max(selectedIndex - 1, 0))}
              disabled={!hasPrevious}
            >
              Previous
            </button>
            <span>
              {selectedIndex + 1} / {entries.length}
            </span>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                const nextIndex = selectedIndex + 1;
                setSelectedCursor(nextIndex >= entries.length - 1 ? Number.MAX_SAFE_INTEGER : nextIndex);
              }}
              disabled={!hasNext}
            >
              Next
            </button>
          </div>

          {selectedEntry && (
            <article className="action-replay__detail">
              <div className="action-replay__detail-top">
                <strong>{selectedEntry.player}</strong>
                <span>{selectedEntry.street}</span>
              </div>
              <p>{actionLabel(selectedEntry)}</p>
              {selectedEntry.decisionGrade && (
                <div className={`grade-pill grade-pill--${selectedEntry.decisionGrade.rating}`}>
                  <strong>{selectedEntry.decisionGrade.rating}</strong>
                  <span>{selectedEntry.decisionGrade.score}</span>
                </div>
              )}
              <small>{formatTime(selectedEntry.timestamp)}</small>

              {selectedEntry.rationale && (
                <div className="action-replay__note">
                  <strong>Reasoning</strong>
                  <p>{selectedEntry.rationale}</p>
                </div>
              )}

              {selectedEntry.decisionGrade && (
                <div className="action-replay__note">
                  <strong>Trainer Agent</strong>
                  <p>{selectedEntry.decisionGrade.summary}</p>
                  <p>{selectedEntry.decisionGrade.coachingPoint}</p>
                </div>
              )}

              {selectedEntry.thinkingProcess && selectedEntry.thinkingProcess.length > 0 && (
                <ol className="thinking-steps">
                  {selectedEntry.thinkingProcess.map((step, index) => (
                    <li key={`${selectedEntry.timestamp}-${index}`}>{step}</li>
                  ))}
                </ol>
              )}
            </article>
          )}

          <ol className="action-replay__timeline">
            {entries.map((entry, index) => (
              <li key={`${entry.timestamp}-${entry.seat}-${index}`}>
                <button
                  type="button"
                  className={index === selectedIndex ? 'action-replay__step action-replay__step--active' : 'action-replay__step'}
                  onClick={() => setSelectedCursor(index >= entries.length - 1 ? Number.MAX_SAFE_INTEGER : index)}
                  aria-current={index === selectedIndex ? 'step' : undefined}
                >
                  <span>{entry.street}</span>
                  <strong>{entry.player}</strong>
                  <em>{actionLabel(entry)}</em>
                  {entry.decisionGrade && (
                    <b className={`grade-dot grade-dot--${entry.decisionGrade.rating}`}>
                      {entry.decisionGrade.rating}
                    </b>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
