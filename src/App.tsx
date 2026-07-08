import { useEffect, useState } from 'react';
import { ActionBar } from './components/ActionBar';
import { ActionReplay } from './components/ActionReplay';
import { AgentInsights } from './components/AgentInsights';
import { AssistantPanel } from './components/AssistantPanel';
import { CoachPanel } from './components/CoachPanel';
import { CoachReviewPanel } from './components/CoachReviewPanel';
import { FormatSelector } from './components/FormatSelector';
import { GlossaryPanel } from './components/GlossaryPanel';
import { HandSummary } from './components/HandSummary';
import { NewUserGuidance } from './components/NewUserGuidance';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { PokerTable } from './components/PokerTable';
import { SkillLevelSelector } from './components/SkillLevelSelector';
import { TrainingPanel } from './components/TrainingPanel';
import { TutorialOverlay } from './components/TutorialOverlay';
import { useGame } from './hooks/useGame';
import { useOnboarding } from './hooks/useOnboarding';
import type { SkillLevel } from './types/game';
import './App.css';

const FIRST_HAND_GUIDE: Record<SkillLevel, string[]> = {
  beginner: [
    'Start with Baseline Discipline so the trainer explains safer fold, call, and bet choices.',
    'Use Quick Hint on your turn when terms like equity, pot odds, or fold equity are unclear.',
    'Open Training between hands to see your current leak and the recommended low-risk drill.',
  ],
  intermediate: [
    'Pick the drill that matches your current leak before starting a hand.',
    'Use Quick Hint for close spots, then compare the grade in Action Replay.',
  ],
  advanced: [
    'Use Training to target range, pressure, and realization leaks; keep in-hand help minimal.',
  ],
};

function App() {
  const [activeView, setActiveView] = useState<'table' | 'training' | 'data'>('table');
  const {
    isOnboardingOpen,
    completeOnboarding,
    restartOnboarding,
  } = useOnboarding();
  const {
    phase,
    view,
    agentMemories,
    decisionTraces,
    actionLog,
    playerRecords,
    trainingProfile,
    skillLevel,
    gameFormat,
    gameFormatConfig,
    isThinking,
    coachAdvice,
    coachFeedback,
    handReport,
    assistantHistory,
    coachHistory,
    clockWarning,
    startGame,
    askCoach,
    askAssistant,
    askCoachReview,
    coachChat,
    humanAction,
    nextHand,
    chooseTrainingDrill,
    chooseSkillLevel,
    chooseGameFormat,
  } = useGame();

  useEffect(() => {
    if (activeView !== 'table' || phase === 'lobby') return;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [activeView, phase]);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-top">
          <div>
            <h1>Poker Coach</h1>
            <p>Learn Texas Hold&apos;em with scoped LLM agents, memory, and persistent credits</p>
          </div>
          <button type="button" className="app__help" onClick={restartOnboarding}>
            Restart Tutorial
          </button>
        </div>
        <SkillLevelSelector value={skillLevel} onChange={chooseSkillLevel} />
        <nav className="app__tabs" aria-label="Demo views">
          <button
            type="button"
            className={activeView === 'table' ? 'app__tab app__tab--active' : 'app__tab'}
            onClick={() => setActiveView('table')}
          >
            Table
          </button>
          <button
            type="button"
            className={activeView === 'training' ? 'app__tab app__tab--active' : 'app__tab'}
            onClick={() => setActiveView('training')}
          >
            Training
          </button>
          <button
            type="button"
            className={activeView === 'data' ? 'app__tab app__tab--active' : 'app__tab'}
            onClick={() => setActiveView('data')}
          >
            Data
          </button>
        </nav>
      </header>

      <main className="app__main">
        {activeView === 'data' && (
          <div className="app__wide">
            <PerformanceDashboard
              records={playerRecords}
              caption={gameFormatConfig.persistsCredits ? 'Credits persist across hands' : 'Format records are session-only'}
            />
            <AgentInsights memories={agentMemories} traces={decisionTraces} />
          </div>
        )}

        {activeView === 'training' && (
          <div className="app__wide">
            <TrainingPanel
              profile={trainingProfile}
              skillLevel={skillLevel}
              gameFormatConfig={gameFormatConfig}
              latestNextAction={handReport?.nextAction}
              onSelectDrill={chooseTrainingDrill}
            />
            <GlossaryPanel defaultOpen storageKey="training" />
            <PerformanceDashboard
              records={playerRecords}
              caption={gameFormatConfig.persistsCredits ? 'Credits persist across hands' : 'Format records are session-only'}
            />
          </div>
        )}

        {activeView === 'table' && phase === 'lobby' && (
          <div className="lobby">
            <h2>Ready to play?</h2>
            <p>
              You&apos;ll face two AI opponents with different styles. Each agent
              receives only its scoped table view and keeps managed memory.
            </p>
            <FormatSelector
              value={gameFormat}
              onChange={chooseGameFormat}
              disabled={isThinking}
            />
            <NewUserGuidance
              title="First hand guide"
              storageKey="lobby"
              defaultOpen
              items={FIRST_HAND_GUIDE[skillLevel]}
            />
            <ul className="lobby__agents">
              <li><strong>Dealer Agent</strong> — rotates button, deals cards</li>
              <li><strong>Ace (Aggro)</strong> — loose-aggressive strategy</li>
              <li><strong>Rock (Tight)</strong> — tight-passive strategy</li>
              <li><strong>Assistant</strong> — in-hand pot odds and equity help</li>
              <li><strong>Pro Coach</strong> — post-hand street review</li>
              <li><strong>Report Agent</strong> — hand summary after each pot</li>
            </ul>
            <button type="button" className="btn btn--primary" onClick={startGame} disabled={isThinking}>
              {isThinking ? 'Starting...' : 'Start Game'}
            </button>
          </div>
        )}

        {activeView === 'table' && view && phase !== 'lobby' && (
          <div className="table-col">
            {isThinking && <div className="thinking-banner">Agents are thinking...</div>}
            <PokerTable view={view} />

            {phase === 'playing' && (
              <ActionBar
                view={view}
                onAction={humanAction}
                onAskCoach={askCoach}
                onAskAssistant={askAssistant}
                disabled={isThinking}
              />
            )}

            {phase === 'hand_complete' && handReport && (
              <HandSummary
                report={handReport}
                currentDrillId={trainingProfile.activeDrillId}
                onSelectDrill={chooseTrainingDrill}
                onNextHand={nextHand}
              />
            )}

            {view.winners && phase === 'hand_complete' && (
              <div className="winners-banner">
                Winner: {view.winners.map((w) => `${w.label} (${w.handName})`).join(', ')}
              </div>
            )}
          </div>
        )}

        {activeView === 'table' && phase !== 'lobby' && (
          <div className="side-rail">
            <AssistantPanel
              history={assistantHistory}
              onAsk={askAssistant}
              disabled={isThinking || !view?.humanToAct}
              clockWarning={clockWarning}
            />
            <CoachPanel advice={coachAdvice} feedback={coachFeedback} skillLevel={skillLevel} />
            <TrainingPanel
              profile={trainingProfile}
              skillLevel={skillLevel}
              gameFormatConfig={gameFormatConfig}
              latestNextAction={handReport?.nextAction}
              onSelectDrill={chooseTrainingDrill}
            />
            <GlossaryPanel storageKey="side-rail" />
            <ActionReplay entries={actionLog} currentStreet={view?.street ?? null} />
            <CoachReviewPanel
              view={view}
              history={coachHistory}
              onReview={askCoachReview}
              onChat={coachChat}
              skillLevel={skillLevel}
              disabled={isThinking}
            />
            <AgentInsights memories={agentMemories} traces={decisionTraces} />
          </div>
        )}

        {activeView === 'table' && phase !== 'lobby' && (
          <div className="bottom-rail">
            <PerformanceDashboard
              records={playerRecords}
              caption={gameFormatConfig.persistsCredits ? 'Credits persist across hands' : 'Format records are session-only'}
            />
          </div>
        )}
      </main>

      {isOnboardingOpen && <TutorialOverlay onClose={completeOnboarding} />}
    </div>
  );
}

export default App;
