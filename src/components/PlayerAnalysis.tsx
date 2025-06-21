import React from 'react';
import { PlayerAnalysis, DrawInfo } from '../types';
import { useSettings } from '../contexts/SettingsContext';

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
  
  // Always show hand analysis including pre-flop
  const showHandAnalysis = true;

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
    if (strength > 0.75) return 'Excellent';  // Full house+
    if (strength > 0.55) return 'Very Good';  // Straight+
    if (strength > 0.45) return 'Good';       // Three of a kind+
    if (strength > 0.25) return 'Fair';       // Two pair+
    if (strength > 0.12) return 'Poor';       // Pair+
    return 'Very Poor';                       // High card
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
                  width: `${analysis.handStrength * 100}%`,
                  backgroundColor: `hsl(${analysis.handStrength * 120}, 70%, 50%)`
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
          <span 
            className="analysis-value"
            style={{ color: analysis.expectedValue > 0 ? '#16a34a' : analysis.expectedValue < 0 ? '#dc2626' : '#6b7280' }}
          >
            {(() => {
              const ev = analysis.expectedValue;
              if (Math.abs(ev) < 0.5) {
                // For near-zero values, show small non-zero numbers to avoid -0.0
                return ev >= 0 ? '+0.1' : '-0.1';
              }
              return (ev > 0 ? '+' : '') + ev.toFixed(0);
            })()}
          </span>
        </div>
        <div className="win-status">
          {analysis.expectedValue > 0 ? 'Profitable' : analysis.expectedValue < 0 ? 'Losing' : 'Neutral'}
        </div>
      </div>

      {/* Pot Odds & Equity */}
      <div className="simple-analysis-card">
        <div className="analysis-header">
          <span className="analysis-title">Pot Odds & Equity</span>
        </div>
        <div className="odds-equity-row">
          <div className="odds-equity-item">
            <span className="odds-label">Pot Odds</span>
            <span className="odds-value">
              {analysis.potOdds === 0 ? 'Free' : `${analysis.potOdds.toFixed(1)}:1`}
            </span>
          </div>
          <div className="odds-equity-item">
            <span className="odds-label">Equity</span>
            <span className="odds-value">{(analysis.equity * 100).toFixed(1)}%</span>
          </div>
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
    </div>
  );
};

// Advanced Analysis Component for horizontal layout
export const AdvancedAnalysisPanel: React.FC<PlayerAnalysisProps> = ({ 
  analysis, 
  isVisible, 
  isLoading = false, 
  isActive = true 
}) => {
  const { settings } = useSettings();
  
  if (!isVisible || !settings.showAdvancedAnalysis) return null;

  return (
    <div className="advanced-analysis-horizontal">
      <h3>Advanced Analysis</h3>
      <div className="advanced-content-grid">
        <div className="advanced-section">
          <h4>Detailed Statistics</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Hand Strength</span>
              <span className="stat-value">{(analysis.handStrength * 100).toFixed(1)}%</span>
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

        {/* ICM & Tournament Analysis */}
        {(analysis.icmEquity !== undefined || analysis.bubbleFactor !== undefined) && (
          <div className="advanced-section">
            <h4>Tournament Analysis</h4>
            <div className="stats-grid">
              {analysis.icmEquity !== undefined && (
                <div className="stat-item">
                  <span className="stat-label">ICM Equity</span>
                  <span className="stat-value">${analysis.icmEquity.toFixed(0)}</span>
                </div>
              )}
              {analysis.riskPremium !== undefined && (
                <div className="stat-item">
                  <span className="stat-label">Risk Premium</span>
                  <span className="stat-value">{analysis.riskPremium.toFixed(1)}%</span>
                </div>
              )}
              {analysis.bubbleFactor !== undefined && (
                <div className="stat-item">
                  <span className="stat-label">Bubble Factor</span>
                  <span className="stat-value">{analysis.bubbleFactor.toFixed(2)}</span>
                </div>
              )}
              {analysis.stackCategory && (
                <div className="stat-item">
                  <span className="stat-label">Stack Size</span>
                  <span className="stat-value">{analysis.stackCategory}</span>
                </div>
              )}
              {analysis.icmPressure && (
                <div className="stat-item">
                  <span className="stat-label">ICM Pressure</span>
                  <span className="stat-value" style={{ 
                    color: analysis.icmPressure === 'high' ? '#dc2626' : 
                           analysis.icmPressure === 'medium' ? '#f59e0b' : '#16a34a' 
                  }}>
                    {analysis.icmPressure}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GTO & Nash Analysis */}
        {(analysis.nashAction || analysis.gtoRange) && (
          <div className="advanced-section">
            <h4>GTO Analysis</h4>
            <div className="stats-grid">
              {analysis.nashAction && (
                <div className="stat-item">
                  <span className="stat-label">Nash Action</span>
                  <span className="stat-value" style={{ 
                    color: analysis.nashAction === 'push' ? '#d97706' : 
                           analysis.nashAction === 'call' ? '#1d4ed8' : '#dc2626' 
                  }}>
                    {analysis.nashAction}
                  </span>
                </div>
              )}
              {analysis.gtoRange && analysis.gtoRange.length > 0 && (
                <div className="stat-item">
                  <span className="stat-label">GTO Range</span>
                  <span className="stat-value">{analysis.gtoRange.length} hands</span>
                </div>
              )}
            </div>
            {analysis.gtoRange && analysis.gtoRange.length > 0 && (
              <div className="gto-range-preview">
                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  Range: {analysis.gtoRange.slice(0, 5).join(', ')}
                  {analysis.gtoRange.length > 5 && ` + ${analysis.gtoRange.length - 5} more`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bet Sizing Analysis */}
        {analysis.betSizing && (
          <div className="advanced-section">
            <h4>Bet Sizing</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Optimal Size</span>
                <span className="stat-value">{analysis.betSizing.optimalSize}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Bluff Frequency</span>
                <span className="stat-value">{analysis.betSizing.bluffFrequency}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Value Frequency</span>
                <span className="stat-value">{analysis.betSizing.valueFrequency}%</span>
              </div>
            </div>
            {analysis.betSizing.reasoning && (
              <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '8px' }}>
                {analysis.betSizing.reasoning}
              </div>
            )}
          </div>
        )}

        {/* Win Probability Breakdown */}
        {analysis.winProbability > 0 && (
          <div className="advanced-section">
            <h4>Win Probability Analysis</h4>
            <div className="probability-breakdown">
              <div className="prob-bar">
                <div className="prob-segment win" style={{ width: `${analysis.winProbability * 100}%` }}>
                  <span>Win: {(analysis.winProbability * 100).toFixed(1)}%</span>
                </div>
                <div className="prob-segment lose" style={{ width: `${(1 - analysis.winProbability) * 100}%` }}>
                  <span>Lose: {((1 - analysis.winProbability) * 100).toFixed(1)}%</span>
                </div>
              </div>
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
    </div>
  );
};

export default PlayerAnalysisPanel;