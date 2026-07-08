import type { HandReport } from '../types/game';
import type { TrainingDrillId } from '../types/game';
import { NextActionCard } from './NextActionCard';

interface HandSummaryProps {
  report: HandReport;
  currentDrillId: TrainingDrillId;
  onNextHand: () => void;
  onSelectDrill: (drillId: TrainingDrillId) => void;
}

export function HandSummary({
  report,
  currentDrillId,
  onNextHand,
  onSelectDrill,
}: HandSummaryProps) {
  return (
    <div className="hand-summary">
      <h3>Hand Summary</h3>
      <p>{report.summary}</p>
      <NextActionCard
        nextAction={report.nextAction}
        currentDrillId={currentDrillId}
        onSelectDrill={onSelectDrill}
      />
      <div className="hand-summary__columns">
        <div>
          <h4>What you did well</h4>
          <ul>
            {report.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>What to improve</h4>
          <ul>
            {report.improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="hand-summary__review">
        <h4>Full Action Timeline</h4>
        <ol>
          {report.timeline.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ol>
      </div>

      <div className="hand-summary__review">
        <h4>Agent Decision Review</h4>
        <ul>
          {report.decisionReviews.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="hand-summary__review">
        <h4>Report Agent Reasoning</h4>
        <ol>
          {report.thinkingProcess.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ol>
      </div>

      <button type="button" className="btn btn--primary" onClick={onNextHand}>
        Next Hand
      </button>
    </div>
  );
}
