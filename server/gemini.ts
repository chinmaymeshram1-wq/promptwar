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
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 20_000 } });
  return { client: ai.models, model };
}
