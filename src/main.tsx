import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/index.css';
import { initTelemetry } from './telemetry';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Start Firebase on the first user interaction, so the Google tag never competes with the initial page load.
// Performance Monitoring still reads this page load's Navigation Timing retroactively.
const INTERACTIONS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
const startTelemetry = () => {
  INTERACTIONS.forEach((type) => window.removeEventListener(type, startTelemetry));
  void initTelemetry();
};
INTERACTIONS.forEach((type) => window.addEventListener(type, startTelemetry, { once: true, passive: true }));
