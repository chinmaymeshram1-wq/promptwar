import { z } from 'zod';
import { DIETS, TRANSPORT_MODES } from './factors.js';
import { CATEGORIES, LIMITS, type Category } from './constants.js';

// Re-exported so server code can keep importing everything from one module.
export { CATEGORIES, LIMITS, type Category };

/** Request body accepted by POST /api/plan. */
export const PlanRequestSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('agent'),
    description: z
      .string()
      .trim()
      .min(LIMITS.descriptionMinChars, 'Please describe your lifestyle in a bit more detail.')
      .max(LIMITS.descriptionMaxChars, `Keep it under ${LIMITS.descriptionMaxChars} characters.`),
  }),
  z.object({
    mode: z.literal('demo'),
    profileId: z.string().regex(/^[a-z0-9_]{1,40}$/),
  }),
]);
export type PlanRequest = z.infer<typeof PlanRequestSchema>;

export const TransportEntrySchema = z.object({
  mode: z.enum(TRANSPORT_MODES),
  kmPerWeek: z.number().finite().min(0).max(LIMITS.maxKmPerWeek),
});

/** Structured lifestyle the agent extracts from free text. All fields optional: unknown means not counted. */
export const LifestyleSchema = z.object({
  transport: z.array(TransportEntrySchema).max(LIMITS.maxTransportEntries).default([]),
  electricityKwhPerMonth: z.number().finite().min(0).max(LIMITS.maxKwhPerMonth).optional(),
  householdSize: z.number().int().min(1).max(20).default(1),
  lpgCylindersPerMonth: z.number().finite().min(0).max(LIMITS.maxLpgCylindersPerMonth).optional(),
  diet: z.enum(DIETS).optional(),
  wasteKgPerWeek: z.number().finite().min(0).max(LIMITS.maxWasteKgPerWeek).optional(),
});
export type Lifestyle = z.infer<typeof LifestyleSchema>;
export type LifestyleInput = z.input<typeof LifestyleSchema>;

export interface Footprint {
  /** kg CO2e per year, per person, by category. */
  byCategory: Record<Category, number>;
  totalKgPerYear: number;
  /** Categories the user did not mention, so they are excluded rather than guessed. */
  missing: Category[];
}

export interface BenchmarkComparison {
  totalTonnes: number;
  indiaAverageTonnes: number;
  globalAverageTonnes: number;
  parisTargetTonnes: number;
  /** Positive = above target. */
  gapToParisTonnes: number;
  rating: 'excellent' | 'good' | 'high' | 'very_high';
}

export interface ActionOption {
  id: string;
  title: string;
  category: Category;
  savingKgPerYear: number;
  effort: 'low' | 'medium' | 'high';
  costHint: 'saves_money' | 'free' | 'investment';
}

export const AgentStepSchema = z.object({
  tool: z.string(),
  summary: z.string(),
  /** False when the tool rejected the call (invalid or out-of-order arguments). */
  ok: z.boolean(),
  durationMs: z.number(),
});
export type AgentStep = z.infer<typeof AgentStepSchema>;

/** The final plan submitted by the agent; text fields are length-bounded before reaching the UI. */
export const PlanNarrativeSchema = z.object({
  headline: z.string().trim().min(1).max(160),
  insight: z.string().trim().min(1).max(600),
  actions: z
    .array(
      z.object({
        id: z.string().max(60),
        note: z.string().trim().max(240).optional(),
      }),
    )
    .min(1)
    .max(LIMITS.maxActions),
});
export type PlanNarrative = z.infer<typeof PlanNarrativeSchema>;

export interface PlanAction extends ActionOption {
  note?: string;
}

export interface PlanResponse {
  source: 'gemini' | 'demo' | 'fallback';
  model?: string;
  lifestyle: Lifestyle;
  footprint: Footprint;
  benchmark: BenchmarkComparison;
  headline: string;
  insight: string;
  actions: PlanAction[];
  projectedTotalKgPerYear: number;
  steps: AgentStep[];
  latencyMs: number;
}

export interface ApiError {
  error: string;
  retryAfterSeconds?: number;
}
