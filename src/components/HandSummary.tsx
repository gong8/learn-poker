import React from 'react';
import { HandSummary } from '../types';
import Card from './Card';

interface HandSummaryProps {
  summaries: HandSummary[];
}

const HandSummaryComponent: React.FC<HandSummaryProps> = ({ summaries }) => {
  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="hand-summaries">
      <h3>Hand Results</h3>
      <div className="hand-summaries-list">
        {summaries.map(summary => (
          <div key={summary.playerId} className={`hand-summary-item ${summary.isWinner ? 'winner' : ''}`}>
            <div className="hand-summary-header">
              <span className="player-name">{summary.playerName}</span>
              <span className={`hand-type ${summary.isWinner ? 'winning-hand' : ''}`}>
                {summary.handDescription}
                {summary.isWinner && ' 🏆'}
              </span>
            </div>
            <div className="hand-cards">
              {summary.cards.map((card, index) => (
                <Card
                  key={`${card.suit}-${card.rank}`}
                  card={card}
                  hidden={false}
                  small
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HandSummaryComponent;