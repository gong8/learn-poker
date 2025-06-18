import React from 'react';
import { Player as PlayerType } from '../types';
import Card from './Card';

interface PlayerProps {
  player: PlayerType;
  isCurrentPlayer: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  showCards: boolean;
  isWinner?: boolean;
  cardSize?: 'small' | 'medium' | 'large';
}

const Player: React.FC<PlayerProps> = ({ 
  player, 
  isCurrentPlayer, 
  isDealer, 
  isSmallBlind, 
  isBigBlind, 
  showCards, 
  isWinner = false, 
  cardSize = 'medium'
}) => {
  
  return (
    <div className={`player-modern ${isCurrentPlayer ? 'current-player' : ''} ${player.isFolded ? 'folded' : ''} ${isWinner ? 'winner' : ''} ${player.isEliminated ? 'eliminated' : ''}`}>
      <div className="player-header">
        <div className="player-name-section">
          <div className="player-name">
            {player.name}
          </div>
          <div className="position-indicators">
            {isDealer && <span className="dealer-button">D</span>}
            {isSmallBlind && <span className="blind-button small-blind">SB</span>}
            {isBigBlind && <span className="blind-button big-blind">BB</span>}
          </div>
        </div>
        <div className="player-status">
          {player.isAllIn && <div className="status-badge all-in">ALL IN</div>}
          {player.isFolded && !player.isEliminated && <div className="status-badge folded">FOLDED</div>}
          {player.isEliminated && <div className="status-badge eliminated">ELIMINATED</div>}
        </div>
      </div>
      
      <div className="player-cards">
        {player.cards.map((card, index) => (
          <Card
            key={index}
            card={card}
            hidden={!showCards && player.isBot}
            size={cardSize}
          />
        ))}
      </div>
      
      <div className="player-bottom">
        <div className="chip-info">
          <div className="chips-amount">
            {Math.floor(player.chips).toLocaleString()}
          </div>
          {player.totalContribution > 0 && (
            <div className="bet-amount">
              {Math.floor(player.totalContribution).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Player;