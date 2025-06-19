/**
 * Poker Game Constants
 * Centralized location for all magic numbers to prevent bugs and improve maintainability
 */

// =============================================================================
// HAND EVALUATION CONSTANTS
// =============================================================================

export const HAND_EVALUATION = {
  // Maximum possible hand scores
  MAX_HAND_SCORE: 900000,
  ROYAL_FLUSH_SCORE: 900000,
  STRAIGHT_FLUSH_SCORE: 800000,
  FOUR_OF_A_KIND_SCORE: 700000,
  FULL_HOUSE_SCORE: 600000,
  FLUSH_SCORE: 500000,
  STRAIGHT_SCORE: 400000,
  THREE_OF_A_KIND_SCORE: 300000,
  TWO_PAIR_SCORE: 200000,
  PAIR_SCORE: 100000,
  
  // Scoring multipliers
  BASE_MULTIPLIER: 15,
  BASE_MULTIPLIER_SQUARED: 225, // 15²
  BASE_MULTIPLIER_CUBED: 3375,  // 15³
  
  // Score limits
  MAX_HIGH_CARD_SCORE: 99999,
  PAIR_BASE_SCORE: 100,
  
  // Special values
  WHEEL_STRAIGHT_HIGH_CARD: 5,
  
  // Normalization values
  TOTAL_POSSIBLE_HANDS: 7462,
} as const;

// =============================================================================
// GAME CONFIGURATION CONSTANTS
// =============================================================================

export const GAME_CONFIG = {
  // Starting conditions
  STARTING_CHIPS: 1000,
  DEFAULT_SMALL_BLIND: 5,
  DEFAULT_BIG_BLIND: 10,
  
  // Card dealing
  HOLE_CARDS_COUNT: 2,
  TOTAL_COMMUNITY_CARDS: 5,
  FLOP_CARDS: 3,
  TURN_CARDS: 1,
  RIVER_CARDS: 1,
  
  // Deck properties
  DECK_SIZE: 52,
  CARDS_PER_RANK: 4,
  TOTAL_RANKS: 13,
  TOTAL_SUITS: 4,
  
  // Game limits
  MAX_HAND_HISTORY: 50,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 10,
} as const;

// =============================================================================
// BOT AI BEHAVIOR CONSTANTS
// =============================================================================

export const BOT_BEHAVIOR = {
  // Hand strength normalization and curves
  STRENGTH_MIN: 0.05,
  STRENGTH_MAX: 0.95,
  
  // Strength curve thresholds
  WEAK_THRESHOLD: 0.3,
  MEDIUM_THRESHOLD: 0.6,
  STRONG_THRESHOLD: 0.8,
  
  // Strength curve multipliers
  WEAK_MULTIPLIER: 0.4,
  MEDIUM_MULTIPLIER: 0.8,
  STRONG_MULTIPLIER: 1.4,
  VERY_STRONG_MULTIPLIER: 1.5,
  
  // Pre-flop evaluation thresholds
  HIGH_PAIR_THRESHOLD: 10,  // JJ+
  MEDIUM_PAIR_THRESHOLD: 7, // 77+
  
  // Pre-flop strength ranges
  PREMIUM_PAIR_STRENGTH: 0.7,
  PREMIUM_PAIR_MAX: 0.95,
  MEDIUM_PAIR_STRENGTH: 0.45,
  LOW_PAIR_STRENGTH: 0.15,
  
  // High card requirements
  ACE_RANK: 14,
  KING_RANK: 13,
  JACK_RANK: 11,
  TEN_RANK: 10,
  NINE_RANK: 9,
  
  // Bonuses
  SUITED_BONUS: 0.05,
  CONNECTOR_BONUS: 0.03,
  GAP_BONUS: 0.01,
  
  // Position multipliers
  LATE_POSITION_MULTIPLIER: 1.2,
  MIDDLE_POSITION_MULTIPLIER: 1.05,
  EARLY_POSITION_MULTIPLIER: 0.95,
  
  // Random behavior
  RANDOM_BEHAVIOR_MIN: 0.7,
  RANDOM_BEHAVIOR_RANGE: 0.6,
  
  // Pot odds thresholds
  BAD_POT_ODDS_THRESHOLD: 0.35,
  GOOD_POT_ODDS_THRESHOLD: 0.3,
} as const;

// =============================================================================
// BOT PROFILES
// =============================================================================

export const BOT_PROFILES = {
  CONSERVATIVE: {
    foldThreshold: 0.25,
    bluffFrequency: 0.03,
    aggressiveness: 0.15,
    betSizingMultiplier: 0.4,
    allInThreshold: 0.9,
    randomnessFactor: 0.1,
  },
  BALANCED: {
    foldThreshold: 0.2,
    bluffFrequency: 0.08,
    aggressiveness: 0.35,
    betSizingMultiplier: 0.6,
    allInThreshold: 0.8,
    randomnessFactor: 0.15,
  },
  AGGRESSIVE: {
    foldThreshold: 0.15,
    bluffFrequency: 0.18,
    aggressiveness: 0.55,
    betSizingMultiplier: 0.8,
    allInThreshold: 0.7,
    randomnessFactor: 0.2,
  },
  RANDOM: {
    foldThreshold: 0.5,
    bluffFrequency: 0.2,
    aggressiveness: 0.25,
    betSizingMultiplier: 0.8,
    allInThreshold: 0.88,
    randomnessFactor: 0.4,
  },
  
  // Profile distribution weights
  WEIGHTS: {
    CONSERVATIVE: 0.5,
    BALANCED: 0.4,
    AGGRESSIVE: 0.1,
  },
} as const;

// =============================================================================
// EQUITY CALCULATION CONSTANTS
// =============================================================================

export const EQUITY_CALC = {
  // Monte Carlo simulation
  DEFAULT_ITERATIONS: 10000,
  FAST_ITERATIONS: 500,
  PRECISE_ITERATIONS: 1000,
  
  // Draw probabilities (percentages)
  DRAW_ODDS: {
    FLUSH: { outs: 9, turnRiver: 35, turnOnly: 19 },
    OPEN_ENDED: { outs: 8, turnRiver: 31, turnOnly: 17 },
    GUTSHOT: { outs: 4, turnRiver: 17, turnOnly: 9 },
    FLUSH_AND_STRAIGHT: { outs: 15, turnRiver: 54, turnOnly: 32 },
    OVERCARDS: { outs: 6, turnRiver: 24, turnOnly: 13 },
    THREE_OUTS: { outs: 3, turnRiver: 13, turnOnly: 7 },
  },
  
  // Pre-flop strength categories
  PREFLOP_STRENGTH: {
    PREMIUM_PAIRS: 0.9,    // AA, KK, QQ
    HIGH_PAIRS: 0.8,       // JJ, TT, 99
    MEDIUM_PAIRS: 0.6,     // 88, 77, 66
    LOW_PAIRS: 0.4,        // 55 and below
    
    ACE_PREMIUM: 0.85,     // AK, AQ
    ACE_GOOD: 0.75,        // AJ, AT
    ACE_MEDIUM: 0.65,      // A9, A8
    ACE_WEAK: 0.5,         // A7 and below
    
    BROADWAY_PREMIUM: 0.7, // KQ, KJ, QJ
    BROADWAY_GOOD: 0.6,    // K9, Q9, etc.
    BROADWAY_WEAK: 0.4,
    
    SUITED_BONUS: 0.1,
    CONNECTOR_BONUS: 0.05,
  },
  
  // Draw equity estimates
  DRAW_EQUITY: {
    FLUSH: 0.8,
    STRAIGHT: 0.6,
    SET: 0.9,
    PAIR: 0.4,
  },
} as const;

// =============================================================================
// BET SIZING CONSTANTS
// =============================================================================

export const BET_SIZING = {
  // Standard bet sizes (percentage of pot)
  SMALL_BET: 25,
  SMALL_MEDIUM_BET: 33,
  MEDIUM_BET: 50,
  LARGE_BET: 75,
  POT_BET: 100,
  OVERBET_SMALL: 150,
  OVERBET_LARGE: 200,
  
  // C-bet frequencies by position/board
  CBET_FREQUENCY: {
    IP_DRY: 69,
    IP_WET: 55,
    OOP_DRY: 42,
    OOP_WET: 28,
  },
  
  // Board texture adjustments
  DRY_BOARD_SIZE: 33,
  WET_BOARD_SIZE: 50,
  COORDINATED_BOARD_SIZE: 75,
  VERY_WET_BOARD_SIZE: 100,
  
  // Polarization threshold
  POLARIZATION_THRESHOLD: 75,
} as const;

// =============================================================================
// TOURNAMENT CONSTANTS
// =============================================================================

export const TOURNAMENT = {
  // Stack categories (in big blinds)
  SHORT_STACK_THRESHOLD: 15,
  BIG_STACK_THRESHOLD: 40,
  
  // ICM calculations
  RISK_PREMIUM_THRESHOLD: 15,
  
  // Nash push/fold threshold
  PUSH_FOLD_THRESHOLD: 20,
  
  // Payout structures
  STANDARD_PAYOUTS: {
    FIRST_PLACE: 0.5,
    SECOND_PLACE: 0.3,
    THIRD_PLACE: 0.2,
    FOURTH_PLACE: 0.15,
    BUBBLE: 0.05,
  },
  
  // Tournament adjustments
  BUBBLE_TIGHTNESS: 0.8,
  FINAL_TABLE_AGGRESSION: 1.2,
} as const;

// =============================================================================
// ADVANCED ANALYSIS CONSTANTS
// =============================================================================

export const ANALYSIS = {
  // Equity thresholds for recommendations
  VERY_STRONG_EQUITY: 0.8,
  STRONG_EQUITY: 0.75,
  MEDIUM_EQUITY: 0.5,
  WEAK_EQUITY: 0.3,
  
  // Hand strength categories
  PREMIUM_HAND_STRENGTH: 0.7,
  GOOD_HAND_STRENGTH: 0.5,
  MARGINAL_HAND_STRENGTH: 0.3,
  
  // Draw thresholds
  STRONG_DRAW_OUTS: 8,
  WEAK_DRAW_OUTS: 4,
  
  // Pot odds ratios
  GOOD_POT_ODDS: 3,
  EXCELLENT_POT_ODDS: 2,
  
  // Confidence modifiers
  ICM_PRESSURE_MODIFIER: 0.8,
  DRAW_CONFIDENCE_BONUS: 20,
} as const;

// =============================================================================
// UI AND TIMING CONSTANTS
// =============================================================================

export const UI_CONFIG = {
  // Bot speeds (milliseconds)
  BOT_SPEED: {
    FAST: 500,
    NORMAL: 1000,
    SLOW: 2000,
  },
  
  // Default game setup
  DEFAULT_BOT_COUNT: 3,
  
  // Animation timing
  CARD_DEAL_DELAY: 200,
  ACTION_HIGHLIGHT_DURATION: 1500,
  
  // Position calculations
  EARLY_POSITION_FRACTION: 1/3,
  MIDDLE_POSITION_FRACTION: 2/3,
} as const;

// =============================================================================
// RANK AND SUIT VALUES
// =============================================================================

export const CARD_VALUES = {
  RANKS: {
    TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, SIX: 6, SEVEN: 7, EIGHT: 8, 
    NINE: 9, TEN: 10, JACK: 11, QUEEN: 12, KING: 13, ACE: 14
  },
  
  // Special rank groupings
  BROADWAY_CARDS: [10, 11, 12, 13, 14], // T, J, Q, K, A
  HIGH_CARDS: [9, 10, 11, 12, 13, 14],  // 9+
  
  // Straight sequences
  WHEEL_STRAIGHT: [14, 2, 3, 4, 5], // A-2-3-4-5
  BROADWAY_STRAIGHT: [10, 11, 12, 13, 14], // T-J-Q-K-A
} as const;

// =============================================================================
// RANDOMIZATION CONSTANTS
// =============================================================================

export const RANDOMIZATION = {
  SHUFFLE_OFFSET: 0.5,
  NAME_SHUFFLE_FACTOR: 0.5,
} as const;

// =============================================================================
// THRESHOLD CONSTANTS  
// =============================================================================

export const THRESHOLDS = {
  // Hand quality display thresholds
  EXCELLENT_HAND: 0.75,
  VERY_GOOD_HAND: 0.50,
  GOOD_HAND: 0.35,
  FAIR_HAND: 0.20,
  WEAK_HAND: 0.05,
  
  // Win probability display thresholds
  VERY_LIKELY_WIN: 0.7,
  FAVORED_WIN: 0.55,
  EVEN_WIN: 0.45,
  UNLIKELY_WIN: 0.3,
  
  // Straight and connectivity
  MAX_STRAIGHT_GAP: 4,
  MIN_WHEEL_CARDS: 2,
  MAX_CONNECTIVITY_GAP: 2,
  
  // Side pot display
  MIN_CONTRIBUTION_LEVELS: 2,
} as const;

// =============================================================================
// CALCULATION LIMITS
// =============================================================================

export const LIMITS = {
  MAX_OUTS: 21,
  HAND_STRENGTH_NORMALIZATION: 900,
  HSL_COLOR_MULTIPLIER: 120,
  PERCENTAGE_CONVERSION: 100,
  POSITION_ADJUSTMENT: 10,
  
  // Hand strength thresholds for analysis
  STRONG_HAND_THRESHOLD: 1000,
  MEDIUM_HAND_THRESHOLD: 500,
} as const;

// =============================================================================
// ITERATION COUNTS
// =============================================================================

export const ITERATIONS = {
  EQUITY_CALC_LATE_STREET: 500,
  EQUITY_CALC_EARLY_STREET: 1000,
  STRAIGHT_POSSIBILITIES: 10,
} as const;

// =============================================================================
// TYPE HELPERS
// =============================================================================

// Export types for better TypeScript support
export type HandEvaluationConstants = typeof HAND_EVALUATION;
export type GameConfigConstants = typeof GAME_CONFIG;
export type BotBehaviorConstants = typeof BOT_BEHAVIOR;
export type BotProfileConstants = typeof BOT_PROFILES;
export type EquityCalcConstants = typeof EQUITY_CALC;
export type BetSizingConstants = typeof BET_SIZING;
export type TournamentConstants = typeof TOURNAMENT;
export type AnalysisConstants = typeof ANALYSIS;
export type UIConfigConstants = typeof UI_CONFIG;
export type CardValueConstants = typeof CARD_VALUES;
export type RandomizationConstants = typeof RANDOMIZATION;
export type ThresholdConstants = typeof THRESHOLDS;
export type LimitsConstants = typeof LIMITS;
export type IterationConstants = typeof ITERATIONS;