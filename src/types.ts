export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
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
  type: 'flush' | 'straight' | 'gutshot' | 'two-pair' | 'trips' | 'full-house' | 'none' | 'backdoor-flush' | 'double-gutshot' | 'pair';
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
  recommendation: 'fold' | 'call' | 'raise' | 'all-in';
  confidence: number;
  outs: number;
  draws: DrawInfo[];
  cardCount: number;
  winProbability: number;
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
  isWinner: boolean;
}

export interface GameState {
  players: Player[];
  communityCards: Card[];
  pot: number;
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
}