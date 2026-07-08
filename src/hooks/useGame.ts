import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Action } from '../types/poker';

import { getCoachAdvice, getCoachFeedback } from '../agents/coach';
import { CoachReview } from '../agents/coachReview';
import { dealerTimers, type TimerHandle } from '../agents/dealer';
import {
  DEFAULT_SKILL_LEVEL,
  normalizeSkillLevel,
  skillLevelInstruction,
} from '../agents/skillLevel';
import {
  createTrainingProfile,
  gradeHumanDecision,
  normalizeTrainingProfile,
  setActiveTrainingDrill,
  updateTrainingProfile,
} from '../agents/trainingProfile';
import {
  requestAIDecision,
  requestAssistantChat,
  requestCoachFollowUp,
  requestCoachStreetReview,
  requestHandReport,
} from '../agents/llmClient';
import { GameSession } from '../game/GameSession';
import {
  DEFAULT_GAME_FORMAT,
  getGameFormatConfig,
  HUMAN_SEAT,
  normalizeGameFormat,
} from '../game/constants';
import type {
  AgentDecisionTrace,
  AgentMemorySnapshot,
  ChatMessage,
  CoachAdvice,
  GameFormat,
  GameFormatConfig,
  HandReport,
  PlayerRecord,
  SkillLevel,
  Street,
  TableView,
  TrainingDrillId,
  TrainingProfile,
} from '../types/game';

export type GamePhase = 'lobby' | 'playing' | 'hand_complete';

const RECORDS_KEY = 'pokercursor.records.v1';
const TRAINING_PROFILE_KEY = 'pokercursor.trainingProfile.v1';
const SKILL_LEVEL_KEY = 'pokercursor.skillLevel.v1';
const GAME_FORMAT_KEY = 'pokercursor.gameFormat.v1';

function loadSavedRecords(): PlayerRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(RECORDS_KEY);
    return raw ? JSON.parse(raw) as PlayerRecord[] : [];
  } catch {
    return [];
  }
}

function saveRecords(records: PlayerRecord[]): void {
  try {
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // Local storage is optional for the demo; in-memory records still work.
  }
}

function loadTrainingProfile(): TrainingProfile {
  if (typeof window === 'undefined') return createTrainingProfile();

  try {
    const raw = window.localStorage.getItem(TRAINING_PROFILE_KEY);
    return raw ? normalizeTrainingProfile(JSON.parse(raw)) : createTrainingProfile();
  } catch {
    return createTrainingProfile();
  }
}

function saveTrainingProfile(profile: TrainingProfile): void {
  try {
    window.localStorage.setItem(TRAINING_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Local storage is optional for the demo; in-memory training still works.
  }
}

function loadSkillLevel(): SkillLevel {
  if (typeof window === 'undefined') return DEFAULT_SKILL_LEVEL;

  try {
    return normalizeSkillLevel(window.localStorage.getItem(SKILL_LEVEL_KEY));
  } catch {
    return DEFAULT_SKILL_LEVEL;
  }
}

function saveSkillLevel(skillLevel: SkillLevel): void {
  try {
    window.localStorage.setItem(SKILL_LEVEL_KEY, skillLevel);
  } catch {
    // Local storage is optional for the demo; in-memory mode still works.
  }
}

function loadGameFormat(): GameFormat {
  if (typeof window === 'undefined') return DEFAULT_GAME_FORMAT;

  try {
    return normalizeGameFormat(window.localStorage.getItem(GAME_FORMAT_KEY));
  } catch {
    return DEFAULT_GAME_FORMAT;
  }
}

function saveGameFormat(gameFormat: GameFormat): void {
  try {
    window.localStorage.setItem(GAME_FORMAT_KEY, gameFormat);
  } catch {
    // Local storage is optional for the demo; in-memory format still works.
  }
}

export function useGame() {
  const [session, setSession] = useState<GameSession | null>(null);
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [tick, setTick] = useState(0);
  const [coachAdvice, setCoachAdvice] = useState<CoachAdvice | null>(null);
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [handReport, setHandReport] = useState<HandReport | null>(null);
  const [savedRecords, setSavedRecords] = useState<PlayerRecord[]>(loadSavedRecords);
  const [trainingProfile, setTrainingProfile] = useState<TrainingProfile>(loadTrainingProfile);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(loadSkillLevel);
  const [gameFormat, setGameFormat] = useState<GameFormat>(loadGameFormat);
  const [isThinking, setIsThinking] = useState(false);
  const [assistantHistory, setAssistantHistory] = useState<ChatMessage[]>([]);
  const [coachHistory, setCoachHistory] = useState<ChatMessage[]>([]);
  const [handLog, setHandLog] = useState<string[]>([]);
  const [clockWarning, setClockWarning] = useState<string | null>(null);

  const coachReviewRef = useRef(new CoachReview());
  const playerTimerRef = useRef<TimerHandle | null>(null);
  const reportSeqRef = useRef(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const clearPlayerTimer = useCallback(() => {
    playerTimerRef.current?.clear();
    playerTimerRef.current = null;
  }, []);

  const view: TableView | null = useMemo(() => {
    void tick;
    return session?.getView(phase === 'hand_complete') ?? null;
  }, [session, phase, tick]);

  const agentMemories: AgentMemorySnapshot[] = useMemo(() => {
    void tick;
    return session?.getAgentMemories() ?? [];
  }, [session, tick]);

  const decisionTraces: AgentDecisionTrace[] = useMemo(() => {
    void tick;
    return session?.getDecisionTraces() ?? [];
  }, [session, tick]);

  const actionLog = useMemo(() => {
    void tick;
    return session?.getActionLog() ?? [];
  }, [session, tick]);

  const playerRecords: PlayerRecord[] = useMemo(() => {
    void tick;
    return session?.getPlayerRecords() ?? savedRecords;
  }, [session, savedRecords, tick]);

  const completeHand = useCallback(async (nextSession: GameSession) => {
    const localReport = nextSession.finalizeHandReport();
    const records = nextSession.getPlayerRecords();
    setHandReport(localReport);
    if (nextSession.getFormatConfig().persistsCredits) {
      setSavedRecords(records);
      saveRecords(records);
    }
    setHandLog((log) => [
      ...log,
      ...nextSession.getActionLog().map(
        (entry) => `${entry.street}: ${entry.player} ${entry.action}`,
      ),
    ]);
    setPhase('hand_complete');
    clearPlayerTimer();
    setClockWarning(null);

    // Upgrade to the LLM-written report in the background; drop the result
    // if a new hand has started in the meantime.
    const seq = reportSeqRef.current;
    void requestHandReport(
      localReport,
      records,
      nextSession.getDecisionTraces(),
    ).then((report) => {
      if (reportSeqRef.current === seq && report !== localReport) {
        setHandReport(report);
      }
    });
  }, [clearPlayerTimer]);

  const startPlayerClock = useCallback((activeSession: GameSession) => {
    clearPlayerTimer();
    const currentView = activeSession.getView(false);
    if (!currentView.humanToAct) return;

    playerTimerRef.current = dealerTimers.startPlayerTimer(
      () => {
        activeSession.act(HUMAN_SEAT, 'fold', undefined, 'Auto-folded on clock expiry.');
        void (async () => {
          const result = await activeSession.advanceUntilHumanOrComplete(requestAIDecision);
          setSession(activeSession);
          if (result === 'hand_complete') {
            await completeHand(activeSession);
          }
          setClockWarning('[DEALER]: Time expired — auto-fold.');
          refresh();
        })();
      },
      () => {
        setClockWarning('[DEALER]: 20 seconds remaining on your clock.');
      },
    );
  }, [clearPlayerTimer, completeHand, refresh]);

  const startHandFlow = useCallback(async (next: GameSession) => {
    reportSeqRef.current += 1;
    setAssistantHistory([]);
    setCoachAdvice(null);
    setCoachFeedback(null);
    setHandReport(null);
    setClockWarning(null);

    const result = await next.advanceUntilHumanOrComplete(requestAIDecision);
    setSession(next);
    setPhase(result === 'hand_complete' ? 'hand_complete' : 'playing');
    if (result === 'hand_complete') {
      await completeHand(next);
    } else if (result === 'human_turn') {
      startPlayerClock(next);
    }
    refresh();
  }, [completeHand, refresh, startPlayerClock]);

  const startGame = useCallback(async () => {
    setIsThinking(true);
    try {
      coachReviewRef.current.resetChatHistory();
      setCoachHistory([]);
      const next = new GameSession(savedRecords, undefined, trainingProfile, gameFormat);
      next.startHand();
      await startHandFlow(next);
    } finally {
      setIsThinking(false);
    }
  }, [gameFormat, savedRecords, startHandFlow, trainingProfile]);

  const askCoach = useCallback(async () => {
    if (!session || !view?.humanToAct) return;
    setIsThinking(true);
    const localAdvice = getCoachAdvice(view, skillLevel);
    setCoachAdvice(localAdvice);
    setCoachFeedback(null);
    session.recordCoachAdvice(localAdvice.summary);
    setIsThinking(false);
    refresh();
  }, [session, view, skillLevel, refresh]);

  const askAssistant = useCallback(async (userMessage: string) => {
    if (!view) return ASSISTANT_IDLE_FALLBACK;

    const reply = await requestAssistantChat(view, userMessage, assistantHistory);
    setAssistantHistory((history) => [
      ...history,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: reply },
    ]);
    return reply;
  }, [view, assistantHistory]);

  const assistantChat = askAssistant;

  const askCoachReview = useCallback(async () => {
    if (!session || !view || view.handInProgress) {
      return "Hand is still live — I'll break it down once this street closes. Stay focused.";
    }

    setIsThinking(true);
    coachReviewRef.current.resetChatHistory();
    setCoachHistory([]);

    const review = await requestCoachStreetReview(
      coachReviewRef.current,
      view,
      session.getActionLog(),
      (view.street ?? 'river') as Street,
      skillLevel,
    );
    setCoachHistory(coachReviewRef.current.getChatHistory());
    setIsThinking(false);
    return review;
  }, [session, view, skillLevel]);

  const coachChat = useCallback(async (userMessage: string) => {
    if (!session || !view || view.handInProgress) {
      const reply = "Hand is still live — I'll break it down once this street closes. Stay focused.";
      setCoachHistory((history) => [
        ...history,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: reply },
      ]);
      return reply;
    }

    setIsThinking(true);
    const reply = await requestCoachFollowUp(
      coachReviewRef.current,
      view,
      session.getActionLog(),
      userMessage,
      coachHistory,
      skillLevel,
    );
    setCoachHistory(coachReviewRef.current.getChatHistory());
    setIsThinking(false);
    return reply;
  }, [session, view, coachHistory, skillLevel]);

  const humanAction = useCallback(
    async (action: Action, betSize?: number) => {
      if (!session || !view?.humanToAct) return;

      setIsThinking(true);
      try {
        clearPlayerTimer();
        setClockWarning(null);
        const feedback = getCoachFeedback(action, view, skillLevel);
        const decisionGrade = gradeHumanDecision(
          action,
          betSize,
          view,
          trainingProfile.activeDrillId,
        );
        setCoachFeedback(feedback);
        setCoachAdvice(null);
        const nextTrainingProfile = updateTrainingProfile(
          trainingProfile,
          decisionGrade,
          view,
          action,
        );
        session.setTrainingProfile(nextTrainingProfile);
        saveTrainingProfile(nextTrainingProfile);
        setTrainingProfile(nextTrainingProfile);

        session.act(
          HUMAN_SEAT,
          action,
          betSize,
          `${feedback} Trainer grade: ${decisionGrade.rating} (${decisionGrade.score}). ${decisionGrade.coachingPoint}`,
          [
            `${skillLevel} mode: ${skillLevelInstruction(skillLevel)}`,
            feedback,
            decisionGrade.summary,
            decisionGrade.coachingPoint,
          ],
          decisionGrade,
        );
        const result = await session.advanceUntilHumanOrComplete(requestAIDecision);
        if (result === 'hand_complete') {
          await completeHand(session);
        } else if (result === 'human_turn') {
          startPlayerClock(session);
        }
      } finally {
        setIsThinking(false);
        refresh();
      }
    },
    [clearPlayerTimer, completeHand, session, skillLevel, startPlayerClock, trainingProfile, view, refresh],
  );

  const nextHand = useCallback(async () => {
    if (!session) return;
    setIsThinking(true);
    try {
      coachReviewRef.current.resetChatHistory();
      setCoachHistory([]);
      session.setTrainingProfile(trainingProfile);
      session.startHand();
      await startHandFlow(session);
    } finally {
      setIsThinking(false);
    }
  }, [session, startHandFlow, trainingProfile]);

  const chooseTrainingDrill = useCallback((drillId: TrainingDrillId) => {
    setTrainingProfile((profile) => {
      const nextProfile = setActiveTrainingDrill(profile, drillId);
      saveTrainingProfile(nextProfile);
      session?.setTrainingProfile(nextProfile);
      return nextProfile;
    });
  }, [session]);

  const chooseSkillLevel = useCallback((nextSkillLevel: SkillLevel) => {
    const normalized = normalizeSkillLevel(nextSkillLevel);
    saveSkillLevel(normalized);
    setSkillLevel(normalized);
  }, []);

  const chooseGameFormat = useCallback((nextGameFormat: GameFormat) => {
    const normalized = normalizeGameFormat(nextGameFormat);
    saveGameFormat(normalized);
    setGameFormat(normalized);
  }, []);

  const gameFormatConfig: GameFormatConfig = session?.getFormatConfig() ?? getGameFormatConfig(gameFormat);

  useEffect(() => () => clearPlayerTimer(), [clearPlayerTimer]);

  return {
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
    handLog,
    clockWarning,
    startGame,
    askCoach,
    askAssistant,
    askCoachReview,
    assistantChat,
    coachChat,
    humanAction,
    nextHand,
    chooseTrainingDrill,
    chooseSkillLevel,
    chooseGameFormat,
  };
}

const ASSISTANT_IDLE_FALLBACK =
  'I can only help during a hand. Ask the Pro Coach for post-hand review.';
