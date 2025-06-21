import { GameState, Player, Card, Action, GamePhase, ChipChange, HandSummary, HandHistoryEntry, BotBehavior } from './types';
import { createDeck, evaluateHand, getHandTypeDisplayName } from './poker-logic';
import { createDeckTracker, updateDeckTracker } from './card-analysis';
import { getBotProfile } from './bot-profiles';
import { getRandomBotName, resetBotNames } from './bot-names';

export function createInitialGameState(playerCount: number, botCount: number, botConfigs?: BotBehavior[]): GameState {
  const players: Player[] = [];
  
  resetBotNames();
  
  players.push({
    id: 'human',
    name: 'You',
    chips: 1000,
    cards: [],
    isBot: false,
    isFolded: false,
    currentBet: 0,
    totalContribution: 0,
    isAllIn: false,
    hasActedInRound: false,
    isEliminated: false
  });
  
  for (let i = 0; i < botCount; i++) {
    const botBehavior = botConfigs?.[i] || 'balanced';
    players.push({
      id: `bot-${i}`,
      name: getRandomBotName(),
      chips: 1000,
      cards: [],
      isBot: true,
      isFolded: false,
      currentBet: 0,
      totalContribution: 0,
      isAllIn: false,
      hasActedInRound: false,
      isEliminated: false,
      botProfile: getBotProfile(botBehavior)
    });
  }
  
  return {
    players,
    communityCards: [],
    pot: 0,
    currentPlayerIndex: 0,
    dealerIndex: 0,
    smallBlindIndex: 1,
    bigBlindIndex: 2,
    phase: 'preflop',
    currentBet: 0,
    deck: createDeck(),
    smallBlind: 5,
    bigBlind: 10,
    isGameActive: false,
    deckTracker: createDeckTracker(),
    lastHandChipChanges: [],
    lastHandSummaries: [],
    handHistory: [],
    handNumber: 0
  };
}

function eliminatePlayersWithoutChips(gameState: GameState): void {
  // Mark players with 0 chips as eliminated
  gameState.players.forEach(player => {
    if (player.chips <= 0) {
      player.chips = 0; // Ensure consistent 0 value for eliminated players
      player.isFolded = true; // Mark as folded so they don't participate
      player.isEliminated = true; // Mark as eliminated
    }
  });
  
  // Filter out eliminated players from position calculations
  const remainingPlayers = gameState.players.filter(p => !p.isEliminated);
  
  if (remainingPlayers.length > 0) {
    // Adjust dealer position to a remaining player if current dealer is eliminated
    let attempts = 0;
    while (attempts < gameState.players.length && gameState.players[gameState.dealerIndex].isEliminated) {
      gameState.dealerIndex = (gameState.dealerIndex + 1) % gameState.players.length;
      attempts++;
    }
  }
}

export function startNewHand(gameState: GameState): GameState {
  const newState = { ...gameState };
  
  // Eliminate players with 0 chips
  eliminatePlayersWithoutChips(newState);
  
  // Check if only one player remains
  const remainingPlayers = newState.players.filter(p => !p.isEliminated);
  if (remainingPlayers.length <= 1) {
    newState.isGameActive = false;
    return newState;
  }
  
  newState.deck = createDeck();
  newState.communityCards = [];
  newState.pot = 0;
  newState.finalPot = undefined; // Clear preserved pot value
  newState.currentBet = Math.round(newState.bigBlind);
  newState.phase = 'preflop';
  newState.isGameActive = true;
  newState.deckTracker = createDeckTracker();
  newState.lastHandChipChanges = [];
  newState.lastHandSummaries = [];
  newState.handNumber += 1;
  
  // Move dealer to next player with chips
  let dealerAttempts = 0;
  do {
    newState.dealerIndex = (newState.dealerIndex + 1) % newState.players.length;
    dealerAttempts++;
  } while (dealerAttempts < newState.players.length && newState.players[newState.dealerIndex].isEliminated);
  
  // Set small blind to next player with chips after dealer
  newState.smallBlindIndex = newState.dealerIndex;
  let sbAttempts = 0;
  do {
    newState.smallBlindIndex = (newState.smallBlindIndex + 1) % newState.players.length;
    sbAttempts++;
  } while (sbAttempts < newState.players.length && newState.players[newState.smallBlindIndex].isEliminated);
  
  // Set big blind to next player with chips after small blind
  newState.bigBlindIndex = newState.smallBlindIndex;
  let bbAttempts = 0;
  do {
    newState.bigBlindIndex = (newState.bigBlindIndex + 1) % newState.players.length;
    bbAttempts++;
  } while (bbAttempts < newState.players.length && newState.players[newState.bigBlindIndex].isEliminated);
  
  // Set first to act to next player with chips after big blind
  newState.currentPlayerIndex = newState.bigBlindIndex;
  let firstAttempts = 0;
  do {
    newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    firstAttempts++;
  } while (firstAttempts < newState.players.length && newState.players[newState.currentPlayerIndex].isEliminated);
  
  // Capture starting chips BEFORE any bets are made
  const startingChips = newState.players.map(p => ({ id: p.id, chips: p.chips }));
  
  newState.players = newState.players.map((player, index) => ({
    ...player,
    cards: [],
    isFolded: player.isEliminated, // Keep eliminated players folded
    currentBet: 0,
    totalContribution: 0,
    isAllIn: false,
    hasActedInRound: false
  }));
  
  dealCards(newState);
  postBlinds(newState);
  
  (newState as any).handStartingChips = startingChips;
  
  return newState;
}

function dealCards(gameState: GameState): void {
  for (let i = 0; i < 2; i++) {
    for (const player of gameState.players) {
      if (!player.isEliminated && gameState.deck.length > 0) {
        const card = gameState.deck.pop()!;
        player.cards.push(card);
        updateDeckTracker(gameState.deckTracker, card);
      }
    }
  }
}

function postBlinds(gameState: GameState): void {
  const smallBlindPlayer = gameState.players[gameState.smallBlindIndex];
  const bigBlindPlayer = gameState.players[gameState.bigBlindIndex];
  
  const smallBlindAmount = Math.min(smallBlindPlayer.chips, gameState.smallBlind);
  const bigBlindAmount = Math.min(bigBlindPlayer.chips, gameState.bigBlind);
  
  smallBlindPlayer.chips = Math.round(smallBlindPlayer.chips - smallBlindAmount);
  smallBlindPlayer.currentBet = Math.round(smallBlindAmount);
  smallBlindPlayer.totalContribution = Math.round(smallBlindAmount);
  smallBlindPlayer.hasActedInRound = true;
  
  bigBlindPlayer.chips = Math.round(bigBlindPlayer.chips - bigBlindAmount);
  bigBlindPlayer.currentBet = Math.round(bigBlindAmount);
  bigBlindPlayer.totalContribution = Math.round(bigBlindAmount);
  // Big blind gets option to act preflop, so don't mark as acted yet
  
  gameState.pot = Math.round(gameState.pot + smallBlindAmount + bigBlindAmount);
  
  if (smallBlindPlayer.chips === 0) smallBlindPlayer.isAllIn = true;
  if (bigBlindPlayer.chips === 0) bigBlindPlayer.isAllIn = true;
}

export function processPlayerAction(gameState: GameState, action: Action, betAmount?: number): GameState {
  const newState = { ...gameState };
  const currentPlayer = newState.players[newState.currentPlayerIndex];
  
  // Mark player as having acted in this round
  currentPlayer.hasActedInRound = true;
  
  // If this is a raise/bet, reset hasActedInRound for other players
  if (action === 'bet' || action === 'raise') {
    newState.players.forEach((player, index) => {
      if (index !== newState.currentPlayerIndex && !player.isFolded && !player.isAllIn) {
        player.hasActedInRound = false;
      }
    });
  }
  
  switch (action) {
    case 'fold':
      currentPlayer.isFolded = true;
      break;
      
    case 'check':
      break;
      
    case 'call':
      const callAmount = Math.min(currentPlayer.chips, Math.max(0, newState.currentBet - currentPlayer.currentBet));
      currentPlayer.chips = Math.round(currentPlayer.chips - callAmount);
      currentPlayer.currentBet = Math.round(currentPlayer.currentBet + callAmount);
      currentPlayer.totalContribution = Math.round(currentPlayer.totalContribution + callAmount);
      newState.pot = Math.round(newState.pot + callAmount);
      if (currentPlayer.chips <= 0) {
        currentPlayer.chips = 0;
        currentPlayer.isAllIn = true;
      }
      break;
      
    case 'bet':
    case 'raise':
      const raiseAmount = betAmount || newState.currentBet * 2;
      // Calculate how much more the player needs to bet
      const additionalBet = Math.min(currentPlayer.chips, Math.max(0, raiseAmount - currentPlayer.currentBet));
      
      // If player can't cover the full raise amount, it becomes an all-in
      if (additionalBet < raiseAmount - currentPlayer.currentBet && additionalBet === currentPlayer.chips) {
        currentPlayer.chips = 0;
        currentPlayer.currentBet = Math.round(currentPlayer.currentBet + additionalBet);
        currentPlayer.totalContribution = Math.round(currentPlayer.totalContribution + additionalBet);
        newState.pot = Math.round(newState.pot + additionalBet);
        currentPlayer.isAllIn = true;
        // Only update currentBet if this all-in is actually a raise
        if (currentPlayer.currentBet > newState.currentBet) {
          newState.currentBet = Math.round(currentPlayer.currentBet);
        }
      } else {
        currentPlayer.chips = Math.round(currentPlayer.chips - additionalBet);
        currentPlayer.currentBet = Math.round(currentPlayer.currentBet + additionalBet);
        currentPlayer.totalContribution = Math.round(currentPlayer.totalContribution + additionalBet);
        newState.pot = Math.round(newState.pot + additionalBet);
        newState.currentBet = Math.round(currentPlayer.currentBet);
        if (currentPlayer.chips <= 0) {
          currentPlayer.chips = 0;
          currentPlayer.isAllIn = true;
        }
      }
      break;
      
    case 'all-in':
      const allInAmount = currentPlayer.chips;
      currentPlayer.chips = 0;
      currentPlayer.currentBet = Math.round(currentPlayer.currentBet + allInAmount);
      currentPlayer.totalContribution = Math.round(currentPlayer.totalContribution + allInAmount);
      newState.pot = Math.round(newState.pot + allInAmount);
      const wasRaise = currentPlayer.currentBet > newState.currentBet;
      newState.currentBet = Math.round(Math.max(newState.currentBet, currentPlayer.currentBet));
      currentPlayer.isAllIn = true;
      
      // If this all-in is a raise, reset hasActedInRound for other players
      if (wasRaise) {
        newState.players.forEach((player, index) => {
          if (index !== newState.currentPlayerIndex && !player.isFolded && !player.isAllIn && !player.isEliminated) {
            player.hasActedInRound = false;
          }
        });
      }
      break;
  }
  
  moveToNextPlayer(newState);
  
  if (isRoundComplete(newState)) {
    advanceToNextPhase(newState);
  }
  
  return newState;
}

function moveToNextPlayer(gameState: GameState): void {
  let nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  let attempts = 0;
  const maxAttempts = gameState.players.length;
  
  while (attempts < maxAttempts && (gameState.players[nextIndex].isFolded || gameState.players[nextIndex].isAllIn || gameState.players[nextIndex].isEliminated)) {
    nextIndex = (nextIndex + 1) % gameState.players.length;
    attempts++;
  }
  
  // If we've gone through all players and none can act, set currentPlayerIndex to -1
  if (attempts >= maxAttempts || gameState.players[nextIndex].isFolded || gameState.players[nextIndex].isAllIn || gameState.players[nextIndex].isEliminated) {
    gameState.currentPlayerIndex = -1;
    return;
  }
  
  gameState.currentPlayerIndex = nextIndex;
}

function isRoundComplete(gameState: GameState): boolean {
  const activePlayers = gameState.players.filter(p => !p.isFolded && !p.isAllIn && !p.isEliminated);
  const allNonFoldedPlayers = gameState.players.filter(p => !p.isFolded && !p.isEliminated);
  
  // If only one non-folded player remains, hand is over
  if (allNonFoldedPlayers.length <= 1) {
    return true;
  }
  
  // If only one active player remains (others folded or all-in), round is complete
  if (activePlayers.length <= 1) {
    return true;
  }
  
  // If no valid current player exists (all are folded/all-in), round is complete
  if (gameState.currentPlayerIndex < 0) {
    return true;
  }
  
  // Special case: if all remaining players are all-in, round is complete
  if (activePlayers.length === 0) {
    return true;
  }
  
  // Check if all active players have equal bets and have acted
  const currentBets = activePlayers.map(p => p.currentBet);
  const allBetsEqual = currentBets.every(bet => bet === currentBets[0]);
  const allPlayersActed = activePlayers.every(p => p.hasActedInRound);
  
  // Additional safety check: if current player is not in active players list
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.isFolded || currentPlayer.isAllIn || currentPlayer.isEliminated) {
    return allBetsEqual;
  }
  
  return allBetsEqual && allPlayersActed;
}

function advanceToNextPhase(gameState: GameState): void {
  // Check if only one active player remains - if so, deal remaining cards then go to showdown
  const activePlayers = gameState.players.filter(p => !p.isFolded && !p.isAllIn && !p.isEliminated);
  if (activePlayers.length <= 1) {
    // Deal all remaining community cards to complete the board
    dealRemainingCommunityCards(gameState);
    gameState.phase = 'showdown';
    determineWinner(gameState);
    return;
  }
  
  resetCurrentBets(gameState);
  
  switch (gameState.phase) {
    case 'preflop':
      gameState.phase = 'flop';
      dealCommunityCards(gameState, 3);
      break;
    case 'flop':
      gameState.phase = 'turn';
      dealCommunityCards(gameState, 1);
      break;
    case 'turn':
      gameState.phase = 'river';
      dealCommunityCards(gameState, 1);
      break;
    case 'river':
      gameState.phase = 'showdown';
      determineWinner(gameState);
      break;
  }
  
  if (gameState.phase !== 'showdown') {
    gameState.currentPlayerIndex = (gameState.dealerIndex + 1) % gameState.players.length;
    let attempts = 0;
    const maxAttempts = gameState.players.length;
    
    while (attempts < maxAttempts && (gameState.players[gameState.currentPlayerIndex].isFolded || gameState.players[gameState.currentPlayerIndex].isAllIn || gameState.players[gameState.currentPlayerIndex].isEliminated)) {
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
      attempts++;
    }
    
    // If no valid player found, force showdown
    if (attempts >= maxAttempts) {
      gameState.phase = 'showdown';
      dealRemainingCommunityCards(gameState);
      determineWinner(gameState);
      return;
    }
  }
}

function resetCurrentBets(gameState: GameState): void {
  gameState.players.forEach(player => {
    // Reset currentBet for new betting round but keep totalContribution
    player.currentBet = 0;
    player.hasActedInRound = false;
  });
  gameState.currentBet = 0;
}

function dealCommunityCards(gameState: GameState, count: number): void {
  for (let i = 0; i < count; i++) {
    if (gameState.deck.length > 0) {
      const card = gameState.deck.pop()!;
      gameState.communityCards.push(card);
      updateDeckTracker(gameState.deckTracker, card);
    }
  }
}

function dealRemainingCommunityCards(gameState: GameState): void {
  const cardsNeeded = 5 - gameState.communityCards.length;
  if (cardsNeeded > 0) {
    dealCommunityCards(gameState, cardsNeeded);
  }
}

function determineWinner(gameState: GameState): void {
  const activePlayers = gameState.players.filter(p => !p.isFolded && !p.isEliminated);
  
  const startingChips = (gameState as any).handStartingChips || gameState.players.map(p => ({ id: p.id, chips: p.chips }));
  
  if (activePlayers.length === 1) {
    activePlayers[0].chips = Math.round(activePlayers[0].chips + gameState.pot);
    gameState.finalPot = gameState.pot; // Preserve pot value for display
    gameState.pot = 0;
    gameState.isGameActive = false;
    gameState.currentPlayerIndex = -1; // Clear turn highlight
    
    calculateChipChanges(gameState, startingChips);
    // Ensure unique winner ID to prevent duplicate trophies
    const uniqueWinnerIds = Array.from(new Set([activePlayers[0].id]));
    calculateHandSummaries(gameState, uniqueWinnerIds);
    addToHandHistory(gameState, uniqueWinnerIds);
    return;
  }
  
  // Calculate side pots for proper all-in handling
  const sidePots = calculateSidePots(gameState);
  
  const playerHands = activePlayers.map(player => ({
    player,
    hand: evaluateHand([...player.cards, ...gameState.communityCards])
  }));
  
  const allWinnerIds: string[] = [];
  
  // Distribute each side pot separately
  for (const sidePot of sidePots) {
    const eligiblePlayers = playerHands.filter(ph => 
      sidePot.eligiblePlayerIds.includes(ph.player.id)
    );
    
    if (eligiblePlayers.length === 0) continue;
    
    eligiblePlayers.sort((a, b) => b.hand.score - a.hand.score);
    const winners = eligiblePlayers.filter(ph => ph.hand.score === eligiblePlayers[0].hand.score);
    const winnerShare = Math.floor(sidePot.amount / winners.length);
    
    winners.forEach(winner => {
      winner.player.chips = Math.round(winner.player.chips + winnerShare);
      if (!allWinnerIds.includes(winner.player.id)) {
        allWinnerIds.push(winner.player.id);
      }
    });
  }
  
  gameState.finalPot = gameState.pot; // Preserve pot value for display
  gameState.pot = 0;
  gameState.isGameActive = false;
  gameState.currentPlayerIndex = -1; // Clear turn highlight
  
  // All-in players who didn't win any side pots should have 0 chips
  // (they already contributed everything they had)
  
  calculateChipChanges(gameState, startingChips);
  // Ensure unique winner IDs to prevent duplicate trophies
  const uniqueWinnerIds = Array.from(new Set(allWinnerIds));
  calculateHandSummaries(gameState, uniqueWinnerIds);
  addToHandHistory(gameState, uniqueWinnerIds);
}

function calculateSidePots(gameState: GameState): Array<{ amount: number; eligiblePlayerIds: string[] }> {
  const allPlayers = [...gameState.players];
  const activePlayers = allPlayers.filter(p => !p.isFolded && !p.isEliminated);
  
  // Get all unique contribution amounts from all players (not just active ones)
  const contributionAmounts = Array.from(new Set(allPlayers.map(p => p.totalContribution))).sort((a, b) => a - b);
  
  const sidePots: Array<{ amount: number; eligiblePlayerIds: string[] }> = [];
  let previousContributionLevel = 0;
  
  for (const contributionLevel of contributionAmounts) {
    if (contributionLevel <= 0) continue; // Skip zero or negative contributions
    
    const contributionDifference = contributionLevel - previousContributionLevel;
    
    // Count ALL players who contributed at least this level (including folded ones for pot calculation)
    const contributingPlayers = allPlayers.filter(p => p.totalContribution >= contributionLevel);
    
    // But only active players are eligible to win
    const eligiblePlayers = activePlayers.filter(p => p.totalContribution >= contributionLevel);
    
    if (contributingPlayers.length > 0 && contributionDifference > 0) {
      const potAmount = Math.round(contributingPlayers.length * contributionDifference);
      sidePots.push({
        amount: potAmount,
        eligiblePlayerIds: eligiblePlayers.map(p => p.id)
      });
    }
    
    previousContributionLevel = contributionLevel;
  }
  
  // Verify total side pot amounts equal the main pot
  const totalSidePotAmount = sidePots.reduce((sum, pot) => sum + pot.amount, 0);
  if (Math.abs(totalSidePotAmount - gameState.pot) > 1) { // Allow for small rounding differences
    console.warn(`Side pot calculation mismatch: ${totalSidePotAmount} vs ${gameState.pot}`);
  }
  
  return sidePots;
}

function calculateChipChanges(gameState: GameState, startingChips: { id: string, chips: number }[]): void {
  gameState.lastHandChipChanges = gameState.players.map(player => {
    const startingAmount = startingChips.find(sc => sc.id === player.id)?.chips || 0;
    const change = player.chips - startingAmount;
    
    return {
      playerId: player.id,
      playerName: player.name,
      change,
      finalChips: player.chips,
      totalBet: player.totalContribution
    };
  });
}

function calculateHandSummaries(gameState: GameState, winnerIds: string[]): void {
  // Ensure unique players to prevent duplicates
  const uniquePlayers = gameState.players.filter((player, index, players) => 
    players.findIndex(p => p.id === player.id) === index
  );
  
  // Ensure unique winner IDs to prevent duplicate trophies
  const uniqueWinnerIds = Array.from(new Set(winnerIds));
  
  gameState.lastHandSummaries = uniquePlayers
    .filter(player => !player.isFolded && player.cards.length > 0)
    .map(player => {
      const hand = evaluateHand([...player.cards, ...gameState.communityCards]);
      return {
        playerId: player.id,
        playerName: player.name,
        handRank: hand.rank,
        handDescription: getHandTypeDisplayName(hand.rank),
        cards: hand.cards,
        holeCards: player.cards,
        isWinner: uniqueWinnerIds.includes(player.id)
      };
    })
    .sort((a, b) => {
      if (a.isWinner && !b.isWinner) return -1;
      if (!a.isWinner && b.isWinner) return 1;
      return 0;
    });
}

function addToHandHistory(gameState: GameState, winnerIds: string[]): void {
  const historyEntry: HandHistoryEntry = {
    handNumber: gameState.handNumber,
    timestamp: Date.now(),
    phase: 'showdown',
    communityCards: [...gameState.communityCards],
    pot: gameState.lastHandChipChanges.reduce((sum, change) => sum + change.totalBet, 0),
    summaries: [...gameState.lastHandSummaries],
    chipChanges: [...gameState.lastHandChipChanges],
    winnerIds: [...winnerIds]
  };
  
  gameState.handHistory.unshift(historyEntry); // Add to beginning for newest first
  
  // Keep only last 50 hands to prevent memory issues
  if (gameState.handHistory.length > 50) {
    gameState.handHistory = gameState.handHistory.slice(0, 50);
  }
}

export function getValidActions(gameState: GameState, playerIndex: number): Action[] {
  const player = gameState.players[playerIndex];
  const actions: Action[] = [];
  
  if (player.isFolded || player.isAllIn || player.isEliminated || player.chips <= 0) {
    return actions;
  }
  
  const callAmount = gameState.currentBet - player.currentBet;
  const isBigBlind = playerIndex === gameState.bigBlindIndex;
  const isPreflop = gameState.phase === 'preflop';
  
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