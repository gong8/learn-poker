import { BotProfile, BotBehavior } from './types';
import { BOT_PROFILES as CONSTANTS_BOT_PROFILES } from './constants';

export const BOT_PROFILE_CONFIGS: Record<BotBehavior, BotProfile> = {
  conservative: {
    behavior: 'conservative',
    ...CONSTANTS_BOT_PROFILES.CONSERVATIVE
  },
  balanced: {
    behavior: 'balanced',
    ...CONSTANTS_BOT_PROFILES.BALANCED
  },
  aggressive: {
    behavior: 'aggressive',
    ...CONSTANTS_BOT_PROFILES.AGGRESSIVE
  },
  random: {
    behavior: 'random',
    ...CONSTANTS_BOT_PROFILES.RANDOM
  }
};

export function getRandomBotProfile(): BotProfile {
  const behaviors: BotBehavior[] = ['conservative', 'balanced', 'aggressive'];
  const weights = [CONSTANTS_BOT_PROFILES.WEIGHTS.CONSERVATIVE, CONSTANTS_BOT_PROFILES.WEIGHTS.BALANCED, CONSTANTS_BOT_PROFILES.WEIGHTS.AGGRESSIVE]; // 50% conservative, 40% balanced, 10% aggressive
  
  const random = Math.random();
  let cumulativeWeight = 0;
  
  for (let i = 0; i < behaviors.length; i++) {
    cumulativeWeight += weights[i];
    if (random <= cumulativeWeight) {
      return { ...BOT_PROFILE_CONFIGS[behaviors[i]] };
    }
  }
  
  return { ...BOT_PROFILE_CONFIGS.balanced };
}

export function getBotProfile(behavior: BotBehavior): BotProfile {
  return { ...BOT_PROFILE_CONFIGS[behavior] };
}

// Export the profiles for backwards compatibility
export const BOT_PROFILES = BOT_PROFILE_CONFIGS;