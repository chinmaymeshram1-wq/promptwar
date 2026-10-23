/**
 * Firebase Analytics + Performance Monitoring, loaded lazily after first paint.
 *
 * - Disabled entirely when VITE_FIREBASE_CONFIG is not set (local dev, tests, forks).
 * - Never sends user text: only coarse, non-identifying event parameters.
 * - Failures are swallowed; telemetry must never break the app.
 */
import type { PlanResponse } from '../shared/schemas';

interface FirebaseWebConfig {
  apiKey: string;
  projectId: string;
  appId: string;
  measurementId?: string;
  [key: string]: string | undefined;
}

type EventParams = Record<string, string | number>;
type LogEvent = (name: string, params?: EventParams) => void;

/** Parses the JSON config from the environment; returns null when absent or malformed. */
export function parseFirebaseConfig(raw: string | undefined): FirebaseWebConfig | null {
  if (!raw) return null;
  try {
    const config = JSON.parse(raw) as Partial<FirebaseWebConfig>;
    return config.apiKey && config.projectId && config.appId ? (config as FirebaseWebConfig) : null;
  } catch {
    return null;
  }
}

let logEvent: LogEvent | null = null;
let started = false;

export async function initTelemetry(raw: string | undefined = import.meta.env.VITE_FIREBASE_CONFIG): Promise<boolean> {
  const config = parseFirebaseConfig(raw);
  if (!config || started) return false;
  started = true;
  try {
    const [{ initializeApp }, analytics, { getPerformance }] = await Promise.all([
      import('firebase/app'),
      import('firebase/analytics'),
      import('firebase/performance'),
    ]);
    const app = initializeApp(config);
    getPerformance(app); // Automatic page-load and network-request traces.
    if (config.measurementId && (await analytics.isSupported())) {
      const instance = analytics.getAnalytics(app);
      logEvent = (name, params) => analytics.logEvent(instance, name, params);
    }
    return true;
  } catch {
    return false;
  }
}

/** Records a completed plan using only aggregate, non-personal fields. */
export function trackPlan(plan: PlanResponse): void {
  logEvent?.('plan_generated', {
    source: plan.source,
    latency_ms: plan.latencyMs,
    tool_calls: plan.steps.length,
    actions: plan.actions.length,
    rating: plan.benchmark.rating,
  });
}

export function trackError(status: number): void {
  logEvent?.('plan_failed', { status });
}
