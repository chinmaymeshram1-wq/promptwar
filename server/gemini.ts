import { GoogleGenAI } from '@google/genai';
import type { ModelClient } from './agent.js';

/** `gemini-flash-latest` tracks Google's current Flash model; pin a version with GEMINI_MODEL if needed. */
export const DEFAULT_MODEL = 'gemini-flash-latest';

export interface GeminiConfig {
  client: ModelClient | null;
  model: string;
}

/** Reads configuration from the server environment only. The key never reaches the browser bundle. */
export function createGeminiFromEnv(env: Record<string, string | undefined> = process.env): GeminiConfig {
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  if (!apiKey) return { client: null, model };
  // No httpOptions.timeout: the SDK maps it to an X-Server-Timeout header, which made Gemini abandon
  // slower tool-calling turns with 504 DEADLINE_EXCEEDED. The per-request AbortSignal in handler.ts
  // still bounds total latency. Transient 429/5xx responses get one quick retry.
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      retryOptions: { attempts: 2, initialDelay: 400, maxDelay: 1500, httpStatusCodes: [429, 500, 503, 504] },
    },
  });
  return { client: ai.models, model };
}
