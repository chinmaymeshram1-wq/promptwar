/** Adapts Web-standard Request/Response (Vercel Functions) to the framework-agnostic handler. */
import { randomUUID } from 'node:crypto';
import { TtlCache } from './cache.js';
import { createGeminiFromEnv } from './gemini.js';
import { handlePlanRequest, MAX_BODY_BYTES, type HandlerDeps } from './handler.js';
import { RateLimiter } from './rateLimit.js';

const RATE_LIMIT_PER_MINUTE = 8;
const CACHE_ENTRIES = 200;
const CACHE_TTL_MS = 15 * 60_000;

let deps: HandlerDeps | undefined;

/** Lazily built once per warm instance, so the SDK client and limiter are reused across requests. */
export function getDeps(): HandlerDeps {
  deps ??= {
    ...createGeminiFromEnv(),
    limiter: new RateLimiter(RATE_LIMIT_PER_MINUTE, 60_000),
    cache: new TtlCache(CACHE_ENTRIES, CACHE_TTL_MS),
    log: (event) => console.info(JSON.stringify(event)),
  };
  return deps;
}

export function clientIpFrom(headers: Headers): string {
  return headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export async function handleWebRequest(request: Request, handlerDeps: HandlerDeps = getDeps()): Promise<Response> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  const rawBody = declaredLength > MAX_BODY_BYTES ? 'x'.repeat(MAX_BODY_BYTES + 1) : await request.text();
  const requestId = request.headers.get('x-vercel-id') ?? randomUUID();
  const result = await handlePlanRequest(
    {
      method: request.method,
      contentType: request.headers.get('content-type') ?? undefined,
      clientIp: clientIpFrom(request.headers),
      rawBody,
      origin: request.headers.get('origin') ?? undefined,
      host: request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? undefined,
      requestId,
    },
    handlerDeps,
  );
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Request-Id': requestId,
      ...result.headers,
    },
  });
}
