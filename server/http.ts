/** Adapts Web-standard Request/Response (Vercel Functions) to the framework-agnostic handler. */
import { createGeminiFromEnv } from './gemini.js';
import { handlePlanRequest, MAX_BODY_BYTES, type HandlerDeps } from './handler.js';
import { RateLimiter } from './rateLimit.js';

const RATE_LIMIT_PER_MINUTE = 8;

let deps: HandlerDeps | undefined;

/** Lazily built once per warm instance, so the SDK client and limiter are reused across requests. */
export function getDeps(): HandlerDeps {
  if (!deps) {
    deps = {
      ...createGeminiFromEnv(),
      limiter: new RateLimiter(RATE_LIMIT_PER_MINUTE, 60_000),
      log: (event) => console.info(JSON.stringify(event)),
    };
  }
  return deps;
}

export function clientIpFrom(headers: Headers): string {
  return headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export async function handleWebRequest(request: Request, handlerDeps: HandlerDeps = getDeps()): Promise<Response> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  const rawBody = declaredLength > MAX_BODY_BYTES ? 'x'.repeat(MAX_BODY_BYTES + 1) : await request.text();
  const result = await handlePlanRequest(
    {
      method: request.method,
      contentType: request.headers.get('content-type') ?? undefined,
      clientIp: clientIpFrom(request.headers),
      rawBody,
    },
    handlerDeps,
  );
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...result.headers,
    },
  });
}
