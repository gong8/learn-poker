import { Card, Suit, Rank } from './types';
import { HAND_EVALUATION, CARD_VALUES } from './constants';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRankValue(rank: Rank): number {
  const rankValues: Record<Rank, number> = {
    '2': CARD_VALUES.RANKS.TWO, '3': CARD_VALUES.RANKS.THREE, '4': CARD_VALUES.RANKS.FOUR, 
    '5': CARD_VALUES.RANKS.FIVE, '6': CARD_VALUES.RANKS.SIX, '7': CARD_VALUES.RANKS.SEVEN, 
    '8': CARD_VALUES.RANKS.EIGHT, '9': CARD_VALUES.RANKS.NINE, '10': CARD_VALUES.RANKS.TEN,
    'J': CARD_VALUES.RANKS.JACK, 'Q': CARD_VALUES.RANKS.QUEEN, 'K': CARD_VALUES.RANKS.KING, 'A': CARD_VALUES.RANKS.ACE
  };
  return rankValues[rank];
}

export type HandRank = 
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

export interface HandEvaluation {
  rank: HandRank;
  score: number;
  cards: Card[];
}

export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 2) {
    throw new Error('Need at least 2 cards to evaluate hand');
  }

  // Handle cases with fewer than 5 cards (pre-flop, flop, turn)
  if (cards.length < 5) {
    return evaluatePartialHand(cards);
  }

  const allCombinations = getCombinations(cards, 5);
  let bestHand: HandEvaluation = {
    rank: 'high-card',
    score: 0,
    cards: []
  };

  for (const combination of allCombinations) {
    const evaluation = evaluateFiveCards(combination);
    if (evaluation.score > bestHand.score) {
      bestHand = evaluation;
    }
  }

  return bestHand;
}

function evaluatePartialHand(cards: Card[]): HandEvaluation {
  const sortedCards = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
  const ranks = sortedCards.map(card => card.rank);
  const suits = sortedCards.map(card => card.suit);
  
  const rankCounts = new Map<Rank, number>();
  ranks.forEach(rank => {
    rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
  });
  
  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  const isSuited = suits.length >= 2 && suits.every(suit => suit === suits[0]);
  
  // Check for pairs in partial hands
  if (counts[0] === 2) {
    const pairRank = Array.from(rankCounts.entries()).find(([, count]) => count === 2)![0];
    return { 
      rank: 'pair', 
      score: HAND_EVALUATION.PAIR_BASE_SCORE + getRankValue(pairRank), 
      cards: sortCardsSystematically(cards, 'pair') 
    };
  }
  
  // For partial hands, suited cards are just high card with potential
  // Don't call it a flush unless we actually have 5 cards
  
  // For partial hands with < 5 cards, we should only ever return high-card or pair
  // Don't claim straights or flushes until we have enough cards
  
  // Default to high card
  return { 
    rank: 'high-card', 
    score: getRankValue(ranks[0]), 
    cards: sortCardsSystematically(cards, 'high-card') 
  };
}

function checkPartialStraight(ranks: Rank[]): { isPotentialStraight: boolean; highCard: number } {
  const values = ranks.map(getRankValue).sort((a, b) => a - b);
  
  // For 2-4 cards, check if they form a consecutive sequence
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i + 1] - values[i] !== 1) {
      return { isPotentialStraight: false, highCard: 0 };
    }
  }
  
  return { isPotentialStraight: true, highCard: values[values.length - 1] };
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 1) return arr.map(item => [item]);
  if (k === arr.length) return [arr];
  
  const combinations: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = getCombinations(arr.slice(i + 1), k - 1);
    for (const combination of rest) {
      combinations.push([arr[i], ...combination]);
    }
  }
  return combinations;
}

function sortCardsSystematically(cards: Card[], handRank: HandRank): Card[] {
  const sortedCards = [...cards];
  const rankCounts = new Map<Rank, number>();
  
  sortedCards.forEach(card => {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
  });

  switch (handRank) {
    case 'royal-flush':
    case 'straight-flush':
    case 'straight':
      // Sort in straight order (handle wheel straight A-2-3-4-5)
      const ranks = sortedCards.map(card => card.rank);
      const isWheel = ranks.includes('A') && ranks.includes('2') && ranks.includes('3') && ranks.includes('4') && ranks.includes('5');
      
      if (isWheel) {
        // For wheel straight, order as A-2-3-4-5 (A is low)
        const wheelOrder: Rank[] = ['A', '2', '3', '4', '5'];
        return wheelOrder.map(rank => sortedCards.find(card => card.rank === rank)!);
      } else {
        // Normal straight order (low to high)
        return sortedCards.sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));
      }
      
    case 'flush':
      // Sort by rank (high to low) within same suit
      return sortedCards.sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
      
    case 'four-of-a-kind':
      // Show four of a kind first, then kicker
      return sortedCards.sort((a, b) => {
        const countA = rankCounts.get(a.rank)!;
        const countB = rankCounts.get(b.rank)!;
        if (countA !== countB) return countB - countA; // Four first, then kicker
        return getRankValue(b.rank) - getRankValue(a.rank); // High to low within same count
      });
      
    case 'full-house':
      // Show three of a kind first, then pair
      return sortedCards.sort((a, b) => {
        const countA = rankCounts.get(a.rank)!;
        const countB = rankCounts.get(b.rank)!;
        if (countA !== countB) return countB - countA; // Three first, then pair
        return getRankValue(b.rank) - getRankValue(a.rank); // High to low within same count
      });
      
    case 'three-of-a-kind':
      // Show three of a kind first, then kickers (high to low)
      return sortedCards.sort((a, b) => {
        const countA = rankCounts.get(a.rank)!;
        const countB = rankCounts.get(b.rank)!;
        if (countA !== countB) return countB - countA; // Three first, then kickers
        return getRankValue(b.rank) - getRankValue(a.rank); // High to low within same count
      });
      
    case 'two-pair':
      // Show higher pair, then lower pair, then kicker
      const pairs = Array.from(rankCounts.entries())
        .filter(([, count]) => count === 2)
        .map(([rank]) => rank)
        .sort((a, b) => getRankValue(b) - getRankValue(a));
      
      const kicker = Array.from(rankCounts.entries())
        .filter(([, count]) => count === 1)
        .map(([rank]) => rank)[0];
      
      const result: Card[] = [];
      // Add higher pair
      result.push(...sortedCards.filter(card => card.rank === pairs[0]));
      // Add lower pair  
      result.push(...sortedCards.filter(card => card.rank === pairs[1]));
      // Add kicker
      if (kicker) result.push(...sortedCards.filter(card => card.rank === kicker));
      return result;
      
    case 'pair':
      // Show pair first, then kickers (high to low)
      return sortedCards.sort((a, b) => {
        const countA = rankCounts.get(a.rank)!;
        const countB = rankCounts.get(b.rank)!;
        if (countA !== countB) return countB - countA; // Pair first, then kickers
        return getRankValue(b.rank) - getRankValue(a.rank); // High to low within same count
      });
      
    case 'high-card':
    default:
      // Sort high to low
      return sortedCards.sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
  }
}

function evaluateFiveCards(cards: Card[]): HandEvaluation {
  const sortedCards = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
  const ranks = sortedCards.map(card => card.rank);
  const suits = sortedCards.map(card => card.suit);
  
  const rankCounts = new Map<Rank, number>();
  ranks.forEach(rank => {
    rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
  });
  
  const isFlush = suits.every(suit => suit === suits[0]);
  const straightResult = checkStraight(ranks);
  const isStraight = straightResult.isStraight;
  const straightHighCard = straightResult.highCard;
  const isRoyalStraight = ranks.join('') === 'AKQJ10';
  
  if (isFlush && isRoyalStraight) {
    return { rank: 'royal-flush', score: HAND_EVALUATION.ROYAL_FLUSH_SCORE, cards: sortCardsSystematically(cards, 'royal-flush') };
  }
  
  if (isFlush && isStraight) {
    return { rank: 'straight-flush', score: HAND_EVALUATION.STRAIGHT_FLUSH_SCORE + straightHighCard, cards: sortCardsSystematically(cards, 'straight-flush') };
  }
  
  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  
  if (counts[0] === 4) {
    const fourOfAKindRank = Array.from(rankCounts.entries()).find(([, count]) => count === 4)![0];
    const kicker = Array.from(rankCounts.entries()).find(([, count]) => count === 1)?.[0];
    const quadsScore = getRankValue(fourOfAKindRank) * HAND_EVALUATION.BASE_MULTIPLIER + (kicker ? getRankValue(kicker) : 0);
    return { rank: 'four-of-a-kind', score: HAND_EVALUATION.FOUR_OF_A_KIND_SCORE + quadsScore, cards: sortCardsSystematically(cards, 'four-of-a-kind') };
  }
  
  if (counts[0] === 3 && counts[1] === 2) {
    const threeOfAKindRank = Array.from(rankCounts.entries()).find(([, count]) => count === 3)![0];
    const pairRank = Array.from(rankCounts.entries()).find(([, count]) => count === 2)![0];
    const fullHouseScore = getRankValue(threeOfAKindRank) * HAND_EVALUATION.BASE_MULTIPLIER + getRankValue(pairRank);
    return { rank: 'full-house', score: HAND_EVALUATION.FULL_HOUSE_SCORE + fullHouseScore, cards: sortCardsSystematically(cards, 'full-house') };
  }
  
  if (isFlush) {
    // For flush comparison, use all card values weighted by position
    const flushScore = ranks.reduce((score, rank, index) => {
      return score + getRankValue(rank) * Math.pow(HAND_EVALUATION.BASE_MULTIPLIER, 4-index);
    }, 0);
    return { rank: 'flush', score: HAND_EVALUATION.FLUSH_SCORE + flushScore, cards: sortCardsSystematically(cards, 'flush') };
  }
  
  if (isStraight) {
    return { rank: 'straight', score: HAND_EVALUATION.STRAIGHT_SCORE + straightHighCard, cards: sortCardsSystematically(cards, 'straight') };
  }
  
  if (counts[0] === 3) {
    const threeOfAKindRank = Array.from(rankCounts.entries()).find(([, count]) => count === 3)![0];
    const kickers = Array.from(rankCounts.entries()).filter(([, count]) => count === 1)
      .map(([rank]) => rank).sort((a, b) => getRankValue(b) - getRankValue(a));
    // Score: trips * 15^2 + kicker1 * 15 + kicker2
    const tripsScore = getRankValue(threeOfAKindRank) * HAND_EVALUATION.BASE_MULTIPLIER_SQUARED + 
      (kickers[0] ? getRankValue(kickers[0]) * HAND_EVALUATION.BASE_MULTIPLIER : 0) +
      (kickers[1] ? getRankValue(kickers[1]) : 0);
    return { rank: 'three-of-a-kind', score: HAND_EVALUATION.THREE_OF_A_KIND_SCORE + tripsScore, cards: sortCardsSystematically(cards, 'three-of-a-kind') };
  }
  
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = Array.from(rankCounts.entries()).filter(([, count]) => count === 2).map(([rank]) => rank);
    const sortedPairs = pairs.sort((a, b) => getRankValue(b) - getRankValue(a));
    const kicker = Array.from(rankCounts.entries()).filter(([, count]) => count === 1).map(([rank]) => rank)[0];
    // Score: high pair * 15^2 + low pair * 15 + kicker
    const twoPairScore = getRankValue(sortedPairs[0]) * HAND_EVALUATION.BASE_MULTIPLIER_SQUARED + getRankValue(sortedPairs[1]) * HAND_EVALUATION.BASE_MULTIPLIER + (kicker ? getRankValue(kicker) : 0);
    return { rank: 'two-pair', score: HAND_EVALUATION.TWO_PAIR_SCORE + twoPairScore, cards: sortCardsSystematically(cards, 'two-pair') };
  }
  
  if (counts[0] === 2) {
    const pairRank = Array.from(rankCounts.entries()).find(([, count]) => count === 2)![0];
    const kickers = Array.from(rankCounts.entries()).filter(([, count]) => count === 1)
      .map(([rank]) => rank).sort((a, b) => getRankValue(b) - getRankValue(a));
    // Score: pair * 15^3 + kicker1 * 15^2 + kicker2 * 15 + kicker3
    const pairScore = getRankValue(pairRank) * HAND_EVALUATION.BASE_MULTIPLIER_CUBED + 
      (kickers[0] ? getRankValue(kickers[0]) * HAND_EVALUATION.BASE_MULTIPLIER_SQUARED : 0) +
      (kickers[1] ? getRankValue(kickers[1]) * HAND_EVALUATION.BASE_MULTIPLIER : 0) +
      (kickers[2] ? getRankValue(kickers[2]) : 0);
    return { rank: 'pair', score: HAND_EVALUATION.PAIR_SCORE + pairScore, cards: sortCardsSystematically(cards, 'pair') };
  }
  
  // High card comparison uses all cards weighted by position (but keep it below pair level)
  const highCardScore = ranks.reduce((score, rank, index) => {
    return score + getRankValue(rank) * Math.pow(HAND_EVALUATION.BASE_MULTIPLIER, 4-index);
  }, 0);
  return { rank: 'high-card', score: Math.min(HAND_EVALUATION.MAX_HIGH_CARD_SCORE, highCardScore), cards: sortCardsSystematically(cards, 'high-card') };
}

function checkStraight(ranks: Rank[]): { isStraight: boolean; highCard: number } {
  const values = ranks.map(getRankValue).sort((a, b) => a - b);
  
  // Check for regular straight
  let consecutive = true;
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i + 1] - values[i] !== 1) {
      consecutive = false;
      break;
    }
  }
  
  if (consecutive) {
    return { isStraight: true, highCard: values[values.length - 1] };
  }
  
  // Check for A-2-3-4-5 (wheel) straight
  if (values.join(',') === '2,3,4,5,14') {
    return { isStraight: true, highCard: HAND_EVALUATION.WHEEL_STRAIGHT_HIGH_CARD }; // 5 is high card in wheel
  }
  
  return { isStraight: false, highCard: 0 };
}

export function getHandTypeDisplayName(handRank: HandRank): string {
  const displayNames: Record<HandRank, string> = {
    'royal-flush': 'Royal Flush',
    'straight-flush': 'Straight Flush',
    'four-of-a-kind': 'Four of a Kind',
    'full-house': 'Full House',
    'flush': 'Flush',
    'straight': 'Straight',
    'three-of-a-kind': 'Three of a Kind',
    'two-pair': 'Two Pair',
    'pair': 'Pair',
    'high-card': 'High Card'
  };
  return displayNames[handRank];
}