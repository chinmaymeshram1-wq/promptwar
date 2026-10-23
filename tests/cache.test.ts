import { describe, expect, it } from 'vitest';
import { cacheKey, TtlCache } from '../server/cache';

describe('TtlCache', () => {
  it('returns values until they expire', () => {
    const cache = new TtlCache<string>(10, 1000);
    cache.set('a', 'x', 0);
    expect(cache.get('a', 999)).toBe('x');
    expect(cache.get('a', 1000)).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the least recently used entry when full', () => {
    const cache = new TtlCache<number>(2, 60_000);
    cache.set('a', 1, 0);
    cache.set('b', 2, 0);
    cache.get('a', 1); // 'a' becomes most recent
    cache.set('c', 3, 2);
    expect(cache.get('b', 3)).toBeUndefined();
    expect(cache.get('a', 3)).toBe(1);
    expect(cache.get('c', 3)).toBe(3);
  });
});

describe('cacheKey', () => {
  it('ignores case and whitespace differences', () => {
    expect(cacheKey('  I drive   to WORK ')).toBe(cacheKey('i drive to work'));
  });

  it('hashes, so raw user text is never stored as a key', () => {
    const key = cacheKey('my private commute');
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain('commute');
  });
});
