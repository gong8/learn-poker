import React, { useState } from 'react';
import { Action } from '../types';

interface GameControlsProps {
  validActions: Action[];
  onAction: (action: Action, betAmount?: number) => void;
  currentBet: number;
  playerChips: number;
  minRaise: number;
  isBigBlind?: boolean;
  isPreflop?: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({
  validActions,
  onAction,
  currentBet,
  playerChips,
  minRaise,
  isBigBlind = false,
  isPreflop = false
}) => {
  // For betting, the amount should be the total bet amount (current bet + raise)
  const minBetAmount = currentBet + minRaise;
  const [betAmount, setBetAmount] = useState(minBetAmount);

  const handleAction = (action: Action) => {
    if (action === 'bet' || action === 'raise') {
      onAction(action, betAmount);
    } else {
      onAction(action);
    }
  };

  const showBigBlindMessage = isBigBlind && isPreflop && currentBet === 0 && !validActions.includes('fold');
  
  return (
    <div className="game-controls">
      {showBigBlindMessage && (
        <div className="big-blind-message">
          <span>💡 As big blind, you can check or raise (no need to fold with no raises)</span>
        </div>
      )}
      <div className="action-buttons">
        {validActions.map(action => {
          let buttonText = action.charAt(0).toUpperCase() + action.slice(1);
          
          if (action === 'call') {
            buttonText = `Call ${currentBet}`;
          }
          
          return (
            <button
              key={action}
              className={`action-button ${action}`}
              onClick={() => handleAction(action)}
              disabled={!validActions.includes(action)}
            >
              {buttonText}
            </button>
          );
        })}
      </div>
      
      {(validActions.includes('bet') || validActions.includes('raise')) && (
        <div className="bet-controls">
          <label htmlFor="bet-amount">Bet Amount:</label>
          <input
            id="bet-amount"
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(minBetAmount, Math.min(playerChips + currentBet, parseInt(e.target.value) || 0)))}
            min={minBetAmount}
            max={playerChips + currentBet}
          />
          <input
            type="range"
            value={betAmount}
            onChange={(e) => setBetAmount(parseInt(e.target.value))}
            min={minBetAmount}
            max={playerChips + currentBet}
            className="bet-slider"
          />
        </div>
      )}
    </div>
  );
};

export default GameControls;