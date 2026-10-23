import { AnimatePresence } from 'motion/react';
import { lazy, Suspense, useCallback } from 'react';
import type { PlanRequest, PlanResponse } from '../../shared/schemas';
import { PlanForm } from '../components/PlanForm';
import { EmptyState, ErrorState, RunProgress } from '../components/RunStatus';
import type { PlanStatus } from '../hooks/usePlanRequest';

// The dashboard is code-split; App prefetches its chunk as soon as a request starts.
const loadPlanResult = () => import('../components/results/PlanResult');
const PlanResult = lazy(() => loadPlanResult().then((mod) => ({ default: mod.PlanResult })));
export const prefetchPlanResult = () => void loadPlanResult();

/** Plans whose heading already received focus; revisiting the page must not steal focus again. */
const announcedPlans = new WeakSet<PlanResponse>();

interface PlanWorkspaceProps {
  status: PlanStatus;
  onSubmit: (request: PlanRequest) => void;
}

/** Input on the left, live status or results on the right. State lives in App so it survives navigation. */
export function PlanWorkspace({ status, onSubmit }: PlanWorkspaceProps) {
  const plan = status.kind === 'done' ? status.plan : null;

  // AnimatePresence mounts new content only after the old content exits, so focus moves to the
  // results heading from a ref callback at mount time, and only the first time each plan appears.
  const focusNewResult = useCallback(
    (node: HTMLHeadingElement | null) => {
      if (!node || !plan || announcedPlans.has(plan)) return;
      announcedPlans.add(plan);
      node.focus();
    },
    [plan],
  );

  return (
    <div className="workspace">
      <div className="workspace-input">
        <PlanForm busy={status.kind === 'loading'} onSubmit={onSubmit} />
      </div>
      <div>
        <div role="status" aria-live="polite" className="visually-hidden">
          {status.kind === 'loading' && 'Building your plan…'}
          {status.kind === 'done' && 'Your plan is ready.'}
        </div>
        {/* initial={false}: content present at first paint renders immediately (no fade-in delay). */}
        <AnimatePresence mode="wait" initial={false}>
          {status.kind === 'idle' && <EmptyState key="idle" />}
          {status.kind === 'loading' && <RunProgress key="loading" mode={status.mode} />}
          {status.kind === 'error' && (
            <ErrorState key="error" message={status.message} suggestDemo={status.suggestDemo} />
          )}
          {status.kind === 'done' && (
            <Suspense key="done" fallback={null}>
              <PlanResult ref={focusNewResult} plan={status.plan} />
            </Suspense>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
