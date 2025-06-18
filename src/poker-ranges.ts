import { Rank } from './types';

export interface PushFoldRange {
  hand: string;
  maxStackSizeBB: number;
}

export interface RangeData {
  position: string;
  action: 'push' | 'call';
  ranges: PushFoldRange[];
}

// Nash Push/Fold Charts from the research data
export const NASH_PUSH_RANGES: PushFoldRange[] = [
  // Premium Pairs
  { hand: 'AA', maxStackSizeBB: 20 },
  { hand: 'KK', maxStackSizeBB: 20 },
  { hand: 'QQ', maxStackSizeBB: 20 },
  { hand: 'JJ', maxStackSizeBB: 20 },
  { hand: 'TT', maxStackSizeBB: 20 },
  { hand: '99', maxStackSizeBB: 20 },
  { hand: '88', maxStackSizeBB: 20 },
  { hand: '77', maxStackSizeBB: 20 },
  { hand: '66', maxStackSizeBB: 20 },
  { hand: '55', maxStackSizeBB: 20 },
  { hand: '44', maxStackSizeBB: 17.3 },
  { hand: '33', maxStackSizeBB: 13.8 },
  { hand: '22', maxStackSizeBB: 11.2 },
  
  // Ace Suited
  { hand: 'AKs', maxStackSizeBB: 20 },
  { hand: 'AQs', maxStackSizeBB: 20 },
  { hand: 'AJs', maxStackSizeBB: 20 },
  { hand: 'ATs', maxStackSizeBB: 20 },
  { hand: 'A9s', maxStackSizeBB: 20 },
  { hand: 'A8s', maxStackSizeBB: 20 },
  { hand: 'A7s', maxStackSizeBB: 20 },
  { hand: 'A6s', maxStackSizeBB: 20 },
  { hand: 'A5s', maxStackSizeBB: 20 },
  { hand: 'A4s', maxStackSizeBB: 20 },
  { hand: 'A3s', maxStackSizeBB: 20 },
  { hand: 'A2s', maxStackSizeBB: 20 },
  
  // Ace Offsuit
  { hand: 'AKo', maxStackSizeBB: 20 },
  { hand: 'AQo', maxStackSizeBB: 20 },
  { hand: 'AJo', maxStackSizeBB: 20 },
  { hand: 'ATo', maxStackSizeBB: 20 },
  { hand: 'A9o', maxStackSizeBB: 20 },
  { hand: 'A8o', maxStackSizeBB: 18.2 },
  { hand: 'A7o', maxStackSizeBB: 15.6 },
  { hand: 'A6o', maxStackSizeBB: 13.9 },
  { hand: 'A5o', maxStackSizeBB: 12.7 },
  { hand: 'A4o', maxStackSizeBB: 11.8 },
  { hand: 'A3o', maxStackSizeBB: 11.1 },
  { hand: 'A2o', maxStackSizeBB: 10.6 },
  
  // King Suited
  { hand: 'KQs', maxStackSizeBB: 20 },
  { hand: 'KJs', maxStackSizeBB: 20 },
  { hand: 'KTs', maxStackSizeBB: 20 },
  { hand: 'K9s', maxStackSizeBB: 20 },
  { hand: 'K8s', maxStackSizeBB: 20 },
  { hand: 'K7s', maxStackSizeBB: 17.8 },
  { hand: 'K6s', maxStackSizeBB: 15.2 },
  { hand: 'K5s', maxStackSizeBB: 13.4 },
  { hand: 'K4s', maxStackSizeBB: 12.1 },
  { hand: 'K3s', maxStackSizeBB: 11.2 },
  { hand: 'K2s', maxStackSizeBB: 10.5 },
  
  // King Offsuit
  { hand: 'KQo', maxStackSizeBB: 20 },
  { hand: 'KJo', maxStackSizeBB: 20 },
  { hand: 'KTo', maxStackSizeBB: 20 },
  { hand: 'K9o', maxStackSizeBB: 16.8 },
  { hand: 'K8o', maxStackSizeBB: 13.9 },
  { hand: 'K7o', maxStackSizeBB: 12.1 },
  { hand: 'K6o', maxStackSizeBB: 10.9 },
  { hand: 'K5o', maxStackSizeBB: 10.1 }
];

export const NASH_CALL_RANGES: PushFoldRange[] = [
  // Premium Pairs
  { hand: 'AA', maxStackSizeBB: 20 },
  { hand: 'KK', maxStackSizeBB: 20 },
  { hand: 'QQ', maxStackSizeBB: 20 },
  { hand: 'JJ', maxStackSizeBB: 20 },
  { hand: 'TT', maxStackSizeBB: 20 },
  { hand: '99', maxStackSizeBB: 20 },
  { hand: '88', maxStackSizeBB: 20 },
  { hand: '77', maxStackSizeBB: 20 },
  { hand: '66', maxStackSizeBB: 20 },
  { hand: '55', maxStackSizeBB: 20 },
  { hand: '44', maxStackSizeBB: 20 },
  { hand: '33', maxStackSizeBB: 15.8 },
  { hand: '22', maxStackSizeBB: 12.3 },
  
  // Ace Suited
  { hand: 'AKs', maxStackSizeBB: 20 },
  { hand: 'AQs', maxStackSizeBB: 20 },
  { hand: 'AJs', maxStackSizeBB: 20 },
  { hand: 'ATs', maxStackSizeBB: 20 },
  { hand: 'A9s', maxStackSizeBB: 20 },
  { hand: 'A8s', maxStackSizeBB: 18.7 },
  { hand: 'A7s', maxStackSizeBB: 16.2 },
  { hand: 'A6s', maxStackSizeBB: 14.3 },
  { hand: 'A5s', maxStackSizeBB: 12.9 },
  { hand: 'A4s', maxStackSizeBB: 11.9 },
  { hand: 'A3s', maxStackSizeBB: 11.2 },
  { hand: 'A2s', maxStackSizeBB: 10.6 },
  
  // Ace Offsuit
  { hand: 'AKo', maxStackSizeBB: 20 },
  { hand: 'AQo', maxStackSizeBB: 20 },
  { hand: 'AJo', maxStackSizeBB: 20 },
  { hand: 'ATo', maxStackSizeBB: 18.9 },
  { hand: 'A9o', maxStackSizeBB: 15.8 },
  { hand: 'A8o', maxStackSizeBB: 13.7 },
  { hand: 'A7o', maxStackSizeBB: 12.2 },
  { hand: 'A6o', maxStackSizeBB: 11.1 },
  { hand: 'A5o', maxStackSizeBB: 10.3 }
];

// GTO Preflop Ranges by position
export interface GTORange {
  position: string;
  stackDepthBB: number;
  openRange: string[];
  percentage: number;
}

export const GTO_CASH_RANGES: GTORange[] = [
  {
    position: 'UTG',
    stackDepthBB: 100,
    openRange: ['66+', 'A9s+', 'A5s', 'KTs+', 'QTs+', 'JTs', 'T9s', '98s', 'AQo+'],
    percentage: 13.2
  },
  {
    position: 'MP',
    stackDepthBB: 100,
    openRange: ['55+', 'A8s+', 'A5s', 'K9s+', 'Q9s+', 'J9s+', 'T8s+', '97s+', '87s', '76s', 'AJo+', 'KQo'],
    percentage: 16.8
  },
  {
    position: 'CO',
    stackDepthBB: 100,
    openRange: ['44+', 'A2s+', 'K8s+', 'Q8s+', 'J8s+', 'T7s+', '96s+', '86s+', '75s+', '65s', '54s', 'ATo+', 'KJo+', 'QJo'],
    percentage: 26.1
  },
  {
    position: 'BTN',
    stackDepthBB: 100,
    openRange: ['22+', 'A2s+', 'K2s+', 'Q2s+', 'J6s+', 'T6s+', '96s+', '85s+', '75s+', '64s+', '53s+', '43s', 'A2o+', 'K7o+', 'Q8o+', 'J8o+', 'T8o+', '97o+', '87o', '76o'],
    percentage: 48.9
  },
  {
    position: 'SB',
    stackDepthBB: 100,
    openRange: ['22+', 'A2s+', 'K2s+', 'Q4s+', 'J7s+', 'T7s+', '96s+', '86s+', '75s+', '65s', '54s', 'A2o+', 'K8o+', 'Q9o+', 'J9o+', 'T9o'],
    percentage: 41.2
  }
];

export const GTO_TOURNAMENT_RANGES: { [stackDepth: number]: GTORange[] } = {
  20: [
    {
      position: 'UTG',
      stackDepthBB: 20,
      openRange: ['22+', 'A7s+', 'A5s-A4s', 'ATo+', 'K9s+', 'KJo+', 'Q9s+', 'J9s+', 'T9s'],
      percentage: 11.8
    },
    {
      position: 'BTN',
      stackDepthBB: 20,
      openRange: ['22+', 'A2s+', 'K5s+', 'Q7s+', 'J7s+', 'T7s+', '97s+', '86s+', '76s', '65s', 'A5o+', 'K9o+', 'Q9o+', 'J9o+'],
      percentage: 28.4
    }
  ],
  15: [
    {
      position: 'UTG',
      stackDepthBB: 15,
      openRange: ['77+', 'A9s+', 'AJo+', 'KQs', 'KQo'],
      percentage: 7.8
    },
    {
      position: 'BTN',
      stackDepthBB: 15,
      openRange: ['22+', 'A2s+', 'K7s+', 'Q8s+', 'J8s+', 'T8s+', '97s+', '87s', '76s', 'A7o+', 'KTo+', 'QTo+', 'JTo'],
      percentage: 33.4
    }
  ],
  10: [
    {
      position: 'UTG',
      stackDepthBB: 10,
      openRange: ['88+', 'ATs+', 'AJo+', 'KQs'],
      percentage: 5.2
    },
    {
      position: 'BTN',
      stackDepthBB: 10,
      openRange: ['33+', 'A2s+', 'K8s+', 'Q9s+', 'J9s+', 'T9s', '98s', 'A9o+', 'KJo+', 'QJo'],
      percentage: 25.8
    }
  ]
};

// Position adjustments for full table play
export const POSITION_ADJUSTMENTS = {
  'BTN': 2,     // Divide Nash ranges by 2
  'CO': 4,      // Divide Nash ranges by 4
  'MP': 6,      // Divide Nash ranges by 6
  'UTG': 8      // Divide Nash ranges by 8
};

export function convertHandToString(rank1: Rank, rank2: Rank, suited: boolean): string {
  // Sort ranks for consistent representation
  const ranks = [rank1, rank2].sort((a, b) => {
    const order = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    return order.indexOf(b) - order.indexOf(a);
  });
  
  const handString = ranks.join('');
  return handString + (suited ? 's' : 'o');
}

export function isHandInRange(handString: string, ranges: string[]): boolean {
  // Direct match
  if (ranges.includes(handString)) return true;
  
  // Check for range patterns like "66+", "A2s+", etc.
  for (const range of ranges) {
    if (range.includes('+')) {
      const baseHand = range.replace('+', '');
      if (isHandInPlusRange(handString, baseHand)) return true;
    }
    if (range.includes('-')) {
      const [start, end] = range.split('-');
      if (isHandInDashRange(handString, start, end)) return true;
    }
  }
  
  return false;
}

function isHandInPlusRange(handString: string, baseHand: string): boolean {
  // Handle pocket pairs like "66+"
  if (baseHand.match(/^(\d|T|J|Q|K|A)\1$/)) {
    const baseRank = baseHand[0];
    const handRank = handString[0];
    if (handString.length === 2 && handString[0] === handString[1]) {
      return getRankValue(handRank) >= getRankValue(baseRank);
    }
  }
  
  // Handle suited hands like "A2s+"
  if (baseHand.endsWith('s') && handString.endsWith('s')) {
    const baseFirst = baseHand[0];
    const baseSecond = baseHand[1];
    const handFirst = handString[0];
    const handSecond = handString[1];
    
    if (baseFirst === handFirst && baseFirst === 'A') {
      return getRankValue(handSecond) >= getRankValue(baseSecond);
    }
    if (baseFirst === handFirst && baseFirst === 'K') {
      return getRankValue(handSecond) >= getRankValue(baseSecond);
    }
  }
  
  // Handle offsuit hands like "A2o+"
  if (baseHand.endsWith('o') && handString.endsWith('o')) {
    const baseFirst = baseHand[0];
    const baseSecond = baseHand[1];
    const handFirst = handString[0];
    const handSecond = handString[1];
    
    if (baseFirst === handFirst && baseFirst === 'A') {
      return getRankValue(handSecond) >= getRankValue(baseSecond);
    }
    if (baseFirst === handFirst && baseFirst === 'K') {
      return getRankValue(handSecond) >= getRankValue(baseSecond);
    }
  }
  
  return false;
}

function isHandInDashRange(handString: string, startHand: string, endHand: string): boolean {
  // Handle ranges like "A5s-A2s"
  if (startHand.endsWith('s') && endHand.endsWith('s') && handString.endsWith('s')) {
    const startFirst = startHand[0];
    const startSecond = startHand[1];
    const endSecond = endHand[1];
    const handFirst = handString[0];
    const handSecond = handString[1];
    
    if (startFirst === handFirst && startFirst === endHand[0]) {
      const handRankValue = getRankValue(handSecond);
      const startRankValue = getRankValue(startSecond);
      const endRankValue = getRankValue(endSecond);
      
      return handRankValue <= startRankValue && handRankValue >= endRankValue;
    }
  }
  
  return false;
}

function getRankValue(rank: string): number {
  const rankValues: { [key: string]: number } = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  return rankValues[rank] || 0;
}

export function shouldPushFold(handString: string, stackSizeBB: number, position: string = 'SB'): 'push' | 'call' | 'fold' {
  // Adjust stack size based on position
  const adjustment = (POSITION_ADJUSTMENTS as any)[position] || 1;
  const adjustedStackSize = stackSizeBB * adjustment;
  
  // Check push range
  const pushRange = NASH_PUSH_RANGES.find(range => range.hand === handString);
  if (pushRange && adjustedStackSize <= pushRange.maxStackSizeBB) {
    return 'push';
  }
  
  // Check call range
  const callRange = NASH_CALL_RANGES.find(range => range.hand === handString);
  if (callRange && adjustedStackSize <= callRange.maxStackSizeBB) {
    return 'call';
  }
  
  return 'fold';
}

export function getGTORange(position: string, stackDepthBB: number = 100): GTORange | null {
  // For tournament play, find closest stack depth
  if (stackDepthBB <= 30) {
    const tournamentRanges = Object.keys(GTO_TOURNAMENT_RANGES)
      .map(Number)
      .sort((a, b) => Math.abs(stackDepthBB - a) - Math.abs(stackDepthBB - b));
    
    const closestDepth = tournamentRanges[0];
    const ranges = GTO_TOURNAMENT_RANGES[closestDepth];
    return ranges.find(range => range.position === position) || null;
  }
  
  // For cash game ranges
  return GTO_CASH_RANGES.find(range => range.position === position) || null;
}