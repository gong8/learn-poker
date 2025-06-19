import React from 'react';
import { PlayerAnalysis, DrawInfo } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { THRESHOLDS, LIMITS } from '../constants';

interface PlayerAnalysisProps {
  analysis: PlayerAnalysis;
  isVisible: boolean;
  isLoading?: boolean;
  isActive?: boolean;
  gamePhase?: string;
}

const PlayerAnalysisPanel: React.FC<PlayerAnalysisProps> = ({ 
  analysis, 
  isVisible, 
  isLoading = false, 
  isActive = true,
  gamePhase = 'preflop'
}) => {
  const { settings } = useSettings();
  
  if (!isVisible) return null;
  
  // Don't show detailed hand analysis on preflop (but show basic info)
  const showHandAnalysis = gamePhase !== 'preflop' || analysis.currentHandRank !== 'high-card';

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'fold': return '#dc2626';
      case 'call': return '#1d4ed8';
      case 'check': return '#1d4ed8';
      case 'bet': return '#d97706';
      case 'raise': return '#d97706';
      case 'all-in': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  const getHandQuality = (strength: number) => {
    if (strength > THRESHOLDS.EXCELLENT_HAND) return 'Excellent';  // Four of a kind+
    if (strength > THRESHOLDS.VERY_GOOD_HAND) return 'Very Good';  // Full house+
    if (strength > THRESHOLDS.GOOD_HAND) return 'Good';       // Flush+
    if (strength > THRESHOLDS.FAIR_HAND) return 'Fair';       // Three of a kind+
    if (strength > THRESHOLDS.WEAK_HAND) return 'Weak';       // Pair+
    return 'Poor';                            // High card
  };

  const getWinChance = (probability: number) => {
    if (probability > THRESHOLDS.VERY_LIKELY_WIN) return 'Very Likely';
    if (probability > THRESHOLDS.FAVORED_WIN) return 'Favored';
    if (probability > THRESHOLDS.EVEN_WIN) return 'Even';
    if (probability > THRESHOLDS.UNLIKELY_WIN) return 'Unlikely';
    return 'Very Unlikely';
  };

  const getBestDraw = () => {
    if (analysis.draws.length === 0) return null;
    return analysis.draws.reduce((best, current) => 
      current.probability > best.probability ? current : best
    );
  };

  const bestDraw = getBestDraw();

  return (
    <div className={`player-analysis-panel ${!isActive ? 'inactive' : ''}`}>
      <h3>Hand Helper</h3>
      
      {/* Current Hand Quality */}
      <div className="simple-analysis-card">
        <div className="analysis-header">
          <span className="analysis-title">Your Hand</span>
          <span className="analysis-value">
            {showHandAnalysis ? analysis.currentHandRank.replace('-', ' ') : '?'}
          </span>
        </div>
        {showHandAnalysis && (
          <div className="quality-indicator">
            <span className="quality-label">{getHandQuality(analysis.handStrength)}</span>
            <div className="quality-bar">
              <div 
                className="quality-fill"
                style={{ 
                  width: `${analysis.handStrength * LIMITS.PERCENTAGE_CONVERSION}%`,
                  backgroundColor: `hsl(${analysis.handStrength * LIMITS.HSL_COLOR_MULTIPLIER}, 70%, 50%)`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expected Value */}
      <div className="simple-analysis-card">
        <div className="analysis-header">
          <span className="analysis-title">Expected Value</span>
          <span className="analysis-value" style={{ color: analysis.expectedValue >= 0 ? '#16a34a' : '#dc2626' }}>
            {analysis.expectedValue >= 0 ? '+' : ''}{analysis.expectedValue.toFixed(0)}
          </span>
        </div>
        <div className="win-status">{analysis.expectedValue >= 0 ? 'Profitable' : 'Unprofitable'}</div>
      </div>

      {/* Pot Odds & Equity */}
      <div className="simple-analysis-card">
        <div className="analysis-header">
          <span className="analysis-title">Pot Odds</span>
          <span className="analysis-value">
            {analysis.potOdds === 0 ? 'Free' : `${analysis.potOdds.toFixed(1)}:1`}
          </span>
        </div>
        <div className="analysis-header" style={{ marginTop: '8px' }}>
          <span className="analysis-title">Equity</span>
          <span className="analysis-value">{(analysis.equity * LIMITS.PERCENTAGE_CONVERSION).toFixed(1)}%</span>
        </div>
      </div>

      {/* Drawing Opportunities */}
      {analysis.draws.length > 0 && (
        <div className="simple-analysis-card">
          <div className="analysis-header">
            <span className="analysis-title">Drawing Opportunities</span>
            <span className="analysis-value">{analysis.draws.length} found</span>
          </div>
          {analysis.draws.slice(0, 3).map((draw, index) => (
            <div key={index} className="draw-info" style={{ marginBottom: index < Math.min(analysis.draws.length - 1, 2) ? '6px' : '0' }}>
              <span className="draw-name">{draw.type.replace('-', ' ')}</span>
              <span className="draw-outs">({draw.outs} outs, {Math.round(draw.probability)}%)</span>
            </div>
          ))}
          {analysis.draws.length > 3 && (
            <div className="draw-info" style={{ marginTop: '6px', fontSize: '0.7rem', opacity: 0.7 }}>
              +{analysis.draws.length - 3} more (see advanced analysis)
            </div>
          )}
        </div>
      )}

      {/* Recommendation */}
      <div className="recommendation-card">
        <div className="recommendation-header">Suggested Action</div>
        <div 
          className="recommendation-action"
          style={{ 
            backgroundColor: getRecommendationColor(analysis.recommendation),
            color: 'white'
          }}
        >
          {analysis.recommendation.toUpperCase()}
        </div>
        {analysis.confidence > 0.7 && (
          <div className="confidence-note">High confidence</div>
        )}
      </div>

      {/* Advanced Analysis Panel */}
      {settings.showAdvancedAnalysis && (
        <div className="advanced-analysis">
          <div className="advanced-section">
            <h4>Detailed Statistics</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Hand Strength</span>
                <span className="stat-value">{(analysis.handStrength * LIMITS.PERCENTAGE_CONVERSION).toFixed(1)}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Equity</span>
                <span className="stat-value">{(analysis.equity * LIMITS.PERCENTAGE_CONVERSION).toFixed(1)}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pot Odds</span>
                <span className="stat-value">
                  {analysis.potOdds === 0 ? 'Free' : `${analysis.potOdds.toFixed(1)}:1`}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Expected Value</span>
                <span 
                  className="stat-value"
                  style={{ color: analysis.expectedValue >= 0 ? '#16a34a' : '#dc2626' }}
                >
                  {analysis.expectedValue >= 0 ? '+' : ''}{analysis.expectedValue.toFixed(0)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Outs</span>
                <span className="stat-value">{analysis.outs}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Confidence</span>
                <span className="stat-value">{(analysis.confidence * LIMITS.PERCENTAGE_CONVERSION).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {analysis.potentialStrength > analysis.handStrength && (
            <div className="advanced-section">
              <h4>Potential Strength</h4>
              <div className="potential-bar">
                <div 
                  className="potential-fill"
                  style={{ 
                    width: `${analysis.potentialStrength * LIMITS.PERCENTAGE_CONVERSION}%`,
                    backgroundColor: `hsl(${analysis.potentialStrength * LIMITS.HSL_COLOR_MULTIPLIER}, 60%, 50%)`
                  }}
                />
              </div>
              <span className="potential-label">
                Up to {(analysis.potentialStrength * LIMITS.PERCENTAGE_CONVERSION).toFixed(1)}% with draws
              </span>
            </div>
          )}

          {analysis.draws.length > 0 && (
            <div className="advanced-section">
              <h4>All Drawing Opportunities</h4>
              <div className="draws-list">
                {analysis.draws.map((draw, index) => (
                  <div key={index} className="draw-item">
                    <div className="draw-header">
                      <span className="draw-type">{draw.type.replace('-', ' ')}</span>
                      <span className="draw-probability">{draw.probability.toFixed(1)}%</span>
                    </div>
                    <div className="draw-details">
                      <span className="draw-outs">{draw.outs} outs</span>
                      <span className="draw-description">{draw.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.cardCount !== 0 && (
            <div className="advanced-section">
              <h4>Card Counting</h4>
              <div className="card-count-advanced">
                <span 
                  className="count-value-advanced"
                  style={{ color: analysis.cardCount > 0 ? '#16a34a' : analysis.cardCount < 0 ? '#dc2626' : '#f59e0b' }}
                >
                  {analysis.cardCount > 0 ? '+' : ''}{analysis.cardCount.toFixed(1)}
                </span>
                <span className="count-explanation">
                  {analysis.cardCount > 0 
                    ? 'Deck favors you' 
                    : analysis.cardCount < 0 
                    ? 'Deck against you' 
                    : 'Neutral count'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerAnalysisPanel;