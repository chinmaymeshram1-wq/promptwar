/**
 * Human-readable summaries for each agent step. Shared by the Gemini agent and demo mode
 * so the trace reads identically whichever path produced the plan.
 */
import { CATEGORIES } from './constants.js';
import { BENCHMARKS_TONNES } from './factors.js';
import type { ActionOption, BenchmarkComparison, Footprint, PlanNarrative } from './schemas.js';

export const summarizeFootprint = (footprint: Footprint): string =>
  `Calculated ${Math.round(footprint.totalKgPerYear)} kg CO₂e/year across ${CATEGORIES.length - footprint.missing.length} categories`;

export const summarizeBenchmark = (benchmark: BenchmarkComparison): string =>
  `Compared ${benchmark.totalTonnes} t with the ${BENCHMARKS_TONNES.paris_2030_target} t Paris-aligned target (${benchmark.rating.replace('_', ' ')})`;

export const summarizeRanking = (ranked: readonly ActionOption[]): string =>
  `Ranked ${ranked.length} applicable actions by annual saving`;

export const summarizePlan = (narrative: Pick<PlanNarrative, 'actions'>): string =>
  `Submitted a plan with ${narrative.actions.length} actions`;
