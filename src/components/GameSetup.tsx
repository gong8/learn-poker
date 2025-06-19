import React, { useState } from 'react';
import { BotBehavior } from '../types';
import { UI_CONFIG } from '../constants';

interface GameSetupProps {
  onStartGame: (botCount: number, botConfigs: BotBehavior[]) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame }) => {
  const [botCount, setBotCount] = useState<number>(UI_CONFIG.DEFAULT_BOT_COUNT);
  const [behaviorCounts, setBehaviorCounts] = useState({
    conservative: 1,
    balanced: 1,
    aggressive: 1,
    random: 0
  });

  const handleBotCountChange = (count: number) => {
    setBotCount(count);
  };

  // Generate bot configs based on behavior counts and shuffle them
  const generateShuffledBotConfigs = (): BotBehavior[] => {
    const configs: BotBehavior[] = [];
    Object.entries(behaviorCounts).forEach(([behavior, count]) => {
      for (let i = 0; i < count; i++) {
        configs.push(behavior as BotBehavior);
      }
    });
    // Shuffle the array to anonymize which bot gets which behavior
    return configs.sort(() => Math.random() - 0.5);
  };

  const updateBehaviorCount = (behavior: BotBehavior, change: number) => {
    const newCounts = { ...behaviorCounts };
    const newValue = Math.max(0, newCounts[behavior] + change);
    const totalOtherBots = Object.entries(newCounts)
      .filter(([key]) => key !== behavior)
      .reduce((sum, [, count]) => sum + count, 0);
    
    // Don't allow total to exceed botCount
    if (totalOtherBots + newValue <= botCount) {
      newCounts[behavior] = newValue;
      setBehaviorCounts(newCounts);
    }
  };

  const getTotalSelectedBots = () => {
    return Object.values(behaviorCounts).reduce((sum, count) => sum + count, 0);
  };

  const handleStartGame = () => {
    const shuffledBotConfigs = generateShuffledBotConfigs();
    onStartGame(botCount, shuffledBotConfigs);
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

  const randomizeBehaviors = () => {
    const behaviors: BotBehavior[] = ['conservative', 'balanced', 'aggressive', 'random'];
    const newCounts = { conservative: 0, balanced: 0, aggressive: 0, random: 0 };
    
    // Randomly assign each bot a behavior
    for (let i = 0; i < botCount; i++) {
      const randomBehavior = behaviors[Math.floor(Math.random() * behaviors.length)];
      newCounts[randomBehavior]++;
    }
    
    setBehaviorCounts(newCounts);
  };


  return (
    <div className="game-setup">
      <h2>Texas Hold'em Poker</h2>
      <div className="setup-controls">
        <div className="bot-selection-modern">
          <div className="bot-count-label">
            <span className="label-text">Number of Bots</span>
            <span className="label-subtitle">Choose how many AI opponents to play against</span>
          </div>
          <div className="bot-count-options">
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

        <div className="bot-configurations">
          <div className="bot-config-header">
            <h3>Bot Behavior Mix</h3>
            <button 
              className="randomize-btn"
              onClick={randomizeBehaviors}
              title="Randomly distribute bot behaviors"
            >
              🎲 Randomize
            </button>
          </div>
          <p className="bot-shuffle-hint">
            🎲 Choose how many of each type, but their identities will be shuffled
          </p>
          <div className="behavior-counters">
            {(['conservative', 'balanced', 'aggressive', 'random'] as BotBehavior[]).map(behavior => (
              <div key={behavior} className="behavior-counter">
                <div className="behavior-info">
                  <span className="behavior-name">{getBehaviorDisplayName(behavior)}</span>
                  <span className="behavior-desc">{getBehaviorDescription(behavior)}</span>
                </div>
                <div className="counter-controls">
                  <button 
                    onClick={() => updateBehaviorCount(behavior, -1)}
                    disabled={behaviorCounts[behavior] === 0}
                    className="counter-btn"
                  >
                    -
                  </button>
                  <span className="counter-value">{behaviorCounts[behavior]}</span>
                  <button 
                    onClick={() => updateBehaviorCount(behavior, 1)}
                    disabled={getTotalSelectedBots() >= botCount}
                    className="counter-btn"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="bot-count-summary">
            Total bots: {getTotalSelectedBots()} / {botCount}
          </div>
        </div>

        <button 
          className="start-game-button" 
          onClick={handleStartGame}
          disabled={getTotalSelectedBots() !== botCount}
        >
          Start Game
        </button>
      </div>
    </div>
  );
};

export default GameSetup;