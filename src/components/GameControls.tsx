import React, { useState } from 'react';
import { Action } from '../types';

interface GameControlsProps {
  validActions: Action[];
  onAction: (action: Action, betAmount?: number) => void;
  currentBet: number;
  playerChips: number;
  minRaise: number;
  potSize: number;
  isBigBlind?: boolean;
  isPreflop?: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({
  validActions,
  onAction,
  currentBet,
  playerChips,
  minRaise,
  potSize,
  isBigBlind = false,
  isPreflop = false
}) => {
  const minBetAmount = currentBet + minRaise;
  const maxBetAmount = playerChips;
  const [betAmount, setBetAmount] = useState(minBetAmount);
  const [customBet, setCustomBet] = useState(false);

  const handleAction = (action: Action, amount?: number) => {
    if (action === 'bet' || action === 'raise') {
      onAction(action, amount || betAmount);
    } else {
      onAction(action);
    }
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
                  className={`action-btn action-btn-${action}`}
                  onClick={() => handleAction(action)}
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
    </div>
  );
};

export default GameControls;