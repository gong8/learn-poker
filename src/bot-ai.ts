import { GameState, Player, Action, Card } from './types';
import { evaluateHand } from './poker-logic';
import { getValidActions } from './game-engine';

export interface BotDecision {
  action: Action;
  betAmount?: number;
}

export function makeBotDecision(gameState: GameState, botIndex: number): BotDecision {
  const bot = gameState.players[botIndex];
  const validActions = getValidActions(gameState, botIndex);
  
  if (validActions.length === 0) {
    return { action: 'fold' };
  }
  
  const handStrength = calculateHandStrength(bot, gameState.communityCards);
  const potOdds = calculatePotOdds(gameState, bot);
  const position = calculatePosition(gameState, botIndex);
  const aggressiveness = getAggressiveness(bot);
  
  return makeDecisionBasedOnFactors(
    validActions,
    handStrength,
    potOdds,
    position,
    aggressiveness,
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
  
  const maxPossibleScore = 900;
  return handEvaluation.score / maxPossibleScore;
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
  const gap = highCard - lowCard;
  
  let strength = 0;
  
  if (isPair) {
    strength = 0.5 + (rank1 / 14) * 0.4;
  } else {
    strength = (highCard + lowCard) / 28;
    if (isSuited) strength += 0.1;
    if (gap <= 4) strength += 0.05;
  }
  
  return Math.min(strength, 1);
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

function getAggressiveness(player: Player): number {
  const hash = player.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 0.3 + (hash % 100) / 250;
}

function makeDecisionBasedOnFactors(
  validActions: Action[],
  handStrength: number,
  potOdds: number,
  position: 'early' | 'middle' | 'late',
  aggressiveness: number,
  gameState: GameState,
  player: Player
): BotDecision {
  const random = Math.random();
  
  // If no good actions available, fold (but this should rarely happen with our logic)
  if (validActions.length === 0 || (!validActions.includes('call') && !validActions.includes('check') && !validActions.includes('fold'))) {
    return validActions.includes('fold') ? { action: 'fold' } : { action: validActions[0] };
  }
  
  const positionMultiplier = position === 'late' ? 1.2 : position === 'middle' ? 1.0 : 0.8;
  const adjustedHandStrength = handStrength * positionMultiplier;
  
  if (adjustedHandStrength < 0.2) {
    if (validActions.includes('check') && random < 0.7) {
      return { action: 'check' };
    }
    return validActions.includes('fold') ? { action: 'fold' } : { action: 'check' };
  }
  
  if (adjustedHandStrength < 0.4) {
    if (validActions.includes('check')) {
      return { action: 'check' };
    }
    if (potOdds < 0.3 && validActions.includes('call')) {
      return { action: 'call' };
    }
    return { action: 'fold' };
  }
  
  if (adjustedHandStrength < 0.6) {
    if (validActions.includes('check') && random < 0.4) {
      return { action: 'check' };
    }
    if (validActions.includes('call')) {
      return { action: 'call' };
    }
    if (aggressiveness > 0.6 && validActions.includes('bet') && random < 0.3) {
      const betAmount = Math.min(player.chips, gameState.pot * 0.5);
      return { action: 'bet', betAmount };
    }
    return { action: 'check' };
  }
  
  if (adjustedHandStrength >= 0.8) {
    // Very strong hands - consider all-in with high aggression
    if (aggressiveness > 0.7 && validActions.includes('all-in') && random < 0.4) {
      return { action: 'all-in' };
    }
    if (aggressiveness > 0.5 && validActions.includes('raise') && random < 0.7) {
      const betAmount = Math.min(player.chips, gameState.pot * (1 + aggressiveness));
      return { action: 'raise', betAmount };
    }
    if (validActions.includes('bet') && random < 0.6) {
      const betAmount = Math.min(player.chips, gameState.pot * 0.75);
      return { action: 'bet', betAmount };
    }
  }
  
  // If call is available, use it as fallback
  if (validActions.includes('call')) {
    return { action: 'call' };
  }
  
  // If check is available, use it as fallback
  if (validActions.includes('check')) {
    return { action: 'check' };
  }
  
  // Last resort - if only all-in is available (shouldn't happen often)
  if (validActions.includes('all-in')) {
    return { action: 'all-in' };
  }
  
  // Should never reach here with proper valid actions, but safety fallback
  return validActions.length > 0 ? { action: validActions[0] } : { action: 'fold' };
}