import { GoogleGenAI } from '@google/genai';
import type { ModelClient } from './agent.js';

/**
 * Models chosen by benchmarking the full 4-turn agent on the Gemini API:
 * - gemini-3.1-flash-lite: about 6 s end to end, generous free-tier quota. Default.
 * - gemini-3-flash-preview: fast (about 1 s per call) with separate quota. Used as the fallback when the
 *   primary model fails, so one provider hiccup does not fail the request.
 * gemini-3.5-flash wrote richer plans but its free-tier quota ran out quickly (429), so it is opt-in.
 * The moving `gemini-flash-latest` alias hung on tool calls, and 2.5 models return 404 for new keys.
 */
export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
export const DEFAULT_FALLBACK_MODEL = 'gemini-3-flash-preview';

export interface GeminiConfig {
  client: ModelClient | null;
  model: string;
  fallbackModel: string;
}

/** Reads configuration from the server environment only. The key never reaches the browser bundle. */
export function createGeminiFromEnv(env: Record<string, string | undefined> = process.env): GeminiConfig {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const fallbackModel = env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL;
  if (!apiKey) return { client: null, model, fallbackModel };
  // No httpOptions.timeout (it becomes an X-Server-Timeout header that made Gemini abandon tool turns with
  // 504s) and no SDK retryOptions (its retry loop ignored the AbortSignal and could hang the function).
  // Latency is bounded by the per-request AbortSignal; resilience comes from the agent's model fallback.
  const ai = new GoogleGenAI({ apiKey });
  return { client: ai.models, model, fallbackModel };
}
