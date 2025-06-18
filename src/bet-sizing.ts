/**
 * Optimal Bet Sizing and Bluffing Frequency Calculator
 * Implements GTO bet sizing theory and bluff-to-value ratios
 */

import { Card } from './types';

export interface BetSizingRecommendation {
  optimalSize: number; // As percentage of pot
  bluffFrequency: number; // Percentage of bluffs in range
  valueFrequency: number; // Percentage of value hands
  minimumDefenseFrequency: number; // MDF for opponent
  reasoning: string;
}

export interface BluffToValueRatio {
  betSize: number; // Percentage of pot
  bluffToValue: string; // Ratio like "1:2"
  bluffPercent: number;
  valuePercent: number;
}

export interface BoardTexture {
  type: 'dry' | 'semi-wet' | 'wet' | 'monotone';
  flushPossible: boolean;
  straightPossible: boolean;
  pairOnBoard: boolean;
  highCards: number; // Number of high cards (J+)
  connected: boolean;
  monotone: boolean;
}

// Optimal bluff-to-value ratios by bet size (from research data)
export const BLUFF_VALUE_RATIOS: BluffToValueRatio[] = [
  { betSize: 25, bluffToValue: '1:4', bluffPercent: 20, valuePercent: 80 },
  { betSize: 33, bluffToValue: '1:3', bluffPercent: 25, valuePercent: 75 },
  { betSize: 50, bluffToValue: '1:2', bluffPercent: 33, valuePercent: 67 },
  { betSize: 75, bluffToValue: '3:4', bluffPercent: 43, valuePercent: 57 },
  { betSize: 100, bluffToValue: '1:1', bluffPercent: 50, valuePercent: 50 },
  { betSize: 150, bluffToValue: '3:2', bluffPercent: 60, valuePercent: 40 },
  { betSize: 200, bluffToValue: '2:1', bluffPercent: 67, valuePercent: 33 }
];

// C-bet frequencies by board texture (from research data)
export const CBET_FREQUENCIES = {
  dry: { frequency: 69, size: 33, description: 'Dry boards (K♠7♥2♣)' },
  semiWet: { frequency: 55, size: 50, description: 'Semi-wet boards (A♠8♥5♦)' },
  wet: { frequency: 42, size: 75, description: 'Wet boards (J♠8♠6♦)' },
  monotone: { frequency: 28, size: 100, description: 'Monotone boards (A♠J♠5♠)' }
};

/**
 * Calculate optimal bluff frequency based on bet size
 */
export function calculateOptimalBluffFrequency(betSizePercent: number): number {
  // Formula: Optimal_Bluff_Frequency = Pot_Odds_Given_to_Opponent
  // Pot_Odds = Bet_Size / (Pot_Size + Bet_Size)
  const potOdds = betSizePercent / (100 + betSizePercent);
  return potOdds * 100; // Convert to percentage
}

/**
 * Calculate minimum defense frequency (MDF) against a bet
 */
export function calculateMDF(betSizePercent: number): number {
  // MDF = Pot_Size / (Pot_Size + Bet_Size)
  const mdf = 100 / (100 + betSizePercent);
  return mdf * 100; // Convert to percentage
}

/**
 * Get bluff-to-value ratio for a specific bet size
 */
export function getBluffValueRatio(betSizePercent: number): BluffToValueRatio {
  // Find closest ratio
  const closest = BLUFF_VALUE_RATIOS.reduce((prev, curr) => 
    Math.abs(curr.betSize - betSizePercent) < Math.abs(prev.betSize - betSizePercent) ? curr : prev
  );
  
  return closest;
}

/**
 * Analyze board texture for betting decisions
 */
export function analyzeBoardTexture(communityCards: Card[]): BoardTexture {
  if (communityCards.length < 3) {
    return {
      type: 'dry',
      flushPossible: false,
      straightPossible: false,
      pairOnBoard: false,
      highCards: 0,
      connected: false,
      monotone: false
    };
  }

  const ranks = communityCards.map(card => getRankValue(card.rank));
  const suits = communityCards.map(card => card.suit);
  
  // Check for pairs
  const rankCounts = new Map<number, number>();
  ranks.forEach(rank => {
    rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
  });
  const pairOnBoard = Array.from(rankCounts.values()).some(count => count >= 2);
  
  // Check for flush possibilities
  const suitCounts = new Map<string, number>();
  suits.forEach(suit => {
    suitCounts.set(suit, (suitCounts.get(suit) || 0) + 1);
  });
  const maxSuitCount = Math.max(...Array.from(suitCounts.values()));
  const flushPossible = maxSuitCount >= 3;
  const monotone = maxSuitCount >= 4 || (communityCards.length >= 4 && maxSuitCount >= 3);
  
  // Check for straight possibilities
  const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => a - b);
  const straightPossible = checkStraightPossible(uniqueRanks);
  
  // Count high cards (J, Q, K, A)
  const highCards = ranks.filter(rank => rank >= 11).length;
  
  // Check connectivity
  const connected = checkConnected(uniqueRanks);
  
  // Determine board type
  let type: BoardTexture['type'];
  if (monotone) {
    type = 'monotone';
  } else if (flushPossible && straightPossible) {
    type = 'wet';
  } else if (flushPossible || straightPossible || connected) {
    type = 'semi-wet';
  } else {
    type = 'dry';
  }
  
  return {
    type,
    flushPossible,
    straightPossible,
    pairOnBoard,
    highCards,
    connected,
    monotone
  };
}

function getRankValue(rank: string): number {
  const rankValues: { [key: string]: number } = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  return rankValues[rank] || 0;
}

function checkStraightPossible(sortedRanks: number[]): boolean {
  if (sortedRanks.length < 3) return false;
  
  // Check for any 3-card straight possibility
  for (let i = 0; i <= sortedRanks.length - 3; i++) {
    const gap1 = sortedRanks[i + 1] - sortedRanks[i];
    const gap2 = sortedRanks[i + 2] - sortedRanks[i + 1];
    
    if (gap1 <= 4 && gap2 <= 4) {
      return true;
    }
  }
  
  // Check for wheel possibility (A-2-3-4-5)
  if (sortedRanks.includes(14) && sortedRanks.includes(2)) {
    const lowCards = sortedRanks.filter(rank => rank <= 5);
    if (lowCards.length >= 2) return true;
  }
  
  return false;
}

function checkConnected(sortedRanks: number[]): boolean {
  if (sortedRanks.length < 2) return false;
  
  for (let i = 0; i < sortedRanks.length - 1; i++) {
    if (sortedRanks[i + 1] - sortedRanks[i] <= 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get optimal bet sizing recommendation based on board texture and position
 */
export function getBetSizingRecommendation(
  boardTexture: BoardTexture,
  position: 'IP' | 'OOP', // In position or out of position
  handStrength: 'strong' | 'medium' | 'weak' | 'draw',
  potSize: number
): BetSizingRecommendation {
  let optimalSize: number;
  let reasoning: string;
  
  // Base sizing on board texture
  switch (boardTexture.type) {
    case 'dry':
      optimalSize = 33;
      reasoning = 'Small bet on dry board for value extraction and bluff efficiency';
      break;
    case 'semi-wet':
      optimalSize = 50;
      reasoning = 'Medium bet on semi-wet board for protection and value';
      break;
    case 'wet':
      optimalSize = 75;
      reasoning = 'Large bet on wet board for strong value and fold equity';
      break;
    case 'monotone':
      optimalSize = 100;
      reasoning = 'Pot-sized bet on monotone board for maximum value/bluff';
      break;
  }
  
  // Adjust for hand strength
  if (handStrength === 'strong') {
    optimalSize = Math.max(optimalSize, 50); // Minimum 50% for strong hands
    reasoning += ' (adjusted up for strong hand)';
  } else if (handStrength === 'draw') {
    optimalSize = Math.min(optimalSize, 75); // Cap at 75% for draws
    reasoning += ' (adjusted for draw)';
  } else if (handStrength === 'weak') {
    optimalSize = Math.min(optimalSize, 50); // Smaller bluffs
    reasoning += ' (adjusted down for bluff)';
  }
  
  // Adjust for position
  if (position === 'OOP') {
    optimalSize += 10; // Slightly larger OOP
    reasoning += ' (adjusted up for OOP)';
  }
  
  // Get bluff-to-value ratio
  const ratio = getBluffValueRatio(optimalSize);
  const mdf = calculateMDF(optimalSize);
  
  return {
    optimalSize,
    bluffFrequency: ratio.bluffPercent,
    valueFrequency: ratio.valuePercent,
    minimumDefenseFrequency: mdf,
    reasoning
  };
}

/**
 * Get C-bet frequency recommendation
 */
export function getCBetRecommendation(
  boardTexture: BoardTexture,
  position: 'IP' | 'OOP',
  handType: 'value' | 'bluff' | 'mixed'
): {
  frequency: number;
  size: number;
  bluffHands: string[];
  reasoning: string;
} {
  let baseFreq: number;
  let baseSize: number;
  let bluffHands: string[];
  let reasoning: string;
  
  switch (boardTexture.type) {
    case 'dry':
      baseFreq = CBET_FREQUENCIES.dry.frequency;
      baseSize = CBET_FREQUENCIES.dry.size;
      bluffHands = ['Backdoor draws', 'Overcards'];
      reasoning = 'High frequency small bet on dry board';
      break;
    case 'semi-wet':
      baseFreq = CBET_FREQUENCIES.semiWet.frequency;
      baseSize = CBET_FREQUENCIES.semiWet.size;
      bluffHands = ['Gutshots', 'Backdoor flush draws'];
      reasoning = 'Medium frequency medium bet on semi-wet board';
      break;
    case 'wet':
      baseFreq = CBET_FREQUENCIES.wet.frequency;
      baseSize = CBET_FREQUENCIES.wet.size;
      bluffHands = ['Strong draws only'];
      reasoning = 'Lower frequency large bet on wet board';
      break;
    case 'monotone':
      baseFreq = CBET_FREQUENCIES.monotone.frequency;
      baseSize = CBET_FREQUENCIES.monotone.size;
      bluffHands = ['Nut flush draws', 'Sets/two-pair'];
      reasoning = 'Low frequency pot-sized bet on monotone board';
      break;
  }
  
  // Adjust for position
  if (position === 'OOP') {
    baseFreq -= 5; // Slightly lower frequency OOP
    reasoning += ' (adjusted for OOP)';
  }
  
  return {
    frequency: baseFreq,
    size: baseSize,
    bluffHands,
    reasoning
  };
}

/**
 * Calculate expected value of a bet
 */
export function calculateBetEV(
  betSize: number,
  potSize: number,
  foldEquity: number,
  winProbability: number
): number {
  // EV = (FoldEquity × CurrentPot) + ((1 - FoldEquity) × WinProbability × (CurrentPot + BetSize)) - ((1 - FoldEquity) × (1 - WinProbability) × BetSize)
  const immediateWin = foldEquity * potSize;
  const showdownWin = (1 - foldEquity) * winProbability * (potSize + betSize);
  const showdownLoss = (1 - foldEquity) * (1 - winProbability) * betSize;
  
  return immediateWin + showdownWin - showdownLoss;
}

/**
 * Find optimal bet size by maximizing EV
 */
export function findOptimalBetSize(
  potSize: number,
  winProbability: number,
  opponentFoldRange: number[]
): number {
  const betSizes = [25, 33, 50, 75, 100, 150, 200];
  let bestSize = 50;
  let bestEV = -Infinity;
  
  for (const size of betSizes) {
    // Estimate fold equity based on bet size (opponents fold more to larger bets)
    const foldEquity = Math.min(0.8, opponentFoldRange[0] + (size / 100) * 0.3);
    const ev = calculateBetEV(size * potSize / 100, potSize, foldEquity, winProbability);
    
    if (ev > bestEV) {
      bestEV = ev;
      bestSize = size;
    }
  }
  
  return bestSize;
}

/**
 * Get polarization recommendation (value vs bluff frequencies)
 */
export function getPolarizationRecommendation(
  boardTexture: BoardTexture,
  betSize: number
): {
  polarize: boolean;
  valueRange: string;
  bluffRange: string;
  reasoning: string;
} {
  const ratio = getBluffValueRatio(betSize);
  const shouldPolarize = betSize >= 75 || boardTexture.type === 'wet' || boardTexture.type === 'monotone';
  
  let valueRange: string;
  let bluffRange: string;
  let reasoning: string;
  
  if (shouldPolarize) {
    valueRange = 'Strong hands (two pair+)';
    bluffRange = 'Strong draws and air';
    reasoning = `Polarized range due to ${betSize}% bet size and ${boardTexture.type} board`;
  } else {
    valueRange = 'Top pair+, strong draws';
    bluffRange = 'Weak draws, overcards';
    reasoning = `Linear range due to smaller bet size and ${boardTexture.type} board`;
  }
  
  return {
    polarize: shouldPolarize,
    valueRange,
    bluffRange,
    reasoning
  };
}