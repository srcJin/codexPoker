import { getTrainingDrill } from '../agents/drills';
import type { TrainingDrillId, TrainingNextAction } from '../types/game';

interface NextActionCardProps {
  nextAction: TrainingNextAction;
  currentDrillId?: TrainingDrillId;
  onSelectDrill?: (drillId: TrainingDrillId) => void;
}

export function NextActionCard({
  nextAction,
  currentDrillId,
  onSelectDrill,
}: NextActionCardProps) {
  const drill = nextAction.drillId ? getTrainingDrill(nextAction.drillId) : null;
  const selectableDrillId = drill && nextAction.drillId !== currentDrillId
    ? nextAction.drillId
    : undefined;

  return (
    <section className={`next-action-card next-action-card--${nextAction.kind}`}>
      <div className="next-action-card__top">
        <span>Recommended Next Action</span>
        {drill ? <em>{drill.label}</em> : null}
      </div>
      <strong>{nextAction.title}</strong>
      <p>{nextAction.detail}</p>
      <div className="next-action-card__footer">
        {nextAction.street || nextAction.action ? (
          <small>{[nextAction.street, nextAction.action].filter(Boolean).join(' · ')}</small>
        ) : (
          <small>{nextAction.kind.replaceAll('-', ' ')}</small>
        )}
        {selectableDrillId && onSelectDrill ? (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => onSelectDrill(selectableDrillId)}
          >
            {nextAction.cta}
          </button>
        ) : null}
      </div>
    </section>
  );
}
