import React, { useState } from 'react';

interface GameSetupProps {
  onStartGame: (botCount: number) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame }) => {
  const [botCount, setBotCount] = useState(3);

  const handleStartGame = () => {
    onStartGame(botCount);
  };

  return (
    <div className="game-setup">
      <h2>Texas Hold'em Poker</h2>
      <div className="setup-controls">
        <div className="bot-selection">
          <label htmlFor="bot-count">Number of Bots:</label>
          <select
            id="bot-count"
            value={botCount}
            onChange={(e) => setBotCount(parseInt(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(count => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </div>
        <button className="start-game-button" onClick={handleStartGame}>
          Start Game
        </button>
      </div>
    </div>
  );
};

export default GameSetup;