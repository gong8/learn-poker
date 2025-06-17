import React from 'react';
import { createRoot } from 'react-dom/client';

const App = () => <div>Hello from Vercel!</div>;

const container = document.getElementById('root');
if (!container) throw new Error('Root container not found');

const root = createRoot(container);
root.render(<App />);
