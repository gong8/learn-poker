import React, { useState } from 'react';
import { BotBehavior } from '../types';
import { getRandomBotProfile } from '../bot-profiles';

interface BotDistribution {
  conservative: number;
  balanced: number;
  aggressive: number;
  random: number;
}

interface GameSetupProps {
  onStartGame: (botCount: number, botConfigs: BotBehavior[]) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame }) => {
  const [botCount, setBotCount] = useState(3);
  const [distribution, setDistribution] = useState<BotDistribution>({
    conservative: 1,
    balanced: 1,
    aggressive: 1,
    random: 0
  });

  const handleBotCountChange = (count: number) => {
    setBotCount(count);
  };

  const handleDistributionChange = (behavior: keyof BotDistribution, delta: number) => {
    const newDistribution = { ...distribution };
    const newValue = Math.max(0, newDistribution[behavior] + delta);
    const total = Object.values(newDistribution).reduce((sum, val) => sum + val, 0) - newDistribution[behavior] + newValue;
    
    if (total <= botCount) {
      newDistribution[behavior] = newValue;
      setDistribution(newDistribution);
    }
  };

  const generateBotConfigs = (): BotBehavior[] => {
    const configs: BotBehavior[] = [];
    
    // Add exact number of each behavior type
    for (let i = 0; i < distribution.conservative; i++) {
      configs.push('conservative');
    }
    for (let i = 0; i < distribution.balanced; i++) {
      configs.push('balanced');
    }
    for (let i = 0; i < distribution.aggressive; i++) {
      configs.push('aggressive');
    }
    for (let i = 0; i < distribution.random; i++) {
      configs.push('random');
    }
    
    // Fill remaining slots with random behaviors
    const totalAssigned = Object.values(distribution).reduce((sum, val) => sum + val, 0);
    const remaining = botCount - totalAssigned;
    for (let i = 0; i < remaining; i++) {
      configs.push(getRandomBotProfile().behavior);
    }
    
    return configs;
  };

  const handleStartGame = () => {
    const botConfigs = generateBotConfigs();
    onStartGame(botCount, botConfigs);
  };

  const totalAssigned = Object.values(distribution).reduce((sum, val) => sum + val, 0);
  const remainingSlots = botCount - totalAssigned;

  return (
    <div className="game-setup-modern">
      <div className="setup-header">
        <h2>Texas Hold'em Poker</h2>
        <p className="setup-subtitle">Configure your game settings</p>
      </div>
      
      <div className="setup-content">
        <div className="setup-section">
          <div className="section-header">
            <h3>Number of Bots</h3>
            <div className="bot-count-display">{botCount} bot{botCount !== 1 ? 's' : ''}</div>
          </div>
          <div className="bot-count-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(count => (
              <button
                key={count}
                className={`bot-count-btn ${botCount === count ? 'active' : ''}`}
                onClick={() => handleBotCountChange(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="setup-section">
          <div className="section-header">
            <h3>Bot Behavior Distribution</h3>
            <div className="distribution-summary-modern">
              <span className="assigned-count">{totalAssigned}/{botCount} assigned</span>
              {remainingSlots > 0 && <span className="random-count">{remainingSlots} random</span>}
            </div>
          </div>
          <div className="section-controls">
            <p className="section-description">
              Configure the personality mix of your AI opponents. Unassigned slots will use random behaviors.
            </p>
            <button 
              className="random-all-btn"
              onClick={() => {
                const behaviorTypes: (keyof BotDistribution)[] = ['conservative', 'balanced', 'aggressive', 'random'];
                const newDistribution: BotDistribution = { conservative: 0, balanced: 0, aggressive: 0, random: 0 };
                
                for (let i = 0; i < botCount; i++) {
                  const randomBehavior = behaviorTypes[Math.floor(Math.random() * behaviorTypes.length)];
                  newDistribution[randomBehavior]++;
                }
                
                setDistribution(newDistribution);
              }}
              title="Randomly distribute bots across all behavior types"
            >
              🎲 Pick All Randomly
            </button>
          </div>
          
          <div className="distribution-grid">
            <div className="behavior-card conservative">
              <div className="behavior-header">
                <div className="behavior-info">
                  <h4>Conservative</h4>
                  <p>Plays tight, rarely bluffs</p>
                </div>
                <div className="behavior-icon">🛡️</div>
              </div>
              <div className="behavior-controls">
                <button 
                  className="control-btn decrease"
                  onClick={() => handleDistributionChange('conservative', -1)}
                  disabled={distribution.conservative === 0}
                >
                  −
                </button>
                <div className="count-display">{distribution.conservative}</div>
                <button 
                  className="control-btn increase"
                  onClick={() => handleDistributionChange('conservative', 1)}
                  disabled={totalAssigned >= botCount}
                >
                  +
                </button>
              </div>
            </div>

            <div className="behavior-card balanced">
              <div className="behavior-header">
                <div className="behavior-info">
                  <h4>Balanced</h4>
                  <p>Adaptive mixed strategy</p>
                </div>
                <div className="behavior-icon">⚖️</div>
              </div>
              <div className="behavior-controls">
                <button 
                  className="control-btn decrease"
                  onClick={() => handleDistributionChange('balanced', -1)}
                  disabled={distribution.balanced === 0}
                >
                  −
                </button>
                <div className="count-display">{distribution.balanced}</div>
                <button 
                  className="control-btn increase"
                  onClick={() => handleDistributionChange('balanced', 1)}
                  disabled={totalAssigned >= botCount}
                >
                  +
                </button>
              </div>
            </div>

            <div className="behavior-card aggressive">
              <div className="behavior-header">
                <div className="behavior-info">
                  <h4>Aggressive</h4>
                  <p>Bets big, bluffs often</p>
                </div>
                <div className="behavior-icon">🔥</div>
              </div>
              <div className="behavior-controls">
                <button 
                  className="control-btn decrease"
                  onClick={() => handleDistributionChange('aggressive', -1)}
                  disabled={distribution.aggressive === 0}
                >
                  −
                </button>
                <div className="count-display">{distribution.aggressive}</div>
                <button 
                  className="control-btn increase"
                  onClick={() => handleDistributionChange('aggressive', 1)}
                  disabled={totalAssigned >= botCount}
                >
                  +
                </button>
              </div>
            </div>

            <div className="behavior-card random">
              <div className="behavior-header">
                <div className="behavior-info">
                  <h4>Random</h4>
                  <p>Unpredictable wildcard</p>
                </div>
                <div className="behavior-icon">🎲</div>
              </div>
              <div className="behavior-controls">
                <button 
                  className="control-btn decrease"
                  onClick={() => handleDistributionChange('random', -1)}
                  disabled={distribution.random === 0}
                >
                  −
                </button>
                <div className="count-display">{distribution.random}</div>
                <button 
                  className="control-btn increase"
                  onClick={() => handleDistributionChange('random', 1)}
                  disabled={totalAssigned >= botCount}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <button className="start-game-btn-modern" onClick={handleStartGame}>
          <span>Start Game</span>
          <div className="btn-icon">▶</div>
        </button>
      </div>
    </div>
  );
};

export default GameSetup;