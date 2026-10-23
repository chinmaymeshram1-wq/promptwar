import { describe, expect, it } from 'vitest';
import { DIET_FACTORS, GRID_FACTOR_KG_PER_KWH, TRANSPORT_FACTORS } from '../shared/factors';
import { LifestyleSchema, type LifestyleInput } from '../shared/schemas';
import { calculateFootprint, compareToBenchmarks, projectTotal, rankActions } from '../shared/tools';

const lifestyle = (input: LifestyleInput) => LifestyleSchema.parse(input);

describe('calculateFootprint', () => {
  it('annualises weekly transport with the published factor', () => {
    const f = calculateFootprint(lifestyle({ transport: [{ mode: 'car_petrol', kmPerWeek: 100 }] }));
    expect(f.byCategory.transport).toBeCloseTo(100 * 52 * TRANSPORT_FACTORS.car_petrol, 0);
  });

  it('splits household electricity across members', () => {
    const solo = calculateFootprint(lifestyle({ electricityKwhPerMonth: 300 }));
    const family = calculateFootprint(lifestyle({ electricityKwhPerMonth: 300, householdSize: 3 }));
    expect(solo.byCategory.electricity).toBeCloseTo(300 * 12 * GRID_FACTOR_KG_PER_KWH, 0);
    expect(family.byCategory.electricity).toBeCloseTo(solo.byCategory.electricity / 3, 0);
  });

  it('uses per-person daily diet factors', () => {
    const f = calculateFootprint(lifestyle({ diet: 'vegan' }));
    expect(f.byCategory.food).toBeCloseTo(DIET_FACTORS.vegan * 365, 0);
  });

  it('reports missing categories instead of guessing them', () => {
    const f = calculateFootprint(lifestyle({ diet: 'vegetarian' }));
    expect(f.missing).toEqual(['transport', 'electricity', 'cooking', 'waste']);
    expect(f.totalKgPerYear).toBe(f.byCategory.food);
  });

  it('treats zero-emission travel as known but zero', () => {
    const f = calculateFootprint(lifestyle({ transport: [{ mode: 'bicycle_walk', kmPerWeek: 50 }] }));
    expect(f.byCategory.transport).toBe(0);
    expect(f.missing).not.toContain('transport');
  });
});

describe('LifestyleSchema', () => {
  it.each([
    { transport: [{ mode: 'rocket', kmPerWeek: 1 }] },
    { transport: [{ mode: 'bus', kmPerWeek: -5 }] },
    { electricityKwhPerMonth: 1e9 },
    { householdSize: 0 },
    { diet: 'carnivore' },
  ])('rejects out-of-range or unknown input %o', (input) => {
    expect(LifestyleSchema.safeParse(input).success).toBe(false);
  });
});

describe('compareToBenchmarks', () => {
  it.each([
    [1500, 'excellent'],
    [3000, 'good'],
    [6000, 'high'],
    [12000, 'very_high'],
  ] as const)('rates %d kg as %s', (kg, rating) => {
    expect(compareToBenchmarks(kg).rating).toBe(rating);
  });

  it('computes the gap to the Paris-aligned target', () => {
    expect(compareToBenchmarks(3300).gapToParisTonnes).toBeCloseTo(1, 2);
  });
});

describe('rankActions', () => {
  const commuter = lifestyle({
    transport: [{ mode: 'car_petrol', kmPerWeek: 250 }],
    electricityKwhPerMonth: 250,
    diet: 'heavy_meat',
  });

  it('returns only applicable actions, sorted by saving', () => {
    const ranked = rankActions(commuter);
    expect(ranked.length).toBeGreaterThan(3);
    expect(ranked.every((a) => a.savingKgPerYear > 0)).toBe(true);
    const savings = ranked.map((a) => a.savingKgPerYear);
    expect(savings).toEqual([...savings].sort((a, b) => b - a));
    expect(ranked.map((a) => a.id)).not.toContain('ev_two_wheeler');
  });

  it('suggests nothing for an empty lifestyle', () => {
    expect(rankActions(lifestyle({}))).toEqual([]);
  });
});

describe('projectTotal', () => {
  it('never drives a category below zero when actions overlap', () => {
    const l = lifestyle({ electricityKwhPerMonth: 100 });
    const f = calculateFootprint(l);
    const ranked = rankActions(l, f);
    const doubled = [...ranked, ...ranked];
    expect(projectTotal(f, doubled)).toBeGreaterThanOrEqual(0);
    expect(projectTotal(f, [])).toBe(f.totalKgPerYear);
  });
});
