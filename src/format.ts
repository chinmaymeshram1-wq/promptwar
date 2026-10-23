import type { Category } from '../shared/constants';
import type { PlanAction } from '../shared/schemas';

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
const tonneFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 1 });

export const formatKg = (kg: number): string => `${kgFormatter.format(kg)} kg`;
export const formatTonnes = (kg: number): string => `${tonneFormatter.format(kg / 1000)} t`;

export const percentReduction = (before: number, after: number): number =>
  before > 0 ? Math.round(((before - after) / before) * 100) : 0;
