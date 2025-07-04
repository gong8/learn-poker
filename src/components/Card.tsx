import React from 'react';
import { Card as CardType } from '../types';

interface CardProps {
  card: CardType | null;
  hidden?: boolean;
  small?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const Card: React.FC<CardProps> = ({ card, hidden = false, small = false, size }) => {
  const cardSize = size || (small ? 'small' : 'medium');
  
  if (!card || hidden) {
    return (
      <div className={`card card-back ${cardSize}`}>
        <div className="card-pattern"></div>
      </div>
    );
  }

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  const getSuitColor = (suit: string) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
  };

  return (
    <div className={`card ${getSuitColor(card.suit)} ${cardSize}`}>
      <div className="card-rank">{card.rank}</div>
      <div className="card-suit">{getSuitSymbol(card.suit)}</div>
    </div>
  );
};

export default Card;