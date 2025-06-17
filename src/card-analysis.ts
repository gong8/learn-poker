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
  if (betToCall <= 0) return 0; // When you can check for free, pot odds are irrelevant
  return pot / betToCall;
}

export function calculateAdvancedOuts(playerCards: Card[], communityCards: Card[], deckTracker: DeckTracker): { outs: number; draws: DrawInfo[] } {
  if (playerCards.length !== 2) return { outs: 0, draws: [] };
  
  const allCurrentCards = [...playerCards, ...communityCards];
  const draws: DrawInfo[] = [];
  let totalOuts = 0;
  
  if (allCurrentCards.length >= 5) {
    // For complete hands (5+ cards), still analyze specific draws but also include improvement
    const flushDraws = analyzeFlushDraw(playerCards, communityCards, deckTracker);
    const straightDraws = analyzeStraightDraw(playerCards, communityCards, deckTracker);
    const pairDraws = analyzePairDraw(playerCards, communityCards, deckTracker);
    const fullHouseDraws = analyzeFullHouseDraws(playerCards, communityCards, deckTracker);
    
    const allDraws = [...flushDraws, ...straightDraws, ...pairDraws, ...fullHouseDraws];
    
    // Add generic improvement draw if there are other outs not covered
    const currentHand = evaluateHand(allCurrentCards);
    let improveOuts = 0;
    
    for (const remainingCard of deckTracker.remainingCards) {
      const testCards = [...playerCards, ...communityCards, remainingCard];
      const newHand = evaluateHand(testCards);
      
      if (newHand.score > currentHand.score) {
        improveOuts++;
      }
    }
    
    // Only add improve draw if there are outs not covered by specific draws
    const specificOuts = allDraws.reduce((sum, draw) => sum + draw.outs, 0);
    const additionalOuts = Math.max(0, improveOuts - specificOuts);
    
    if (additionalOuts > 0) {
      const handRank = currentHand.rank;
      let improvementDescription = '';
      
      if (handRank === 'high-card') {
        improvementDescription = `${additionalOuts} additional outs to improve`;
      } else if (handRank === 'pair') {
        improvementDescription = `${additionalOuts} other outs for two pair, trips, or better`;
      } else if (handRank === 'two-pair') {
        improvementDescription = `${additionalOuts} other outs for full house or better`;
      } else if (handRank === 'three-of-a-kind') {
        improvementDescription = `${additionalOuts} other outs for full house or quads`;
      } else {
        improvementDescription = `${additionalOuts} other outs to improve ${handRank.replace('-', ' ')}`;
      }
      
      allDraws.push({
        type: 'improve',
        outs: additionalOuts,
        probability: (additionalOuts / deckTracker.remainingCards.length) * 100,
        description: improvementDescription
      });
    }
    
    allDraws.sort((a, b) => b.probability - a.probability);
    const totalUniqueOuts = Math.min(improveOuts, 21); // Cap at reasonable maximum
    
    return { outs: totalUniqueOuts, draws: allDraws };
  }
  
  // Pre-flop and early street analysis
  const flushDraws = analyzeFlushDraw(playerCards, communityCards, deckTracker);
  const straightDraws = analyzeStraightDraw(playerCards, communityCards, deckTracker);
  const pairDraws = analyzePairDraw(playerCards, communityCards, deckTracker);
  
  // Add all draws but avoid double-counting outs
  const allDraws = [...flushDraws, ...straightDraws, ...pairDraws];
  
  // Sort by probability (highest first)
  allDraws.sort((a, b) => b.probability - a.probability);
  
  // Calculate total unique outs (approximate since some outs might overlap)
  let uniqueOuts = 0;
  const countedRanks = new Set<string>();
  
  allDraws.forEach(draw => {
    if (draw.type.includes('flush')) {
      uniqueOuts += Math.min(draw.outs, 9); // Max 9 flush outs
    } else {
      // For straight draws, estimate non-overlapping outs
      uniqueOuts += Math.min(draw.outs, 8); // Max 8 straight outs
    }
  });
  
  return { outs: Math.min(uniqueOuts, 21), draws: allDraws };
}

function analyzeFlushDraw(playerCards: Card[], communityCards: Card[], deckTracker: DeckTracker): DrawInfo[] {
  const allCards = [...playerCards, ...communityCards];
  const suitCounts = new Map<string, number>();
  const draws: DrawInfo[] = [];
  
  allCards.forEach(card => {
    suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
  });
  
  // Check for flush draws (4 cards of same suit)
  for (const [suit, count] of Array.from(suitCounts.entries())) {
    if (count === 4) {
      const remainingSuitCards = deckTracker.remainingCards.filter(card => card.suit === suit).length;
      if (remainingSuitCards > 0) {
        // Check if this could also be a straight flush or royal flush
        const suitedCards = allCards.filter(card => card.suit === suit);
        const suitedRanks = suitedCards.map(card => getRankValue(card.rank)).sort((a, b) => a - b);
        
        let isRoyalFlushDraw = false;
        let isStraightFlushDraw = false;
        
        // Check for royal flush draw (need A, K, Q, J, 10 of same suit)
        const royalRanks = [10, 11, 12, 13, 14];
        const hasRoyalCards = royalRanks.filter(rank => suitedRanks.includes(rank));
        if (hasRoyalCards.length >= 3) {
          const missingRoyalRanks = royalRanks.filter(rank => !suitedRanks.includes(rank));
          const royalOuts = deckTracker.remainingCards.filter(card => 
            card.suit === suit && missingRoyalRanks.includes(getRankValue(card.rank))
          ).length;
          
          if (royalOuts > 0) {
            isRoyalFlushDraw = true;
            draws.push({
              type: 'royal-flush',
              outs: royalOuts,
              probability: (royalOuts / deckTracker.remainingCards.length) * 100,
              description: `Royal flush draw - need ${missingRoyalRanks.map(r => getRankFromValue(r)).join(', ')} of ${suit}s`
            });
          }
        }
        
        // Check for other straight flush draws
        if (!isRoyalFlushDraw && suitedRanks.length >= 3) {
          for (let start = 1; start <= 10; start++) {
            const targetStraight = start === 1 ? [14, 2, 3, 4, 5] : [start, start+1, start+2, start+3, start+4];
            const matchingSuited = targetStraight.filter(rank => suitedRanks.includes(rank));
            const missingSuited = targetStraight.filter(rank => !suitedRanks.includes(rank));
            
            if (matchingSuited.length >= 3 && missingSuited.length === 1) {
              const straightFlushOuts = deckTracker.remainingCards.filter(card => 
                card.suit === suit && missingSuited.includes(getRankValue(card.rank))
              ).length;
              
              if (straightFlushOuts > 0) {
                isStraightFlushDraw = true;
                draws.push({
                  type: 'straight-flush',
                  outs: straightFlushOuts,
                  probability: (straightFlushOuts / deckTracker.remainingCards.length) * 100,
                  description: `Straight flush draw - need ${getRankFromValue(missingSuited[0])} of ${suit}s`
                });
                break;
              }
            }
          }
        }
        
        // Regular flush draw (if not straight flush)
        if (!isRoyalFlushDraw && !isStraightFlushDraw) {
          draws.push({
            type: 'flush',
            outs: remainingSuitCards,
            probability: (remainingSuitCards / deckTracker.remainingCards.length) * 100,
            description: `Flush draw - need 1 more ${suit}`
          });
        }
      }
    }
  }
  
  // Check for near-flush draws (3 cards of same suit when we have 5+ total cards)
  for (const [suit, count] of Array.from(suitCounts.entries())) {
    if (count === 3 && allCards.length >= 5) {
      const remainingSuitCards = deckTracker.remainingCards.filter(card => card.suit === suit).length;
      if (remainingSuitCards > 0) {
        draws.push({
          type: 'flush-draw' as const,
          outs: remainingSuitCards,
          probability: (remainingSuitCards / deckTracker.remainingCards.length) * 100,
          description: `Possible flush - need 2 more ${suit}s`
        });
      }
    }
  }
  
  // Check for backdoor flush draws (3 cards of same suit on flop)
  if (communityCards.length === 3) {
    for (const [suit, count] of Array.from(suitCounts.entries())) {
      if (count === 3) {
        const remainingSuitCards = deckTracker.remainingCards.filter(card => card.suit === suit).length;
        if (remainingSuitCards >= 2) {
          // Calculate probability of hitting both turn and river
          const turnProb = remainingSuitCards / deckTracker.remainingCards.length;
          const riverProb = (remainingSuitCards - 1) / (deckTracker.remainingCards.length - 1);
          const backdoorProb = turnProb * riverProb * 100;
          
          draws.push({
            type: 'backdoor-flush',
            outs: remainingSuitCards,
            probability: backdoorProb,
            description: `Backdoor flush draw - need both turn and river ${suit}s`
          });
        }
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
  
  // Find all possible straights and their missing cards
  const foundDraws = new Set<string>();
  
  // Check all possible 5-card straights (A-2-3-4-5 through 10-J-Q-K-A)
  const straightStarts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // 1 represents wheel straight (A-2-3-4-5)
  
  for (const start of straightStarts) {
    let targetStraight: number[];
    if (start === 1) {
      targetStraight = [14, 2, 3, 4, 5]; // Wheel straight: A-2-3-4-5
    } else {
      targetStraight = [start, start + 1, start + 2, start + 3, start + 4];
    }
    
    const matchingRanks = targetStraight.filter(rank => uniqueRanks.includes(rank));
    const missingRanks = targetStraight.filter(rank => !uniqueRanks.includes(rank));
    
    if (matchingRanks.length >= 3 && missingRanks.length > 0 && missingRanks.length <= 2) {
      let totalOuts = 0;
      const missingRankNames: string[] = [];
      
      missingRanks.forEach(missingRank => {
        const outs = deckTracker.remainingCards.filter(card => getRankValue(card.rank) === missingRank).length;
        totalOuts += outs;
        missingRankNames.push(getRankFromValue(missingRank));
      });
      
      if (totalOuts > 0) {
        const drawKey = `${missingRanks.sort().join('-')}`;
        if (!foundDraws.has(drawKey)) {
          foundDraws.add(drawKey);
          
          let drawType: string;
          let description: string;
          
          if (missingRanks.length === 1) {
            // Check if it's open-ended or gutshot
            const missingRank = missingRanks[0];
            const isOpenEnded = (
              (missingRank === targetStraight[0] || missingRank === targetStraight[4]) &&
              matchingRanks.length === 4
            );
            
            if (isOpenEnded) {
              drawType = 'open-ended';
              description = `Open-ended straight draw - need ${missingRankNames[0]}`;
            } else {
              drawType = 'gutshot';
              description = `Inside straight draw - need ${missingRankNames[0]}`;
            }
          } else {
            drawType = 'double-gutshot';
            description = `Double gutshot - need ${missingRankNames.join(' or ')}`;
          }
          
          draws.push({
            type: drawType as 'open-ended' | 'gutshot' | 'double-gutshot',
            outs: totalOuts,
            probability: (totalOuts / deckTracker.remainingCards.length) * 100,
            description
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
  const allCards = [...playerCards, ...communityCards];
  const draws: DrawInfo[] = [];
  
  // Count all ranks
  const rankCounts = new Map<string, number>();
  allCards.forEach(card => {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
  });
  
  // If we have a pocket pair, look for trips/quads
  if (playerRanks[0] === playerRanks[1]) {
    const pairRank = playerRanks[0];
    const outs = deckTracker.remainingCards.filter(card => card.rank === pairRank).length;
    
    if (outs > 0) {
      const currentCount = rankCounts.get(pairRank) || 0;
      if (currentCount === 2) {
        draws.push({
          type: 'trips',
          outs,
          probability: (outs / deckTracker.remainingCards.length) * 100,
          description: `Set draw - ${outs} outs to trips`
        });
      } else if (currentCount === 3) {
        draws.push({
          type: 'four-of-a-kind',
          outs,
          probability: (outs / deckTracker.remainingCards.length) * 100,
          description: `Quads draw - ${outs} out to four of a kind`
        });
      }
    }
  } else {
    // Look for pairing each hole card separately
    for (const rank of playerRanks) {
      const currentCount = rankCounts.get(rank) || 0;
      const outs = deckTracker.remainingCards.filter(card => card.rank === rank).length;
      
      if (outs > 0 && currentCount === 1) {
        draws.push({
          type: 'pair',
          outs,
          probability: (outs / deckTracker.remainingCards.length) * 100,
          description: `Pair of ${rank}s - ${outs} outs`
        });
      } else if (outs > 0 && currentCount === 2) {
        draws.push({
          type: 'trips',
          outs,
          probability: (outs / deckTracker.remainingCards.length) * 100,
          description: `Trips ${rank}s - ${outs} outs`
        });
      } else if (outs > 0 && currentCount === 3) {
        draws.push({
          type: 'four-of-a-kind',
          outs,
          probability: (outs / deckTracker.remainingCards.length) * 100,
          description: `Quads ${rank}s - ${outs} out`
        });
      }
    }
    
    // Look for two pair draws (if we already have one pair)
    const pairs = Array.from(rankCounts.entries()).filter(([_, count]) => count === 2);
    if (pairs.length === 1) {
      const unpaired = playerRanks.filter(rank => (rankCounts.get(rank) || 0) === 1);
      for (const rank of unpaired) {
        const outs = deckTracker.remainingCards.filter(card => card.rank === rank).length;
        
        if (outs > 0) {
          draws.push({
            type: 'two-pair',
            outs,
            probability: (outs / deckTracker.remainingCards.length) * 100,
            description: `Two pair - ${outs} outs to pair ${rank}s`
          });
        }
      }
    }
  }
  
  // Look for runner-runner possibilities (when < 5 cards)
  if (allCards.length <= 4 && communityCards.length <= 3) {
    analyzeRunnerRunnerDraws(playerCards, communityCards, deckTracker, draws);
  }
  
  return draws;
}

function analyzeRunnerRunnerDraws(playerCards: Card[], communityCards: Card[], deckTracker: DeckTracker, draws: DrawInfo[]): void {
  // Only analyze runner-runner on flop or earlier
  if (communityCards.length > 3) return;
  
  const allCards = [...playerCards, ...communityCards];
  const suits = allCards.map(card => card.suit);
  const ranks = allCards.map(card => getRankValue(card.rank));
  
  // Runner-runner flush (if we have 2 of same suit)
  const suitCounts = new Map<string, number>();
  suits.forEach(suit => {
    suitCounts.set(suit, (suitCounts.get(suit) || 0) + 1);
  });
  
  for (const [suit, count] of Array.from(suitCounts.entries())) {
    if (count === 2 && communityCards.length === 3) {
      const remainingSuitCards = deckTracker.remainingCards.filter(card => card.suit === suit).length;
      if (remainingSuitCards >= 2) {
        // Need both turn and river to be this suit
        const turnProb = remainingSuitCards / deckTracker.remainingCards.length;
        const riverProb = (remainingSuitCards - 1) / (deckTracker.remainingCards.length - 1);
        const runnerRunnerProb = turnProb * riverProb * 100;
        
        draws.push({
          type: 'runner-runner',
          outs: remainingSuitCards,
          probability: runnerRunnerProb,
          description: `Runner-runner flush - need both turn & river ${suit}s`
        });
      }
    }
  }
  
  // Runner-runner straight possibilities
  const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => a - b);
  if (uniqueRanks.length >= 2) {
    // Check for potential straights that need 2 more cards
    for (let i = 1; i <= 10; i++) {
      const targetStraight = i === 1 ? [14, 2, 3, 4, 5] : [i, i+1, i+2, i+3, i+4];
      const matching = targetStraight.filter(rank => uniqueRanks.includes(rank));
      const missing = targetStraight.filter(rank => !uniqueRanks.includes(rank));
      
      if (matching.length >= 2 && missing.length === 2 && communityCards.length === 3) {
        let totalOuts = 0;
        missing.forEach(missingRank => {
          const outs = deckTracker.remainingCards.filter(card => getRankValue(card.rank) === missingRank).length;
          totalOuts += outs;
        });
        
        if (totalOuts >= 2) {
          const runnerRunnerProb = (totalOuts / deckTracker.remainingCards.length) * 
                                   ((totalOuts - 1) / (deckTracker.remainingCards.length - 1)) * 100;
          
          draws.push({
            type: 'runner-runner',
            outs: totalOuts,
            probability: runnerRunnerProb,
            description: `Runner-runner straight - need ${missing.map(r => getRankFromValue(r)).join(' & ')}`
          });
        }
      }
    }
  }
}

function analyzeFullHouseDraws(playerCards: Card[], communityCards: Card[], deckTracker: DeckTracker): DrawInfo[] {
  const allCards = [...playerCards, ...communityCards];
  const draws: DrawInfo[] = [];
  
  if (allCards.length < 5) return draws;
  
  const rankCounts = new Map<string, number>();
  allCards.forEach(card => {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
  });
  
  const pairs = Array.from(rankCounts.entries()).filter(([_, count]) => count === 2);
  const trips = Array.from(rankCounts.entries()).filter(([_, count]) => count === 3);
  
  // If we have trips, look for pairing the board or improving existing pairs
  if (trips.length > 0) {
    const tripRank = trips[0][0];
    let fullHouseOuts = 0;
    
    // Check if we can improve existing pairs to trips
    pairs.forEach(([pairRank, _]) => {
      if (pairRank !== tripRank) {
        const outs = deckTracker.remainingCards.filter(card => card.rank === pairRank).length;
        fullHouseOuts += outs;
      }
    });
    
    // Check for pairing any rank on the board (community cards only)
    const communityRanks = communityCards.map(card => card.rank);
    const uniqueCommunityRanks = Array.from(new Set(communityRanks));
    
    uniqueCommunityRanks.forEach(rank => {
      if (rank !== tripRank && (rankCounts.get(rank) || 0) === 1) {
        // This rank appears once, so we can pair it
        const outs = deckTracker.remainingCards.filter(card => card.rank === rank).length;
        fullHouseOuts += outs;
      }
    });
    
    if (fullHouseOuts > 0) {
      draws.push({
        type: 'full-house',
        outs: fullHouseOuts,
        probability: (fullHouseOuts / deckTracker.remainingCards.length) * 100,
        description: `Full house draw - ${fullHouseOuts} outs to pair the board`
      });
    }
  }
  
  // If we have two pair, look for trips to make full house
  if (pairs.length >= 2) {
    let fullHouseOuts = 0;
    pairs.forEach(([pairRank, _]) => {
      const outs = deckTracker.remainingCards.filter(card => card.rank === pairRank).length;
      fullHouseOuts += outs;
    });
    
    if (fullHouseOuts > 0) {
      draws.push({
        type: 'full-house',
        outs: fullHouseOuts,
        probability: (fullHouseOuts / deckTracker.remainingCards.length) * 100,
        description: `Full house draw - ${fullHouseOuts} outs to trips`
      });
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
  
  // For complete hands (5+ cards), use a more efficient equity calculation
  const currentHand = evaluateHand(allCards);
  const handStrength = currentHand.score / 900; // Normalize to 0-1
  
  // Simplified equity based on hand strength and remaining cards
  // This is much more efficient than the nested loop approach
  let equity = handStrength;
  
  // Adjust equity based on board texture and opponents
  const remainingCards = deckTracker.remainingCards.length;
  const communityStrength = evaluateCommunityStrength(communityCards);
  
  // If board is dangerous and our hand isn't very strong, reduce equity
  if (communityStrength > 0.6 && handStrength < 0.6) {
    equity *= 0.8;
  }
  
  // If we have draws, add some equity potential
  const { outs } = calculateAdvancedOuts(playerCards, communityCards, deckTracker);
  const drawEquity = Math.min(0.3, (outs / Math.max(1, remainingCards)) * 0.4);
  equity += drawEquity;
  
  return Math.min(0.95, Math.max(0.05, equity));
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
  // If we can check for free, EV is always positive (no cost to see next card)
  if (betToCall <= 0) return pot * equity;
  
  if (remainingCards === 0) return 0;
  
  // Use equity directly as win probability, don't double-count outs
  const winProbability = Math.min(0.95, Math.max(0.05, equity));
  const winAmount = pot + betToCall;
  const loseAmount = betToCall;
  
  return (winProbability * winAmount) - ((1 - winProbability) * loseAmount);
}

export function getRecommendation(analysis: PlayerAnalysis, validActions: string[]): 'fold' | 'call' | 'check' | 'bet' | 'raise' | 'all-in' {
  const { handStrength, potentialStrength, equity, expectedValue, outs, draws, winProbability } = analysis;
  
  // Premium hands - always aggressive
  if (handStrength > 0.85 || equity > 0.8) {
    if (validActions.includes('raise')) return 'raise';
    if (validActions.includes('bet')) return 'bet';
    if (validActions.includes('all-in')) return 'all-in';
    if (validActions.includes('call')) return 'call';
  }
  
  // Strong hands with good potential
  if (handStrength > 0.7 || (potentialStrength > 0.8 && outs >= 8)) {
    if (validActions.includes('raise')) return 'raise';
    if (validActions.includes('bet')) return 'bet';
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
  
  // Medium draws with decent pot odds (or when we can check for free)
  if (hasMediumDraw && (analysis.potOdds === 0 || analysis.potOdds > 3) && expectedValue > -0.1) {
    if (validActions.includes('call')) return 'call';
    if (validActions.includes('check')) return 'check';
  }
  
  // Medium strength hands with positive EV
  if (expectedValue > 0 && (handStrength > 0.5 || winProbability > 0.4)) {
    if (validActions.includes('call')) return 'call';
    if (validActions.includes('check')) return 'check';
  }
  
  // Marginal hands with very good pot odds (or free to see next card)
  if ((analysis.potOdds === 0 || analysis.potOdds > 4) && (handStrength > 0.3 || outs > 4)) {
    if (validActions.includes('call')) return 'call';
    if (validActions.includes('check')) return 'check';
  }
  
  // Default to fold or check if possible
  if (validActions.includes('check')) return 'check';
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

  // Consider game context
  const activePlayers = gameState.players.filter(p => !p.isFolded && !p.isAllIn);
  const numberOfOpponents = activePlayers.length - 1;
  const foldedPlayersCount = gameState.players.filter(p => p.isFolded).length;
  
  let handStrength = calculateHandStrength(player.cards, gameState.communityCards);
  let equity = calculateEquity(player.cards, gameState.communityCards, deckTracker);
  const { outs, draws } = calculateAdvancedOuts(player.cards, gameState.communityCards, deckTracker);

  // Adjust for number of opponents - fewer opponents = higher relative strength
  const opponentAdjustment = Math.max(0.8, 1 - (numberOfOpponents - 1) * 0.1);
  handStrength *= opponentAdjustment;
  equity *= opponentAdjustment;

  // Evaluate community card strength and adjust accordingly
  if (gameState.communityCards.length >= 3) {
    const communityStrength = evaluateCommunityStrength(gameState.communityCards);
    
    // If community is very strong but player hand is weak, reduce confidence
    if (communityStrength > 0.7 && handStrength < 0.4) {
      handStrength *= 0.8;
      equity *= 0.9;
    }
    
    // If community is weak and player has decent cards, boost slightly
    if (communityStrength < 0.3 && handStrength > 0.6) {
      handStrength *= 1.1;
      equity *= 1.05;
    }
  }
  
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
  if (player.cards.length === 2) {
    try {
      const allCards = [...player.cards, ...gameState.communityCards];
      if (allCards.length >= 2) {
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

function evaluateCommunityStrength(communityCards: Card[]): number {
  if (communityCards.length < 3) return 0;
  
  const ranks = communityCards.map(card => getRankValue(card.rank));
  const suits = communityCards.map(card => card.suit);
  
  let strength = 0;
  
  // Check for pairs/trips on board
  const rankCounts = new Map<number, number>();
  ranks.forEach(rank => {
    rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
  });
  
  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  if (counts[0] >= 3) strength += 0.8; // Trips on board
  else if (counts[0] >= 2) strength += 0.5; // Pair on board
  
  // Check for flush possibilities
  const suitCounts = new Map<string, number>();
  suits.forEach(suit => {
    suitCounts.set(suit, (suitCounts.get(suit) || 0) + 1);
  });
  
  const maxSuitCount = Math.max(...Array.from(suitCounts.values()));
  if (maxSuitCount >= 4) strength += 0.7; // Flush possible
  else if (maxSuitCount >= 3) strength += 0.3; // Flush draw possible
  
  // Check for straight possibilities
  const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => a - b);
  if (uniqueRanks.length >= 3) {
    let maxConsecutive = 1;
    let currentConsecutive = 1;
    
    for (let i = 1; i < uniqueRanks.length; i++) {
      if (uniqueRanks[i] - uniqueRanks[i - 1] === 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }
    
    if (maxConsecutive >= 4) strength += 0.6; // Straight possible
    else if (maxConsecutive >= 3) strength += 0.2; // Straight draw possible
  }
  
  // Check for high cards
  const highCardBonus = ranks.filter(rank => rank >= 11).length * 0.1;
  strength += highCardBonus;
  
  return Math.min(strength, 1);
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