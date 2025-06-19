/**
 * Enhanced Equity Calculator with Precise Hand Evaluation
 * Implements Monte Carlo simulation and precise draw probabilities
 */

import { Card, Rank } from './types';
import { evaluateHand } from './poker-logic';
import { HAND_EVALUATION, EQUITY_CALC, CARD_VALUES } from './constants';

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

export interface MonteCarloOptions {
  iterations: number;
  opponents: number;
  deadCards: Card[];
}

// Common draw probabilities from research data (using constants)
export const DRAW_PROBABILITIES = EQUITY_CALC.DRAW_ODDS;

// Hand strength distributions from research
export const HAND_RANKINGS = {
  royalFlush: { combinations: 4, probability: 0.0002, odds: 649739 },
  straightFlush: { combinations: 36, probability: 0.0014, odds: 72192 },
  fourOfAKind: { combinations: 624, probability: 0.024, odds: 4164 },
  fullHouse: { combinations: 3744, probability: 0.144, odds: 693 },
  flush: { combinations: 5108, probability: 0.197, odds: 508 },
  straight: { combinations: 10200, probability: 0.392, odds: 254 },
  threeOfAKind: { combinations: 54912, probability: 2.11, odds: 46.3 },
  twoPair: { combinations: 123552, probability: 4.75, odds: 20.0 },
  onePair: { combinations: 1098240, probability: 42.26, odds: 1.37 },
  highCard: { combinations: 1302540, probability: 50.12, odds: 1.0 }
};

/**
 * Calculate precise equity using Monte Carlo simulation
 */
export function calculateEquity(
  holeCards: Card[],
  communityCards: Card[],
  deadCards: Card[] = [],
  options: MonteCarloOptions = { iterations: EQUITY_CALC.DEFAULT_ITERATIONS, opponents: 1, deadCards: [] }
): EquityResult {
  if (holeCards.length !== 2) {
    throw new Error('Must provide exactly 2 hole cards');
  }

  const allDeadCards = [...holeCards, ...communityCards, ...deadCards, ...options.deadCards];
  const remainingCards = createRemainingDeck(allDeadCards);
  
  if (communityCards.length === 5) {
    // All cards dealt, just evaluate final hand
    return evaluateFinalHand(holeCards, communityCards);
  }

  return runMonteCarloSimulation(holeCards, communityCards, remainingCards, options);
}

/**
 * Run Monte Carlo simulation for equity calculation
 */
function runMonteCarloSimulation(
  holeCards: Card[],
  communityCards: Card[],
  remainingCards: Card[],
  options: MonteCarloOptions
): EquityResult {
  let wins = 0;
  let ties = 0;
  const { iterations, opponents } = options;

  for (let i = 0; i < iterations; i++) {
    const shuffledCards = [...remainingCards];
    shuffleArray(shuffledCards);

    // Deal remaining community cards
    const simulatedCommunity = [...communityCards];
    const cardsNeeded = 5 - communityCards.length;
    
    for (let j = 0; j < cardsNeeded; j++) {
      simulatedCommunity.push(shuffledCards[j]);
    }

    // Deal opponent hands
    const opponentHands: Card[][] = [];
    for (let op = 0; op < opponents; op++) {
      const opHand: Card[] = [];
      for (let k = 0; k < 2; k++) {
        opHand.push(shuffledCards[cardsNeeded + op * 2 + k]);
      }
      opponentHands.push(opHand);
    }

    // Evaluate all hands
    const heroHand = evaluateHand([...holeCards, ...simulatedCommunity]);
    const opponentEvaluations = opponentHands.map(hand => 
      evaluateHand([...hand, ...simulatedCommunity])
    );

    // Determine result
    const bestOpponentScore = Math.max(...opponentEvaluations.map(evaluation => evaluation.score));
    
    if (heroHand.score > bestOpponentScore) {
      wins++;
    } else if (heroHand.score === bestOpponentScore) {
      ties++;
    }
  }

  const winProbability = wins / iterations;
  const tieProbability = ties / iterations;
  const loseProbability = 1 - winProbability - tieProbability;
  const equity = winProbability + tieProbability * 0.5;

  // Calculate draws and outs
  const draws = calculateDrawEquities(holeCards, communityCards, remainingCards);
  const totalOuts = draws.reduce((sum, draw) => sum + draw.outs, 0);
  const handStrength = calculateHandStrength(holeCards, communityCards);

  return {
    equity,
    winProbability,
    tieProbability,
    loseProbability,
    outs: Math.min(totalOuts, 21), // Cap at reasonable maximum
    draws,
    handStrength
  };
}

/**
 * Evaluate final hand when all cards are dealt
 */
function evaluateFinalHand(holeCards: Card[], communityCards: Card[]): EquityResult {
  const hand = evaluateHand([...holeCards, ...communityCards]);
  const handStrength = hand.score / HAND_EVALUATION.MAX_HAND_SCORE; // Normalize to 0-1
  
  return {
    equity: handStrength,
    winProbability: handStrength,
    tieProbability: 0,
    loseProbability: 1 - handStrength,
    outs: 0,
    draws: [],
    handStrength
  };
}

/**
 * Calculate draw equities with precise probabilities
 */
function calculateDrawEquities(
  holeCards: Card[],
  communityCards: Card[],
  remainingCards: Card[]
): DrawEquity[] {
  const draws: DrawEquity[] = [];
  const allCards = [...holeCards, ...communityCards];
  
  if (communityCards.length >= 5) return draws;

  // Flush draws
  const flushDraw = analyzeFlushDraw(allCards, remainingCards);
  if (flushDraw) draws.push(flushDraw);

  // Straight draws
  const straightDraws = analyzeStraightDraws(allCards, remainingCards);
  draws.push(...straightDraws);

  // Pair draws
  const pairDraws = analyzePairDraws(holeCards, communityCards, remainingCards);
  draws.push(...pairDraws);

  return draws;
}

/**
 * Analyze flush draw possibilities
 */
function analyzeFlushDraw(allCards: Card[], remainingCards: Card[]): DrawEquity | null {
  const suitCounts = new Map<string, number>();
  
  allCards.forEach(card => {
    suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
  });

  for (const [suit, count] of Array.from(suitCounts.entries())) {
    if (count === 4) {
      // Flush draw
      const outs = remainingCards.filter(card => card.suit === suit).length;
      if (outs > 0) {
        const cardsLeft = 5 - allCards.length;
        return {
          type: 'flush',
          outs,
          turnProbability: cardsLeft >= 2 ? (outs / remainingCards.length) * 100 : 0,
          riverProbability: cardsLeft >= 1 ? (outs / remainingCards.length) * 100 : 0,
          turnAndRiverProbability: calculateTurnAndRiverProbability(outs, remainingCards.length, cardsLeft),
          equity: (outs / remainingCards.length) * EQUITY_CALC.DRAW_EQUITY.FLUSH // Flush equity approximation
        };
      }
    }
  }

  return null;
}

/**
 * Analyze straight draw possibilities
 */
function analyzeStraightDraws(allCards: Card[], remainingCards: Card[]): DrawEquity[] {
  const draws: DrawEquity[] = [];
  const ranks = allCards.map(card => getRankValue(card.rank));
  const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => a - b);

  if (uniqueRanks.length < 3) return draws;

  // Check for open-ended straight draws
  for (let i = 1; i <= 10; i++) {
    const straightRanks = i === 1 ? [14, 2, 3, 4, 5] : [i, i+1, i+2, i+3, i+4];
    const matching = straightRanks.filter(rank => uniqueRanks.includes(rank));
    const missing = straightRanks.filter(rank => !uniqueRanks.includes(rank));

    if (matching.length >= 3 && missing.length <= 2) {
      let outs = 0;
      missing.forEach(missingRank => {
        outs += remainingCards.filter(card => getRankValue(card.rank) === missingRank).length;
      });

      if (outs > 0) {
        const cardsLeft = 5 - allCards.length;
        const drawType = missing.length === 1 ? 
          (missing[0] === straightRanks[0] || missing[0] === straightRanks[4] ? 'open-ended' : 'gutshot') :
          'double-gutshot';

        draws.push({
          type: drawType,
          outs,
          turnProbability: cardsLeft >= 2 ? (outs / remainingCards.length) * 100 : 0,
          riverProbability: cardsLeft >= 1 ? (outs / remainingCards.length) * 100 : 0,
          turnAndRiverProbability: calculateTurnAndRiverProbability(outs, remainingCards.length, cardsLeft),
          equity: (outs / remainingCards.length) * EQUITY_CALC.DRAW_EQUITY.STRAIGHT // Straight equity approximation
        });
      }
    }
  }

  return draws;
}

/**
 * Analyze pair draw possibilities
 */
function analyzePairDraws(
  holeCards: Card[],
  communityCards: Card[],
  remainingCards: Card[]
): DrawEquity[] {
  const draws: DrawEquity[] = [];
  const holeRanks = holeCards.map(card => card.rank);
  
  // Pocket pair to set
  if (holeRanks[0] === holeRanks[1]) {
    const outs = remainingCards.filter(card => card.rank === holeRanks[0]).length;
    if (outs > 0) {
      const cardsLeft = 5 - holeCards.length - communityCards.length;
      draws.push({
        type: 'set',
        outs,
        turnProbability: cardsLeft >= 2 ? (outs / remainingCards.length) * 100 : 0,
        riverProbability: cardsLeft >= 1 ? (outs / remainingCards.length) * 100 : 0,
        turnAndRiverProbability: calculateTurnAndRiverProbability(outs, remainingCards.length, cardsLeft),
        equity: (outs / remainingCards.length) * EQUITY_CALC.DRAW_EQUITY.SET // Set equity approximation
      });
    }
  } else {
    // Unpaired hole cards to pair
    for (const rank of holeRanks) {
      const outs = remainingCards.filter(card => card.rank === rank).length;
      if (outs > 0) {
        const cardsLeft = 5 - holeCards.length - communityCards.length;
        draws.push({
          type: 'pair',
          outs,
          turnProbability: cardsLeft >= 2 ? (outs / remainingCards.length) * 100 : 0,
          riverProbability: cardsLeft >= 1 ? (outs / remainingCards.length) * 100 : 0,
          turnAndRiverProbability: calculateTurnAndRiverProbability(outs, remainingCards.length, cardsLeft),
          equity: (outs / remainingCards.length) * EQUITY_CALC.DRAW_EQUITY.PAIR // Pair equity approximation
        });
      }
    }
  }

  return draws;
}

/**
 * Calculate turn and river probability
 */
function calculateTurnAndRiverProbability(outs: number, remainingCards: number, cardsLeft: number): number {
  if (cardsLeft < 2) return 0;
  
  const missProb = ((remainingCards - outs) / remainingCards) * ((remainingCards - outs - 1) / (remainingCards - 1));
  return (1 - missProb) * 100;
}

/**
 * Calculate hand strength relative to possible hands
 */
function calculateHandStrength(holeCards: Card[], communityCards: Card[]): number {
  const allCards = [...holeCards, ...communityCards];
  
  if (allCards.length < 5) {
    // Pre-flop or early street strength
    return calculatePreFlopStrength(holeCards);
  }

  const hand = evaluateHand(allCards);
  return hand.score / HAND_EVALUATION.MAX_HAND_SCORE; // Normalize based on maximum possible score
}

/**
 * Calculate pre-flop hand strength
 */
function calculatePreFlopStrength(holeCards: Card[]): number {
  if (holeCards.length !== 2) return 0;

  const [card1, card2] = holeCards;
  const rank1 = getRankValue(card1.rank);
  const rank2 = getRankValue(card2.rank);
  const isPair = card1.rank === card2.rank;
  const suited = card1.suit === card2.suit;
  const gap = Math.abs(rank1 - rank2);

  let strength = 0;

  if (isPair) {
    if (rank1 >= CARD_VALUES.RANKS.QUEEN) strength = EQUITY_CALC.PREFLOP_STRENGTH.PREMIUM_PAIRS; // AA, KK, QQ
    else if (rank1 >= CARD_VALUES.RANKS.NINE) strength = EQUITY_CALC.PREFLOP_STRENGTH.HIGH_PAIRS; // JJ, TT, 99
    else if (rank1 >= CARD_VALUES.RANKS.SIX) strength = EQUITY_CALC.PREFLOP_STRENGTH.MEDIUM_PAIRS; // 88, 77, 66
    else strength = EQUITY_CALC.PREFLOP_STRENGTH.LOW_PAIRS; // Low pairs
  } else {
    const highCard = Math.max(rank1, rank2);
    const lowCard = Math.min(rank1, rank2);

    if (highCard === CARD_VALUES.RANKS.ACE) { // Ace
      if (lowCard >= CARD_VALUES.RANKS.QUEEN) strength = EQUITY_CALC.PREFLOP_STRENGTH.ACE_PREMIUM; // AK, AQ
      else if (lowCard >= CARD_VALUES.RANKS.TEN) strength = EQUITY_CALC.PREFLOP_STRENGTH.ACE_GOOD; // AJ, AT
      else if (lowCard >= CARD_VALUES.RANKS.EIGHT) strength = EQUITY_CALC.PREFLOP_STRENGTH.ACE_MEDIUM; // A9, A8
      else strength = EQUITY_CALC.PREFLOP_STRENGTH.ACE_WEAK; // A7 and below
    } else if (highCard >= CARD_VALUES.RANKS.QUEEN) { // K or Q
      if (lowCard >= CARD_VALUES.RANKS.TEN) strength = EQUITY_CALC.PREFLOP_STRENGTH.BROADWAY_PREMIUM; // KQ, KJ, QJ
      else if (lowCard >= CARD_VALUES.RANKS.EIGHT) strength = EQUITY_CALC.PREFLOP_STRENGTH.BROADWAY_GOOD; // K9, Q9, etc.
      else strength = EQUITY_CALC.PREFLOP_STRENGTH.BROADWAY_WEAK;
    } else {
      strength = 0.3;
    }

    if (suited) strength += EQUITY_CALC.PREFLOP_STRENGTH.SUITED_BONUS; // Suited bonus
    if (gap <= 4 && !isPair) strength += EQUITY_CALC.PREFLOP_STRENGTH.CONNECTOR_BONUS; // Connector bonus
  }

  return Math.min(strength, 1);
}

/**
 * Create remaining deck after removing dealt cards
 */
function createRemainingDeck(dealtCards: Card[]): Card[] {
  const fullDeck = createFullDeck();
  return fullDeck.filter(card => 
    !dealtCards.some(dealt => dealt.rank === card.rank && dealt.suit === card.suit)
  );
}

/**
 * Create full 52-card deck
 */
function createFullDeck(): Card[] {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }

  return deck;
}

/**
 * Shuffle array in place using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Get rank value for comparison
 */
function getRankValue(rank: Rank): number {
  const rankValues: Record<Rank, number> = {
    '2': CARD_VALUES.RANKS.TWO, '3': CARD_VALUES.RANKS.THREE, '4': CARD_VALUES.RANKS.FOUR, 
    '5': CARD_VALUES.RANKS.FIVE, '6': CARD_VALUES.RANKS.SIX, '7': CARD_VALUES.RANKS.SEVEN, 
    '8': CARD_VALUES.RANKS.EIGHT, '9': CARD_VALUES.RANKS.NINE, '10': CARD_VALUES.RANKS.TEN,
    'J': CARD_VALUES.RANKS.JACK, 'Q': CARD_VALUES.RANKS.QUEEN, 'K': CARD_VALUES.RANKS.KING, 'A': CARD_VALUES.RANKS.ACE
  };
  return rankValues[rank];
}

/**
 * Calculate pot odds
 */
export function calculatePotOdds(potSize: number, betToCall: number): number {
  if (betToCall <= 0) return 0;
  return potSize / betToCall;
}

/**
 * Calculate implied odds
 */
export function calculateImpliedOdds(
  potSize: number,
  betToCall: number,
  expectedFutureBets: number
): number {
  if (betToCall <= 0) return 0;
  return (potSize + expectedFutureBets) / betToCall;
}

/**
 * Calculate expected value
 */
export function calculateExpectedValue(
  winProbability: number,
  amountWon: number,
  loseProbability: number,
  amountLost: number
): number {
  return (winProbability * amountWon) - (loseProbability * amountLost);
}