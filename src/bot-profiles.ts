import { BotProfile, BotBehavior } from './types';

export const BOT_PROFILES: Record<BotBehavior, BotProfile> = {
  conservative: {
    behavior: 'conservative',
    aggressiveness: 0.25,
    bluffFrequency: 0.1,
    foldThreshold: 0.35,
    betSizingMultiplier: 0.6,
    allInThreshold: 0.95, // Increased from 0.9 - only premium hands
    randomnessFactor: 0.1
  },
  balanced: {
    behavior: 'balanced',
    aggressiveness: 0.5,
    bluffFrequency: 0.2,
    foldThreshold: 0.25,
    betSizingMultiplier: 0.8,
    allInThreshold: 0.92, // Increased from 0.85
    randomnessFactor: 0.15
  },
  aggressive: {
    behavior: 'aggressive',
    aggressiveness: 0.8,
    bluffFrequency: 0.35,
    foldThreshold: 0.15,
    betSizingMultiplier: 1.2,
    allInThreshold: 0.88, // Increased from 0.7 - was way too low
    randomnessFactor: 0.2
  },
  random: {
    behavior: 'random',
    aggressiveness: 0.5,
    bluffFrequency: 0.2,
    foldThreshold: 0.25,
    betSizingMultiplier: 0.8,
    allInThreshold: 0.90, // Increased from 0.8
    randomnessFactor: 0.4
  }
};

export function getRandomBotProfile(): BotProfile {
  const behaviors: BotBehavior[] = ['conservative', 'balanced', 'aggressive'];
  const weights = [0.4, 0.4, 0.2]; // 40% conservative, 40% balanced, 20% aggressive
  
  const random = Math.random();
  let cumulativeWeight = 0;
  
  for (let i = 0; i < behaviors.length; i++) {
    cumulativeWeight += weights[i];
    if (random <= cumulativeWeight) {
      return { ...BOT_PROFILES[behaviors[i]] };
    }
  }
  
  return { ...BOT_PROFILES.balanced };
}

export function getBotProfile(behavior: BotBehavior): BotProfile {
  return { ...BOT_PROFILES[behavior] };
}