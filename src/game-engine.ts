import { GameState, Player, Card, Action, GamePhase, ChipChange, HandSummary, HandHistoryEntry, BotBehavior } from './types';
import { createDeck, evaluateHand, getHandTypeDisplayName } from './poker-logic';
import { createDeckTracker, updateDeckTracker } from './card-analysis';
import { getBotProfile } from './bot-profiles';
import { GAME_CONFIG, UI_CONFIG, RANDOMIZATION } from './constants';

// Generic bot names that don't reveal behavior or numbering
const BOT_NAMES = [
  'Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Taylor', 'Avery', 'Quinn',
  'Blake', 'Cameron', 'Devon', 'Ellis', 'Finley', 'Gray', 'Harper', 'Indigo',
  'Jude', 'Kai', 'Lane', 'Max', 'Nova', 'Ocean', 'Parker', 'River',
  'Sage', 'Tate', 'Vale', 'West', 'Zoe', 'Adrian', 'Blair', 'Cleo',
  'Drew', 'Ember', 'Frost', 'Gale', 'Haven', 'Iris', 'Jules', 'Knox',
  'Luna', 'Miles', 'Nash', 'Onyx', 'Phoenix', 'Quinn', 'Raven', 'Storm',
  'Theo', 'Uma', 'Vega', 'Wren', 'Xander', 'Yuki', 'Zara', 'Aspen',
  'Bryce', 'Cora', 'Dex', 'Eden', 'Felix', 'Gia', 'Hunter', 'Ivy',
  'Jax', 'Kira', 'Leo', 'Mira', 'Nico', 'Olive', 'Paz', 'Reed',
  'Skye', 'Tara', 'Uri', 'Vera', 'Win', 'Zane', 'Aria', 'Beck',
  'Cruz', 'Dale', 'Ezra', 'Faye', 'Gus', 'Hale', 'Ione', 'Jett',
  'Kade', 'Lux', 'Mae', 'Noel', 'Orion', 'Piper', 'Quin', 'Rue',
  'Sly', 'Tru', 'Ula', 'Vex', 'Wade', 'Zia'
];

export function createInitialGameState(playerCount: number, botCount: number, botConfigs?: BotBehavior[]): GameState {
  const players: Player[] = [];
  
  players.push({
    id: 'human',
    name: 'You',
    chips: GAME_CONFIG.STARTING_CHIPS,
    cards: [],
    isBot: false,
    isFolded: false,
    currentBet: 0,
    totalContribution: 0,
    isAllIn: false,
    hasActedInRound: false,
    isEliminated: false
  });
  
  // Shuffle bot names to randomize them
  const shuffledNames = [...BOT_NAMES].sort(() => Math.random() - RANDOMIZATION.SHUFFLE_OFFSET);
  
  for (let i = 0; i < botCount; i++) {
    const botBehavior = botConfigs?.[i] || 'balanced';
    players.push({
      id: `bot-${i}`,
      name: shuffledNames[i] || `Player ${i + 2}`,
      chips: GAME_CONFIG.STARTING_CHIPS,
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
    smallBlind: GAME_CONFIG.DEFAULT_SMALL_BLIND,
    bigBlind: GAME_CONFIG.DEFAULT_BIG_BLIND,
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
  for (let i = 0; i < GAME_CONFIG.HOLE_CARDS_COUNT; i++) {
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
      const callAmount = Math.min(currentPlayer.chips, newState.currentBet - currentPlayer.currentBet);
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
  
  // Find the next player who can act (not folded, not all-in, not eliminated)
  while (attempts < maxAttempts) {
    const nextPlayer = gameState.players[nextIndex];
    
    // Check if this player can act
    if (!nextPlayer.isFolded && !nextPlayer.isAllIn && !nextPlayer.isEliminated) {
      gameState.currentPlayerIndex = nextIndex;
      return;
    }
    
    nextIndex = (nextIndex + 1) % gameState.players.length;
    attempts++;
  }
  
  // If we've gone through all players and none can act, set currentPlayerIndex to -1
  gameState.currentPlayerIndex = -1;
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
  
  // Extra safety: prevent infinite loops by checking if we've gone around the table
  // If everyone has acted and bets are equal, round should be complete
  if (allBetsEqual && allPlayersActed) {
    return true;
  }
  
  // Emergency break: if we somehow get stuck, force completion
  const playersWhoCanAct = activePlayers.filter(p => 
    !p.hasActedInRound || p.currentBet < gameState.currentBet
  );
  
  if (playersWhoCanAct.length === 0 && allBetsEqual) {
    return true;
  }
  
  return false;
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
      dealCommunityCards(gameState, GAME_CONFIG.FLOP_CARDS);
      break;
    case 'flop':
      gameState.phase = 'turn';
      dealCommunityCards(gameState, GAME_CONFIG.TURN_CARDS);
      break;
    case 'turn':
      gameState.phase = 'river';
      dealCommunityCards(gameState, GAME_CONFIG.RIVER_CARDS);
      break;
    case 'river':
      gameState.phase = 'showdown';
      determineWinner(gameState);
      break;
  }
  
  if (gameState.phase !== 'showdown') {
    // Start with the player after the dealer for post-flop betting rounds
    let nextIndex = (gameState.dealerIndex + 1) % gameState.players.length;
    let attempts = 0;
    const maxAttempts = gameState.players.length;
    
    // Find the first player who can act
    while (attempts < maxAttempts) {
      const nextPlayer = gameState.players[nextIndex];
      
      if (!nextPlayer.isFolded && !nextPlayer.isAllIn && !nextPlayer.isEliminated) {
        gameState.currentPlayerIndex = nextIndex;
        return;
      }
      
      nextIndex = (nextIndex + 1) % gameState.players.length;
      attempts++;
    }
    
    // If no valid player found, force showdown
    gameState.phase = 'showdown';
    dealRemainingCommunityCards(gameState);
    determineWinner(gameState);
    return;
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
  const cardsNeeded = GAME_CONFIG.TOTAL_COMMUNITY_CARDS - gameState.communityCards.length;
  if (cardsNeeded > 0) {
    dealCommunityCards(gameState, cardsNeeded);
  }
}

function determineWinner(gameState: GameState): void {
  const activePlayers = gameState.players.filter(p => !p.isFolded && !p.isEliminated);
  
  const startingChips = (gameState as any).handStartingChips || gameState.players.map(p => ({ id: p.id, chips: p.chips }));
  
  if (activePlayers.length === 1) {
    activePlayers[0].chips = Math.round(activePlayers[0].chips + gameState.pot);
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
  
  // Validate that side pots total equals the main pot
  const totalSidePotAmount = sidePots.reduce((sum, pot) => sum + pot.amount, 0);
  if (Math.abs(totalSidePotAmount - gameState.pot) > 1) { // Allow for rounding errors
    console.warn(`Side pot total (${totalSidePotAmount}) doesn't match main pot (${gameState.pot})`);
  }
  
  const playerHands = activePlayers.map(player => ({
    player,
    hand: evaluateHand([...player.cards, ...gameState.communityCards])
  }));
  
  const allWinnerIds: string[] = [];
  let totalDistributed = 0;
  
  // Distribute each side pot separately
  for (const sidePot of sidePots) {
    const eligiblePlayers = playerHands.filter(ph => 
      sidePot.eligiblePlayerIds.includes(ph.player.id)
    );
    
    if (eligiblePlayers.length === 0) continue;
    
    eligiblePlayers.sort((a, b) => b.hand.score - a.hand.score);
    const winners = eligiblePlayers.filter(ph => ph.hand.score === eligiblePlayers[0].hand.score);
    const winnerShare = Math.floor(sidePot.amount / winners.length);
    const remainder = sidePot.amount - (winnerShare * winners.length);
    
    winners.forEach((winner, index) => {
      // Give remainder to first winner to handle odd chip distributions
      const actualShare = winnerShare + (index === 0 ? remainder : 0);
      winner.player.chips = Math.round(winner.player.chips + actualShare);
      totalDistributed += actualShare;
      
      if (!allWinnerIds.includes(winner.player.id)) {
        allWinnerIds.push(winner.player.id);
      }
    });
  }
  
  gameState.pot = 0;
  gameState.isGameActive = false;
  gameState.currentPlayerIndex = -1; // Clear turn highlight
  calculateChipChanges(gameState, startingChips);
  // Ensure unique winner IDs to prevent duplicate trophies
  const uniqueWinnerIds = Array.from(new Set(allWinnerIds));
  calculateHandSummaries(gameState, uniqueWinnerIds);
  addToHandHistory(gameState, uniqueWinnerIds);
}

function calculateSidePots(gameState: GameState): Array<{ amount: number; eligiblePlayerIds: string[] }> {
  const allPlayers = [...gameState.players];
  const activePlayers = allPlayers.filter(p => !p.isFolded && !p.isEliminated);
  
  // Get all unique contribution amounts, sorted from lowest to highest
  const contributionLevels = Array.from(new Set(allPlayers.map(p => p.totalContribution)))
    .filter(amount => amount > 0)
    .sort((a, b) => a - b);
  
  const sidePots: Array<{ amount: number; eligiblePlayerIds: string[] }> = [];
  let previousLevel = 0;
  
  for (const currentLevel of contributionLevels) {
    const levelDifference = currentLevel - previousLevel;
    
    if (levelDifference <= 0) continue;
    
    // Count all players who contributed at least to this level (for pot size calculation)
    const contributorsAtThisLevel = allPlayers.filter(p => p.totalContribution >= currentLevel);
    
    // Only non-folded players who contributed at least to this level can win this pot
    const eligibleWinners = activePlayers.filter(p => p.totalContribution >= currentLevel);
    
    if (contributorsAtThisLevel.length > 0 && eligibleWinners.length > 0) {
      const potAmount = contributorsAtThisLevel.length * levelDifference;
      sidePots.push({
        amount: potAmount,
        eligiblePlayerIds: eligibleWinners.map(p => p.id)
      });
    }
    
    previousLevel = currentLevel;
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
        isWinner: winnerIds.includes(player.id)
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
  
  // Keep only last hands to prevent memory issues
  if (gameState.handHistory.length > GAME_CONFIG.MAX_HAND_HISTORY) {
    gameState.handHistory = gameState.handHistory.slice(0, GAME_CONFIG.MAX_HAND_HISTORY);
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