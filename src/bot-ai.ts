import { GameState, Player, Action, Card, BotProfile } from './types';
import { evaluateHand } from './poker-logic';
import { getValidActions } from './game-engine';
import { getRandomBotProfile } from './bot-profiles';

export interface BotDecision {
  action: Action;
  betAmount?: number;
}

function roundToBigBlindMultiple(amount: number, bigBlind: number): number {
  return Math.round(Math.max(bigBlind, Math.round(amount / bigBlind) * bigBlind));
}

export function makeBotDecision(gameState: GameState, botIndex: number): BotDecision {
  const bot = gameState.players[botIndex];
  const validActions = getValidActions(gameState, botIndex);
  
  if (validActions.length === 0) {
    return { action: 'fold' };
  }
  
  // Ensure bot has a profile
  if (!bot.botProfile) {
    bot.botProfile = getRandomBotProfile();
  }
  
  const handStrength = calculateHandStrength(bot, gameState.communityCards);
  const potOdds = calculatePotOdds(gameState, bot);
  const position = calculatePosition(gameState, botIndex);
  
  return makeDecisionBasedOnProfile(
    validActions,
    handStrength,
    potOdds,
    position,
    bot.botProfile,
    gameState,
    bot
  );
}

function calculateHandStrength(player: Player, communityCards: Card[]): number {
  // Use the standard card analysis function for consistency
  const { calculateHandStrength: cardAnalysisStrength } = require('./card-analysis');
  return cardAnalysisStrength(player.cards, communityCards);
}


function getRankValue(rank: string): number {
  const rankValues: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  return rankValues[rank] || 0;
}

function calculatePotOdds(gameState: GameState, player: Player): number {
  const callAmount = gameState.currentBet - player.currentBet;
  if (callAmount <= 0) return 1;
  
  const potAfterCall = gameState.pot + callAmount;
  return callAmount / potAfterCall;
}

function calculatePosition(gameState: GameState, playerIndex: number): 'early' | 'middle' | 'late' {
  const totalPlayers = gameState.players.length;
  const dealerIndex = gameState.dealerIndex;
  
  const positionFromDealer = (playerIndex - dealerIndex + totalPlayers) % totalPlayers;
  
  if (positionFromDealer <= totalPlayers / 3) return 'early';
  if (positionFromDealer <= (totalPlayers * 2) / 3) return 'middle';
  return 'late';
}

function makeDecisionBasedOnProfile(
  validActions: Action[],
  handStrength: number,
  potOdds: number,
  position: 'early' | 'middle' | 'late',
  profile: BotProfile,
  gameState: GameState,
  player: Player
): BotDecision {
  const random = Math.random();
  
  // If no good actions available, fold
  if (validActions.length === 0) {
    return { action: 'fold' };
  }
  
  // Apply randomness factor from profile
  const randomFactor = profile.behavior === 'random' 
    ? 0.7 + (random * 0.6) // 0.7 to 1.3 for random behavior
    : 0.9 + (random * profile.randomnessFactor); // Much less randomness for other profiles
  
  // Position adjustment
  const positionMultiplier = position === 'late' ? 1.2 : position === 'middle' ? 1.05 : 0.95;
  const adjustedHandStrength = handStrength * positionMultiplier * randomFactor;
  
  // Special case: if player has very few chips compared to current bet, be more likely to fold
  const chipsToBetRatio = player.chips / Math.max(gameState.currentBet, 1);
  if (chipsToBetRatio < 2 && adjustedHandStrength < 0.55 && validActions.includes('fold')) {
    return { action: 'fold' };
  }

  // Check if we should fold based on profile threshold using REALISTIC values
  if (adjustedHandStrength < profile.foldThreshold) { 
    if (validActions.includes('check')) {
      return { action: 'check' };
    }
    // Only fold if pot odds are bad or profile says to fold easily
    if (validActions.includes('fold') && (potOdds > 0.3 || random < (profile.foldThreshold * 2))) {
      return { action: 'fold' };
    }
    if (validActions.includes('call') && potOdds < 0.25) {
      return { action: 'call' };
    }
    return validActions.includes('check') ? { action: 'check' } : { action: 'fold' };
  }
  
  // Medium strength hands 
  if (adjustedHandStrength < 0.75) {
    // Bluff occasionally based on profile
    if (adjustedHandStrength < 0.45 && random < profile.bluffFrequency && validActions.includes('bet')) {
      const rawBetAmount = Math.min(player.chips, gameState.pot * profile.betSizingMultiplier * 0.5);
      const betAmount = roundToBigBlindMultiple(rawBetAmount, gameState.bigBlind);
      return { action: 'bet', betAmount };
    }
    
    // Aggressive profiles bet/raise more with medium hands
    if (profile.aggressiveness > 0.5 && validActions.includes('bet') && random < profile.aggressiveness * 0.6) {
      const rawBetAmount = Math.min(player.chips, gameState.pot * profile.betSizingMultiplier);
      const betAmount = roundToBigBlindMultiple(rawBetAmount, gameState.bigBlind);
      return { action: 'bet', betAmount };
    }
    
    if (profile.aggressiveness > 0.6 && validActions.includes('raise') && random < profile.aggressiveness * 0.5) {
      const rawBetAmount = Math.min(player.chips, gameState.pot * profile.betSizingMultiplier);
      const minRaise = gameState.currentBet + gameState.bigBlind;
      const betAmount = roundToBigBlindMultiple(Math.max(minRaise, rawBetAmount), gameState.bigBlind);
      return { action: 'raise', betAmount };
    }
    
    // Default to passive play for medium hands
    if (validActions.includes('check') && random < 0.6) {
      return { action: 'check' };
    }
    if (validActions.includes('call')) {
      return { action: 'call' };
    }
    return { action: 'check' };
  }
  
  // Strong hands - be more aggressive based on profile 
  if (adjustedHandStrength >= 0.75) {
    // All-in with very strong hands (much more controlled with additional constraints)
    if (adjustedHandStrength >= profile.allInThreshold && validActions.includes('all-in') && random < (profile.aggressiveness * 0.05)) {
      // Additional constraints to make all-ins much rarer
      const stackToPotRatio = player.chips / Math.max(gameState.pot, gameState.bigBlind * 2);
      const activePlayers = gameState.players.filter(p => !p.isFolded && !p.isEliminated).length;
      
      // Only all-in if:
      // 1. We have a very strong hand (checked above)
      // 2. Stack is relatively small (less than 10x pot) OR hand is extremely strong (>0.90)
      // 3. Random chance is even lower for bigger stacks
      // 4. Not too many players left (avoid early all-ins in full tables)
      if ((stackToPotRatio < 10 || adjustedHandStrength > 0.90) && 
          activePlayers <= 4 && 
          random < (profile.aggressiveness * 0.03)) {
        return { action: 'all-in' };
      }
    }
    
    // Raise with strong hands
    if (validActions.includes('raise') && random < profile.aggressiveness * 0.8) {
      const rawBetAmount = Math.min(player.chips, gameState.pot * profile.betSizingMultiplier * 1.2);
      const minRaise = gameState.currentBet + gameState.bigBlind;
      const betAmount = roundToBigBlindMultiple(Math.max(minRaise, rawBetAmount), gameState.bigBlind);
      return { action: 'raise', betAmount };
    }
    
    // Bet with strong hands
    if (validActions.includes('bet') && random < 0.8) {
      const rawBetAmount = Math.min(player.chips, gameState.pot * profile.betSizingMultiplier);
      const betAmount = roundToBigBlindMultiple(rawBetAmount, gameState.bigBlind);
      return { action: 'bet', betAmount };
    }
    
    // Always call with strong hands
    if (validActions.includes('call')) {
      return { action: 'call' };
    }
  }
  
  // Fallback logic
  if (validActions.includes('check')) {
    return { action: 'check' };
  }
  if (validActions.includes('call')) {
    return { action: 'call' };
  }
  if (validActions.includes('fold')) {
    return { action: 'fold' };
  }
  
  // Last resort
  return { action: validActions[0] };
}