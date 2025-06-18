/**
 * ICM (Independent Chip Model) Calculator
 * Implements the Malmuth-Harville method for tournament equity calculations
 */

export interface ICMSituation {
  stackSizes: number[];
  payoutStructure: number[];
  totalChips: number;
}

export interface ICMResult {
  equities: number[];
  riskPremiums: number[];
  chipEVs: number[];
}

export interface PlayerICM {
  playerId: string;
  stackSize: number;
  icmEquity: number;
  chipEquity: number;
  riskPremium: number;
  finishProbabilities: number[];
}

/**
 * Calculate ICM equity using Malmuth-Harville method
 */
export function calculateICM(situation: ICMSituation): ICMResult {
  const { stackSizes, payoutStructure, totalChips } = situation;
  const numPlayers = stackSizes.length;
  
  if (numPlayers !== payoutStructure.length) {
    throw new Error('Stack sizes and payout structure must have same length');
  }
  
  const equities: number[] = [];
  const chipEVs: number[] = [];
  const riskPremiums: number[] = [];
  
  for (let i = 0; i < numPlayers; i++) {
    // Calculate finish probabilities for this player
    const finishProbs = calculateFinishProbabilities(stackSizes, i, numPlayers);
    
    // Calculate ICM equity
    let icmEquity = 0;
    for (let position = 0; position < numPlayers; position++) {
      icmEquity += finishProbs[position] * payoutStructure[position];
    }
    
    // Calculate chip equity (proportion of total prize pool)
    const chipEquity = (stackSizes[i] / totalChips) * payoutStructure.reduce((sum, payout) => sum + payout, 0);
    
    // Calculate risk premium
    const riskPremium = chipEquity > 0 ? ((chipEquity - icmEquity) / chipEquity) * 100 : 0;
    
    equities.push(icmEquity);
    chipEVs.push(chipEquity);
    riskPremiums.push(riskPremium);
  }
  
  return { equities, riskPremiums, chipEVs };
}

/**
 * Calculate probability of finishing in each position using Malmuth-Harville
 */
function calculateFinishProbabilities(stackSizes: number[], playerIndex: number, numPlayers: number): number[] {
  const totalChips = stackSizes.reduce((sum, stack) => sum + stack, 0);
  const probabilities: number[] = new Array(numPlayers).fill(0);
  
  // Recursive function to calculate probabilities
  function calculatePosition(
    remainingStacks: number[],
    remainingPlayers: number[],
    currentPosition: number,
    probability: number
  ) {
    if (remainingPlayers.length === 1) {
      // Last player gets last position
      const lastPlayer = remainingPlayers[0];
      if (lastPlayer === playerIndex) {
        probabilities[currentPosition] += probability;
      }
      return;
    }
    
    const totalRemaining = remainingStacks.reduce((sum, stack) => sum + stack, 0);
    
    for (let i = 0; i < remainingPlayers.length; i++) {
      const player = remainingPlayers[i];
      const playerStack = remainingStacks[i];
      const eliminationProb = playerStack / totalRemaining;
      
      if (player === playerIndex) {
        probabilities[currentPosition] += probability * eliminationProb;
      }
      
      // Continue with remaining players
      const newRemainingStacks = remainingStacks.filter((_, idx) => idx !== i);
      const newRemainingPlayers = remainingPlayers.filter((_, idx) => idx !== i);
      
      calculatePosition(
        newRemainingStacks,
        newRemainingPlayers,
        currentPosition + 1,
        probability * eliminationProb
      );
    }
  }
  
  calculatePosition(
    [...stackSizes],
    Array.from({ length: numPlayers }, (_, i) => i),
    0,
    1.0
  );
  
  return probabilities;
}

/**
 * Simplified ICM calculation for performance (approximation)
 */
export function calculateICMFast(stackSizes: number[], payoutStructure: number[]): number[] {
  const totalChips = stackSizes.reduce((sum, stack) => sum + stack, 0);
  const numPlayers = stackSizes.length;
  const equities: number[] = [];
  
  for (let i = 0; i < numPlayers; i++) {
    const stackProportion = stackSizes[i] / totalChips;
    
    // Probability of finishing first
    const firstProb = stackProportion;
    
    // Simplified probability of finishing second (approximation)
    let secondProb = 0;
    for (let j = 0; j < numPlayers; j++) {
      if (j !== i) {
        secondProb += (stackSizes[j] / totalChips) * (stackSizes[i] / (totalChips - stackSizes[j]));
      }
    }
    
    // Simplified equity calculation
    let equity = firstProb * payoutStructure[0];
    if (payoutStructure.length > 1) {
      equity += secondProb * payoutStructure[1];
    }
    if (payoutStructure.length > 2) {
      const thirdProb = Math.max(0, 1 - firstProb - secondProb);
      equity += thirdProb * payoutStructure[2];
    }
    
    equities.push(equity);
  }
  
  return equities;
}

/**
 * Calculate bubble factor for tournament situations
 */
export function calculateBubbleFactor(
  stackSizes: number[],
  payoutStructure: number[],
  playerIndex: number
): number {
  const situation: ICMSituation = {
    stackSizes,
    payoutStructure,
    totalChips: stackSizes.reduce((sum, stack) => sum + stack, 0)
  };
  
  const result = calculateICM(situation);
  const icmEquity = result.equities[playerIndex];
  const chipEquity = result.chipEVs[playerIndex];
  
  if (chipEquity === 0) return 0;
  
  // Bubble factor is ratio of what you lose if you bust vs what you gain if you win
  const totalPrize = payoutStructure.reduce((sum, payout) => sum + payout, 0);
  const avgStack = situation.totalChips / stackSizes.length;
  const chipEVIfWin = (stackSizes[playerIndex] + avgStack) / situation.totalChips * totalPrize;
  
  const evLostIfBust = icmEquity;
  const evGainedIfWin = chipEVIfWin - icmEquity;
  
  return evGainedIfWin > 0 ? evLostIfBust / evGainedIfWin : 0;
}

/**
 * Determine if we're on the bubble
 */
export function isOnBubble(stackSizes: number[], payoutStructure: number[]): boolean {
  const playersRemaining = stackSizes.filter(stack => stack > 0).length;
  const payingPositions = payoutStructure.filter(payout => payout > 0).length;
  
  return playersRemaining === payingPositions + 1;
}

/**
 * Calculate payout flatness (affects risk premiums)
 */
export function calculatePayoutFlatness(payoutStructure: number[]): number {
  if (payoutStructure.length < 3) return 0;
  
  const totalPrize = payoutStructure.reduce((sum, payout) => sum + payout, 0);
  const minCash = Math.min(...payoutStructure.filter(p => p > 0));
  const firstPlace = Math.max(...payoutStructure);
  const avgTop3 = payoutStructure.slice(0, 3).reduce((sum, payout) => sum + payout, 0) / 3;
  
  return (avgTop3 - minCash) / (firstPlace - minCash);
}

/**
 * Get typical risk premiums by tournament stage
 */
export function getTypicalRiskPremium(
  stackSizes: number[],
  payoutStructure: number[]
): number {
  const playersRemaining = stackSizes.filter(stack => stack > 0).length;
  const payingPositions = payoutStructure.filter(payout => payout > 0).length;
  const payoutFlatness = calculatePayoutFlatness(payoutStructure);
  
  // Money bubble
  if (playersRemaining === payingPositions + 1) {
    return payoutFlatness > 0.6 ? 40 : 15; // 15-40%
  }
  
  // Final table
  if (playersRemaining <= 9 && playersRemaining > 2) {
    return payoutFlatness > 0.6 ? 35 : 20; // 20-35%
  }
  
  // Heads-up
  if (playersRemaining === 2) {
    return 15; // 5-15%
  }
  
  // Regular play
  return 5;
}

/**
 * Calculate ICM pressure (how much ICM affects decisions)
 */
export function calculateICMPressure(
  stackSizes: number[],
  payoutStructure: number[],
  playerIndex: number
): 'low' | 'medium' | 'high' {
  const situation: ICMSituation = {
    stackSizes,
    payoutStructure,
    totalChips: stackSizes.reduce((sum, stack) => sum + stack, 0)
  };
  
  const result = calculateICM(situation);
  const riskPremium = result.riskPremiums[playerIndex];
  
  if (riskPremium < 10) return 'low';
  if (riskPremium < 25) return 'medium';
  return 'high';
}

/**
 * Calculate stack size category for tournament play
 */
export function getStackCategory(stackSize: number, bigBlind: number): 'short' | 'medium' | 'big' {
  const stackBBs = stackSize / bigBlind;
  
  if (stackBBs <= 15) return 'short';
  if (stackBBs <= 40) return 'medium';
  return 'big';
}

/**
 * Get tournament strategy adjustment based on stack and ICM
 */
export function getTournamentAdjustment(
  stackSizes: number[],
  payoutStructure: number[],
  playerIndex: number,
  bigBlind: number
): {
  category: 'short' | 'medium' | 'big';
  icmPressure: 'low' | 'medium' | 'high';
  riskPremium: number;
  pushRangeAdjustment: number;
  callRangeAdjustment: number;
  playTighter: number; // Percentage tighter than chip EV
} {
  const category = getStackCategory(stackSizes[playerIndex], bigBlind);
  const icmPressure = calculateICMPressure(stackSizes, payoutStructure, playerIndex);
  const typicalRiskPremium = getTypicalRiskPremium(stackSizes, payoutStructure);
  
  let pushRangeAdjustment = 0;
  let callRangeAdjustment = 0;
  let playTighter = 0;
  
  switch (category) {
    case 'short':
      pushRangeAdjustment = 50; // Expand by 40-60%
      callRangeAdjustment = -40; // Tighten by 30-50%
      playTighter = 5; // Minimal risk premium
      break;
    case 'medium':
      pushRangeAdjustment = -25; // Avoid confrontation
      callRangeAdjustment = -25;
      playTighter = 25; // High risk premium
      break;
    case 'big':
      pushRangeAdjustment = 35; // Apply pressure
      callRangeAdjustment = 15;
      playTighter = 10; // Low risk premium
      break;
  }
  
  // Adjust based on ICM pressure
  if (icmPressure === 'high') {
    playTighter += 10;
    callRangeAdjustment -= 15;
  } else if (icmPressure === 'low') {
    playTighter -= 5;
    pushRangeAdjustment += 10;
  }
  
  return {
    category,
    icmPressure,
    riskPremium: typicalRiskPremium,
    pushRangeAdjustment,
    callRangeAdjustment,
    playTighter
  };
}