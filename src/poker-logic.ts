import { Card, Suit, Rank } from './types';

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
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
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
  
  // Check for trips in partial hands (3+ cards)
  if (counts[0] === 3) {
    const tripRank = Array.from(rankCounts.entries()).find(([, count]) => count === 3)![0];
    const kickers = Array.from(rankCounts.entries())
      .filter(([, count]) => count === 1)
      .map(([rank]) => getRankValue(rank))
      .sort((a, b) => b - a);
    const kickerScore = kickers.length > 0 ? kickers[0] * 100 + (kickers[1] || 0) : 0;
    return { 
      rank: 'three-of-a-kind', 
      score: 3000000 + getRankValue(tripRank) * 10000 + kickerScore, 
      cards: sortCardsSystematically(cards, 'three-of-a-kind') 
    };
  }
  
  // Check for two pair in partial hands (4+ cards)
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = Array.from(rankCounts.entries())
      .filter(([, count]) => count === 2)
      .map(([rank]) => getRankValue(rank))
      .sort((a, b) => b - a);
    const kicker = Array.from(rankCounts.entries())
      .find(([, count]) => count === 1);
    const kickerValue = kicker ? getRankValue(kicker[0]) : 0;
    return { 
      rank: 'two-pair', 
      score: 2000000 + pairs[0] * 10000 + pairs[1] * 100 + kickerValue, 
      cards: sortCardsSystematically(cards, 'two-pair') 
    };
  }
  
  // Check for pairs in partial hands
  if (counts[0] === 2) {
    const pairRank = Array.from(rankCounts.entries()).find(([, count]) => count === 2)![0];
    const kickers = Array.from(rankCounts.entries())
      .filter(([, count]) => count === 1)
      .map(([rank]) => getRankValue(rank))
      .sort((a, b) => b - a);
    const kickerScore = kickers[0] * 1000 + (kickers[1] || 0) * 100 + (kickers[2] || 0);
    return { 
      rank: 'pair', 
      score: 1000000 + getRankValue(pairRank) * 100000 + kickerScore, 
      cards: sortCardsSystematically(cards, 'pair') 
    };
  }
  
  // Check for potential straight in partial hands (3+ cards)
  if (cards.length >= 3) {
    const straightResult = checkPartialStraightDraw(ranks);
    if (straightResult.isPotentialStraight) {
      // Give it a modest bonus but keep it as high-card
      const rankValues = ranks.map(getRankValue).sort((a, b) => b - a);
      const baseScore = rankValues[0] * 10000 + rankValues[1] * 1000 + rankValues[2] * 100 + (rankValues[3] || 0) * 10 + (rankValues[4] || 0);
      return { 
        rank: 'high-card', 
        score: baseScore + 5000, // Small straight draw bonus
        cards: sortCardsSystematically(cards, 'high-card') 
      };
    }
  }
  
  // Check for potential flush in partial hands (3+ suited)
  if (cards.length >= 3 && isSuited) {
    const rankValues = ranks.map(getRankValue).sort((a, b) => b - a);
    const baseScore = rankValues[0] * 10000 + rankValues[1] * 1000 + rankValues[2] * 100 + (rankValues[3] || 0) * 10 + (rankValues[4] || 0);
    return { 
      rank: 'high-card', 
      score: baseScore + 3000, // Small flush draw bonus
      cards: sortCardsSystematically(cards, 'high-card') 
    };
  }
  
  // Default to high card with proper scoring scale
  const rankValues = ranks.map(getRankValue).sort((a, b) => b - a);
  const score = rankValues[0] * 10000 + rankValues[1] * 1000 + (rankValues[2] || 0) * 100 + (rankValues[3] || 0) * 10 + (rankValues[4] || 0);
  return { 
    rank: 'high-card', 
    score: score, 
    cards: sortCardsSystematically(cards, 'high-card') 
  };
}

function checkPartialStraightDraw(ranks: Rank[]): { isPotentialStraight: boolean; highCard: number } {
  const values = ranks.map(getRankValue).sort((a, b) => a - b);
  
  // For 3+ cards, check if they form a consecutive sequence or near-consecutive
  if (values.length < 3) return { isPotentialStraight: false, highCard: 0 };
  
  // Check for perfect consecutive
  let consecutive = true;
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i + 1] - values[i] !== 1) {
      consecutive = false;
      break;
    }
  }
  
  if (consecutive) {
    return { isPotentialStraight: true, highCard: values[values.length - 1] };
  }
  
  // Check for near-straight (1 gap)
  if (values.length >= 3) {
    const span = values[values.length - 1] - values[0];
    if (span <= 4) { // Could make a straight
      return { isPotentialStraight: true, highCard: values[values.length - 1] };
    }
  }
  
  // Check for wheel straight potential (A-2-3-4-5)
  if (values.includes(14) && values.includes(2) && values.includes(3)) {
    return { isPotentialStraight: true, highCard: 5 };
  }
  
  return { isPotentialStraight: false, highCard: 0 };
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
    return { rank: 'royal-flush', score: 9000000, cards: sortCardsSystematically(cards, 'royal-flush') };
  }
  
  if (isFlush && isStraight) {
    return { rank: 'straight-flush', score: 8000000 + straightHighCard, cards: sortCardsSystematically(cards, 'straight-flush') };
  }
  
  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  
  if (counts[0] === 4) {
    const fourOfAKindRank = Array.from(rankCounts.entries()).find(([, count]) => count === 4)![0];
    const kicker = Array.from(rankCounts.entries()).find(([, count]) => count === 1)![0];
    return { 
      rank: 'four-of-a-kind', 
      score: 7000000 + getRankValue(fourOfAKindRank) * 100 + getRankValue(kicker), 
      cards: sortCardsSystematically(cards, 'four-of-a-kind') 
    };
  }
  
  if (counts[0] === 3 && counts[1] === 2) {
    const threeOfAKindRank = Array.from(rankCounts.entries()).find(([, count]) => count === 3)![0];
    const pairRank = Array.from(rankCounts.entries()).find(([, count]) => count === 2)![0];
    return { 
      rank: 'full-house', 
      score: 6000000 + getRankValue(threeOfAKindRank) * 100 + getRankValue(pairRank), 
      cards: sortCardsSystematically(cards, 'full-house') 
    };
  }
  
  if (isFlush) {
    const rankValues = ranks.map(getRankValue).sort((a, b) => b - a);
    return { 
      rank: 'flush', 
      score: 5000000 + rankValues[0] * 10000 + rankValues[1] * 1000 + rankValues[2] * 100 + rankValues[3] * 10 + rankValues[4], 
      cards: sortCardsSystematically(cards, 'flush') 
    };
  }
  
  if (isStraight) {
    return { rank: 'straight', score: 4000000 + straightHighCard, cards: sortCardsSystematically(cards, 'straight') };
  }
  
  if (counts[0] === 3) {
    const threeOfAKindRank = Array.from(rankCounts.entries()).find(([, count]) => count === 3)![0];
    const kickers = Array.from(rankCounts.entries())
      .filter(([, count]) => count === 1)
      .map(([rank]) => getRankValue(rank))
      .sort((a, b) => b - a);
    return { 
      rank: 'three-of-a-kind', 
      score: 3000000 + getRankValue(threeOfAKindRank) * 10000 + kickers[0] * 100 + kickers[1], 
      cards: sortCardsSystematically(cards, 'three-of-a-kind') 
    };
  }
  
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = Array.from(rankCounts.entries())
      .filter(([, count]) => count === 2)
      .map(([rank]) => getRankValue(rank))
      .sort((a, b) => b - a);
    const kicker = Array.from(rankCounts.entries())
      .find(([, count]) => count === 1);
    const kickerValue = kicker ? getRankValue(kicker[0]) : 0;
    return { 
      rank: 'two-pair', 
      score: 2000000 + pairs[0] * 10000 + pairs[1] * 100 + kickerValue, 
      cards: sortCardsSystematically(cards, 'two-pair') 
    };
  }
  
  if (counts[0] === 2) {
    const pairRank = Array.from(rankCounts.entries()).find(([, count]) => count === 2)![0];
    const kickers = Array.from(rankCounts.entries())
      .filter(([, count]) => count === 1)
      .map(([rank]) => getRankValue(rank))
      .sort((a, b) => b - a);
    return { 
      rank: 'pair', 
      score: 1000000 + getRankValue(pairRank) * 100000 + kickers[0] * 1000 + kickers[1] * 100 + kickers[2], 
      cards: sortCardsSystematically(cards, 'pair') 
    };
  }
  
  const rankValues = ranks.map(getRankValue).sort((a, b) => b - a);
  return { 
    rank: 'high-card', 
    score: rankValues[0] * 10000 + rankValues[1] * 1000 + rankValues[2] * 100 + rankValues[3] * 10 + rankValues[4], 
    cards: sortCardsSystematically(cards, 'high-card') 
  };
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
    return { isStraight: true, highCard: 5 }; // 5 is high card in wheel
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