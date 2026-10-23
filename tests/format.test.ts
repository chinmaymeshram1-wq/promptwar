import { describe, expect, it } from 'vitest';
import { findDemoProfile, runDemo } from '../shared/demo';
import { formatKg, percentReduction, traceSummary } from '../src/format';

const plan = runDemo(findDemoProfile('city_commuter')!, () => 0);

describe('formatting', () => {
  it('formats kilograms with Indian digit grouping', () => {
    expect(formatKg(123456.7)).toBe('1,23,457 kg');
  });

  it('computes percentage reduction safely', () => {
    expect(percentReduction(200, 150)).toBe(25);
    expect(percentReduction(0, 0)).toBe(0);
  });
});

describe('traceSummary', () => {
  it('reports measured agent efficiency', () => {
    const summary = traceSummary({
      ...plan,
      latencyMs: 6400,
      model: 'gemini-test',
      usage: { modelCalls: 4, promptTokens: 9000, outputTokens: 500, totalTokens: 9500 },
    });
    expect(summary).toBe('4 tool calls · 6.4 s · 4 model calls · 9,500 tokens · gemini-test');
  });

  it('makes cache hits explicit', () => {
    expect(traceSummary({ ...plan, cached: true })).toBe('4 tool calls · served from cache, 0 tokens');
  });
});
