import { Card, Rank, DeckTracker, PlayerAnalysis, GameState, Player, DrawInfo } from './types';
import { createDeck, evaluateHand, HandRank } from './poker-logic';

export function createDeckTracker(): DeckTracker {
  const fullDeck = createDeck();
  return {
    remainingCards: [...fullDeck],
    dealtCards: [],
    runningCount: 0,
    trueCount: 0,
    cardCount: initializeCardCount()
  };
}

function initializeCardCount(): { [key: string]: number } {
  const count: { [key: string]: number } = {};
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  ranks.forEach(rank => {
    count[rank] = 4; // 4 cards of each rank in a full deck
  });
  return count;
}

export function updateDeckTracker(tracker: DeckTracker, dealtCard: Card): void {
  // Remove card from remaining deck
  const cardIndex = tracker.remainingCards.findIndex(
    c => c.rank === dealtCard.rank && c.suit === dealtCard.suit
  );
  if (cardIndex !== -1) {
    tracker.remainingCards.splice(cardIndex, 1);
  }
  
  // Add to dealt cards
  tracker.dealtCards.push(dealtCard);
  
  // Update card count
  if (tracker.cardCount[dealtCard.rank] > 0) {
    tracker.cardCount[dealtCard.rank]--;
  }
  
  // Update Hi-Lo count
  updateHiLoCount(tracker, dealtCard);
  
  // Calculate true count (running count divided by remaining decks)
  const remainingDecks = tracker.remainingCards.length / 52;
  tracker.trueCount = remainingDecks > 0 ? tracker.runningCount / remainingDecks : 0;
}

function updateHiLoCount(tracker: DeckTracker, card: Card): void {
  const highCards = ['10', 'J', 'Q', 'K', 'A'];
  const lowCards = ['2', '3', '4', '5', '6'];
  
  if (lowCards.includes(card.rank)) {
    tracker.runningCount += 1;
  } else if (highCards.includes(card.rank)) {
    tracker.runningCount -= 1;
  }
  // 7, 8, 9 are neutral (0)
}

export function calculateHandStrength(playerCards: Card[], communityCards: Card[]): number {
  const allCards = [...playerCards, ...communityCards];
  if (allCards.length < 5) {
    return calculatePreFlopStrength(playerCards);
  }
  
  const hand = evaluateHand(allCards);
  return Math.min(hand.score / 900, 1);
}

function calculatePreFlopStrength(playerCards: Card[]): number {
  if (playerCards.length !== 2) return 0;
  
  const [card1, card2] = playerCards;
  const rank1 = getRankValue(card1.rank);
  const rank2 = getRankValue(card2.rank);
  const isPair = card1.rank === card2.rank;
  const isSuited = card1.suit === card2.suit;
  const gap = Math.abs(rank1 - rank2);
  
  let strength = 0;
  
  if (isPair) {
    if (rank1 >= 12) strength = 0.9; // AA, KK, QQ
    else if (rank1 >= 9) strength = 0.8; // JJ, TT, 99
    else if (rank1 >= 6) strength = 0.6; // 88, 77, 66
    else strength = 0.4; // Low pairs
  } else {
    const highCard = Math.max(rank1, rank2);
    const lowCard = Math.min(rank1, rank2);
    
    if (highCard === 14) { // Ace
      if (lowCard >= 12) strength = 0.85; // AK, AQ
      else if (lowCard >= 10) strength = 0.75; // AJ, AT
      else if (lowCard >= 8) strength = 0.65; // A9, A8
      else strength = 0.5; // A7 and below
    } else if (highCard >= 12) { // K or Q
      if (lowCard >= 10) strength = 0.7; // KQ, KJ, QJ
      else if (lowCard >= 8) strength = 0.6; // K9, Q9, etc.
      else strength = 0.4;
    } else {
      strength = 0.3;
    }
    
    if (isSuited) strength += 0.1; // Suited bonus
    if (gap <= 4 && !isPair) strength += 0.05; // Connector bonus
  }
  
  return Math.min(strength, 1);
}

function getRankValue(rank: Rank): number {
  const rankValues: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  return rankValues[rank];
}

export function calculatePotOdds(pot: number, betToCall: number): number {
  if (betToCall === 0) return Infinity;
  return pot / betToCall;
}

export function calculateAdvancedOuts(playerCards: Card[], communityCards: Card[], deckTracker: DeckTracker): { outs: number; draws: DrawInfo[] } {
  if (playerCards.length !== 2) return { outs: 0, draws: [] };
  
  const allCurrentCards = [...playerCards, ...communityCards];
  const draws: DrawInfo[] = [];
  let totalOuts = 0;
  
  if (allCurrentCards.length >= 5) {
    const currentHand = evaluateHand(allCurrentCards);
    let improveOuts = 0;
    
    for (const remainingCard of deckTracker.remainingCards) {
      const testCards = [...playerCards, ...communityCards, remainingCard];
      const newHand = evaluateHand(testCards);
      
      if (newHand.score > currentHand.score) {
        improveOuts++;
      }
    }
    
    if (improveOuts > 0) {
      draws.push({
        type: 'none',
        outs: improveOuts,
        probability: (improveOuts / deckTracker.remainingCards.length) * 100,
        description: `${improveOuts} cards to improve`
      });
    }
    
    return { outs: improveOuts, draws };
  }
  
  // Pre-flop and early street analysis
  const flushDraws = analyzeFlushDraw(playerCards, communityCards, deckTracker);
  const straightDraws = analyzeStraightDraw(playerCards, communityCards, deckTracker);
  const pairDraws = analyzePairDraw(playerCards, communityCards, deckTracker);
  
  // Add all flush draws
  flushDraws.forEach(draw => {
    draws.push(draw);
    totalOuts += draw.outs;
  });
  
  // Add all straight draws
  straightDraws.forEach(draw => {
    draws.push(draw);
    totalOuts += draw.outs;
  });
  
  // Add all pair draws
  pairDraws.forEach(draw => {
    draws.push(draw);
    totalOuts += draw.outs;
  });
  
  return { outs: Math.min(totalOuts, 47), draws };
}

function analyzeFlushDraw(playerCards: Card[], communityCards: Card[], deckTracker: DeckTracker): DrawInfo[] {
  const allCards = [...playerCards, ...communityCards];
  const suitCounts = new Map<string, number>();
  const draws: DrawInfo[] = [];
  
  allCards.forEach(card => {
    suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
  });
  
  // Check for 4-card flush draws
  for (const [suit, count] of Array.from(suitCounts.entries())) {
    if (count === 4) {
      const remainingSuitCards = deckTracker.remainingCards.filter(card => card.suit === suit).length;
      if (remainingSuitCards > 0) {
        draws.push({
          type: 'flush',
          outs: remainingSuitCards,
          probability: (remainingSuitCards / deckTracker.remainingCards.length) * 100,
          description: `Flush draw (${remainingSuitCards} ${suit}s remaining)`
        });
      }
    }
  }
  
  // Check for backdoor flush draws (3 cards of same suit)
  for (const [suit, count] of Array.from(suitCounts.entries())) {
    if (count === 3 && communityCards.length === 3) {
      const remainingSuitCards = deckTracker.remainingCards.filter(card => card.suit === suit).length;
      if (remainingSuitCards > 0) {
        draws.push({
          type: 'backdoor-flush',
          outs: remainingSuitCards,
          probability: (remainingSuitCards / deckTracker.remainingCards.length) * 100,
          description: `Backdoor flush draw (${remainingSuitCards} ${suit}s remaining)`
        });
      }
    }
  }
  
  return draws;
}

function analyzeStraightDraw(playerCards: Card[], communityCards: Card[], deckTracker: DeckTracker): DrawInfo[] {
  const allCards = [...playerCards, ...communityCards];
  const ranks = allCards.map(card => getRankValue(card.rank));
  const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => a - b);
  const draws: DrawInfo[] = [];
  
  if (uniqueRanks.length < 3) return draws;
  
  // Check for open-ended straight draws
  for (let i = 0; i <= uniqueRanks.length - 3; i++) {
    const sequence = uniqueRanks.slice(i, i + 3);
    if (sequence[1] - sequence[0] === 1 && sequence[2] - sequence[1] === 1) {
      const lowEnd = sequence[0] - 1;
      const highEnd = sequence[2] + 1;
      let outs = 0;
      
      if (lowEnd >= 2) {
        outs += deckTracker.remainingCards.filter(card => getRankValue(card.rank) === lowEnd).length;
      }
      if (highEnd <= 14) {
        outs += deckTracker.remainingCards.filter(card => getRankValue(card.rank) === highEnd).length;
      }
      
      if (outs > 0) {
        draws.push({
          type: 'straight',
          outs,
          probability: (outs / deckTracker.remainingCards.length) * 100,
          description: `Open-ended straight draw (${outs} outs)`
        });
      }
    }
  }
  
  // Check for gutshot straight draws
  const foundGutshots = new Set<number>();
  for (let i = 0; i < uniqueRanks.length; i++) {
    for (let j = i + 1; j < uniqueRanks.length; j++) {
      for (let k = j + 1; k < uniqueRanks.length; k++) {
        const ranks3 = [uniqueRanks[i], uniqueRanks[j], uniqueRanks[k]];
        
        // Check for missing card in 4-card straight
        for (let start = Math.max(2, ranks3[0] - 1); start <= Math.min(11, ranks3[2] + 1); start++) {
          const targetStraight = [start, start + 1, start + 2, start + 3];
          const missing = targetStraight.filter(rank => !ranks3.includes(rank));
          
          if (missing.length === 1 && !foundGutshots.has(missing[0])) {
            const missingRank = missing[0];
            const outs = deckTracker.remainingCards.filter(card => getRankValue(card.rank) === missingRank).length;
            
            if (outs > 0) {
              foundGutshots.add(missingRank);
              draws.push({
                type: 'gutshot',
                outs,
                probability: (outs / deckTracker.remainingCards.length) * 100,
                description: `Gutshot straight draw (${outs} outs to ${getRankFromValue(missingRank)})`
              });
            }
          }
        }
      }
    }
  }
  
  // Check for double gutshot (two different cards complete a straight)
  if (uniqueRanks.length >= 4) {
    for (let start = 2; start <= 10; start++) {
      const targetStraight = [start, start + 1, start + 2, start + 3, start + 4];
      const missing = targetStraight.filter(rank => !uniqueRanks.includes(rank));
      
      if (missing.length === 2) {
        let totalOuts = 0;
        missing.forEach(missingRank => {
          totalOuts += deckTracker.remainingCards.filter(card => getRankValue(card.rank) === missingRank).length;
        });
        
        if (totalOuts > 0) {
          draws.push({
            type: 'double-gutshot',
            outs: totalOuts,
            probability: (totalOuts / deckTracker.remainingCards.length) * 100,
            description: `Double gutshot (${totalOuts} outs to ${missing.map(getRankFromValue).join(' or ')})`
          });
        }
      }
    }
  }
  
  return draws;
}

function getRankFromValue(value: number): string {
  const rankMap: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A'
  };
  return rankMap[value] || '?';
}

function analyzePairDraw(playerCards: Card[], communityCards: Card[], deckTracker: DeckTracker): DrawInfo[] {
  const playerRanks = playerCards.map(card => card.rank);
  const communityRanks = communityCards.map(card => card.rank);
  const draws: DrawInfo[] = [];
  
  // If we have a pocket pair, look for trips/quads
  if (playerRanks[0] === playerRanks[1]) {
    const pairRank = playerRanks[0];
    const outs = deckTracker.remainingCards.filter(card => card.rank === pairRank).length;
    
    if (outs > 0) {
      draws.push({
        type: 'trips',
        outs,
        probability: (outs / deckTracker.remainingCards.length) * 100,
        description: `Set draw (${outs} outs to trips)`
      });
    }
  } else {
    // Look for pairing each hole card separately
    for (const rank of playerRanks) {
      if (!communityRanks.includes(rank)) {
        const outs = deckTracker.remainingCards.filter(card => card.rank === rank).length;
        
        if (outs > 0) {
          draws.push({
            type: 'pair',
            outs,
            probability: (outs / deckTracker.remainingCards.length) * 100,
            description: `Pair ${rank}s (${outs} outs)`
          });
        }
      }
    }
    
    // Look for two pair draws (if we already have one pair)
    const playerRankCounts = new Map<string, number>();
    const allRanks = [...playerRanks, ...communityRanks];
    allRanks.forEach(rank => {
      playerRankCounts.set(rank, (playerRankCounts.get(rank) || 0) + 1);
    });
    
    const pairs = Array.from(playerRankCounts.entries()).filter(([_, count]) => count === 2);
    if (pairs.length === 1) {
      const unpaired = playerRanks.filter(rank => !pairs.some(([pairRank]) => pairRank === rank));
      for (const rank of unpaired) {
        const outs = deckTracker.remainingCards.filter(card => card.rank === rank).length;
        
        if (outs > 0) {
          draws.push({
            type: 'two-pair',
            outs,
            probability: (outs / deckTracker.remainingCards.length) * 100,
            description: `Two pair (${outs} outs to pair ${rank}s)`
          });
        }
      }
    }
  }
  
  return draws;
}

export function calculateOuts(playerCards: Card[], communityCards: Card[], deckTracker: DeckTracker): number {
  return calculateAdvancedOuts(playerCards, communityCards, deckTracker).outs;
}

export function calculateEquity(playerCards: Card[], communityCards: Card[], deckTracker: DeckTracker): number {
  if (playerCards.length !== 2) return 0;
  
  const allCards = [...playerCards, ...communityCards];
  
  if (allCards.length < 5) {
    return calculatePreFlopEquity(playerCards, communityCards, deckTracker);
  }
  
  const currentHand = evaluateHand(allCards);
  let wins = 0;
  let total = 0;
  
  for (const card1 of deckTracker.remainingCards) {
    for (const card2 of deckTracker.remainingCards) {
      if (card1 === card2) continue;
      
      const opponentCards = [card1, card2];
      const opponentHand = evaluateHand([...opponentCards, ...communityCards]);
      
      if (currentHand.score > opponentHand.score) {
        wins++;
      } else if (currentHand.score === opponentHand.score) {
        wins += 0.5; // Split pot
      }
      
      total++;
      
      if (total > 1000) break; // Performance limit
    }
    if (total > 1000) break;
  }
  
  return total > 0 ? wins / total : 0;
}

function calculatePreFlopEquity(playerCards: Card[], communityCards: Card[], deckTracker: DeckTracker): number {
  // Simplified pre-flop equity calculation
  const strength = calculatePreFlopStrength(playerCards);
  
  // Adjust based on number of opponents (assuming heads-up for simplicity)
  return Math.max(0.1, strength - 0.1);
}

export function calculateExpectedValue(
  equity: number,
  potOdds: number,
  outs: number,
  remainingCards: number,
  betToCall: number,
  pot: number
): number {
  if (remainingCards === 0 || betToCall === 0) return 0;
  
  const winProbability = Math.min(0.95, equity + (outs / remainingCards) * 0.3);
  const winAmount = pot + betToCall;
  const loseAmount = betToCall;
  
  return (winProbability * winAmount) - ((1 - winProbability) * loseAmount);
}

export function getRecommendation(analysis: PlayerAnalysis, validActions: string[]): 'fold' | 'call' | 'raise' | 'all-in' {
  const { handStrength, potentialStrength, equity, expectedValue, outs, draws, winProbability } = analysis;
  
  // Premium hands - always aggressive
  if (handStrength > 0.85 || equity > 0.8) {
    if (validActions.includes('raise')) return 'raise';
    if (validActions.includes('all-in')) return 'all-in';
    if (validActions.includes('call')) return 'call';
  }
  
  // Strong hands with good potential
  if (handStrength > 0.7 || (potentialStrength > 0.8 && outs >= 8)) {
    if (validActions.includes('raise')) return 'raise';
    if (validActions.includes('call')) return 'call';
  }
  
  // Drawing hands with good odds
  const hasStrongDraw = draws.some(draw => 
    (draw.type === 'flush' && draw.outs >= 9) ||
    (draw.type === 'straight' && draw.outs >= 8) ||
    (draw.type === 'double-gutshot' && draw.outs >= 8) ||
    (draw.type === 'trips' && draw.outs >= 2)
  );
  
  // Medium draws worth considering with good pot odds
  const hasMediumDraw = draws.some(draw => 
    (draw.type === 'gutshot' && draw.outs >= 4) ||
    (draw.type === 'backdoor-flush' && draw.outs >= 9) ||
    (draw.type === 'pair' && draw.outs >= 3)
  );
  
  if (hasStrongDraw && expectedValue > 0) {
    if (validActions.includes('call')) return 'call';
  }
  
  // Medium draws with decent pot odds
  if (hasMediumDraw && analysis.potOdds > 3 && expectedValue > -0.1) {
    if (validActions.includes('call')) return 'call';
  }
  
  // Medium strength hands with positive EV
  if (expectedValue > 0 && (handStrength > 0.5 || winProbability > 0.4)) {
    if (validActions.includes('call')) return 'call';
  }
  
  // Marginal hands with very good pot odds
  if (analysis.potOdds > 4 && (handStrength > 0.3 || outs > 4)) {
    if (validActions.includes('call')) return 'call';
  }
  
  // Default to fold
  return 'fold';
}

export function analyzePlayer(gameState: GameState, playerIndex: number): PlayerAnalysis {
  const player = gameState.players[playerIndex];
  const { deckTracker } = gameState;
  
  if (player.cards.length === 0) {
    return {
      handStrength: 0,
      potentialStrength: 0,
      currentHandRank: 'none',
      potOdds: 0,
      equity: 0,
      expectedValue: 0,
      recommendation: 'fold',
      confidence: 0,
      outs: 0,
      draws: [],
      cardCount: deckTracker.trueCount,
      winProbability: 0
    };
  }
  
  const handStrength = calculateHandStrength(player.cards, gameState.communityCards);
  const equity = calculateEquity(player.cards, gameState.communityCards, deckTracker);
  const { outs, draws } = calculateAdvancedOuts(player.cards, gameState.communityCards, deckTracker);
  
  const betToCall = gameState.currentBet - player.currentBet;
  const potOdds = calculatePotOdds(gameState.pot, betToCall);
  
  // Calculate potential strength (current + draw potential)
  const drawPotential = draws.reduce((sum, draw) => sum + (draw.probability / 100) * 0.5, 0);
  const potentialStrength = Math.min(1, handStrength + drawPotential);
  
  // Calculate win probability
  const winProbability = Math.min(0.95, equity + (outs / Math.max(1, deckTracker.remainingCards.length)) * 0.4);
  
  const expectedValue = calculateExpectedValue(
    equity,
    potOdds,
    outs,
    deckTracker.remainingCards.length,
    betToCall,
    gameState.pot
  );
  
  // Determine current hand rank
  let currentHandRank = 'high-card';
  if (player.cards.length === 2 && gameState.communityCards.length >= 3) {
    try {
      const allCards = [...player.cards, ...gameState.communityCards];
      if (allCards.length >= 5) {
        const hand = evaluateHand(allCards);
        currentHandRank = hand.rank;
      }
    } catch {
      currentHandRank = 'high-card';
    }
  }
  
  const analysis: PlayerAnalysis = {
    handStrength,
    potentialStrength,
    currentHandRank,
    potOdds,
    equity,
    expectedValue,
    recommendation: 'fold',
    confidence: Math.min(Math.abs(deckTracker.trueCount) / 5, 1),
    outs,
    draws,
    cardCount: deckTracker.trueCount,
    winProbability
  };
  
  const validActions = getValidActionsForAnalysis(gameState, playerIndex);
  analysis.recommendation = getRecommendation(analysis, validActions);
  
  return analysis;
}

function getValidActionsForAnalysis(gameState: GameState, playerIndex: number): string[] {
  const player = gameState.players[playerIndex];
  const actions: string[] = [];
  
  if (player.isFolded || player.isAllIn) {
    return actions;
  }
  
  const callAmount = gameState.currentBet - player.currentBet;
  
  // Only allow fold if there's a bet to call (callAmount > 0)
  // No point in folding when you can check for free
  if (callAmount > 0) {
    actions.push('fold');
  }
  
  if (callAmount === 0) {
    actions.push('check');
  } else if (player.chips >= callAmount) {
    actions.push('call');
  }
  
  if (player.chips > callAmount) {
    if (callAmount === 0) {
      actions.push('bet');
    } else {
      actions.push('raise');
    }
  }
  
  if (player.chips > 0) {
    actions.push('all-in');
  }
  
  return actions;
}