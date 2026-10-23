import { m } from 'motion/react';
import { useEffect, useState } from 'react';
import type { PlanRequest } from '../../shared/schemas';
import { fadeUp } from '../motion/variants';
import { ChartIcon } from './icons';
import { WorkflowTimeline, type WorkflowStep } from './WorkflowTimeline';

/**
 * Shown while a real request is in flight. The steps describe what the client can actually observe
 * (request sent, waiting on the server, rendering), never invented tool progress.
 */
export function RunProgress({ mode }: { mode: PlanRequest['mode'] }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => setElapsed((performance.now() - started) / 1000), 250);
    return () => window.clearInterval(id);
  }, []);

  const steps: WorkflowStep[] = [
    { key: 'sent', title: 'Request sent securely', status: 'completed' },
    {
      key: 'work',
      title: mode === 'agent' ? 'Gemini agent is calling tools' : 'Running demo profile through calculators',
      detail: mode === 'agent' ? 'Extract → calculate → benchmark → rank → plan' : 'No AI call in demo mode',
      status: 'running',
      meta: `${elapsed.toFixed(1)} s`,
    },
    { key: 'render', title: 'Build your dashboard', status: 'pending' },
  ];

  return (
    <m.div className="card stack" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
      <div className="progress" aria-hidden="true" />
      <WorkflowTimeline steps={steps} label="Plan progress" />
    </m.div>
  );
}

export function EmptyState() {
  return (
    <m.div className="empty" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
      <span className="empty-icon">
        <ChartIcon size={24} />
      </span>
      <h2>Your plan will appear here</h2>
      <p>
        Describe your lifestyle, or try Demo mode, to see your footprint by category, how you compare, and the changes
        that save the most CO₂.
      </p>
    </m.div>
  );
}

export function ErrorState({ message, suggestDemo }: { message: string; suggestDemo: boolean }) {
  return (
    <m.div className="alert" role="alert" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
      <strong>We couldn't build your plan</strong>
      <p>{message}</p>
      {suggestDemo && <p className="muted">Tip: switch to Demo mode to explore without the AI service.</p>}
    </m.div>
  );
}
