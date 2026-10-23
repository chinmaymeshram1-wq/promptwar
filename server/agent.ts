/**
 * EcoPilot agent: a bounded Gemini function-calling loop.
 *
 * Gemini plans and explains; deterministic tools in /shared compute every number.
 * The prompt lives in ./agentPrompt and tool execution in ./agentTools; this module owns the loop:
 * turn budget, per-call timeouts, model fallback, token accounting and the final plan.
 */
import {
  FunctionCallingConfigMode,
  type Content,
  type FunctionCall,
  type GenerateContentParameters,
} from '@google/genai';
import { assemblePlan, deterministicNarrative } from '../shared/plan.js';
import type { AgentStep, PlanResponse, TokenUsage } from '../shared/schemas.js';
import { compareToBenchmarks, rankActions } from '../shared/tools.js';
import { FUNCTION_DECLARATIONS, SAFETY_SETTINGS, SYSTEM_INSTRUCTION, wrapUserText } from './agentPrompt.js';
import { executeTool, type AgentState } from './agentTools.js';

const MAX_TURNS = 6;
/** A single stuck model call is cancelled after this long and retried on the fallback model. */
const CALL_TIMEOUT_MS = 15_000;

/** Minimal surface of `GoogleGenAI['models']` the agent depends on (easy to fake in tests). */
export interface ModelClient {
  generateContent(params: GenerateContentParameters): Promise<ModelResponse>;
}

interface ModelResponse {
  functionCalls?: FunctionCall[];
  candidates?: { content?: Content }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
}

export interface AgentOptions {
  client: ModelClient;
  model: string;
  /** Used for the rest of the run if a call to `model` fails (quota, overload, timeout, retired model). */
  fallbackModel?: string;
  /** Whole-request budget; each call is additionally bounded by `callTimeoutMs`. */
  signal?: AbortSignal;
  now?: () => number;
  maxTurns?: number;
  callTimeoutMs?: number;
  /** Called with upstream model failures so the host can log them server-side (never sent to clients). */
  onModelError?: (error: unknown) => void;
}

/** Raised when the agent cannot produce any grounded result. The message is safe to show users. */
export class AgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentError';
  }
}

const emptyUsage = (): TokenUsage => ({ modelCalls: 0, promptTokens: 0, outputTokens: 0, totalTokens: 0 });

function recordUsage(usage: TokenUsage, response: ModelResponse): void {
  usage.modelCalls++;
  usage.promptTokens += response.usageMetadata?.promptTokenCount ?? 0;
  usage.outputTokens += response.usageMetadata?.candidatesTokenCount ?? 0;
  usage.totalTokens += response.usageMetadata?.totalTokenCount ?? 0;
}

/** Whichever comes first: the whole-request budget or this call's own timeout. */
const callSignal = (budget: AbortSignal | undefined, timeoutMs: number): AbortSignal =>
  budget ? AbortSignal.any([budget, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);

export async function runAgent(description: string, options: AgentOptions): Promise<PlanResponse> {
  const now = options.now ?? (() => performance.now());
  const maxTurns = options.maxTurns ?? MAX_TURNS;
  const callTimeoutMs = options.callTimeoutMs ?? CALL_TIMEOUT_MS;
  const startedAt = now();
  const state: AgentState = {};
  const steps: AgentStep[] = [];
  const usage = emptyUsage();
  const contents: Content[] = [{ role: 'user', parts: [{ text: wrapUserText(description) }] }];
  let model = options.model;
  let modelFailed = false;

  for (let turn = 0; turn < maxTurns && !state.narrative; turn++) {
    let response: ModelResponse;
    try {
      response = await options.client.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
          safetySettings: SAFETY_SETTINGS,
          abortSignal: callSignal(options.signal, callTimeoutMs),
        },
      });
    } catch (error) {
      options.onModelError?.(error);
      if (options.fallbackModel && model !== options.fallbackModel && !options.signal?.aborted) {
        model = options.fallbackModel;
        turn--; // Retry this turn once on the fallback model.
        continue;
      }
      modelFailed = true;
      break;
    }

    recordUsage(usage, response);
    const calls = response.functionCalls ?? [];
    if (calls.length === 0) break;

    // Keep the model's own content (including thought signatures) so the next turn has full context.
    contents.push(
      response.candidates?.[0]?.content ?? { role: 'model', parts: calls.map((functionCall) => ({ functionCall })) },
    );
    contents.push({
      role: 'user',
      parts: calls.map((call) => {
        const t0 = now();
        const { result, summary } = executeTool(call, state);
        steps.push({
          tool: call.name ?? 'unknown',
          summary,
          ok: !('error' in result),
          durationMs: Math.round(now() - t0),
        });
        return { functionResponse: { id: call.id, name: call.name, response: result } };
      }),
    });
  }

  if (!state.lifestyle || !state.footprint) {
    throw new AgentError(
      modelFailed
        ? 'The AI service is unavailable right now. Try again shortly, or use Demo mode.'
        : 'Could not understand that description. Mention how you travel, your electricity use or your diet.',
    );
  }

  const ranked = state.ranked ?? rankActions(state.lifestyle, state.footprint);
  const narrative =
    state.narrative ??
    deterministicNarrative(state.footprint, compareToBenchmarks(state.footprint.totalKgPerYear), ranked);

  return assemblePlan({
    source: state.narrative ? 'gemini' : 'fallback',
    model,
    lifestyle: state.lifestyle,
    footprint: state.footprint,
    ranked,
    narrative,
    steps,
    usage,
    startedAt,
    now,
  });
}
