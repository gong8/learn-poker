import React, { useState } from 'react';
import { PlayerAnalysis, DrawInfo } from '../types';

interface PlayerAnalysisProps {
  analysis: PlayerAnalysis;
  isVisible: boolean;
}

const PlayerAnalysisPanel: React.FC<PlayerAnalysisProps> = ({ analysis, isVisible }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  if (!isVisible) return null;

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'fold': return '#dc2626';
      case 'call': return '#f59e0b';
      case 'raise': return '#16a34a';
      case 'all-in': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  const getHandQuality = (strength: number) => {
    if (strength > 0.8) return 'Excellent';
    if (strength > 0.6) return 'Good';
    if (strength > 0.4) return 'Fair';
    if (strength > 0.2) return 'Poor';
    return 'Very Poor';
  };

  const getWinChance = (probability: number) => {
    if (probability > 0.7) return 'Very Likely';
    if (probability > 0.55) return 'Favored';
    if (probability > 0.45) return 'Even';
    if (probability > 0.3) return 'Unlikely';
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
    <div className="player-analysis-panel">
      <h3>Hand Helper</h3>
      
      {/* Current Hand Quality */}
      <div className="simple-analysis-card">
        <div className="analysis-header">
          <span className="analysis-title">Your Hand</span>
          <span className="analysis-value">{analysis.currentHandRank.replace('-', ' ')}</span>
        </div>
        <div className="quality-indicator">
          <span className="quality-label">{getHandQuality(analysis.handStrength)}</span>
          <div className="quality-bar">
            <div 
              className="quality-fill"
              style={{ 
                width: `${analysis.handStrength * 100}%`,
                backgroundColor: `hsl(${analysis.handStrength * 120}, 70%, 50%)`
              }}
            />
          </div>
        </div>
      </div>

      {/* Win Chances */}
      <div className="simple-analysis-card">
        <div className="analysis-header">
          <span className="analysis-title">Win Chances</span>
          <span className="analysis-value">{Math.round(analysis.winProbability * 100)}%</span>
        </div>
        <div className="win-status">{getWinChance(analysis.winProbability)}</div>
      </div>

      {/* Best Draw (if any) */}
      {bestDraw && (
        <div className="simple-analysis-card">
          <div className="analysis-header">
            <span className="analysis-title">Best Draw</span>
            <span className="analysis-value">{Math.round(bestDraw.probability)}%</span>
          </div>
          <div className="draw-info">
            <span className="draw-name">{bestDraw.type.replace('-', ' ')}</span>
            <span className="draw-outs">({bestDraw.outs} cards help)</span>
          </div>
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

      {/* Advanced Analysis Toggle */}
      <button 
        className="advanced-toggle"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? '▼ Hide Details' : '▶ Show Advanced Analysis'}
      </button>

      {/* Advanced Analysis Panel */}
      {showAdvanced && (
        <div className="advanced-analysis">
          <div className="advanced-section">
            <h4>Detailed Statistics</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Hand Strength</span>
                <span className="stat-value">{(analysis.handStrength * 100).toFixed(1)}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Equity</span>
                <span className="stat-value">{(analysis.equity * 100).toFixed(1)}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pot Odds</span>
                <span className="stat-value">
                  {analysis.potOdds === Infinity ? '∞' : `${analysis.potOdds.toFixed(1)}:1`}
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
                <span className="stat-value">{(analysis.confidence * 100).toFixed(0)}%</span>
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
                    width: `${analysis.potentialStrength * 100}%`,
                    backgroundColor: `hsl(${analysis.potentialStrength * 120}, 60%, 50%)`
                  }}
                />
              </div>
              <span className="potential-label">
                Up to {(analysis.potentialStrength * 100).toFixed(1)}% with draws
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