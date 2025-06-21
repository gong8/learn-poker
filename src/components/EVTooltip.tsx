import React from 'react';
import { ActionEV, formatEV, getEVColor } from '../hover-ev-calculator';

interface EVTooltipProps {
  actionEV: ActionEV;
  position: { x: number; y: number };
  visible: boolean;
}

const EVTooltip: React.FC<EVTooltipProps> = ({ actionEV, position, visible }) => {
  if (!visible) return null;

  const { action, ev, probability, potOdds, recommendation, details } = actionEV;

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'profitable': return '#10b981';
      case 'marginal': return '#f59e0b';
      case 'unprofitable': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const actionLabel = action === 'all-in' ? 'All In' : 
                     action.charAt(0).toUpperCase() + action.slice(1);

  return (
    <div 
      className="ev-tooltip"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        pointerEvents: 'none',
        transform: 'translateY(-50%)'
      }}
    >
      <div className="ev-tooltip-content">
        <div className="ev-tooltip-header">
          <span className="ev-action">{actionLabel}</span>
          <span 
            className="ev-value"
            style={{ color: getEVColor(ev) }}
          >
            {formatEV(ev)}
          </span>
        </div>
        
        <div className="ev-tooltip-body">
          <div className="ev-stat">
            <span className="ev-label">Win Chance:</span>
            <span className="ev-value">{(probability * 100).toFixed(1)}%</span>
          </div>
          
          {potOdds > 0 && (
            <div className="ev-stat">
              <span className="ev-label">Pot Odds:</span>
              <span className="ev-value">{(potOdds * 100).toFixed(1)}%</span>
            </div>
          )}
          
          <div className="ev-stat">
            <span className="ev-label">Win/Lose:</span>
            <span className="ev-value">
              +{details.winAmount} / -{details.loseAmount}
            </span>
          </div>
          
          <div 
            className="ev-recommendation"
            style={{ color: getRecommendationColor(recommendation) }}
          >
            {recommendation.charAt(0).toUpperCase() + recommendation.slice(1)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EVTooltip;