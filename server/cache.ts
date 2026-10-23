/**
 * Small in-memory TTL + LRU cache for agent plans.
 * Identical descriptions (after normalisation) are answered without another Gemini call,
 * which cuts latency to milliseconds and spends no tokens. Per serverless instance, like the rate limiter.
 */
import { createHash } from 'node:crypto';

export class TtlCache<T> {
  private readonly entries = new Map<string, { value: T; expiresAt: number }>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    // Refresh recency: Map iteration order doubles as the LRU order.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, now = Date.now()): void {
    this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
  }

  get size(): number {
    return this.entries.size;
  }
}

/** Case- and whitespace-insensitive key; hashed so raw user text is never kept as a map key. */
export function cacheKey(description: string): string {
  const normalised = description.trim().toLowerCase().replace(/\s+/g, ' ');
  return createHash('sha256').update(normalised).digest('hex');
}
