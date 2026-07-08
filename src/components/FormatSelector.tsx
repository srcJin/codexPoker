import { GAME_FORMATS } from '../game/constants';
import type { GameFormat } from '../types/game';

interface FormatSelectorProps {
  value: GameFormat;
  onChange: (format: GameFormat) => void;
  disabled?: boolean;
}

export function FormatSelector({ value, onChange, disabled }: FormatSelectorProps) {
  return (
    <section className="format-selector" aria-label="Texas Hold'em format">
      <div className="section-heading">
        <h3>Format</h3>
        <span>Texas Hold&apos;em</span>
      </div>
      <div className="format-selector__grid">
        {GAME_FORMATS.map((format) => (
          <button
            key={format.id}
            type="button"
            className={format.id === value ? 'format-card format-card--active' : 'format-card'}
            onClick={() => onChange(format.id)}
            disabled={disabled}
            aria-pressed={format.id === value}
          >
            <strong>{format.label}</strong>
            <span>{format.description}</span>
            <em>
              {format.activeSeats.length} players · ${format.smallBlind}/${format.bigBlind}
              {format.blindLevelHands > 0 ? ` · blinds every ${format.blindLevelHands} hands` : ''}
            </em>
          </button>
        ))}
      </div>
    </section>
  );
}
