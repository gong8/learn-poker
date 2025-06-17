import React from 'react';

interface EliminationModalProps {
  isOpen: boolean;
  onReturnToStart: () => void;
}

const EliminationModal: React.FC<EliminationModalProps> = ({ isOpen, onReturnToStart }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content elimination-modal">
        <div className="modal-header">
          <h2>Game Over</h2>
        </div>
        <div className="modal-body">
          <p>You have been eliminated from the game!</p>
          <p>Better luck next time. Would you like to start a new game?</p>
        </div>
        <div className="modal-footer">
          <button 
            className="action-button primary"
            onClick={onReturnToStart}
          >
            Start New Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default EliminationModal;