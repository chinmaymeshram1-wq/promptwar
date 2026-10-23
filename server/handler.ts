/**
 * Framework-agnostic request handling for POST /api/plan.
 * Used by the Vercel function (api/plan.ts) and the Vite dev server, and unit-tested directly.
 */
import { findDemoProfile, runDemo } from '../shared/demo.js';
import { PlanRequestSchema, type ApiError, type PlanResponse } from '../shared/schemas.js';
import { AgentError, runAgent, type ModelClient } from './agent.js';
import type { RateLimiter } from './rateLimit.js';

export const MAX_BODY_BYTES = 4 * 1024;
export const AGENT_TIMEOUT_MS = 25_000;

export interface HandlerRequest {
  method: string | undefined;
  contentType: string | undefined;
  clientIp: string;
  rawBody: string;
}

export interface HandlerResponse {
  status: number;
  body: PlanResponse | ApiError;
  headers?: Record<string, string>;
}

export interface HandlerDeps {
  /** Null when no API key is configured; agent mode then answers 503 and demo mode still works. */
  client: ModelClient | null;
  model: string;
  limiter: RateLimiter;
  log?: (event: Record<string, unknown>) => void;
}

const error = (status: number, message: string, headers?: Record<string, string>): HandlerResponse => ({
  status,
  body: { error: message },
  headers,
});

export async function handlePlanRequest(req: HandlerRequest, deps: HandlerDeps): Promise<HandlerResponse> {
  if (req.method !== 'POST') return error(405, 'Method not allowed.', { Allow: 'POST' });
  if (!req.contentType?.toLowerCase().startsWith('application/json')) {
    return error(415, 'Content-Type must be application/json.');
  }
  if (Buffer.byteLength(req.rawBody, 'utf8') > MAX_BODY_BYTES) return error(413, 'Request body too large.');

  let json: unknown;
  try {
    json = JSON.parse(req.rawBody);
  } catch {
    return error(400, 'Body must be valid JSON.');
  }
  const parsed = PlanRequestSchema.safeParse(json);
  if (!parsed.success) return error(400, parsed.error.issues[0]?.message ?? 'Invalid request.');
  const request = parsed.data;

  if (request.mode === 'demo') {
    const profile = findDemoProfile(request.profileId);
    if (!profile) return error(404, 'Unknown demo profile.');
    return { status: 200, body: runDemo(profile) };
  }

  const limit = deps.limiter.check(req.clientIp);
  if (!limit.allowed) {
    return {
      status: 429,
      body: { error: 'Too many requests. Please wait a moment.', retryAfterSeconds: limit.retryAfterSeconds },
      headers: { 'Retry-After': String(limit.retryAfterSeconds) },
    };
  }
  if (!deps.client) return error(503, 'AI mode is not configured on this deployment. Try Demo mode.');

  try {
    const plan = await runAgent(request.description, {
      client: deps.client,
      model: deps.model,
      signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
      onModelError: (error) =>
        deps.log?.({
          event: 'model_error',
          model: deps.model,
          // Upstream messages can be long; status and a trimmed message are enough to diagnose.
          message: error instanceof Error ? error.message.slice(0, 300) : 'unknown',
        }),
    });
    deps.log?.({ event: 'plan', source: plan.source, steps: plan.steps.length, latencyMs: plan.latencyMs });
    return { status: 200, body: plan, headers: { 'X-RateLimit-Remaining': String(limit.remaining) } };
  } catch (err) {
    if (err instanceof AgentError) return error(422, err.message);
    // Never leak internals (stack traces, upstream messages) to the client.
    deps.log?.({ event: 'error', message: err instanceof Error ? err.message : 'unknown' });
    return error(500, 'Something went wrong. Please try again.');
  }
}
