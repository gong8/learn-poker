import React, { useState, useRef, useCallback } from 'react';
import { Action, GameState, Card } from '../types';
import { calculateHoverEV, HoverEVData, ActionEV } from '../hover-ev-calculator';
import { useSettings } from '../contexts/SettingsContext';
import EVTooltip from './EVTooltip';

interface GameControlsProps {
  validActions: Action[];
  onAction: (action: Action, betAmount?: number) => void;
  currentBet: number;
  playerChips: number;
  minRaise: number;
  potSize: number;
  isBigBlind?: boolean;
  isPreflop?: boolean;
  gameState?: GameState;
  playerCards?: Card[];
  communityCards?: Card[];
}

const GameControls: React.FC<GameControlsProps> = ({
  validActions,
  onAction,
  currentBet,
  playerChips,
  minRaise,
  potSize,
  isBigBlind = false,
  isPreflop = false,
  gameState,
  playerCards = [],
  communityCards = []
}) => {
  const { settings } = useSettings();
  const minBetAmount = currentBet + minRaise;
  const maxBetAmount = playerChips;
  const [betAmount, setBetAmount] = useState(minBetAmount);
  const [customBet, setCustomBet] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<ActionEV | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoverEVData, setHoverEVData] = useState<HoverEVData | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const calculateEVForActions = useCallback(() => {
    if (!gameState || playerCards.length === 0) return null;
    
    try {
      return calculateHoverEV(gameState, playerCards, communityCards, validActions);
    } catch (error) {
      console.warn('EV calculation failed:', error);
      return null;
    }
  }, [gameState, playerCards, communityCards, validActions]);

  const handleAction = (action: Action, amount?: number) => {
    if (action === 'bet' || action === 'raise') {
      onAction(action, amount || betAmount);
    } else {
      onAction(action);
    }
  };

  const handleMouseEnter = (action: Action, event: React.MouseEvent<HTMLButtonElement>) => {
    if (!settings.showHoverHints) return;
    
    const evData = calculateEVForActions();
    if (!evData) return;

    setHoverEVData(evData);
    const actionKey = action === 'all-in' ? 'allIn' : action;
    const actionEV = evData[actionKey as keyof HoverEVData];
    
    if (actionEV) {
      const rect = event.currentTarget.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const tooltipWidth = 200; // min-width from CSS
      
      // Position to the right of the button, or left if not enough space
      let xPos = rect.right + 10;
      if (xPos + tooltipWidth > viewportWidth) {
        xPos = rect.left - tooltipWidth - 10;
      }
      
      // Position at button center vertically
      setTooltipPosition({
        x: xPos,
        y: rect.top + rect.height / 2
      });
      setHoveredAction(actionEV);
    }
  };

  const handleMouseLeave = () => {
    setHoveredAction(null);
    setHoverEVData(null);
  };

  const roundToBigBlindMultiple = (amount: number) => {
    return Math.round(Math.max(minRaise, Math.round(amount / minRaise) * minRaise));
  };

  const getPresetAmounts = () => {
    const presets = [
      { label: 'Min', amount: minBetAmount },
      { label: '1/2 Pot', amount: Math.min(roundToBigBlindMultiple(currentBet + Math.floor(potSize * 0.5)), maxBetAmount) },
      { label: '3/4 Pot', amount: Math.min(roundToBigBlindMultiple(currentBet + Math.floor(potSize * 0.75)), maxBetAmount) },
      { label: 'Pot', amount: Math.min(roundToBigBlindMultiple(currentBet + potSize), maxBetAmount) },
      { label: 'All In', amount: playerChips, displayAmount: playerChips }
    ];
    return presets.filter(preset => preset.amount >= minBetAmount && preset.amount <= maxBetAmount);
  };

  const showBettingControls = validActions.includes('bet') || validActions.includes('raise');
  
  return (
    <div className="game-controls-modern">
      <div className="controls-container">
        <div className="action-section">
          <div className="primary-actions">
            {validActions.filter(action => !['bet', 'raise'].includes(action)).map(action => {
              let buttonText = action.charAt(0).toUpperCase() + action.slice(1);
              
              if (action === 'call') {
                buttonText = `Call ${currentBet}`;
              }
              
              return (
                <button
                  key={action}
                  ref={(el) => { buttonRefs.current[action] = el; }}
                  className={`action-btn action-btn-${action}`}
                  onClick={() => handleAction(action)}
                  onMouseEnter={(e) => handleMouseEnter(action, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  {buttonText}
                </button>
              );
            })}
          </div>
        </div>

        {showBettingControls && (
          <div className="betting-section">
            <div className="section-header">
              <h4>Betting</h4>
              <button 
                className={`toggle-btn ${customBet ? 'active' : ''}`}
                onClick={() => setCustomBet(!customBet)}
              >
                Custom
              </button>
            </div>
            
            {!customBet ? (
              <div className="preset-bets">
                {getPresetAmounts().map((preset, index) => (
                  <button
                    key={index}
                    className="preset-bet-btn"
                    onClick={() => handleAction(
                      preset.label === 'All In' ? 'all-in' : (validActions.includes('bet') ? 'bet' : 'raise'), 
                      preset.label === 'All In' ? undefined : preset.amount
                    )}
                    onMouseEnter={(e) => handleMouseEnter(
                      preset.label === 'All In' ? 'all-in' : (validActions.includes('bet') ? 'bet' : 'raise'),
                      e
                    )}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="preset-label">{preset.label}</div>
                    <div className="preset-amount">{preset.displayAmount || preset.amount}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="custom-bet">
                <div className="bet-input-group">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(minBetAmount, Math.min(maxBetAmount, parseInt(e.target.value) || 0)))}
                    min={minBetAmount}
                    max={maxBetAmount}
                    className="bet-input"
                  />
                  <button
                    className="action-btn action-btn-bet"
                    onClick={() => handleAction(validActions.includes('bet') ? 'bet' : 'raise')}
                    onMouseEnter={(e) => handleMouseEnter(validActions.includes('bet') ? 'bet' : 'raise', e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {validActions.includes('bet') ? 'Bet' : 'Raise'}
                  </button>
                </div>
                <input
                  type="range"
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseInt(e.target.value))}
                  min={minBetAmount}
                  max={maxBetAmount}
                  className="bet-slider"
                />
                <div className="bet-range">
                  <span>{minBetAmount}</span>
                  <span>{maxBetAmount}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {hoveredAction && (
        <EVTooltip
          actionEV={hoveredAction}
          position={tooltipPosition}
          visible={true}
        />
      )}
    </div>
  );
};

export default GameControls;