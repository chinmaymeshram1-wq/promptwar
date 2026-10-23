import { describe, expect, it } from 'vitest';
import { RateLimiter } from '../server/rateLimit';

describe('RateLimiter', () => {
  it('allows up to the limit within a window, then blocks', () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.check('a', 0).allowed).toBe(true);
    expect(limiter.check('a', 10).remaining).toBe(0);
    const blocked = limiter.check('a', 20);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
  });

  it('resets after the window', () => {
    const limiter = new RateLimiter(1, 1000);
    limiter.check('a', 0);
    expect(limiter.check('a', 1000).allowed).toBe(true);
  });

  it('tracks keys independently', () => {
    const limiter = new RateLimiter(1, 1000);
    limiter.check('a', 0);
    expect(limiter.check('b', 0).allowed).toBe(true);
  });

  it('bounds memory by evicting old keys', () => {
    const limiter = new RateLimiter(1, 1000, 2);
    limiter.check('a', 0);
    limiter.check('b', 0);
    limiter.check('c', 0);
    // 'a' was evicted, so it gets a fresh window.
    expect(limiter.check('a', 1).allowed).toBe(true);
  });
});
