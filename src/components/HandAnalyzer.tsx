import React, { useState, useEffect } from 'react';
import { Card, Rank, Suit, PlayerAnalysis } from '../types';
import { analyzePlayer } from '../advanced-poker-analysis';
import { createInitialGameState } from '../game-engine';
import CardComponent from './Card';
import PlayerAnalysisPanel, { AdvancedAnalysisPanel } from './PlayerAnalysis';
import { useSettings } from '../contexts/SettingsContext';

interface HandAnalyzerProps {
  onBack: () => void;
}

type GamePhase = 'preflop' | 'flop' | 'turn' | 'river';

const HandAnalyzer: React.FC<HandAnalyzerProps> = ({ onBack }) => {
  const { settings, updateSetting } = useSettings();
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [numOpponents, setNumOpponents] = useState<number>(3);
  const [gamePhase, setGamePhase] = useState<GamePhase>('preflop');
  const [analysis, setAnalysis] = useState<PlayerAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

  const cardSlots = {
    preflop: 0,
    flop: 3,
    turn: 4,
    river: 5
  };

  useEffect(() => {
    const currentCards = communityCards.slice();
    const newLength = cardSlots[gamePhase];
    
    if (newLength > currentCards.length) {
      const newCards = [...currentCards, ...new Array(newLength - currentCards.length).fill(null)];
      setCommunityCards(newCards);
    } else if (newLength < currentCards.length) {
      setCommunityCards(currentCards.slice(0, newLength));
    }
  }, [gamePhase]);

  useEffect(() => {
    if (playerCards.length === 2 && playerCards.every(card => card !== null)) {
      runAnalysis();
    }
  }, [playerCards, communityCards, numOpponents, gamePhase]);

  const runAnalysis = async () => {
    if (playerCards.length !== 2 || playerCards.some(card => card === null)) {
      setAnalysis(null);
      return;
    }

    setIsAnalyzing(true);
    try {
      const mockGameState = createMockGameState();
      const playerAnalysis = await analyzePlayer(mockGameState, 0);
      setAnalysis(playerAnalysis);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createMockGameState = () => {
    const gameState = createInitialGameState(1, numOpponents, []);
    gameState.players[0].cards = [...playerCards];
    gameState.communityCards = communityCards.filter(card => card !== null);
    gameState.phase = gamePhase;
    gameState.pot = 150;
    gameState.currentBet = 20;
    gameState.bigBlind = 20;
    gameState.players[0].currentBet = 0;
    return gameState;
  };

  const setPlayerCard = (index: 0 | 1, card: Card) => {
    const newCards = [...playerCards];
    while (newCards.length <= index) {
      newCards.push(null as any);
    }
    newCards[index] = card;
    setPlayerCards(newCards);
  };

  const setCommunityCard = (index: number, card: Card) => {
    const newCards = [...communityCards];
    newCards[index] = card;
    setCommunityCards(newCards);
  };

  const isCardUsed = (checkCard: Card): boolean => {
    const allCards = [...playerCards, ...communityCards].filter(card => card !== null);
    return allCards.some(card => 
      card && card.rank === checkCard.rank && card.suit === checkCard.suit
    );
  };

  const clearAllCards = () => {
    setPlayerCards([]);
    setCommunityCards(new Array(cardSlots[gamePhase]).fill(null));
    setAnalysis(null);
  };

  return (
    <div className="hand-analyzer">
      <div className="analyzer-header">
        <div className="header-left">
          <button className="back-btn" onClick={onBack}>
            ← Back to Game
          </button>
          <div className="analyzer-title">
            <h1>Hand Analyzer</h1>
            <p>Select your cards and board to get strategic analysis</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="header-btn settings-btn" onClick={() => setShowSettings(true)}>
            ⚙️ Settings
          </button>
        </div>
      </div>

      <div className="analyzer-layout">
        <div className="analyzer-main">
          <div className="analyzer-controls">
            <div className="control-section">
              <label>Number of Opponents:</label>
              <div className="opponents-buttons">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <button
                    key={num}
                    className={`opponent-btn ${numOpponents === num ? 'active' : ''}`}
                    onClick={() => setNumOpponents(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-section">
              <label>Game Phase:</label>
              <div className="phase-buttons">
                {(['preflop', 'flop', 'turn', 'river'] as GamePhase[]).map(phase => (
                  <button
                    key={phase}
                    className={`phase-btn ${gamePhase === phase ? 'active' : ''}`}
                    onClick={() => setGamePhase(phase)}
                  >
                    {phase.charAt(0).toUpperCase() + phase.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button className="clear-btn" onClick={clearAllCards}>
              Clear All Cards
            </button>
          </div>

          <div className="cards-section">
            <div className="player-cards-section">
              <h3>Your Cards</h3>
              <div className="player-cards">
                {[0, 1].map(index => (
                  <div key={index} className="card-slot">
                    <CardComponent
                      card={playerCards[index] || null}
                      hidden={!playerCards[index]}
                      size={settings.cardSize}
                    />
                    <CardSelector
                      onSelect={(card) => setPlayerCard(index as 0 | 1, card)}
                      usedCards={isCardUsed}
                      currentCard={playerCards[index]}
                    />
                  </div>
                ))}
              </div>
            </div>

            {gamePhase !== 'preflop' && (
              <div className="community-cards-section">
                <h3>Community Cards</h3>
                <div className="community-cards">
                  {Array.from({ length: cardSlots[gamePhase] }, (_, index) => (
                    <div key={index} className="card-slot">
                      <CardComponent
                        card={communityCards[index] || null}
                        hidden={!communityCards[index]}
                        size={settings.cardSize}
                      />
                      <CardSelector
                        onSelect={(card) => setCommunityCard(index, card)}
                        usedCards={isCardUsed}
                        currentCard={communityCards[index]}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="analyzer-sidebar">
          {analysis && (
            <>
              <PlayerAnalysisPanel 
                analysis={analysis}
                isVisible={true}
                isLoading={isAnalyzing}
                isActive={true}
                gamePhase={gamePhase}
              />
              {settings.showAdvancedAnalysis && (
                <AdvancedAnalysisPanel 
                  analysis={analysis}
                  isVisible={true}
                  isLoading={isAnalyzing}
                  isActive={true}
                  gamePhase={gamePhase}
                />
              )}
            </>
          )}

          {!analysis && !isAnalyzing && (
            <div className="no-analysis">
              <p>Select your hole cards to begin analysis</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="analyzing">
              <div className="spinner"></div>
              <p>Analyzing hand...</p>
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="settings-modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2>Hand Analyzer Settings</h2>
              <button 
                className="close-modal-btn"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>
            
            <div className="settings-modal-content">
              <div className="settings-section">
                <h3>Display Settings</h3>
                <div className="setting-item">
                  <label>Card Size:</label>
                  <select 
                    value={settings.cardSize} 
                    onChange={(e) => updateSetting('cardSize', e.target.value as 'small' | 'medium' | 'large')}
                    className="setting-input"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>

              <div className="settings-section">
                <h3>Analysis Settings</h3>
                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.showAdvancedAnalysis}
                      onChange={(e) => updateSetting('showAdvancedAnalysis', e.target.checked)}
                    />
                    <span>Show Advanced Analysis</span>
                  </label>
                </div>

                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.darkMode}
                      onChange={(e) => updateSetting('darkMode', e.target.checked)}
                    />
                    <span>Dark Mode</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CardSelectorProps {
  onSelect: (card: Card) => void;
  usedCards: (card: Card) => boolean;
  currentCard?: Card | null;
}

const CardSelector: React.FC<CardSelectorProps> = ({ onSelect, usedCards, currentCard }) => {
  const [showSelector, setShowSelector] = useState(false);
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

  const handleCardSelect = (rank: Rank, suit: Suit) => {
    const card: Card = { rank, suit };
    onSelect(card);
    setShowSelector(false);
  };

  const getSuitSymbol = (suit: Suit) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
    }
  };

  const getSuitColor = (suit: Suit) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
  };

  return (
    <div className="card-selector">
      <button 
        className="select-card-btn"
        onClick={() => setShowSelector(!showSelector)}
      >
        {currentCard ? `${currentCard.rank}${getSuitSymbol(currentCard.suit)}` : 'Select Card'}
      </button>

      {showSelector && (
        <div className="card-picker">
          <div className="card-picker-content">
            <div className="card-picker-header">
              <h3>Select Card</h3>
            </div>
            <div className="ranks-row">
              {ranks.map(rank => (
                <div key={rank} className="rank-column">
                  <div className="rank-header">{rank}</div>
                  {suits.map(suit => {
                    const card: Card = { rank, suit };
                    const isUsed = usedCards(card);
                    return (
                      <button
                        key={`${rank}-${suit}`}
                        className={`suit-btn ${getSuitColor(suit)} ${isUsed ? 'disabled' : ''}`}
                        onClick={() => !isUsed && handleCardSelect(rank, suit)}
                        disabled={isUsed}
                        title={isUsed ? 'Card already in use' : `${rank} of ${suit}`}
                      >
                        {getSuitSymbol(suit)}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <button 
              className="close-picker-btn"
              onClick={() => setShowSelector(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandAnalyzer;