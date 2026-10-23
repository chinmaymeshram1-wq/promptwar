import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { initTelemetry } from './telemetry';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Load Firebase after the first paint so it never delays the UI.
const startTelemetry = () => void initTelemetry();
if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(startTelemetry);
else setTimeout(startTelemetry, 1500);
