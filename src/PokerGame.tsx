import React, { useState, useEffect } from 'react';
import { GameState, Action, PlayerAnalysis, BotBehavior } from './types';
import { createInitialGameState, startNewHand, processPlayerAction, getValidActions } from './game-engine';
import { makeBotDecision } from './bot-ai';
import { analyzePlayer } from './card-analysis';
import Player from './components/Player';
import Card from './components/Card';
import GameControls from './components/GameControls';
import GameSetup from './components/GameSetup';
import PlayerAnalysisPanel from './components/PlayerAnalysis';
import HandSummaryComponent from './components/HandSummary';
import SettingsModal from './components/SettingsModal';
import HandHistory from './components/HandHistory';
import EliminationModal from './components/EliminationModal';
import { useSettings } from './contexts/SettingsContext';

const PokerGame: React.FC = () => {
  const { settings } = useSettings();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showdown, setShowdown] = useState(false);
  const [playerAnalysis, setPlayerAnalysis] = useState<PlayerAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHandHistory, setShowHandHistory] = useState(false);
  const [showEliminationModal, setShowEliminationModal] = useState(false);

  const startGame = (botCount: number, botConfigs: BotBehavior[]) => {
    const initialState = createInitialGameState(1, botCount, botConfigs);
    const newGameState = startNewHand(initialState);
    setGameState(newGameState);
    setShowdown(false);
    setShowEliminationModal(false);
  };

  const returnToStart = () => {
    setGameState(null);
    setShowEliminationModal(false);
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
      // Add safety check to prevent infinite loops
      const activePlayers = gameState.players.filter(p => !p.isFolded && !p.isAllIn);
      if (activePlayers.length <= 1) {
        return; // Hand should be ending, don't process more bot actions
      }
      
      const getBotDelay = () => {
        switch (settings.botSpeed) {
          case 'fast': return 500;
          case 'slow': return 2000;
          default: return 1000;
        }
      };

      const timer = setTimeout(() => {
        const botDecision = makeBotDecision(gameState, gameState.currentPlayerIndex);
        handlePlayerAction(botDecision.action, botDecision.betAmount);
      }, getBotDelay());

      return () => clearTimeout(timer);
    }
  }, [gameState]);

  useEffect(() => {
    if (!gameState) return;

    const humanPlayer = gameState.players.find(p => !p.isBot);
    if (humanPlayer) {
      // Check if human player is eliminated and show modal
      if (humanPlayer.isEliminated && !showEliminationModal) {
        setShowEliminationModal(true);
      }

      const humanPlayerIndex = gameState.players.indexOf(humanPlayer);
      const isHumanTurn = gameState.currentPlayerIndex === humanPlayerIndex;
      
      // Run analysis asynchronously to avoid blocking UI
      setIsAnalyzing(true);
      
      // Use setTimeout to defer analysis until after render
      const analysisTimeout = setTimeout(async () => {
        try {
          const analysis = await analyzePlayer(gameState, humanPlayerIndex);
          
          // Only update recommendation if it's human's turn or if there's no current analysis
          if (isHumanTurn || !playerAnalysis) {
            setPlayerAnalysis(analysis);
          } else {
            // Keep the same recommendation but update other stats
            setPlayerAnalysis(prev => prev ? {
              ...analysis,
              recommendation: prev.recommendation
            } : analysis);
          }
        } catch (error) {
          console.error('Analysis failed:', error);
        } finally {
          setIsAnalyzing(false);
        }
      }, 0);
      
      return () => clearTimeout(analysisTimeout);
    }
  }, [gameState, showEliminationModal]);

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
    <div className="poker-game-modern">
      <div className="game-header-modern">
        <div className="header-content">
          <div className="title-section">
            <h1>Learn Poker</h1>
            <div className="game-info-compact">
              <div className="info-item phase">
                <span className="info-label">Phase</span>
                <span className="info-value">{getPhaseDisplay()}</span>
              </div>
              <div className="info-item pot">
                <span className="info-label">Pot</span>
                <span className="info-value">{Math.floor(gameState.pot).toLocaleString()}</span>
              </div>
              <div className="info-item bet">
                <span className="info-label">{gameState.currentBet > 0 ? 'To Call' : 'No Bet'}</span>
                <span className="info-value">{gameState.currentBet > 0 ? Math.floor(gameState.currentBet).toLocaleString() : '—'}</span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            {gameState && (
              <button
                className="header-btn history-btn"
                onClick={() => setShowHandHistory(true)}
                title="Hand History"
              >
                📋
              </button>
            )}
            <button
              className="header-btn settings-btn"
              onClick={() => setShowSettingsModal(true)}
              title="Game Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      <div className="game-layout-modern">
        <div className="game-main-modern">
          <div className="poker-table-modern">
            <div className="community-section">
              <div className="community-cards-grid">
                {Array.from({ length: 5 }, (_, index) => (
                  <Card
                    key={index}
                    card={gameState.communityCards[index] || null}
                    hidden={!gameState.communityCards[index]}
                    size={settings.cardSize}
                  />
                ))}
              </div>
            </div>

            <div className="players-grid-modern">
              {gameState.players.map((player, index) => {
                const isWinner = !gameState.isGameActive && 
                  gameState.lastHandChipChanges.some(change => 
                    change.playerId === player.id && change.change > 0
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
                    cardSize={settings.cardSize}
                  />
                );
              })}
            </div>
          </div>

          {!gameState.isGameActive ? (
            <div className="game-over-modern">
              <div className="results-header">
                <h2>Hand Complete</h2>
                <button onClick={startNewRound} className="new-hand-btn">
                  Start New Hand
                </button>
              </div>
              <div className="results-content">
                <div className="results-left">
                  <HandSummaryComponent summaries={gameState.lastHandSummaries} />
                </div>
                <div className="results-right">
                  {gameState.lastHandChipChanges.length > 0 && (
                    <div className="chip-changes-modern">
                      <h3>Chip Changes</h3>
                      <table className="chip-table">
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
                              <td className="bet-amount">{Math.floor(change.totalBet).toLocaleString()}</td>
                              <td className={`chip-change ${change.change >= 0 ? 'positive' : 'negative'}`}>
                                {change.change >= 0 ? '+' : ''}{Math.floor(change.change).toLocaleString()}
                              </td>
                              <td className="total-chips">{Math.floor(change.finalChips).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : isHumanTurn && humanPlayer ? (
            <GameControls
              validActions={validActions}
              onAction={handlePlayerAction}
              currentBet={Math.floor(Math.max(0, gameState.currentBet - humanPlayer.currentBet))}
              playerChips={humanPlayer.chips}
              minRaise={gameState.bigBlind}
              isBigBlind={gameState.players.indexOf(humanPlayer) === gameState.bigBlindIndex}
              isPreflop={gameState.phase === 'preflop'}
            />
          ) : (
            <div className="waiting-modern">
              <div className="waiting-content">
                <div className="waiting-spinner"></div>
                <span>{gameState.phase === 'showdown' ? 'Showdown in progress...' : 'Waiting for other players...'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="game-sidebar-modern">
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
            isLoading={isAnalyzing}
            isActive={gameState.isGameActive && humanPlayer && !humanPlayer.isFolded && !humanPlayer.isEliminated}
            gamePhase={gameState.phase}
          />
        </div>
      </div>

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {gameState && (
        <HandHistory
          history={gameState.handHistory}
          isOpen={showHandHistory}
          onClose={() => setShowHandHistory(false)}
        />
      )}

      <EliminationModal
        isOpen={showEliminationModal}
        onReturnToStart={returnToStart}
      />
    </div>
  );
};

export default PokerGame;