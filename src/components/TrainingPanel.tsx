import type { DecisionGradeRating, GameFormatConfig, TrainingProfile } from '../types/game';
import type { SkillLevel, TrainingDrillId } from '../types/game';
import { getTrainingDrill, TRAINING_DRILLS } from '../agents/drills';
import { recommendTrainingDrillForSkillLevel } from '../agents/trainingProfile';
import { NewUserGuidance } from './NewUserGuidance';
import { NextActionCard } from './NextActionCard';

interface TrainingPanelProps {
  profile: TrainingProfile;
  skillLevel: SkillLevel;
  gameFormatConfig: GameFormatConfig;
  latestNextAction?: TrainingProfile['nextAction'];
  onSelectDrill: (drillId: TrainingDrillId) => void;
}

const RATING_LABELS: Record<DecisionGradeRating, string> = {
  strong: 'Strong',
  reasonable: 'Reasonable',
  risky: 'Risky',
  leak: 'Leak',
};

const TRAINER_GUIDANCE: Record<SkillLevel, string[]> = {
  beginner: [
    'Start with the recommended drill; it favors safer choices and fewer expensive pots.',
    'VPIP means hands where you voluntarily put chips in before the flop.',
    'Decision Quality counts strong plus reasonable choices, even if the hand result was unlucky.',
  ],
  intermediate: [
    'Use the recommendation when your active drill no longer matches your biggest leak.',
    'Track whether mistakes come from loose continues, overfolds, or passive missed value.',
  ],
  advanced: [
    'Use recommendations as leak targets; prioritize range construction and pressure nodes.',
  ],
};

function pct(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function ratingPct(profile: TrainingProfile, value: number): number {
  return Math.max(4, pct(value, Math.max(profile.totalDecisions, 1)));
}

function opponentRead(profile: TrainingProfile): string {
  const total = Math.max(profile.totalDecisions, 1);
  const looseRate = profile.looseCallWarnings / total;
  const overfoldRate = profile.overfoldWarnings / total;
  const passiveRate = profile.passiveWarnings / total;
  const foldPressure = profile.facedBets > 0 ? profile.foldsFacingBet / profile.facedBets : 0;

  if (looseRate >= 0.2) {
    return 'Opponents are shifting toward larger value bets because you have continued too wide.';
  }

  if (foldPressure >= 0.45 || overfoldRate >= 0.22) {
    return 'Ace is widening pressure lines because your profile shows folds under pressure.';
  }

  if (passiveRate >= 0.25) {
    return 'Ace will contest more pots because your profile shows missed aggression spots.';
  }

  return 'Opponents are still using baseline styles while they wait for a clearer leak.';
}

export function TrainingPanel({
  profile,
  skillLevel,
  gameFormatConfig,
  latestNextAction,
  onSelectDrill,
}: TrainingPanelProps) {
  const quality = pct(
    profile.strongDecisions + profile.reasonableDecisions,
    profile.totalDecisions,
  );
  const aggression = pct(profile.aggressionTaken, profile.aggressionOpportunities);
  const foldToPressure = pct(profile.foldsFacingBet, profile.facedBets);
  const vpip = pct(profile.vpipActions, profile.totalDecisions);
  const activeDrill = getTrainingDrill(profile.activeDrillId);
  const activeProgress = profile.drillProgress[profile.activeDrillId];
  const drillAccuracy = pct(activeProgress.hits, activeProgress.decisions);
  const recommendedDrillId = recommendTrainingDrillForSkillLevel(profile, skillLevel);
  const recommendedDrill = getTrainingDrill(recommendedDrillId);
  const recommendationIsActive = recommendedDrillId === profile.activeDrillId;

  return (
    <section className="training-panel">
      <div className="section-heading">
        <h3>Trainer Agent</h3>
        <span>{profile.totalDecisions} graded decisions</span>
      </div>

      <NewUserGuidance
        title="How to use Trainer Agent"
        storageKey="trainer-agent"
        items={TRAINER_GUIDANCE[skillLevel]}
      />

      <div className={`training-mode training-mode--${skillLevel}`}>
        <div>
          <span>{skillLevel} recommendation</span>
          <strong>{recommendedDrill.label}</strong>
          <p>{recommendedDrill.goal}</p>
        </div>
        {recommendationIsActive ? (
          <em>Active now</em>
        ) : (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => onSelectDrill(recommendedDrillId)}
          >
            Use Drill
          </button>
        )}
      </div>

      <div className="training-format">
        <span>{gameFormatConfig.label}</span>
        <strong>{gameFormatConfig.trainerGoal}</strong>
        <p>{gameFormatConfig.trainerGoalDetail}</p>
      </div>

      <NextActionCard
        nextAction={latestNextAction ?? profile.nextAction}
        currentDrillId={profile.activeDrillId}
        onSelectDrill={onSelectDrill}
      />

      <div className="training-goal">
        <strong>{profile.currentGoal}</strong>
        <p>{profile.currentGoalDetail}</p>
      </div>

      <div className="training-drills">
        <div className="training-drills__header">
          <div>
            <strong>Active Drill</strong>
            <p>{activeDrill.focus}</p>
          </div>
          <span>{drillAccuracy}% hit rate</span>
        </div>

        <div className="training-drill-card">
          <strong>{activeDrill.label}</strong>
          <p>{activeDrill.goal}</p>
          <small>
            {activeProgress.hits} hits / {activeProgress.misses} misses · streak {activeProgress.streak}
          </small>
        </div>

        <div className="training-drill-list" aria-label="Training drill selector">
          {TRAINING_DRILLS.map((drill) => (
            <button
              key={drill.id}
              type="button"
              className={drill.id === profile.activeDrillId ? 'training-drill-choice training-drill-choice--active' : 'training-drill-choice'}
              onClick={() => onSelectDrill(drill.id)}
            >
              <strong>{drill.label}</strong>
              <span>{drill.focus}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="training-adaptation">
        <strong>Opponent Read</strong>
        <p>{opponentRead(profile)}</p>
      </div>

      <div className="training-scoreboard">
        <span>Decision Quality <strong>{quality}%</strong></span>
        <span>VPIP <strong>{vpip}%</strong></span>
        <span>Aggression <strong>{aggression}%</strong></span>
        <span>Fold to Pressure <strong>{foldToPressure}%</strong></span>
      </div>

      <div className="training-ratings" aria-label="Decision grade distribution">
        <div>
          <span>Strong</span>
          <div><span className="training-ratings__strong" style={{ width: `${ratingPct(profile, profile.strongDecisions)}%` }} /></div>
        </div>
        <div>
          <span>Reasonable</span>
          <div><span className="training-ratings__reasonable" style={{ width: `${ratingPct(profile, profile.reasonableDecisions)}%` }} /></div>
        </div>
        <div>
          <span>Risky</span>
          <div><span className="training-ratings__risky" style={{ width: `${ratingPct(profile, profile.riskyDecisions)}%` }} /></div>
        </div>
        <div>
          <span>Leaks</span>
          <div><span className="training-ratings__leak" style={{ width: `${ratingPct(profile, profile.leaks)}%` }} /></div>
        </div>
      </div>

      <div className="training-leaks">
        <span>Passive spots <strong>{profile.passiveWarnings}</strong></span>
        <span>Loose continues <strong>{profile.looseCallWarnings}</strong></span>
        <span>Overfolds <strong>{profile.overfoldWarnings}</strong></span>
      </div>

      <div className="training-recent">
        <h4>Recent Grades</h4>
        {profile.recentGrades.length === 0 ? (
          <p>No graded decisions yet.</p>
        ) : (
          <ol>
            {profile.recentGrades.slice().reverse().map((grade, index) => (
              <li key={`${grade.street}-${grade.action}-${index}`}>
                <span className={`grade-dot grade-dot--${grade.rating}`}>
                  {RATING_LABELS[grade.rating]}
                </span>
                <strong>{grade.score}</strong>
                <p>{grade.street}: {grade.summary}</p>
                {grade.drillNote && <small>{grade.drillNote}</small>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
