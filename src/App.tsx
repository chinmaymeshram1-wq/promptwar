import { AnimatePresence, m } from 'motion/react';
import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { AmbientBackground } from './components/AmbientBackground';
import { PageHeader } from './components/PageHeader';
import { Sidebar, type View } from './components/Sidebar';
import { usePlanRequest } from './hooks/usePlanRequest';
import { useTheme } from './hooks/useTheme';
import { MotionProvider } from './motion/MotionProvider';
import { fadeUp } from './motion/variants';
import { PlanWorkspace, prefetchPlanResult } from './views/PlanWorkspace';

const MethodologyView = lazy(() => import('./views/MethodologyView').then((mod) => ({ default: mod.MethodologyView })));

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

/** App shell: theme, navigation, page header and the active view. */
export function App() {
  const [view, setView] = useState<View>('plan');
  const [theme, toggleTheme] = useTheme();
  // Lives here, not in the view, so a finished plan survives switching pages.
  const { status, submit } = usePlanRequest(prefetchPlanResult);
  const navigatedRef = useRef(false);

  // Move focus to the new page title after in-app navigation only, never on first load.
  const focusPageHeading = useCallback((node: HTMLHeadingElement | null) => {
    if (navigatedRef.current) node?.focus();
  }, []);

  const navigate = (next: View) => {
    navigatedRef.current = true;
    setView(next);
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
                  <PlanWorkspace status={status} onSubmit={(request) => void submit(request)} />
                ) : (
                  <Suspense fallback={null}>
                    <MethodologyView />
                  </Suspense>
                )}
              </m.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </MotionProvider>
  );
}
