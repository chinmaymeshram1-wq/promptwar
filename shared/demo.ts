/**
 * Demo mode: curated profiles run through the exact same deterministic tools as the agent,
 * with no model call. Lets anyone evaluate EcoPilot without an API key and keeps the app
 * useful when the AI service is unavailable.
 */
import { assemblePlan, deterministicNarrative } from './plan.js';
import type { DemoProfile } from './demoProfiles.js';
import { LifestyleSchema, type AgentStep, type PlanResponse } from './schemas.js';
import { calculateFootprint, compareToBenchmarks, rankActions } from './tools.js';

export { DEMO_PROFILES, findDemoProfile, type DemoProfile } from './demoProfiles.js';

export function runDemo(profile: DemoProfile, now: () => number = () => performance.now()): PlanResponse {
  const startedAt = now();
  const steps: AgentStep[] = [];
  const timed = <T>(tool: string, fn: () => T, describe: (value: T) => string): T => {
    const t0 = now();
    const value = fn();
    steps.push({ tool, summary: describe(value), ok: true, durationMs: Math.round(now() - t0) });
    return value;
  };

  const lifestyle = LifestyleSchema.parse(profile.lifestyle);
  const footprint = timed(
    'calculate_footprint',
    () => calculateFootprint(lifestyle),
    (f) => `Calculated ${Math.round(f.totalKgPerYear)} kg CO₂e/year across ${5 - f.missing.length} categories`,
  );
  const benchmark = timed(
    'compare_to_benchmarks',
    () => compareToBenchmarks(footprint.totalKgPerYear),
    (b) => `Compared ${b.totalTonnes} t with the 2.3 t Paris-aligned target (${b.rating.replace('_', ' ')})`,
  );
  const ranked = timed(
    'rank_actions',
    () => rankActions(lifestyle, footprint),
    (r) => `Ranked ${r.length} applicable actions by annual saving`,
  );
  const narrative = timed(
    'submit_plan',
    () => deterministicNarrative(footprint, benchmark, ranked),
    (n) => `Submitted a plan with ${n.actions.length} actions`,
  );

  return assemblePlan({ source: 'demo', lifestyle, footprint, ranked, narrative, steps, startedAt, now });
}
