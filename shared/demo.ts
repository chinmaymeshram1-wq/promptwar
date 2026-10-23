/**
 * Demo mode: curated profiles run through the exact same deterministic tools as the agent,
 * with no model call. Lets anyone evaluate EcoPilot without an API key and keeps the app
 * useful when the AI service is unavailable.
 */
import { TOOL_NAMES } from './constants.js';
import type { DemoProfile } from './demoProfiles.js';
import { assemblePlan, deterministicNarrative } from './plan.js';
import { LifestyleSchema, type AgentStep, type PlanResponse } from './schemas.js';
import { summarizeBenchmark, summarizeFootprint, summarizePlan, summarizeRanking } from './summaries.js';
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
  const footprint = timed(TOOL_NAMES.calculateFootprint, () => calculateFootprint(lifestyle), summarizeFootprint);
  const benchmark = timed(
    TOOL_NAMES.compareToBenchmarks,
    () => compareToBenchmarks(footprint.totalKgPerYear),
    summarizeBenchmark,
  );
  const ranked = timed(TOOL_NAMES.rankActions, () => rankActions(lifestyle, footprint), summarizeRanking);
  const narrative = timed(
    TOOL_NAMES.submitPlan,
    () => deterministicNarrative(footprint, benchmark, ranked),
    summarizePlan,
  );

  return assemblePlan({ source: 'demo', lifestyle, footprint, ranked, narrative, steps, startedAt, now });
}
