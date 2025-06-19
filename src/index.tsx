import React from 'react';
import { createRoot } from 'react-dom/client';
import PokerGame from './PokerGame';
import { SettingsProvider } from './contexts/SettingsContext';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

const root = createRoot(container);
root.render(
  <SettingsProvider>
    <PokerGame />
  </SettingsProvider>
);