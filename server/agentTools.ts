/**
 * Executes model tool calls against server-side state. Every argument is validated; failures are
 * returned to the model as `{ error }` so it can self-correct, and are never thrown.
 */
import type { FunctionCall } from '@google/genai';
import { TOOL_NAMES } from '../shared/constants.js';
import {
  LifestyleSchema,
  PlanNarrativeSchema,
  type ActionOption,
  type Footprint,
  type Lifestyle,
  type PlanNarrative,
} from '../shared/schemas.js';
import { summarizeBenchmark, summarizeFootprint, summarizePlan, summarizeRanking } from '../shared/summaries.js';
import { calculateFootprint, compareToBenchmarks, rankActions } from '../shared/tools.js';

/** What the agent has established so far. Numeric tools read from here, never from model arguments. */
export interface AgentState {
  lifestyle?: Lifestyle;
  footprint?: Footprint;
  ranked?: ActionOption[];
  narrative?: PlanNarrative;
}

export interface ToolOutcome {
  /** Sent back to the model as the function response. */
  result: Record<string, unknown>;
  /** Shown to users in the agent trace. */
  summary: string;
}

const OUT_OF_ORDER = 'Out of order call';

const rejected = (error: string, summary: string): ToolOutcome => ({ result: { error }, summary });

const firstIssue = (error: { issues: { path: PropertyKey[]; message: string }[] }): string => {
  const issue = error.issues[0];
  return issue ? `${issue.path.join('.') || 'input'}: ${issue.message}` : 'invalid arguments';
};

export function executeTool(call: FunctionCall, state: AgentState): ToolOutcome {
  switch (call.name ?? '') {
    case TOOL_NAMES.calculateFootprint: {
      const parsed = LifestyleSchema.safeParse(call.args ?? {});
      if (!parsed.success) return rejected(firstIssue(parsed.error), 'Rejected invalid lifestyle data');
      state.lifestyle = parsed.data;
      state.footprint = calculateFootprint(parsed.data);
      state.ranked = undefined;
      return { result: { ...state.footprint }, summary: summarizeFootprint(state.footprint) };
    }
    case TOOL_NAMES.compareToBenchmarks: {
      if (!state.footprint) return rejected(`Call ${TOOL_NAMES.calculateFootprint} first.`, OUT_OF_ORDER);
      const benchmark = compareToBenchmarks(state.footprint.totalKgPerYear);
      return { result: { ...benchmark }, summary: summarizeBenchmark(benchmark) };
    }
    case TOOL_NAMES.rankActions: {
      if (!state.lifestyle || !state.footprint) {
        return rejected(`Call ${TOOL_NAMES.calculateFootprint} first.`, OUT_OF_ORDER);
      }
      state.ranked = rankActions(state.lifestyle, state.footprint);
      return { result: { actions: state.ranked }, summary: summarizeRanking(state.ranked) };
    }
    case TOOL_NAMES.submitPlan: {
      if (!state.ranked) return rejected(`Call ${TOOL_NAMES.rankActions} first.`, OUT_OF_ORDER);
      const parsed = PlanNarrativeSchema.safeParse(call.args ?? {});
      if (!parsed.success) return rejected(firstIssue(parsed.error), 'Rejected invalid plan');
      const known = new Set(state.ranked.map((a) => a.id));
      const actions = parsed.data.actions.filter((a) => known.has(a.id));
      if (actions.length === 0) {
        return rejected(`Use action ids returned by ${TOOL_NAMES.rankActions}.`, 'Rejected unknown action ids');
      }
      state.narrative = { ...parsed.data, actions };
      return { result: { ok: true }, summary: summarizePlan(state.narrative) };
    }
    default:
      return rejected(`Unknown tool ${String(call.name)}.`, 'Rejected unknown tool');
  }
}
