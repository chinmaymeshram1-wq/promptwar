import { useEffect, useRef, useState } from 'react';
import type { PlanRequest, PlanResponse } from '../shared/schemas';
import { PlanRequestError, requestPlan } from './api';
import { PlanForm } from './components/PlanForm';
import { PlanResult } from './components/PlanResult';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string; suggestDemo: boolean }
  | { kind: 'done'; plan: PlanResponse };

export function App() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (status.kind === 'done') headingRef.current?.focus();
  }, [status]);

  const handleSubmit = async (request: PlanRequest) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus({ kind: 'loading' });
    try {
      const plan = await requestPlan(request, controller.signal);
      setStatus({ kind: 'done', plan });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      const suggestDemo = err instanceof PlanRequestError && [0, 429, 500, 503].includes(err.status);
      setStatus({ kind: 'error', message, suggestDemo });
    }
  };

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container">
          <p className="logo" aria-label="EcoPilot">
            <span aria-hidden="true">🌱</span> EcoPilot
          </p>
          <p className="tagline">Your agentic AI carbon coach</p>
        </div>
      </header>

      <main id="main" className="container">
        <section className="hero" aria-labelledby="hero-heading">
          <h1 id="hero-heading">Turn everyday habits into a measurable climate plan</h1>
          <p>
            Describe your lifestyle. A Gemini agent extracts the facts, calls audited calculators built on published
            emission factors, and ranks the changes that cut the most CO₂ for you.
          </p>
        </section>

        <PlanForm busy={status.kind === 'loading'} onSubmit={handleSubmit} />

        <div aria-live="polite" role="status" className="status">
          {status.kind === 'loading' && <p className="loading">The agent is calculating your footprint…</p>}
        </div>
        {status.kind === 'error' && (
          <div role="alert" className="card error">
            <p>{status.message}</p>
            {status.suggestDemo && <p className="hint">Tip: switch to Demo mode to explore without the AI service.</p>}
          </div>
        )}
        {status.kind === 'done' && <PlanResult ref={headingRef} plan={status.plan} />}
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            Emission factors: DEFRA 2024, CEA India, IPCC 2006, Scarborough et al. 2014. Estimates for guidance, not
            certification.
          </p>
        </div>
      </footer>
    </>
  );
}
