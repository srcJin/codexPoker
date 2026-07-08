import type { SkillLevel } from '../types/game';
import { SKILL_LEVEL_OPTIONS } from '../agents/skillLevel';

interface SkillLevelSelectorProps {
  value: SkillLevel;
  onChange: (skillLevel: SkillLevel) => void;
}

export function SkillLevelSelector({ value, onChange }: SkillLevelSelectorProps) {
  const activeOption = SKILL_LEVEL_OPTIONS.find((option) => option.id === value) ?? SKILL_LEVEL_OPTIONS[0];

  return (
    <section className="skill-level-selector" aria-label="Skill level mode">
      <div className="skill-level-selector__top">
        <span>Skill Mode</span>
        <strong>{activeOption.description}</strong>
      </div>
      <div className="skill-level-selector__choices" role="group" aria-label="Choose skill level">
        {SKILL_LEVEL_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.id === value ? 'skill-level-selector__choice skill-level-selector__choice--active' : 'skill-level-selector__choice'}
            onClick={() => onChange(option.id)}
            aria-pressed={option.id === value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
