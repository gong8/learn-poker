import { GameState, Player, Action, Card, BotProfile } from './types';
import { evaluateHand } from './poker-logic';
import { getValidActions } from './game-engine';
import { getRandomBotProfile } from './bot-profiles';
import { HAND_EVALUATION, BOT_BEHAVIOR, CARD_VALUES, UI_CONFIG } from './constants';

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
  
  // Safety check: if bot has no chips or is eliminated, fold
  if (bot.chips <= 0 || bot.isEliminated) {
    return { action: 'fold' };
  }
  
  // Check if bot can afford the current bet
  const callAmount = gameState.currentBet - bot.currentBet;
  if (callAmount > bot.chips && !validActions.includes('all-in')) {
    // Bot can't afford to call and has no valid all-in option, must fold
    if (validActions.includes('fold')) {
      return { action: 'fold' };
    }
    // If folding isn't available (shouldn't happen), check if available
    if (validActions.includes('check')) {
      return { action: 'check' };
    }
    // Last resort
    return { action: validActions[0] };
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
  if (communityCards.length === 0) {
    return evaluatePreflopHand(player.cards);
  }
  
  const allCards = [...player.cards, ...communityCards];
  const handEvaluation = evaluateHand(allCards);
  
  // Much more conservative post-flop evaluation
  // Most hands should be in the 0.1-0.6 range, with only very strong hands above 0.7
  const maxPossibleScore = HAND_EVALUATION.MAX_HAND_SCORE;
  const rawStrength = handEvaluation.score / maxPossibleScore;
  
  // Apply a curve to make the evaluation more conservative
  // This compresses the middle range and makes fewer hands "strong"
  let adjustedStrength;
  if (rawStrength < BOT_BEHAVIOR.WEAK_THRESHOLD) {
    adjustedStrength = rawStrength * BOT_BEHAVIOR.WEAK_MULTIPLIER; // 0-0.3 becomes 0-0.12
  } else if (rawStrength < BOT_BEHAVIOR.MEDIUM_THRESHOLD) {
    adjustedStrength = 0.12 + (rawStrength - BOT_BEHAVIOR.WEAK_THRESHOLD) * BOT_BEHAVIOR.MEDIUM_MULTIPLIER; // 0.3-0.6 becomes 0.12-0.36
  } else if (rawStrength < BOT_BEHAVIOR.STRONG_THRESHOLD) {
    adjustedStrength = 0.36 + (rawStrength - BOT_BEHAVIOR.MEDIUM_THRESHOLD) * BOT_BEHAVIOR.STRONG_MULTIPLIER; // 0.6-0.8 becomes 0.36-0.64
  } else {
    adjustedStrength = 0.64 + (rawStrength - BOT_BEHAVIOR.STRONG_THRESHOLD) * BOT_BEHAVIOR.VERY_STRONG_MULTIPLIER; // 0.8-1.0 becomes 0.64-0.94
  }
  
  return Math.min(Math.max(adjustedStrength, BOT_BEHAVIOR.STRENGTH_MIN), BOT_BEHAVIOR.STRENGTH_MAX);
}

function evaluatePreflopHand(cards: Card[]): number {
  if (cards.length !== 2) return 0;
  
  const [card1, card2] = cards;
  const rank1 = getRankValue(card1.rank);
  const rank2 = getRankValue(card2.rank);
  
  const isPair = rank1 === rank2;
  const isSuited = card1.suit === card2.suit;
  const highCard = Math.max(rank1, rank2);
  const lowCard = Math.min(rank1, rank2);
  const gap = Math.abs(highCard - lowCard);
  
  let strength = 0;
  
  if (isPair) {
    // Pairs: only high pairs are truly strong
    if (rank1 >= BOT_BEHAVIOR.HIGH_PAIR_THRESHOLD) { // JJ, QQ, KK, AA
      strength = BOT_BEHAVIOR.PREMIUM_PAIR_STRENGTH + (rank1 - BOT_BEHAVIOR.HIGH_PAIR_THRESHOLD) / 4 * 0.25; // 0.7 to 0.95
    } else if (rank1 >= BOT_BEHAVIOR.MEDIUM_PAIR_THRESHOLD) { // 77, 88, 99, 10
      strength = BOT_BEHAVIOR.MEDIUM_PAIR_STRENGTH + (rank1 - BOT_BEHAVIOR.MEDIUM_PAIR_THRESHOLD) / 3 * 0.25; // 0.45 to 0.7
    } else { // 22-66
      strength = BOT_BEHAVIOR.LOW_PAIR_STRENGTH + (rank1 - 2) / 5 * 0.3; // 0.15 to 0.45
    }
  } else {
    // Non-pairs: much more conservative
    // Base strength heavily weighted toward high cards
    const baseStrength = Math.max(0, (highCard - 8) / 6 * 0.3); // Only 9+ get decent base
    strength = baseStrength;
    
    // Premium non-pairs (AK, AQ, etc.)
    if (highCard === BOT_BEHAVIOR.ACE_RANK && lowCard >= BOT_BEHAVIOR.TEN_RANK) { // A-10, A-J, A-Q, A-K
      strength = 0.5 + (lowCard - BOT_BEHAVIOR.TEN_RANK) / 4 * 0.2; // 0.5 to 0.7
    } else if (highCard === BOT_BEHAVIOR.KING_RANK && lowCard >= BOT_BEHAVIOR.TEN_RANK) { // K-10, K-J, K-Q
      strength = 0.35 + (lowCard - BOT_BEHAVIOR.TEN_RANK) / 3 * 0.15; // 0.35 to 0.5
    } else if (highCard >= BOT_BEHAVIOR.JACK_RANK && lowCard >= BOT_BEHAVIOR.NINE_RANK && gap <= 2) { // Connected high cards
      strength = 0.25 + (highCard + lowCard - 20) / 6 * 0.2; // Very modest
    }
    
    // Small bonuses for suited/connected (much smaller)
    if (isSuited && strength > 0) strength += BOT_BEHAVIOR.SUITED_BONUS;
    if (gap <= 1 && strength > 0) strength += BOT_BEHAVIOR.CONNECTOR_BONUS; // Only immediate connectors
    if (gap <= 3 && strength > 0) strength += BOT_BEHAVIOR.GAP_BONUS; // Tiny bonus for gaps
  }
  
  return Math.min(Math.max(strength, BOT_BEHAVIOR.STRENGTH_MIN), BOT_BEHAVIOR.STRENGTH_MAX); // Floor at 0.05, cap at 0.95
}

function getRankValue(rank: string): number {
  const rankValues: Record<string, number> = {
    '2': CARD_VALUES.RANKS.TWO, '3': CARD_VALUES.RANKS.THREE, '4': CARD_VALUES.RANKS.FOUR, 
    '5': CARD_VALUES.RANKS.FIVE, '6': CARD_VALUES.RANKS.SIX, '7': CARD_VALUES.RANKS.SEVEN, 
    '8': CARD_VALUES.RANKS.EIGHT, '9': CARD_VALUES.RANKS.NINE, '10': CARD_VALUES.RANKS.TEN,
    'J': CARD_VALUES.RANKS.JACK, 'Q': CARD_VALUES.RANKS.QUEEN, 'K': CARD_VALUES.RANKS.KING, 'A': CARD_VALUES.RANKS.ACE
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
  
  if (positionFromDealer <= totalPlayers * UI_CONFIG.EARLY_POSITION_FRACTION) return 'early';
  if (positionFromDealer <= totalPlayers * UI_CONFIG.MIDDLE_POSITION_FRACTION) return 'middle';
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
  // Check if this is post-flop and there's been minimal betting (everyone checking)
  const isPostFlop = gameState.phase !== 'preflop';
  const isLowAction = gameState.currentBet <= gameState.bigBlind && isPostFlop;
  const random = Math.random();
  
  // If no good actions available, fold
  if (validActions.length === 0) {
    return { action: 'fold' };
  }
  
  // Apply randomness factor from profile
  const randomFactor = profile.behavior === 'random' 
    ? BOT_BEHAVIOR.RANDOM_BEHAVIOR_MIN + (random * BOT_BEHAVIOR.RANDOM_BEHAVIOR_RANGE) // 0.7 to 1.3 for random behavior
    : 0.9 + (random * profile.randomnessFactor); // Much less randomness for other profiles
  
  // Position adjustment
  const positionMultiplier = position === 'late' ? BOT_BEHAVIOR.LATE_POSITION_MULTIPLIER : position === 'middle' ? BOT_BEHAVIOR.MIDDLE_POSITION_MULTIPLIER : BOT_BEHAVIOR.EARLY_POSITION_MULTIPLIER;
  const adjustedHandStrength = handStrength * positionMultiplier * randomFactor;
  
  // Check if we should fold based on profile threshold
  if (adjustedHandStrength < profile.foldThreshold) {
    // Always check if possible instead of folding
    if (validActions.includes('check')) {
      return { action: 'check' };
    }
    // Much more reluctant to fold - only fold if pot odds are really bad AND we have a terrible hand
    if (validActions.includes('fold') && adjustedHandStrength < 0.1 && potOdds > BOT_BEHAVIOR.BAD_POT_ODDS_THRESHOLD && random < 0.3) {
      return { action: 'fold' };
    }
    // Call with reasonable pot odds even with weak hands
    if (validActions.includes('call') && (potOdds < BOT_BEHAVIOR.GOOD_POT_ODDS_THRESHOLD || adjustedHandStrength > 0.08)) {
      return { action: 'call' };
    }
    return validActions.includes('check') ? { action: 'check' } : { action: 'call' };
  }
  
  // Medium strength hands
  if (adjustedHandStrength < 0.5) {
    // Bluff occasionally based on profile
    if (adjustedHandStrength < 0.15 && random < profile.bluffFrequency * 0.7 && validActions.includes('bet')) {
      const rawBetAmount = Math.min(player.chips, gameState.pot * profile.betSizingMultiplier * 0.5);
      const betAmount = roundToBigBlindMultiple(rawBetAmount, gameState.bigBlind);
      return { action: 'bet', betAmount };
    }
    
    // More aggressive post-flop when action is low (prevent boring checking rounds)
    if (isLowAction && adjustedHandStrength > 0.25 && validActions.includes('bet') && random < 0.2) {
      const rawBetAmount = Math.min(player.chips, Math.max(gameState.pot * 0.3, gameState.bigBlind * 2));
      const betAmount = roundToBigBlindMultiple(rawBetAmount, gameState.bigBlind);
      return { action: 'bet', betAmount };
    }
    
    // Aggressive profiles bet/raise more with medium hands
    if (profile.aggressiveness > 0.4 && adjustedHandStrength > 0.3 && validActions.includes('bet') && random < profile.aggressiveness * 0.4) {
      const rawBetAmount = Math.min(player.chips, gameState.pot * profile.betSizingMultiplier);
      const betAmount = roundToBigBlindMultiple(rawBetAmount, gameState.bigBlind);
      return { action: 'bet', betAmount };
    }
    
    if (profile.aggressiveness > 0.5 && adjustedHandStrength > 0.35 && validActions.includes('raise') && random < profile.aggressiveness * 0.3) {
      const rawBetAmount = Math.min(player.chips, gameState.pot * profile.betSizingMultiplier);
      const minRaise = gameState.currentBet + gameState.bigBlind;
      const betAmount = roundToBigBlindMultiple(Math.max(minRaise, rawBetAmount), gameState.bigBlind);
      return { action: 'raise', betAmount };
    }
    
    // Default to passive play for medium hands, but less likely if low action post-flop
    const checkChance = isLowAction ? 0.6 : 0.75;
    if (validActions.includes('check') && random < checkChance) {
      return { action: 'check' };
    }
    if (validActions.includes('call')) {
      return { action: 'call' };
    }
    return { action: 'check' };
  }
  
  // Strong hands - be more aggressive based on profile
  if (adjustedHandStrength >= 0.5) {
    // All-in with very strong hands (very restrictive)
    if (adjustedHandStrength >= profile.allInThreshold && validActions.includes('all-in') && random < (profile.aggressiveness * 0.1)) {
      return { action: 'all-in' };
    }
    
    // Raise with strong hands
    if (adjustedHandStrength >= 0.6 && validActions.includes('raise') && random < profile.aggressiveness * 0.6) {
      const rawBetAmount = Math.min(player.chips, gameState.pot * profile.betSizingMultiplier * 1.2);
      const minRaise = gameState.currentBet + gameState.bigBlind;
      const betAmount = roundToBigBlindMultiple(Math.max(minRaise, rawBetAmount), gameState.bigBlind);
      return { action: 'raise', betAmount };
    }
    
    // Bet with strong hands
    if (adjustedHandStrength >= 0.55 && validActions.includes('bet') && random < 0.65) {
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