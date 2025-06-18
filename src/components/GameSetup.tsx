import React, { useState } from 'react';
import { BotBehavior } from '../types';

interface GameSetupProps {
  onStartGame: (botCount: number, botConfigs: BotBehavior[]) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame }) => {
  const [botCount, setBotCount] = useState(3);
  const [botConfigs, setBotConfigs] = useState<BotBehavior[]>(
    Array(8).fill('balanced')
  );

  const handleBotCountChange = (count: number) => {
    setBotCount(count);
  };

  const handleBotBehaviorChange = (index: number, behavior: BotBehavior) => {
    const newConfigs = [...botConfigs];
    newConfigs[index] = behavior;
    setBotConfigs(newConfigs);
  };

  const handleStartGame = () => {
    onStartGame(botCount, botConfigs.slice(0, botCount));
  };

  const getBehaviorDisplayName = (behavior: BotBehavior): string => {
    switch (behavior) {
      case 'conservative': return 'Conservative';
      case 'balanced': return 'Balanced';
      case 'aggressive': return 'Aggressive';
      case 'random': return 'Random';
      default: return 'Balanced';
    }
  };

  const getBehaviorDescription = (behavior: BotBehavior): string => {
    switch (behavior) {
      case 'conservative': return 'Plays tight, rarely bluffs';
      case 'balanced': return 'Balanced strategy';
      case 'aggressive': return 'Bets aggressively, bluffs often';
      case 'random': return 'Unpredictable playing style';
      default: return 'Balanced strategy';
    }
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
            onChange={(e) => handleBotCountChange(parseInt(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(count => (
              <option key={count} value={count}>{count}</option>
            ))}
          </select>
        </div>

        <div className="bot-configurations">
          <h3>Bot Behaviors</h3>
          <div className="bot-config-grid">
            {Array.from({ length: botCount }, (_, index) => (
              <div key={index} className="bot-config-item">
                <div className="bot-config-header">
                  <span className="bot-name">Bot {index + 1}</span>
                </div>
                <div className="bot-behavior-selector">
                  <select
                    value={botConfigs[index]}
                    onChange={(e) => handleBotBehaviorChange(index, e.target.value as BotBehavior)}
                    className="bot-behavior-select"
                  >
                    <option value="conservative">Conservative</option>
                    <option value="balanced">Balanced</option>
                    <option value="aggressive">Aggressive</option>
                    <option value="random">Random</option>
                  </select>
                  <div className="bot-behavior-description">
                    {getBehaviorDescription(botConfigs[index])}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="start-game-button" onClick={handleStartGame}>
          Start Game
        </button>
      </div>
    </div>
  );
};

export default GameSetup;