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
}

const Player: React.FC<PlayerProps> = ({ player, isCurrentPlayer, isDealer, isSmallBlind, isBigBlind, showCards, isWinner = false }) => {
  return (
    <div className={`player ${isCurrentPlayer ? 'current-player' : ''} ${player.isFolded ? 'folded' : ''} ${isWinner ? 'winner' : ''}`}>
      <div className="player-info">
        <div className="player-name">
          {player.name}
          <div className="position-indicators">
            {isDealer && <span className="dealer-button">D</span>}
            {isSmallBlind && <span className="blind-button small-blind">SB</span>}
            {isBigBlind && <span className="blind-button big-blind">BB</span>}
          </div>
        </div>
        <div className="player-chips">
          Chips: {player.chips}
        </div>
        {player.totalContribution > 0 && (
          <div className="player-bet">
            This Hand: {player.totalContribution}
          </div>
        )}
        {player.isAllIn && (
          <div className="all-in-indicator">ALL IN</div>
        )}
      </div>
      <div className="player-cards">
        {player.cards.map((card, index) => (
          <Card
            key={index}
            card={card}
            hidden={!showCards && player.isBot}
          />
        ))}
      </div>
    </div>
  );
};

export default Player;