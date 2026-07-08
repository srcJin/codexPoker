import type { SkillLevel } from '../types/game';

export interface SkillLevelOption {
  id: SkillLevel;
  label: string;
  description: string;
}

export const DEFAULT_SKILL_LEVEL: SkillLevel = 'beginner';

export const SKILL_LEVEL_OPTIONS: SkillLevelOption[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    description: 'Explain terms and keep drills low-risk.',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    description: 'Keep advice concise with standard strategy language.',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Reduce guidance and surface range-based concepts.',
  },
];

export function normalizeSkillLevel(value: unknown): SkillLevel {
  return SKILL_LEVEL_OPTIONS.some((option) => option.id === value)
    ? value as SkillLevel
    : DEFAULT_SKILL_LEVEL;
}

export function skillLevelInstruction(skillLevel: SkillLevel): string {
  switch (skillLevel) {
    case 'beginner':
      return 'Use plain language, define poker terms briefly, and recommend lower-risk disciplined lines.';
    case 'advanced':
      return 'Be compact and technical; use range, equity, blockers, fold equity, and bet-sizing concepts without basic definitions.';
    case 'intermediate':
    default:
      return 'Use concise poker strategy language with only brief explanations for important concepts.';
  }
}
