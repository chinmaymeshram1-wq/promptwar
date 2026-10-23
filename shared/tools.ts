/**
 * Deterministic tools the agent can call. Pure functions: no I/O, no randomness.
 * The LLM decides *which* tools to call and *how to explain* results;
 * these functions own every number shown to the user.
 */
import {
  BENCHMARKS_TONNES,
  DAYS_PER_YEAR,
  DIET_FACTORS,
  GRID_FACTOR_KG_PER_KWH,
  LPG_CYLINDER_KG,
  LPG_FACTOR_KG_PER_KG,
  MONTHS_PER_YEAR,
  TRANSPORT_FACTORS,
  WASTE_FACTOR_KG_PER_KG,
  WEEKS_PER_YEAR,
  type Diet,
  type TransportMode,
} from './factors.js';
import {
  CATEGORIES,
  type ActionOption,
  type BenchmarkComparison,
  type Category,
  type Footprint,
  type Lifestyle,
} from './schemas.js';

const round = (value: number, digits = 1): number => {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
};

const CAR_MODES: readonly TransportMode[] = ['car_petrol', 'car_diesel', 'car_cng'];
/** Electric two-wheeler, kg CO2e/km on India grid (~40 Wh/km). */
const EV_TWO_WHEELER_FACTOR = 0.03;

function annualTransportKg(lifestyle: Lifestyle, modes?: readonly TransportMode[]): number {
  return lifestyle.transport
    .filter((t) => !modes || modes.includes(t.mode))
    .reduce((sum, t) => sum + t.kmPerWeek * WEEKS_PER_YEAR * TRANSPORT_FACTORS[t.mode], 0);
}

function annualKm(lifestyle: Lifestyle, modes: readonly TransportMode[]): number {
  return lifestyle.transport
    .filter((t) => modes.includes(t.mode))
    .reduce((sum, t) => sum + t.kmPerWeek * WEEKS_PER_YEAR, 0);
}

/** Tool 1: annual per-person footprint by category. Missing data is reported, never invented. */
export function calculateFootprint(lifestyle: Lifestyle): Footprint {
  const perPerson = 1 / lifestyle.householdSize;
  const missing: Category[] = [];

  const transport = annualTransportKg(lifestyle);
  if (lifestyle.transport.length === 0) missing.push('transport');

  let electricity = 0;
  if (lifestyle.electricityKwhPerMonth === undefined) missing.push('electricity');
  else electricity = lifestyle.electricityKwhPerMonth * MONTHS_PER_YEAR * GRID_FACTOR_KG_PER_KWH * perPerson;

  let cooking = 0;
  if (lifestyle.lpgCylindersPerMonth === undefined) missing.push('cooking');
  else cooking = lifestyle.lpgCylindersPerMonth * MONTHS_PER_YEAR * LPG_CYLINDER_KG * LPG_FACTOR_KG_PER_KG * perPerson;

  let food = 0;
  if (lifestyle.diet === undefined) missing.push('food');
  else food = DIET_FACTORS[lifestyle.diet] * DAYS_PER_YEAR;

  let waste = 0;
  if (lifestyle.wasteKgPerWeek === undefined) missing.push('waste');
  else waste = lifestyle.wasteKgPerWeek * WEEKS_PER_YEAR * WASTE_FACTOR_KG_PER_KG * perPerson;

  const byCategory: Record<Category, number> = {
    transport: round(transport),
    electricity: round(electricity),
    cooking: round(cooking),
    food: round(food),
    waste: round(waste),
  };
  const totalKgPerYear = round(CATEGORIES.reduce((sum, c) => sum + byCategory[c], 0));
  return { byCategory, totalKgPerYear, missing };
}

/** Tool 2: compare an annual total against national, global and Paris-aligned benchmarks. */
export function compareToBenchmarks(totalKgPerYear: number): BenchmarkComparison {
  const totalTonnes = round(totalKgPerYear / 1000, 2);
  const target = BENCHMARKS_TONNES.paris_2030_target;
  const rating: BenchmarkComparison['rating'] =
    totalTonnes <= target
      ? 'excellent'
      : totalTonnes <= BENCHMARKS_TONNES.global_average
        ? 'good'
        : totalTonnes <= 8
          ? 'high'
          : 'very_high';
  return {
    totalTonnes,
    indiaAverageTonnes: BENCHMARKS_TONNES.india_average,
    globalAverageTonnes: BENCHMARKS_TONNES.global_average,
    parisTargetTonnes: target,
    gapToParisTonnes: round(totalTonnes - target, 2),
    rating,
  };
}

const NEXT_DIET: Partial<Record<Diet, Diet>> = {
  heavy_meat: 'medium_meat',
  medium_meat: 'low_meat',
  low_meat: 'vegetarian',
  pescatarian: 'vegetarian',
  vegetarian: 'vegan',
};

type ActionTemplate = Omit<ActionOption, 'savingKgPerYear'> & {
  saving: (l: Lifestyle, f: Footprint) => number;
};

const ACTION_CATALOG: readonly ActionTemplate[] = [
  {
    id: 'car_to_transit',
    title: 'Move half of your car kilometres to metro or bus',
    category: 'transport',
    effort: 'medium',
    costHint: 'saves_money',
    saving: (l) =>
      CAR_MODES.reduce((sum, mode) => {
        const km = annualKm(l, [mode]) * 0.5;
        return sum + km * (TRANSPORT_FACTORS[mode] - TRANSPORT_FACTORS.bus);
      }, 0),
  },
  {
    id: 'carpool',
    title: 'Carpool your regular car commute with one colleague',
    category: 'transport',
    effort: 'low',
    costHint: 'saves_money',
    saving: (l) => annualTransportKg(l, CAR_MODES) * 0.5,
  },
  {
    id: 'ev_two_wheeler',
    title: 'Switch your motorbike to an electric two-wheeler',
    category: 'transport',
    effort: 'high',
    costHint: 'investment',
    saving: (l) => annualKm(l, ['motorbike']) * (TRANSPORT_FACTORS.motorbike - EV_TWO_WHEELER_FACTOR),
  },
  {
    id: 'flight_to_train',
    title: 'Replace half of your flights with trains',
    category: 'transport',
    effort: 'medium',
    costHint: 'saves_money',
    saving: (l) => annualKm(l, ['flight']) * 0.5 * (TRANSPORT_FACTORS.flight - TRANSPORT_FACTORS.metro_train),
  },
  {
    id: 'ac_24c',
    title: 'Set the AC to 24 °C and use a 5-star fan alongside it',
    category: 'electricity',
    effort: 'low',
    costHint: 'saves_money',
    saving: (_l, f) => f.byCategory.electricity * 0.15,
  },
  {
    id: 'led_standby',
    title: 'Switch to LED lighting and kill standby power at the plug',
    category: 'electricity',
    effort: 'low',
    costHint: 'saves_money',
    saving: (_l, f) => f.byCategory.electricity * 0.06,
  },
  {
    id: 'rooftop_solar',
    title: 'Install rooftop solar (PM Surya Ghar subsidy eligible)',
    category: 'electricity',
    effort: 'high',
    costHint: 'investment',
    saving: (_l, f) => f.byCategory.electricity * 0.7,
  },
  {
    id: 'efficient_cooking',
    title: 'Cook with a pressure cooker and lids to cut LPG use',
    category: 'cooking',
    effort: 'low',
    costHint: 'saves_money',
    saving: (_l, f) => f.byCategory.cooking * 0.2,
  },
  {
    id: 'diet_step_down',
    title: 'Shift your diet one step lower in meat',
    category: 'food',
    effort: 'medium',
    costHint: 'free',
    saving: (l) => {
      const next = l.diet ? NEXT_DIET[l.diet] : undefined;
      return l.diet && next ? (DIET_FACTORS[l.diet] - DIET_FACTORS[next]) * DAYS_PER_YEAR : 0;
    },
  },
  {
    id: 'plant_days',
    title: 'Eat fully plant-based three days a week',
    category: 'food',
    effort: 'low',
    costHint: 'free',
    saving: (l) =>
      l.diet && l.diet !== 'vegan' ? (DIET_FACTORS[l.diet] - DIET_FACTORS.vegan) * DAYS_PER_YEAR * (3 / 7) : 0,
  },
  {
    id: 'compost',
    title: 'Segregate and compost wet waste at home',
    category: 'waste',
    effort: 'low',
    costHint: 'free',
    saving: (_l, f) => f.byCategory.waste * 0.5,
  },
];

export const ACTION_IDS: readonly string[] = ACTION_CATALOG.map((a) => a.id);

/** Tool 3: every applicable action with its quantified annual saving, best first. */
export function rankActions(lifestyle: Lifestyle, footprint = calculateFootprint(lifestyle)): ActionOption[] {
  return ACTION_CATALOG.map(({ saving, ...action }) => ({
    ...action,
    savingKgPerYear: round(saving(lifestyle, footprint)),
  }))
    .filter((a) => a.savingKgPerYear > 0)
    .sort((a, b) => b.savingKgPerYear - a.savingKgPerYear);
}

/**
 * Projected annual total after adopting the given actions.
 * Savings within a category are capped so overlapping actions can never drive it below zero.
 */
export function projectTotal(footprint: Footprint, actions: readonly ActionOption[]): number {
  const remaining = { ...footprint.byCategory };
  for (const action of actions) {
    remaining[action.category] = Math.max(0, remaining[action.category] - action.savingKgPerYear);
  }
  return round(CATEGORIES.reduce((sum, c) => sum + remaining[c], 0));
}
