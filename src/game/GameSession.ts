import type { Action } from '../types/poker';
import PokerTable from './pokerTable';

import { pickAIAction, type AIDecisionResult } from '../agents/aiPlayer';
import { dealerTimers, endHand, formatDealerMessage, startNewHand } from '../agents/dealer';
import { getTrainingScenarioForDrill } from '../agents/drills';
import { AgentMemoryManager } from '../agents/memory';
import { buildHandReport } from '../agents/report';
import { createTrainingProfile, normalizeTrainingProfile } from '../agents/trainingProfile';
import type {
  ActionLogEntry,
  AgentDecisionTrace,
  AgentId,
  DecisionGrade,
  AgentMemorySnapshot,
  GameFormat,
  GameFormatConfig,
  HandReport,
  PlayerRecord,
  SeatView,
  Street,
  TableView,
  TrainingScenario,
  TrainingProfile,
  WinnerView,
} from '../types/game';
import { buildScenarioDeckOrder, cardsToShort } from './cards';
import {
  AI_AGGRESSIVE_SEAT,
  AI_CONSERVATIVE_SEAT,
  DEFAULT_GAME_FORMAT,
  getGameFormatConfig,
  HAND_RANKING_NAMES,
  HUMAN_SEAT,
  SEAT_CONFIG,
  TABLE_SEATS,
} from './constants';

export type AdvanceResult =
  | 'human_turn'
  | 'hand_complete'
  | 'waiting';

export type AIDecisionProvider = (
  seat: number,
  view: TableView,
  memory: AgentMemorySnapshot,
  fallback: AIDecisionResult,
) => Promise<AIDecisionResult>;

import type { PokerTableInstance } from './pokerTable';

type InternalDeckCard = { rank: number; suit: number };
type InternalDeck = InternalDeckCard[] & { shuffle: () => void };
type PokerFacadeWithInternalTable = {
  _table?: {
    _deck?: InternalDeck;
  };
};

const INTERNAL_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const INTERNAL_SUITS = ['c', 'd', 'h', 's'];

function internalCardToShort(card: InternalDeckCard): string {
  return `${INTERNAL_RANKS[card.rank]}${INTERNAL_SUITS[card.suit]}`;
}

export class GameSession {
  private table: PokerTableInstance;
  private actionLog: ActionLogEntry[] = [];
  private decisionTraces: AgentDecisionTrace[] = [];
  private lastHandReport: HandReport | null = null;
  private completedHandView: TableView | null = null;
  private memory = new AgentMemoryManager();
  private records = new Map<number, PlayerRecord>();
  private trainingProfile: TrainingProfile;
  private readonly format: GameFormatConfig;
  private handsStarted = 0;
  private tableBlinds: { smallBlind: number; bigBlind: number };
  // poker-ts forbids reading pots() once the hand ends, so keep the last
  // in-progress snapshot for uncontested-winner resolution.
  private lastPots: { size: number; eligiblePlayers: number[] }[] = [];
  private readonly fastMode: boolean;

  constructor(
    savedRecords: PlayerRecord[] = [],
    fastMode = import.meta.env.MODE === 'test',
    trainingProfile: TrainingProfile = createTrainingProfile(),
    gameFormat: GameFormat = DEFAULT_GAME_FORMAT,
  ) {
    this.fastMode = fastMode;
    this.format = getGameFormatConfig(gameFormat);
    this.trainingProfile = normalizeTrainingProfile(trainingProfile);
    this.tableBlinds = this.currentBlinds();
    this.table = this.createTable(this.tableBlinds);
    for (const seat of this.format.activeSeats) {
      const saved = this.format.persistsCredits
        ? savedRecords.find((record) => record.seat === seat)
        : undefined;
      const credits = saved && saved.credits > 0 ? saved.credits : this.format.startingStack;
      this.table.sitDown(seat, credits);
      this.records.set(seat, this.createPlayerRecord(seat, credits, saved));
    }
  }

  getActionLog(): ActionLogEntry[] {
    return [...this.actionLog];
  }

  getLastHandReport(): HandReport | null {
    return this.lastHandReport;
  }

  getAgentMemories(): AgentMemorySnapshot[] {
    const activeAgents = this.activeAgentIds();
    return this.memory.getAllSnapshots().filter((snapshot) => activeAgents.has(snapshot.agentId));
  }

  getDecisionTraces(): AgentDecisionTrace[] {
    return [...this.decisionTraces];
  }

  getPlayerRecords(): PlayerRecord[] {
    return Array.from(this.records.values()).map((record) => ({
      ...record,
      recentResults: [...record.recentResults],
    }));
  }

  getFormatConfig(): GameFormatConfig {
    return this.format;
  }

  setTrainingProfile(profile: TrainingProfile): void {
    this.trainingProfile = normalizeTrainingProfile(profile);
  }

  startHand(): void {
    this.prepareTableForNextHand();
    this.actionLog = [];
    this.decisionTraces = [];
    this.lastHandReport = null;
    this.completedHandView = null;
    this.memory.resetHand();
    const scenario = getTrainingScenarioForDrill(this.trainingProfile.activeDrillId);
    const restoreDeck = scenario ? this.applyScenarioDeck(scenario) : null;
    try {
      startNewHand(this.table);
    } finally {
      restoreDeck?.();
    }
    this.handsStarted += 1;
    this.recordAgentTrace(
      'dealer',
      undefined,
      formatDealerMessage(`${this.format.label}: button rotated, hole cards dealt, blinds $${this.tableBlinds.smallBlind}/$${this.tableBlinds.bigBlind} posted.${scenario ? ` Scenario drill: ${scenario.label}.` : ''}`),
      this.getScopedView('dealer'),
    );
  }

  getView(revealAllCards = false): TableView {
    if (!this.table.isHandInProgress() && this.completedHandView) {
      return this.completedHandView;
    }

    const handInProgress = this.table.isHandInProgress();
    const street = handInProgress ? this.table.roundOfBetting() : null;
    const playerToAct = handInProgress && this.table.isBettingRoundInProgress()
      ? this.table.playerToAct()
      : -1;
    const button = handInProgress ? this.table.button() : -1;
    const holeCards = handInProgress || this.hasShowdownCards()
      ? this.table.holeCards()
      : [];

    const seats: SeatView[] = Array.from({ length: TABLE_SEATS }, (_, seat) => {
      const config = SEAT_CONFIG[seat];
      if (!config) {
        return {
          seat,
          label: `Seat ${seat + 1}`,
          role: 'human' as const,
          stack: 0,
          betSize: 0,
          holeCards: null,
          isActive: false,
          isToAct: false,
          isButton: false,
        };
      }

      const seatState = this.table.seats()[seat];
      const rawCards = holeCards[seat] ?? null;
      let displayCards: string[] | null = null;
      if (rawCards) {
        if (revealAllCards || seat === HUMAN_SEAT || !handInProgress) {
          displayCards = cardsToShort(rawCards);
        } else {
          displayCards = ['back', 'back'];
        }
      }

      return {
        seat,
        label: config.label,
        role: config.role,
        stack: seatState?.stack ?? 0,
        betSize: seatState?.betSize ?? 0,
        holeCards: displayCards,
        isActive: seatState !== null,
        isToAct: seat === playerToAct,
        isButton: seat === button,
      };
    });

    const legal = handInProgress && this.table.isBettingRoundInProgress()
      ? this.table.legalActions()
      : { actions: [] as Action[] };

    return {
      handInProgress,
      street,
      communityCards: handInProgress ? cardsToShort(this.table.communityCards()) : [],
      seats,
      pots: handInProgress ? this.table.pots() : [],
      humanToAct: playerToAct === HUMAN_SEAT,
      legalActions: legal.actions,
      chipRange: legal.chipRange,
      winners: handInProgress ? null : this.getWinners(),
    };
  }

  recordCoachAdvice(summary: string): void {
    this.recordAgentTrace(
      'coach',
      HUMAN_SEAT,
      `Built advice from the human cards and public board: ${summary}`,
      this.getScopedView('coach'),
    );
  }

  act(
    seat: number,
    action: Action,
    betSize?: number,
    rationale?: string,
    thinkingProcess?: string[],
    decisionGrade?: DecisionGrade,
  ): void {
    const street = this.table.roundOfBetting() as Street;
    const label = SEAT_CONFIG[seat]?.label ?? `Seat ${seat + 1}`;

    this.actionLog.push({
      seat,
      player: label,
      action,
      betSize,
      street,
      timestamp: Date.now(),
      rationale,
      thinkingProcess: thinkingProcess ?? (rationale ? [rationale] : undefined),
      decisionGrade,
    });

    this.table.actionTaken(action, betSize);
  }

  async advanceUntilHumanOrComplete(
    decideAI?: AIDecisionProvider,
  ): Promise<AdvanceResult> {
    while (this.table.isHandInProgress()) {
      while (this.table.isBettingRoundInProgress()) {
        const seat = this.table.playerToAct();
        if (seat === HUMAN_SEAT) {
          return 'human_turn';
        }

        // Once the human is out of the hand, fast-forward the AI-only
        // playout with local heuristics instead of paced LLM turns.
        const humanInHand = this.table.handPlayers()[HUMAN_SEAT] !== null;

        if (!this.fastMode && humanInHand) {
          await dealerTimers.delay(dealerTimers.randomAgentDelay());
        }

        const view = this.getScopedView(this.agentIdForSeat(seat), seat);
        const memory = this.memory.getSnapshot(this.agentIdForSeat(seat));
        const fallback = pickAIAction(seat, view, memory, this.trainingProfile);
        const { decision, trace } = decideAI && humanInHand
          ? await decideAI(seat, view, memory, fallback)
          : fallback;
      this.decisionTraces.push(trace);
      this.memory.recordDecision(trace);
      this.act(
        seat,
        decision.action,
        decision.betSize,
        decision.rationale,
        decision.thinkingProcess,
      );
      }

      this.table.endBettingRound();

      if (this.table.areBettingRoundsCompleted()) {
        this.finishHand(this.table.areBettingRoundsCompleted());
        return 'hand_complete';
      }

      if (this.table.numActivePlayers() <= 1) {
        this.finishHand(false);
        return 'hand_complete';
      }
    }

    return 'waiting';
  }

  private finishHand(runShowdown: boolean): void {
    const snapshot = this.captureTableView();
    this.lastPots = this.table.isHandInProgress() ? this.table.pots() : this.lastPots;
    if (runShowdown) {
      endHand(this.table);
    }
    this.applyCurrentStacks(snapshot);
    const winners = this.getWinners();
    snapshot.winners = winners;
    snapshot.handInProgress = false;
    snapshot.humanToAct = false;
    snapshot.legalActions = [];
    this.completedHandView = snapshot;
    this.updateRecords(winners);
    this.recordAgentTrace(
      'report',
      undefined,
      'Prepared to review complete history, all revealed cards, and every stored decision trace.',
      snapshot,
    );
  }

  finalizeHandReport(): HandReport {
    const view = this.getView(true);
    this.lastHandReport = buildHandReport(
      this.actionLog,
      view,
      this.decisionTraces,
      this.getPlayerRecords(),
      this.trainingProfile,
    );
    return this.lastHandReport;
  }

  private captureTableView(): TableView {
    const handInProgress = this.table.isHandInProgress();
    const street = handInProgress ? this.table.roundOfBetting() : null;
    const button = handInProgress ? this.table.button() : -1;
    const holeCards = handInProgress ? this.table.holeCards() : [];

    const seats: SeatView[] = Array.from({ length: TABLE_SEATS }, (_, seat) => {
      const config = SEAT_CONFIG[seat];
      if (!config) {
        return {
          seat,
          label: `Seat ${seat + 1}`,
          role: 'human' as const,
          stack: 0,
          betSize: 0,
          holeCards: null,
          isActive: false,
          isToAct: false,
          isButton: false,
        };
      }

      const seatState = this.table.seats()[seat];
      const rawCards = holeCards[seat] ?? null;

      return {
        seat,
        label: config.label,
        role: config.role,
        stack: seatState?.stack ?? 0,
        betSize: seatState?.betSize ?? 0,
        holeCards: rawCards ? cardsToShort(rawCards) : null,
        isActive: seatState !== null,
        isToAct: false,
        isButton: seat === button,
      };
    });

    return {
      handInProgress: true,
      street,
      communityCards: handInProgress ? cardsToShort(this.table.communityCards()) : [],
      seats,
      pots: handInProgress ? this.table.pots() : [...this.lastPots],
      humanToAct: false,
      legalActions: [],
      winners: null,
    };
  }

  private hasShowdownCards(): boolean {
    if (!this.table.isHandInProgress()) return false;
    return this.table.holeCards().some((cards: unknown) => cards !== null);
  }

  private getWinners(): WinnerView[] | null {
    const handInProgress = this.table.isHandInProgress();
    const winners = handInProgress ? [] : this.table.winners();
    if (!winners.length) {
      const pots = handInProgress ? this.table.pots() : this.lastPots;
      if (pots.length === 1 && pots[0].eligiblePlayers.length === 1) {
        const seat = pots[0].eligiblePlayers[0];
        return [
          {
            seat,
            label: SEAT_CONFIG[seat]?.label ?? `Seat ${seat + 1}`,
            handName: 'Won uncontested',
            cards: [],
          },
        ];
      }
      return null;
    }

    const result: WinnerView[] = [];
    for (const potWinners of winners) {
      for (const [seat, hand] of potWinners) {
        result.push({
          seat,
          label: SEAT_CONFIG[seat]?.label ?? `Seat ${seat + 1}`,
          handName: HAND_RANKING_NAMES[hand.ranking] ?? 'Winner',
          cards: cardsToShort(hand.cards),
        });
      }
    }
    return result;
  }

  private getScopedView(agentId: AgentId, revealSeat?: number): TableView {
    const reveal =
      agentId === 'coach'
        ? HUMAN_SEAT
        : agentId === 'ai_aggressive' || agentId === 'ai_conservative'
          ? revealSeat
          : undefined;

    return this.buildViewForSeat(reveal);
  }

  private buildViewForSeat(revealSeat?: number): TableView {
    if (!this.table.isHandInProgress() && this.completedHandView) {
      return {
        ...this.completedHandView,
        seats: this.completedHandView.seats.map((seat) => ({
          ...seat,
          holeCards: seat.seat === revealSeat ? seat.holeCards : seat.holeCards ? ['back', 'back'] : null,
        })),
      };
    }

    const view = this.getView(false);
    return {
      ...view,
      seats: view.seats.map((seat) => {
        if (!seat.holeCards || seat.seat === revealSeat) {
          return seat;
        }
        return { ...seat, holeCards: ['back', 'back'] };
      }),
    };
  }

  private recordAgentTrace(
    agentId: AgentId,
    seat: number | undefined,
    rationale: string,
    view: TableView,
  ): void {
    const memory = this.memory.getSnapshot(agentId);
    const visibleCards = view.seats.flatMap((item) =>
      item.holeCards?.filter((card) => card !== 'back') ?? [],
    );
    const trace: AgentDecisionTrace = {
      id: `${agentId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      agentId,
      label: memory.label,
      seat,
      street: view.street,
      observation: [
        `Board: ${view.communityCards.length ? view.communityCards.join(' ') : 'none'}`,
        `Public pot total: $${view.pots.reduce((sum, pot) => sum + pot.size, 0)}`,
      ],
      shortTerm: memory.shortTerm,
      rationale,
      thinkingProcess: [
        'Collected the role-scoped visible state.',
        'Applied the agent responsibility and memory profile.',
        'Recorded a public reasoning summary for the demo trace.',
      ],
      visibleCards: [...visibleCards, ...view.communityCards],
      timestamp: Date.now(),
    };

    this.decisionTraces.push(trace);
    this.memory.recordDecision(trace);
  }

  private agentIdForSeat(seat: number): AgentId {
    if (seat === AI_AGGRESSIVE_SEAT) return 'ai_aggressive';
    if (seat === AI_CONSERVATIVE_SEAT) return 'ai_conservative';
    return 'dealer';
  }

  private activeAgentIds(): Set<AgentId> {
    return new Set<AgentId>([
      'dealer',
      'coach',
      'report',
      ...this.format.activeSeats
        .filter((seat) => seat !== HUMAN_SEAT)
        .map((seat) => this.agentIdForSeat(seat)),
    ]);
  }

  private currentBlinds(): { smallBlind: number; bigBlind: number } {
    const level = this.format.blindLevelHands > 0
      ? Math.floor(this.handsStarted / this.format.blindLevelHands)
      : 0;
    const multiplier = level + 1;
    return {
      smallBlind: this.format.smallBlind * multiplier,
      bigBlind: this.format.bigBlind * multiplier,
    };
  }

  private createTable(blinds: { smallBlind: number; bigBlind: number }): PokerTableInstance {
    return new PokerTable(blinds, TABLE_SEATS);
  }

  private applyScenarioDeck(scenario: TrainingScenario): (() => void) | null {
    const deck = (this.table as unknown as PokerFacadeWithInternalTable)._table?._deck;
    if (!deck) {
      return null;
    }

    const orderedShorts = buildScenarioDeckOrder(this.format.activeSeats, scenario);
    const cardsByShort = new Map(Array.from(deck, (card) => [internalCardToShort(card), card]));
    const previousShuffle = deck.shuffle;

    deck.shuffle = () => {
      orderedShorts.forEach((short, index) => {
        const card = cardsByShort.get(short);
        if (!card) {
          throw new Error(`Scenario card ${short} is unavailable in poker-ts deck`);
        }
        deck[index] = card;
      });
    };

    return () => {
      deck.shuffle = previousShuffle;
    };
  }

  private prepareTableForNextHand(): void {
    const nextBlinds = this.currentBlinds();
    const blindsChanged =
      nextBlinds.smallBlind !== this.tableBlinds.smallBlind ||
      nextBlinds.bigBlind !== this.tableBlinds.bigBlind;

    if (!this.format.resetStacksEachHand && !blindsChanged) {
      return;
    }

    const previousSeats = this.table.seats();
    this.tableBlinds = nextBlinds;
    this.table = this.createTable(nextBlinds);

    for (const seat of this.format.activeSeats) {
      const stack = this.format.resetStacksEachHand
        ? this.format.startingStack
        : previousSeats[seat]?.stack ?? this.records.get(seat)?.credits ?? this.format.startingStack;
      this.table.sitDown(seat, Math.max(stack, nextBlinds.bigBlind));
    }
  }

  private createPlayerRecord(
    seat: number,
    credits: number,
    saved?: PlayerRecord,
  ): PlayerRecord {
    const config = SEAT_CONFIG[seat];
    const startingCredit = this.format.persistsCredits
      ? saved?.startingCredit ?? this.format.startingStack
      : this.format.startingStack;
    return {
      seat,
      label: config?.label ?? `Seat ${seat + 1}`,
      role: config?.role ?? 'human',
      startingCredit,
      credits,
      handsPlayed: saved?.handsPlayed ?? 0,
      wins: saved?.wins ?? 0,
      voluntaryActions: saved?.voluntaryActions ?? 0,
      aggressiveActions: saved?.aggressiveActions ?? 0,
      folds: saved?.folds ?? 0,
      net: credits - startingCredit,
      recentResults: saved?.recentResults ? [...saved.recentResults] : [],
    };
  }

  private applyCurrentStacks(view: TableView): void {
    const seats = this.table.seats();
    view.seats = view.seats.map((seat) => ({
      ...seat,
      stack: seats[seat.seat]?.stack ?? seat.stack,
    }));
  }

  private updateRecords(winners: WinnerView[] | null): void {
    const winnerSeats = new Set((winners ?? []).map((winner) => winner.seat));
    const seats = this.table.seats();

    for (const seat of this.format.activeSeats) {
      const record = this.records.get(seat);
      if (!record) continue;

      const previousCredits = record.credits;
      const credits = seats[seat]?.stack ?? previousCredits;
      const actions = this.actionLog.filter((entry) => entry.seat === seat);
      const aggressiveActions = actions.filter(
        (entry) => entry.action === 'bet' || entry.action === 'raise',
      ).length;
      const folds = actions.filter((entry) => entry.action === 'fold').length;
      const voluntaryActions = actions.filter((entry) => entry.action !== 'check').length;

      this.records.set(seat, {
        ...record,
        credits,
        handsPlayed: record.handsPlayed + 1,
        wins: record.wins + (winnerSeats.has(seat) ? 1 : 0),
        voluntaryActions: record.voluntaryActions + voluntaryActions,
        aggressiveActions: record.aggressiveActions + aggressiveActions,
        folds: record.folds + folds,
        net: credits - record.startingCredit,
        recentResults: [...record.recentResults, credits - previousCredits].slice(-12),
      });
    }
  }
}
