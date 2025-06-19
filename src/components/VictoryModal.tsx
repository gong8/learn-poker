import React from 'react';

interface VictoryModalProps {
  isOpen: boolean;
  onReturnToStart: () => void;
}

const VictoryModal: React.FC<VictoryModalProps> = ({ isOpen, onReturnToStart }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content victory-modal">
        <div className="modal-header">
          <h2>🎉 Congratulations!</h2>
        </div>
        <div className="modal-body">
          <p>You have won the game by eliminating all opponents!</p>
          <p>You are the ultimate poker champion. Would you like to start a new game?</p>
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

export default VictoryModal;