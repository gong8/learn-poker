import React from 'react';
import { HandHistoryEntry } from '../types';
import Card from './Card';

interface HandHistoryProps {
  history: HandHistoryEntry[];
  isOpen: boolean;
  onClose: () => void;
}

const HandHistory: React.FC<HandHistoryProps> = ({ history, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="hand-history-backdrop" onClick={handleBackdropClick}>
      <div className="hand-history-modal">
        <div className="hand-history-header">
          <h2>Hand History</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="hand-history-content">
          {history.length === 0 ? (
            <div className="no-history">
              <p>No hands played yet. Start playing to see your hand history!</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((hand, index) => (
                <div key={hand.handNumber} className="history-entry">
                  <div className="history-entry-header">
                    <div className="hand-info">
                      <span className="hand-number">Hand #{hand.handNumber}</span>
                      <span className="hand-time">{formatTimestamp(hand.timestamp)}</span>
                    </div>
                    <div className="pot-info">
                      Pot: {hand.pot} chips
                    </div>
                  </div>

                  <div className="community-cards-history">
                    <h4>Community Cards</h4>
                    <div className="cards-row">
                      {hand.communityCards.map((card, cardIndex) => (
                        <Card
                          key={cardIndex}
                          card={card}
                          size="small"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="players-summary">
                    <h4>Players & Results</h4>
                    <div className="players-grid">
                      {hand.summaries.map((summary, summaryIndex) => (
                        <div 
                          key={summaryIndex} 
                          className={`player-summary ${summary.isWinner ? 'winner' : ''}`}
                        >
                          <div className="player-summary-header">
                            <span className="player-name">{summary.playerName}</span>
                            {summary.isWinner && <span className="winner-badge">🏆</span>}
                          </div>
                          <div className="player-hand-info">
                            <span className="hand-type">{summary.handDescription}</span>
                          </div>
                          <div className="player-cards">
                            {summary.holeCards.map((card, cardIndex) => (
                              <Card
                                key={cardIndex}
                                card={card}
                                size="small"
                              />
                            ))}
                          </div>
                          <div className="chip-change">
                            {(() => {
                              const chipChange = hand.chipChanges.find(c => c.playerId === summary.playerId);
                              if (chipChange) {
                                return (
                                  <span className={chipChange.change >= 0 ? 'positive' : 'negative'}>
                                    {chipChange.change >= 0 ? '+' : ''}{chipChange.change}
                                  </span>
                                );
                              }
                              return '0';
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HandHistory;