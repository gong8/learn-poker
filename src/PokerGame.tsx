import React, { useState, useEffect } from 'react';
import { GameState, Action, PlayerAnalysis } from './types';
import { createInitialGameState, startNewHand, processPlayerAction, getValidActions } from './game-engine';
import { makeBotDecision } from './bot-ai';
import { analyzePlayer } from './card-analysis';
import Player from './components/Player';
import Card from './components/Card';
import GameControls from './components/GameControls';
import GameSetup from './components/GameSetup';
import PlayerAnalysisPanel from './components/PlayerAnalysis';
import HandSummaryComponent from './components/HandSummary';

const PokerGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showdown, setShowdown] = useState(false);
  const [playerAnalysis, setPlayerAnalysis] = useState<PlayerAnalysis | null>(null);

  const startGame = (botCount: number) => {
    const initialState = createInitialGameState(1, botCount);
    const newGameState = startNewHand(initialState);
    setGameState(newGameState);
    setShowdown(false);
  };

  const startNewRound = () => {
    if (gameState) {
      const newGameState = startNewHand(gameState);
      setGameState(newGameState);
      setShowdown(false);
    }
  };

  const handlePlayerAction = (action: Action, betAmount?: number) => {
    if (!gameState || gameState.phase === 'showdown') return;

    const newGameState = processPlayerAction(gameState, action, betAmount);
    setGameState(newGameState);

    if (newGameState.phase === 'showdown') {
      setShowdown(true);
    }
  };

  useEffect(() => {
    if (!gameState || !gameState.isGameActive || gameState.currentPlayerIndex < 0) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (currentPlayer && currentPlayer.isBot && !currentPlayer.isFolded && !currentPlayer.isAllIn) {
      const timer = setTimeout(() => {
        const botDecision = makeBotDecision(gameState, gameState.currentPlayerIndex);
        handlePlayerAction(botDecision.action, botDecision.betAmount);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [gameState]);

  useEffect(() => {
    if (!gameState) return;

    const humanPlayer = gameState.players.find(p => !p.isBot);
    if (humanPlayer) {
      const humanPlayerIndex = gameState.players.indexOf(humanPlayer);
      const analysis = analyzePlayer(gameState, humanPlayerIndex);
      setPlayerAnalysis(analysis);
    }
  }, [gameState]);

  if (!gameState) {
    return <GameSetup onStartGame={startGame} />;
  }

  const humanPlayer = gameState.players.find(p => !p.isBot);
  const validActions = humanPlayer ? getValidActions(gameState, gameState.players.indexOf(humanPlayer)) : [];
  const isHumanTurn = gameState.players[gameState.currentPlayerIndex] === humanPlayer;

  const getPhaseDisplay = () => {
    switch (gameState.phase) {
      case 'preflop': return 'Pre-flop';
      case 'flop': return 'Flop';
      case 'turn': return 'Turn';
      case 'river': return 'River';
      case 'showdown': return 'Showdown';
      default: return '';
    }
  };

  return (
    <div className="poker-game">
      <div className="game-header">
        <h1>Texas Hold'em Poker</h1>
        <div className="game-info">
          <div className="phase">Phase: {getPhaseDisplay()}</div>
          <div className="pot">Pot: {gameState.pot}</div>
          <div className="current-bet">Current Bet: {gameState.currentBet}</div>
        </div>
      </div>

      <div className="game-layout">
        <div className="game-main">
          <div className="poker-table">
            <div className="community-cards">
              <h3>Community Cards</h3>
              <div className="cards">
                {Array.from({ length: 5 }, (_, index) => (
                  <Card
                    key={index}
                    card={gameState.communityCards[index] || null}
                    hidden={!gameState.communityCards[index]}
                  />
                ))}
              </div>
            </div>

            <div className="players">
              {gameState.players.map((player, index) => {
                const isWinner = !gameState.isGameActive && 
                  gameState.lastHandSummaries.some(summary => 
                    summary.playerId === player.id && summary.isWinner
                  );
                
                return (
                  <Player
                    key={player.id}
                    player={player}
                    isCurrentPlayer={gameState.isGameActive && index === gameState.currentPlayerIndex}
                    isDealer={index === gameState.dealerIndex}
                    isSmallBlind={index === gameState.smallBlindIndex}
                    isBigBlind={index === gameState.bigBlindIndex}
                    showCards={showdown || !player.isBot}
                    isWinner={isWinner}
                  />
                );
              })}
            </div>
          </div>

          {!gameState.isGameActive ? (
            <div className="game-over">
              <h2>Hand Complete</h2>
              <div className="hand-results-layout">
                <div className="hand-results-left">
                  <HandSummaryComponent summaries={gameState.lastHandSummaries} />
                </div>
                <div className="hand-results-right">
                  {gameState.lastHandChipChanges.length > 0 && (
                    <div className="chip-changes-summary">
                      <h3>Chip Changes This Hand</h3>
                      <table className="chip-changes-table">
                        <thead>
                          <tr>
                            <th>Player</th>
                            <th>Bet</th>
                            <th>Change</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gameState.lastHandChipChanges.map(change => (
                            <tr key={change.playerId}>
                              <td className="player-name">{change.playerName}</td>
                              <td className="bet-info">{change.totalBet}</td>
                              <td className={`chip-change ${change.change >= 0 ? 'positive' : 'negative'}`}>
                                {change.change >= 0 ? '+' : ''}{change.change}
                              </td>
                              <td className="final-chips">{change.finalChips}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <button onClick={startNewRound} className="new-hand-button">
                    Start New Hand
                  </button>
                </div>
              </div>
            </div>
          ) : isHumanTurn && humanPlayer ? (
            <GameControls
              validActions={validActions}
              onAction={handlePlayerAction}
              currentBet={gameState.currentBet - humanPlayer.currentBet}
              playerChips={humanPlayer.chips}
              minRaise={gameState.bigBlind}
              isBigBlind={gameState.players.indexOf(humanPlayer) === gameState.bigBlindIndex}
              isPreflop={gameState.phase === 'preflop'}
            />
          ) : (
            <div className="waiting">
              {gameState.phase === 'showdown' ? 'Showdown' : 'Waiting for other players...'}
            </div>
          )}
        </div>

        <div className="game-sidebar">
          <PlayerAnalysisPanel 
            analysis={playerAnalysis || {
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
            }}
            isVisible={!!(gameState.isGameActive && humanPlayer?.cards && humanPlayer.cards.length > 0)}
          />
        </div>
      </div>
    </div>
  );
};

export default PokerGame;