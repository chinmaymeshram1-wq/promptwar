import type { Category } from '../shared/constants';
import type { PlanAction, PlanResponse } from '../shared/schemas';

export const CATEGORY_LABELS: Record<Category, string> = {
  transport: 'Travel',
  electricity: 'Electricity',
  cooking: 'Cooking fuel',
  food: 'Food',
  waste: 'Waste',
};

export const EFFORT_LABELS: Record<PlanAction['effort'], string> = {
  low: 'Low effort',
  medium: 'Medium effort',
  high: 'High effort',
};

export const COST_LABELS: Record<PlanAction['costHint'], string> = {
  saves_money: 'Saves money',
  free: 'Free',
  investment: 'Upfront investment',
};

const kgFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const formatKg = (kg: number): string => `${kgFormatter.format(kg)} kg`;

export const percentReduction = (before: number, after: number): number =>
  before > 0 ? Math.round(((before - after) / before) * 100) : 0;

const tokenFormatter = new Intl.NumberFormat('en-IN');

/** One-line, measured efficiency summary: tool calls, latency, model calls, tokens and cache status. */
export function traceSummary(plan: PlanResponse): string {
  const parts = [`${plan.steps.length} tool calls`];
  if (plan.cached) {
    parts.push('served from cache, 0 tokens');
  } else {
    parts.push(`${(plan.latencyMs / 1000).toFixed(1)} s`);
    if (plan.usage) {
      parts.push(`${plan.usage.modelCalls} model calls`, `${tokenFormatter.format(plan.usage.totalTokens)} tokens`);
    }
  }
  if (plan.model) parts.push(plan.model);
  return parts.join(' · ');
}
