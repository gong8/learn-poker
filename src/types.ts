export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type BotBehavior = 'conservative' | 'balanced' | 'aggressive' | 'random';

export interface BotProfile {
  behavior: BotBehavior;
  aggressiveness: number; // 0.0 to 1.0
  bluffFrequency: number; // 0.0 to 1.0
  foldThreshold: number; // hand strength threshold for folding
  betSizingMultiplier: number; // multiplier for bet sizing
  allInThreshold: number; // hand strength threshold for all-in
  randomnessFactor: number; // how much randomness to add
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  isBot: boolean;
  isFolded: boolean;
  currentBet: number;
  totalContribution: number;
  isAllIn: boolean;
  hasActedInRound: boolean;
  isEliminated: boolean;
  botProfile?: BotProfile;
}

export type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type Action = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface DeckTracker {
  remainingCards: Card[];
  dealtCards: Card[];
  runningCount: number;
  trueCount: number;
  cardCount: { [key: string]: number };
}

export interface DrawInfo {
  type: 'flush' | 'straight' | 'gutshot' | 'two-pair' | 'trips' | 'full-house' | 'improve' | 'backdoor-flush' | 'double-gutshot' | 'pair' | 'flush-draw' | 'open-ended' | 'four-of-a-kind' | 'straight-flush' | 'royal-flush' | 'runner-runner';
  outs: number;
  probability: number;
  description: string;
}

export interface PlayerAnalysis {
  handStrength: number;
  potentialStrength: number;
  currentHandRank: string;
  potOdds: number;
  equity: number;
  expectedValue: number;
  recommendation: 'fold' | 'call' | 'check' | 'bet' | 'raise' | 'all-in';
  confidence: number;
  outs: number;
  draws: DrawInfo[];
  cardCount: number;
  winProbability: number;
  // New advanced analysis fields
  icmEquity?: number;
  riskPremium?: number;
  bubbleFactor?: number;
  stackCategory?: 'short' | 'medium' | 'big';
  icmPressure?: 'low' | 'medium' | 'high';
  nashAction?: 'push' | 'call' | 'fold';
  gtoRange?: string[];
  betSizing?: BetSizingRecommendation;
  tournamentAdjustment?: TournamentAdjustment;
}

export interface BetSizingRecommendation {
  optimalSize: number;
  bluffFrequency: number;
  valueFrequency: number;
  minimumDefenseFrequency: number;
  reasoning: string;
}

export interface TournamentAdjustment {
  category: 'short' | 'medium' | 'big';
  icmPressure: 'low' | 'medium' | 'high';
  riskPremium: number;
  pushRangeAdjustment: number;
  callRangeAdjustment: number;
  playTighter: number;
}

export interface ICMSituation {
  stackSizes: number[];
  payoutStructure: number[];
  totalChips: number;
}

export interface BoardTexture {
  type: 'dry' | 'semi-wet' | 'wet' | 'monotone';
  flushPossible: boolean;
  straightPossible: boolean;
  pairOnBoard: boolean;
  highCards: number;
  connected: boolean;
  monotone: boolean;
}

export interface EquityResult {
  equity: number;
  winProbability: number;
  tieProbability: number;
  loseProbability: number;
  outs: number;
  draws: DrawEquity[];
  handStrength: number;
}

export interface DrawEquity {
  type: string;
  outs: number;
  turnProbability: number;
  riverProbability: number;
  turnAndRiverProbability: number;
  equity: number;
}

export interface ChipChange {
  playerId: string;
  playerName: string;
  change: number;
  finalChips: number;
  totalBet: number;
}

export interface HandSummary {
  playerId: string;
  playerName: string;
  handRank: string;
  handDescription: string;
  cards: Card[];
  holeCards: Card[];
  isWinner: boolean;
}

export interface HandHistoryEntry {
  handNumber: number;
  timestamp: number;
  phase: GamePhase;
  communityCards: Card[];
  pot: number;
  summaries: HandSummary[];
  chipChanges: ChipChange[];
  winnerIds: string[];
}

export interface GameState {
  players: Player[];
  communityCards: Card[];
  pot: number;
  finalPot?: number; // Preserves final pot value for display during hand completion
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  phase: GamePhase;
  currentBet: number;
  deck: Card[];
  smallBlind: number;
  bigBlind: number;
  isGameActive: boolean;
  deckTracker: DeckTracker;
  lastHandChipChanges: ChipChange[];
  lastHandSummaries: HandSummary[];
  handHistory: HandHistoryEntry[];
  handNumber: number;
}