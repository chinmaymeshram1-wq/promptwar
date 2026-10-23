import { AnimatePresence, m } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlanRequest, PlanResponse } from '../shared/schemas';
import { PlanRequestError, requestPlan } from './api';
import { MethodologyView } from './components/MethodologyView';
import { PageHeader } from './components/PageHeader';
import { PlanForm } from './components/PlanForm';
import { PlanResult } from './components/PlanResult';
import { EmptyState, ErrorState, RunProgress } from './components/RunStatus';
import { Sidebar, type View } from './components/Sidebar';
import { MotionProvider } from './motion/MotionProvider';
import { fadeUp } from './motion/variants';
import { trackError, trackPlan } from './telemetry';
import { useTheme } from './useTheme';
import { AmbientBackground } from './components/AmbientBackground';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; mode: PlanRequest['mode'] }
  | { kind: 'error'; message: string; suggestDemo: boolean }
  | { kind: 'done'; plan: PlanResponse };

const PAGES: Record<View, { title: string; description: string }> = {
  plan: {
    title: 'Plan builder',
    description:
      'Describe your lifestyle. A Gemini agent extracts the facts, calls audited calculators and ranks the changes that cut the most CO₂ for you.',
  },
  methodology: {
    title: 'Methodology',
    description:
      'Every number EcoPilot shows comes from these published emission factors, never from the language model.',
  },
};

export function App() {
  const [view, setView] = useState<View>('plan');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [theme, toggleTheme] = useTheme();
  const controllerRef = useRef<AbortController | null>(null);
  const navigatedRef = useRef(false);

  useEffect(() => () => controllerRef.current?.abort(), []);

  // AnimatePresence mounts new content only after the old content exits, so focus is moved
  // from ref callbacks at mount time rather than from effects on state changes.
  const focusResultHeading = useCallback((node: HTMLHeadingElement | null) => node?.focus(), []);
  const focusPageHeading = useCallback((node: HTMLHeadingElement | null) => {
    // Only after in-app navigation, never on first load.
    if (navigatedRef.current) node?.focus();
  }, []);

  const navigate = (next: View) => {
    navigatedRef.current = true;
    setView(next);
  };

  const handleSubmit = async (request: PlanRequest) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus({ kind: 'loading', mode: request.mode });
    try {
      const plan = await requestPlan(request, controller.signal);
      setStatus({ kind: 'done', plan });
      trackPlan(plan);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      const suggestDemo = err instanceof PlanRequestError && [0, 429, 500, 503].includes(err.status);
      trackError(err instanceof PlanRequestError ? err.status : -1);
      setStatus({ kind: 'error', message, suggestDemo });
    }
  };

  const page = PAGES[view];

  return (
    <MotionProvider>
      <AmbientBackground />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="app-shell">
        <Sidebar view={view} onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} />

        <main id="main" className="main">
          <div className="main-inner">
            <AnimatePresence mode="wait" initial={false}>
              <m.div key={view} variants={fadeUp} initial="hidden" animate="visible" exit="exit">
                <PageHeader title={page.title} description={page.description} headingRef={focusPageHeading} />

                {view === 'plan' ? (
                  <div className="workspace">
                    <div className="workspace-input">
                      <PlanForm busy={status.kind === 'loading'} onSubmit={handleSubmit} />
                    </div>
                    <div>
                      <div role="status" aria-live="polite" className="visually-hidden">
                        {status.kind === 'loading' && 'Building your plan…'}
                        {status.kind === 'done' && 'Your plan is ready.'}
                      </div>
                      <AnimatePresence mode="wait">
                        {status.kind === 'idle' && <EmptyState key="idle" />}
                        {status.kind === 'loading' && <RunProgress key="loading" mode={status.mode} />}
                        {status.kind === 'error' && (
                          <ErrorState key="error" message={status.message} suggestDemo={status.suggestDemo} />
                        )}
                        {status.kind === 'done' && (
                          <PlanResult key="done" ref={focusResultHeading} plan={status.plan} />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : (
                  <MethodologyView />
                )}
              </m.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </MotionProvider>
  );
}
