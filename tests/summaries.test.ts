import { describe, expect, it } from 'vitest';
import { findDemoProfile, runDemo } from '../shared/demo';
import { LifestyleSchema } from '../shared/schemas';
import { summarizeBenchmark, summarizeFootprint, summarizePlan, summarizeRanking } from '../shared/summaries';
import { calculateFootprint, compareToBenchmarks, rankActions } from '../shared/tools';

describe('step summaries', () => {
  const lifestyle = LifestyleSchema.parse({ transport: [{ mode: 'bus', kmPerWeek: 50 }], diet: 'vegan' });
  const footprint = calculateFootprint(lifestyle);

  it('counts only the categories the user described', () => {
    expect(summarizeFootprint(footprint)).toMatch(/across 2 categories$/);
  });

  it('quotes the benchmark target from the factor table, not a hard-coded value', () => {
    expect(summarizeBenchmark(compareToBenchmarks(footprint.totalKgPerYear))).toContain('2.3 t Paris-aligned target');
  });

  it('describes ranking and plan sizes', () => {
    expect(summarizeRanking(rankActions(lifestyle, footprint))).toMatch(/^Ranked \d+ applicable actions/);
    expect(summarizePlan({ actions: [{ id: 'a' }, { id: 'b' }] })).toBe('Submitted a plan with 2 actions');
  });

  it('gives demo mode the same trace wording as the agent', () => {
    const demo = runDemo(findDemoProfile('city_commuter')!, () => 0);
    expect(demo.steps.map((s) => s.tool)).toEqual([
      'calculate_footprint',
      'compare_to_benchmarks',
      'rank_actions',
      'submit_plan',
    ]);
    expect(demo.steps[0]!.summary).toBe(summarizeFootprint(demo.footprint));
  });
});
