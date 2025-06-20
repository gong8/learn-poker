/**
 * Advanced Poker Analysis Engine
 * Integrates all poker research data: Nash equilibrium, ICM, GTO ranges, bet sizing, and equity calculations
 */

import { 
  Card, 
  GameState, 
  Player, 
  PlayerAnalysis, 
  DrawInfo, 
  BetSizingRecommendation,
  TournamentAdjustment,
  ICMSituation,
  BoardTexture,
  EquityResult,
  DrawEquity
} from './types';

import { 
  NASH_PUSH_RANGES, 
  NASH_CALL_RANGES, 
  shouldPushFold, 
  getGTORange, 
  convertHandToString, 
  isHandInRange 
} from './poker-ranges';

import { 
  calculateICM, 
  calculateBubbleFactor, 
  getStackCategory, 
  getTournamentAdjustment,
  isOnBubble 
} from './icm-calculator';

import { 
  analyzeBoardTexture, 
  getBetSizingRecommendation, 
  getCBetRecommendation 
} from './bet-sizing';

import { 
  calculateEquity as calculateAdvancedEquity, 
  calculatePotOdds, 
  calculateImpliedOdds, 
  calculateExpectedValue 
} from './equity-calculator';

import { evaluateHand } from './poker-logic';

/**
 * Main analysis function that integrates all poker theory
 * Now runs key computations asynchronously to prevent UI blocking
 */
export async function analyzePlayerAdvanced(gameState: GameState, playerIndex: number): Promise<PlayerAnalysis> {
  const player = gameState.players[playerIndex];
  
  // Basic validation
  if (player.cards.length === 0 || player.isFolded || player.isEliminated) {
    return createEmptyAnalysis();
  }

  // Core calculations - run asynchronously to avoid blocking UI
  const equityResult = await calculatePlayerEquityAsync(player.cards, gameState.communityCards, gameState);
  const potOdds = calculatePotOdds(gameState.pot, gameState.currentBet - player.currentBet);
  const boardTexture = analyzeBoardTexture(gameState.communityCards);
  
  // Tournament-specific calculations
  const tournamentData = calculateTournamentMetrics(gameState, playerIndex);
  
  // GTO and Nash analysis
  const gtoAnalysis = calculateGTOAnalysis(player.cards, gameState, playerIndex);
  
  // Bet sizing analysis
  const betSizing = calculateBetSizingAnalysis(boardTexture, gameState, playerIndex);
  
  // Expected value calculation
  const expectedValue = calculateAdvancedEV(equityResult, potOdds, gameState, playerIndex);
  
  // Generate recommendation
  const recommendation = generateAdvancedRecommendation(
    equityResult,
    tournamentData,
    gtoAnalysis,
    betSizing,
    gameState,
    playerIndex
  );

  // Compile comprehensive analysis
  return {
    handStrength: equityResult.handStrength,
    potentialStrength: calculatePotentialStrength(equityResult),
    currentHandRank: getCurrentHandRank(player.cards, gameState.communityCards),
    potOdds,
    equity: equityResult.equity,
    expectedValue,
    recommendation,
    confidence: calculateConfidence(equityResult, tournamentData),
    outs: equityResult.outs,
    draws: convertDrawEquityToDrawInfo(equityResult.draws),
    cardCount: 0, // Legacy field - could implement card counting if needed
    winProbability: equityResult.winProbability,
    
    // Advanced fields
    icmEquity: tournamentData.icmEquity,
    riskPremium: tournamentData.riskPremium,
    bubbleFactor: tournamentData.bubbleFactor,
    stackCategory: tournamentData.stackCategory,
    icmPressure: tournamentData.icmPressure,
    nashAction: gtoAnalysis.nashAction,
    gtoRange: gtoAnalysis.gtoRange,
    betSizing,
    tournamentAdjustment: tournamentData.adjustment
  };
}

/**
 * Calculate player equity using advanced methods
 */
function calculatePlayerEquity(
  playerCards: Card[], 
  communityCards: Card[], 
  gameState: GameState
): EquityResult {
  const activePlayers = gameState.players.filter(p => !p.isFolded && !p.isEliminated);
  const opponents = activePlayers.length - 1;
  
  // Use fast approximation for real-time play to prevent EV fluctuation
  const iterations = communityCards.length >= 4 ? 100 : 250; // Much lower iterations for stable EV
  
  return calculateAdvancedEquity(playerCards, communityCards, [], {
    iterations,
    opponents: Math.max(1, opponents),
    deadCards: []
  });
}

/**
 * Async version that yields control to prevent UI blocking
 */
async function calculatePlayerEquityAsync(
  playerCards: Card[], 
  communityCards: Card[], 
  gameState: GameState
): Promise<EquityResult> {
  return new Promise(resolve => {
    // Use setTimeout to yield control back to the event loop
    setTimeout(() => {
      try {
        const result = calculatePlayerEquity(playerCards, communityCards, gameState);
        resolve(result);
      } catch (error) {
        // Fallback to basic equity calculation
        resolve({
          handStrength: 0.3,
          equity: 0.3,
          winProbability: 0.3,
          tieProbability: 0.1,
          loseProbability: 0.6,
          outs: 0,
          draws: []
        });
      }
    }, 0);
  });
}

/**
 * Calculate tournament-specific metrics
 */
function calculateTournamentMetrics(gameState: GameState, playerIndex: number): {
  icmEquity?: number;
  riskPremium?: number;
  bubbleFactor?: number;
  stackCategory: 'short' | 'medium' | 'big';
  icmPressure: 'low' | 'medium' | 'high';
  adjustment: TournamentAdjustment;
} {
  const player = gameState.players[playerIndex];
  const stackSizes = gameState.players.map(p => p.chips);
  
  // Estimate tournament payout structure (can be made configurable)
  const totalPrize = 1000; // Base tournament value
  const payoutStructure = generatePayoutStructure(stackSizes.length, totalPrize);
  
  const stackCategory = getStackCategory(player.chips, gameState.bigBlind);
  
  let icmEquity: number | undefined;
  let riskPremium: number | undefined;
  let bubbleFactor: number | undefined;
  let icmPressure: 'low' | 'medium' | 'high' = 'low';
  
  // Only calculate ICM if in tournament scenario (multiple players with different stacks)
  if (stackSizes.length > 2 && stackSizes.some(s => s !== stackSizes[0])) {
    try {
      const icmResult = calculateICM({ stackSizes, payoutStructure, totalChips: stackSizes.reduce((a, b) => a + b, 0) });
      icmEquity = icmResult.equities[playerIndex];
      riskPremium = icmResult.riskPremiums[playerIndex];
      
      if (isOnBubble(stackSizes, payoutStructure)) {
        bubbleFactor = calculateBubbleFactor(stackSizes, payoutStructure, playerIndex);
        icmPressure = 'high';
      } else if (riskPremium > 15) {
        icmPressure = 'medium';
      }
    } catch (error) {
      // Fallback to basic analysis if ICM calculation fails
      icmPressure = 'low';
    }
  }
  
  const adjustment = getTournamentAdjustment(stackSizes, payoutStructure, playerIndex, gameState.bigBlind);
  
  return {
    icmEquity,
    riskPremium,
    bubbleFactor,
    stackCategory,
    icmPressure,
    adjustment
  };
}

/**
 * Calculate GTO and Nash analysis
 */
function calculateGTOAnalysis(
  playerCards: Card[], 
  gameState: GameState, 
  playerIndex: number
): {
  nashAction: 'push' | 'call' | 'fold';
  gtoRange: string[];
} {
  const player = gameState.players[playerIndex];
  const stackBBs = player.chips / gameState.bigBlind;
  const position = getPlayerPosition(gameState, playerIndex);
  
  // Convert cards to string format
  const handString = convertHandToString(
    playerCards[0].rank, 
    playerCards[1].rank, 
    playerCards[0].suit === playerCards[1].suit
  );
  
  // Nash push/fold analysis for short stacks
  const nashAction = stackBBs <= 20 ? shouldPushFold(handString, stackBBs, position) : 'fold';
  
  // GTO range analysis
  const gtoRange = getGTORange(position, stackBBs);
  const gtoRangeStrings = gtoRange ? gtoRange.openRange : [];
  
  return {
    nashAction,
    gtoRange: gtoRangeStrings
  };
}

/**
 * Calculate bet sizing analysis
 */
function calculateBetSizingAnalysis(
  boardTexture: BoardTexture,
  gameState: GameState,
  playerIndex: number
): BetSizingRecommendation {
  const player = gameState.players[playerIndex];
  const position = getPlayerPosition(gameState, playerIndex);
  const isInPosition = position === 'BTN' || position === 'CO';
  
  // Determine hand strength category
  let handStrength: 'strong' | 'medium' | 'weak' | 'draw' = 'medium';
  
  if (player.cards.length === 2) {
    const allCards = [...player.cards, ...gameState.communityCards];
    if (allCards.length >= 2) {
      try {
        const hand = evaluateHand(allCards);
        if (hand.score > 1000) handStrength = 'strong';
        else if (hand.score > 500) handStrength = 'medium';
        else handStrength = 'weak';
      } catch {
        handStrength = 'weak';
      }
    }
  }
  
  return getBetSizingRecommendation(
    boardTexture,
    isInPosition ? 'IP' : 'OOP',
    handStrength,
    gameState.pot
  );
}

/**
 * Calculate advanced expected value
 */
function calculateAdvancedEV(
  equityResult: EquityResult,
  potOdds: number,
  gameState: GameState,
  playerIndex: number
): number {
  const player = gameState.players[playerIndex];
  const betToCall = gameState.currentBet - player.currentBet;
  
  if (betToCall <= 0) {
    // Free to see next card
    return gameState.pot * equityResult.equity;
  }
  
  // Basic EV calculation
  const winAmount = gameState.pot + betToCall;
  const loseAmount = betToCall;
  
  let ev = (equityResult.winProbability * winAmount) - ((1 - equityResult.winProbability) * loseAmount);
  
  // Adjust for implied odds if we have draws
  if (equityResult.draws.length > 0 && equityResult.outs > 4) {
    const impliedOdds = calculateImpliedOdds(gameState.pot, betToCall, gameState.pot * 0.5);
    const impliedBonus = Math.min(betToCall * 0.3, impliedOdds * 0.1);
    ev += impliedBonus;
  }
  
  return ev;
}

/**
 * Generate advanced recommendation
 */
function generateAdvancedRecommendation(
  equityResult: EquityResult,
  tournamentData: any,
  gtoAnalysis: any,
  betSizing: BetSizingRecommendation,
  gameState: GameState,
  playerIndex: number
): 'fold' | 'call' | 'check' | 'bet' | 'raise' | 'all-in' {
  const player = gameState.players[playerIndex];
  const validActions = getValidActions(gameState, playerIndex);
  const betToCall = gameState.currentBet - player.currentBet;
  
  // Short stack Nash strategy
  if (tournamentData.stackCategory === 'short' && gtoAnalysis.nashAction === 'push') {
    if (validActions.includes('all-in')) return 'all-in';
    if (validActions.includes('raise')) return 'raise';
  }
  
  if (tournamentData.stackCategory === 'short' && gtoAnalysis.nashAction === 'call') {
    if (validActions.includes('call')) return 'call';
  }
  
  // Strong hands - be aggressive (check this BEFORE ICM pressure to avoid folding excellent hands)
  if (equityResult.handStrength > 0.8 || equityResult.equity > 0.75) {
    if (validActions.includes('raise')) return 'raise';
    if (validActions.includes('bet')) return 'bet';
    if (validActions.includes('all-in') && tournamentData.stackCategory === 'short') return 'all-in';
    if (validActions.includes('call')) return 'call';
  }
  
  // High ICM pressure - play tighter (but only for non-premium hands)
  if (tournamentData.icmPressure === 'high' && equityResult.equity < 0.5 && equityResult.handStrength < 0.7) {
    if (betToCall > 0) return 'fold';
    if (validActions.includes('check')) return 'check';
  }
  
  // Good draws with proper odds
  if (equityResult.outs >= 8 && equityResult.equity > 0.3) {
    const potOdds = gameState.pot / Math.max(1, betToCall);
    if (potOdds > 2 || betToCall === 0) {
      if (validActions.includes('call')) return 'call';
      if (validActions.includes('check')) return 'check';
    }
  }
  
  // Medium strength hands
  if (equityResult.equity > 0.4 && equityResult.handStrength > 0.5) {
    if (betToCall === 0) {
      if (validActions.includes('bet') && betSizing.optimalSize <= 50) return 'bet';
      if (validActions.includes('check')) return 'check';
    } else {
      const potOdds = gameState.pot / betToCall;
      if (potOdds > 3) {
        if (validActions.includes('call')) return 'call';
      }
    }
  }
  
  // Default to safe play
  if (validActions.includes('check')) return 'check';
  return 'fold';
}

/**
 * Helper functions
 */
function createEmptyAnalysis(): PlayerAnalysis {
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
    cardCount: 0,
    winProbability: 0
  };
}

function calculatePotentialStrength(equityResult: EquityResult): number {
  return Math.min(1, equityResult.handStrength + (equityResult.outs / 47) * 0.5);
}

function getCurrentHandRank(playerCards: Card[], communityCards: Card[]): string {
  if (playerCards.length < 2) return 'none';
  
  try {
    const allCards = [...playerCards, ...communityCards];
    if (allCards.length >= 2) {
      const hand = evaluateHand(allCards);
      return hand.rank;
    }
  } catch {
    return 'high-card';
  }
  
  return 'high-card';
}

function calculateConfidence(equityResult: EquityResult, tournamentData: any): number {
  let confidence = equityResult.equity;
  
  // Reduce confidence under high ICM pressure
  if (tournamentData.icmPressure === 'high') {
    confidence *= 0.8;
  }
  
  // Increase confidence with more cards dealt
  if (equityResult.outs > 0) {
    confidence *= (1 + equityResult.outs / 20);
  }
  
  return Math.min(1, Math.max(0, confidence));
}

function convertDrawEquityToDrawInfo(drawEquities: DrawEquity[]): DrawInfo[] {
  return drawEquities.map(draw => ({
    type: draw.type as any, // Type conversion
    outs: draw.outs,
    probability: draw.turnAndRiverProbability || draw.riverProbability || draw.turnProbability,
    description: `${draw.type} draw - ${draw.outs} outs`
  }));
}

function getPlayerPosition(gameState: GameState, playerIndex: number): string {
  const numPlayers = gameState.players.filter(p => !p.isEliminated).length;
  const dealerIndex = gameState.dealerIndex;
  
  if (numPlayers <= 2) {
    return playerIndex === dealerIndex ? 'BTN' : 'BB';
  }
  
  const positionFromDealer = (playerIndex - dealerIndex + numPlayers) % numPlayers;
  
  if (positionFromDealer === 0) return 'BTN';
  if (positionFromDealer === 1) return 'SB';
  if (positionFromDealer === 2) return 'BB';
  if (positionFromDealer === numPlayers - 1) return 'CO';
  if (positionFromDealer === numPlayers - 2) return 'HJ';
  return 'MP';
}

function getValidActions(gameState: GameState, playerIndex: number): string[] {
  const player = gameState.players[playerIndex];
  const actions: string[] = [];
  
  if (player.isFolded || player.isAllIn || player.isEliminated) {
    return actions;
  }
  
  const callAmount = gameState.currentBet - player.currentBet;
  
  if (callAmount > 0) {
    actions.push('fold');
    if (player.chips >= callAmount) {
      actions.push('call');
    }
  } else {
    actions.push('check');
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

function generatePayoutStructure(numPlayers: number, totalPrize: number): number[] {
  // Standard tournament payout structure
  const payouts = new Array(numPlayers).fill(0);
  
  if (numPlayers >= 1) payouts[0] = totalPrize * 0.5;  // 1st: 50%
  if (numPlayers >= 2) payouts[1] = totalPrize * 0.3;  // 2nd: 30%
  if (numPlayers >= 3) payouts[2] = totalPrize * 0.2;  // 3rd: 20%
  if (numPlayers >= 4) {
    payouts[2] = totalPrize * 0.15;  // 3rd: 15%
    payouts[3] = totalPrize * 0.05;  // 4th: 5%
  }
  
  return payouts;
}

// Export the main analysis function as default
export { analyzePlayerAdvanced as analyzePlayer };