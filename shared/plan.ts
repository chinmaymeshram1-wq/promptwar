import { compareToBenchmarks, projectTotal } from './tools.js';
import type {
  ActionOption,
  AgentStep,
  BenchmarkComparison,
  Footprint,
  Lifestyle,
  PlanAction,
  PlanNarrative,
  PlanResponse,
  TokenUsage,
} from './schemas.js';

const CATEGORY_LABEL: Record<keyof Footprint['byCategory'], string> = {
  transport: 'travel',
  electricity: 'electricity',
  cooking: 'cooking fuel',
  food: 'food',
  waste: 'waste',
};

const DEFAULT_ACTION_COUNT = 4;

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Deterministic narrative used by demo mode and whenever the model is unavailable. */
export function deterministicNarrative(
  footprint: Footprint,
  benchmark: BenchmarkComparison,
  ranked: readonly ActionOption[],
): PlanNarrative {
  const [topCategory, topKg] = Object.entries(footprint.byCategory).sort((a, b) => b[1] - a[1])[0] as [
    keyof Footprint['byCategory'],
    number,
  ];
  const share = footprint.totalKgPerYear > 0 ? Math.round((topKg / footprint.totalKgPerYear) * 100) : 0;
  const gap = benchmark.gapToParisTonnes;
  const headline =
    gap > 0
      ? `You emit ${benchmark.totalTonnes} t CO₂e a year, ${gap} t above the 2030 Paris-aligned target.`
      : `You emit ${benchmark.totalTonnes} t CO₂e a year, already within the 2030 Paris-aligned target.`;
  const top = ranked[0];
  const insight = top
    ? `${capitalize(CATEGORY_LABEL[topCategory])} is your biggest source (${share}% of the total). The single highest-impact change is: ${top.title.toLowerCase()}, saving about ${Math.round(top.savingKgPerYear)} kg a year.`
    : 'We could not find a quantified action for the details given. Add more about travel, electricity or diet for a sharper plan.';
  return {
    headline,
    insight,
    actions: ranked.slice(0, DEFAULT_ACTION_COUNT).map((a) => ({ id: a.id })),
  };
}

/** Merge model narrative with tool-computed numbers. Unknown action ids from the model are dropped. */
export function assemblePlan(input: {
  source: PlanResponse['source'];
  model?: string;
  lifestyle: Lifestyle;
  footprint: Footprint;
  ranked: readonly ActionOption[];
  narrative: PlanNarrative;
  steps: AgentStep[];
  usage?: TokenUsage;
  startedAt: number;
  now: () => number;
}): PlanResponse {
  const benchmark = compareToBenchmarks(input.footprint.totalKgPerYear);
  const byId = new Map(input.ranked.map((a) => [a.id, a]));
  const seen = new Set<string>();
  const actions: PlanAction[] = [];
  for (const { id, note } of input.narrative.actions) {
    const option = byId.get(id);
    if (!option || seen.has(id)) continue;
    seen.add(id);
    actions.push(note ? { ...option, note } : option);
  }
  return {
    source: input.source,
    ...(input.model ? { model: input.model } : {}),
    lifestyle: input.lifestyle,
    footprint: input.footprint,
    benchmark,
    headline: input.narrative.headline,
    insight: input.narrative.insight,
    actions,
    projectedTotalKgPerYear: projectTotal(input.footprint, actions),
    steps: input.steps,
    latencyMs: Math.round(input.now() - input.startedAt),
    ...(input.usage ? { usage: input.usage } : {}),
  };
}
