import { calculateExpectedValue, calculateEquity } from './equity-calculator';
import { GameState, Card, Action } from './types';

export interface ActionEV {
  action: Action;
  ev: number;
  probability: number;
  potOdds: number;
  impliedOdds: number;
  recommendation: 'profitable' | 'marginal' | 'unprofitable';
  details: {
    winAmount: number;
    loseAmount: number;
    winProbability: number;
    loseProbability: number;
  };
}

export interface HoverEVData {
  fold: ActionEV;
  call?: ActionEV;
  check?: ActionEV;
  bet?: ActionEV;
  raise?: ActionEV;
  allIn?: ActionEV;
}

export function calculateHoverEV(
  gameState: GameState,
  playerCards: Card[],
  communityCards: Card[],
  validActions: Action[]
): HoverEVData {
  const currentPlayer = gameState.players.find(p => !p.isBot);
  if (!currentPlayer) {
    throw new Error('No human player found');
  }

  const potSize = gameState.pot;
  const currentBet = gameState.currentBet;
  const playerChips = currentPlayer.chips;
  const betToCall = currentBet - (currentPlayer.currentBet || 0);

  // Calculate equity once for all actions
  const equityResult = calculateEquity(playerCards, communityCards, [], { 
    iterations: 1000, 
    opponents: gameState.players.length - 1,
    deadCards: []
  });
  const winProbability = equityResult.equity / 100;
  const loseProbability = 1 - winProbability;

  const result: Partial<HoverEVData> = {};

  // Always calculate fold EV (always 0)
  result.fold = {
    action: 'fold',
    ev: 0,
    probability: 0,
    potOdds: 0,
    impliedOdds: 0,
    recommendation: 'unprofitable',
    details: {
      winAmount: 0,
      loseAmount: currentPlayer.currentBet || 0,
      winProbability: 0,
      loseProbability: 1
    }
  };

  // Calculate call/check EV
  if (validActions.includes('call')) {
    const winAmount = potSize;
    const loseAmount = betToCall;
    const potOdds = betToCall > 0 ? betToCall / (potSize + betToCall) : 0;
    
    const callEV = calculateExpectedValue(
      winProbability,
      winAmount,
      loseProbability,
      loseAmount
    );

    result.call = {
      action: 'call',
      ev: callEV,
      probability: winProbability,
      potOdds: potOdds,
      impliedOdds: potOdds + 0.1, // Simplified implied odds
      recommendation: callEV > 0 ? 'profitable' : callEV > -5 ? 'marginal' : 'unprofitable',
      details: {
        winAmount,
        loseAmount,
        winProbability,
        loseProbability
      }
    };
  }

  if (validActions.includes('check')) {
    const checkEV = potSize * winProbability; // Free to see next card
    
    result.check = {
      action: 'check',
      ev: checkEV,
      probability: winProbability,
      potOdds: 0,
      impliedOdds: 0.2, // Higher implied odds for free cards
      recommendation: 'profitable', // Check is always free
      details: {
        winAmount: potSize,
        loseAmount: 0,
        winProbability,
        loseProbability
      }
    };
  }

  // Calculate bet EV for different amounts
  if (validActions.includes('bet')) {
    const betAmount = Math.min(Math.floor(potSize * 0.75), playerChips);
    const newPotSize = potSize + betAmount;
    const foldEquity = 0.3; // Assume 30% chance opponent folds
    
    const betEV = (foldEquity * potSize) + ((1 - foldEquity) * winProbability * newPotSize) - ((1 - foldEquity) * loseProbability * betAmount);

    result.bet = {
      action: 'bet',
      ev: betEV,
      probability: winProbability,
      potOdds: betAmount / newPotSize,
      impliedOdds: 0.15,
      recommendation: betEV > 0 ? 'profitable' : betEV > -10 ? 'marginal' : 'unprofitable',
      details: {
        winAmount: newPotSize,
        loseAmount: betAmount,
        winProbability: winProbability * (1 - foldEquity),
        loseProbability: loseProbability * (1 - foldEquity)
      }
    };
  }

  if (validActions.includes('raise')) {
    const raiseAmount = Math.min(Math.floor(potSize * 1.5), playerChips);
    const newPotSize = potSize + raiseAmount;
    const foldEquity = 0.4; // Higher chance opponent folds to raise
    
    const raiseEV = (foldEquity * potSize) + ((1 - foldEquity) * winProbability * newPotSize) - ((1 - foldEquity) * loseProbability * raiseAmount);

    result.raise = {
      action: 'raise',
      ev: raiseEV,
      probability: winProbability,
      potOdds: raiseAmount / newPotSize,
      impliedOdds: 0.1,
      recommendation: raiseEV > 0 ? 'profitable' : raiseEV > -15 ? 'marginal' : 'unprofitable',
      details: {
        winAmount: newPotSize,
        loseAmount: raiseAmount,
        winProbability: winProbability * (1 - foldEquity),
        loseProbability: loseProbability * (1 - foldEquity)
      }
    };
  }

  if (validActions.includes('all-in')) {
    const allInAmount = playerChips;
    const newPotSize = potSize + allInAmount;
    const foldEquity = 0.5; // High chance opponent folds to all-in
    
    const allInEV = (foldEquity * potSize) + ((1 - foldEquity) * winProbability * newPotSize) - ((1 - foldEquity) * loseProbability * allInAmount);

    result.allIn = {
      action: 'all-in',
      ev: allInEV,
      probability: winProbability,
      potOdds: allInAmount / newPotSize,
      impliedOdds: 0.05,
      recommendation: allInEV > 0 ? 'profitable' : allInEV > -25 ? 'marginal' : 'unprofitable',
      details: {
        winAmount: newPotSize,
        loseAmount: allInAmount,
        winProbability: winProbability * (1 - foldEquity),
        loseProbability: loseProbability * (1 - foldEquity)
      }
    };
  }

  return result as HoverEVData;
}

export function getBestAction(hoverEVData: HoverEVData): ActionEV {
  const actions = Object.values(hoverEVData).filter(action => action.action !== 'fold');
  if (actions.length === 0) return hoverEVData.fold;
  
  return actions.reduce((best, current) => 
    current.ev > best.ev ? current : best
  );
}

export function formatEV(ev: number): string {
  if (Math.abs(ev) < 0.1) return '±0';
  return ev > 0 ? `+${ev.toFixed(1)}` : ev.toFixed(1);
}

export function getEVColor(ev: number): string {
  if (ev > 5) return '#4ade80'; // Green
  if (ev > 0) return '#a3e635'; // Light green
  if (ev > -5) return '#fbbf24'; // Yellow
  return '#f87171'; // Red
}