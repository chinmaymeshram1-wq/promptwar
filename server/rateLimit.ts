/**
 * Fixed-window, in-memory rate limiter keyed by client IP.
 * Per serverless instance: a cheap first line of defence that bounds Gemini spend.
 * For multi-region production, swap the Map for a shared store (e.g. Firestore or Redis).
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export class RateLimiter {
  private readonly hits = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= this.windowMs) {
      if (this.hits.size >= this.maxKeys) this.evictExpired(now);
      this.hits.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: this.limit - 1, retryAfterSeconds: 0 };
    }
    if (entry.count >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil((entry.windowStart + this.windowMs - now) / 1000),
      };
    }
    entry.count++;
    return { allowed: true, remaining: this.limit - entry.count, retryAfterSeconds: 0 };
  }

  private evictExpired(now: number): void {
    for (const [key, entry] of this.hits) {
      if (now - entry.windowStart >= this.windowMs) this.hits.delete(key);
    }
    // Still full: drop the oldest entry (Map preserves insertion order) to bound memory.
    if (this.hits.size >= this.maxKeys) {
      const oldest = this.hits.keys().next().value;
      if (oldest !== undefined) this.hits.delete(oldest);
    }
  }
}
