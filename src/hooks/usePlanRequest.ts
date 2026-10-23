import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlanRequest, PlanResponse } from '../../shared/schemas';
import { PlanRequestError, requestPlan } from '../api';
import { trackError, trackPlan } from '../telemetry';

export type PlanStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; mode: PlanRequest['mode'] }
  | { kind: 'error'; message: string; suggestDemo: boolean }
  | { kind: 'done'; plan: PlanResponse };

/** Statuses where Demo mode is a useful suggestion: offline, rate-limited, or the AI service is down. */
const DEMO_HINT_STATUSES = new Set([0, 429, 500, 503]);

/**
 * Owns the plan request lifecycle: one request at a time (a new submit cancels the previous one),
 * cancellation on unmount, telemetry, and user-safe error messages.
 */
export function usePlanRequest(onStart?: () => void) {
  const [status, setStatus] = useState<PlanStatus>({ kind: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const submit = useCallback(
    async (request: PlanRequest) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setStatus({ kind: 'loading', mode: request.mode });
      onStart?.();
      try {
        const plan = await requestPlan(request, controller.signal);
        setStatus({ kind: 'done', plan });
        trackPlan(plan);
      } catch (err) {
        if (controller.signal.aborted) return;
        const status = err instanceof PlanRequestError ? err.status : -1;
        trackError(status);
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Something went wrong.',
          suggestDemo: DEMO_HINT_STATUSES.has(status),
        });
      }
    },
    [onStart],
  );

  return { status, submit };
}
