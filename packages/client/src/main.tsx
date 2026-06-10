import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

const root = document.getElementById('root')!;
createRoot(root).render(<App />);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
