import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import vercel from '../vercel.json';
import { contentTypeFor, headersForPath, resolveStaticPath, sourceToRegExp } from '../server/static';

const ROOT = resolve('dist');

describe('resolveStaticPath', () => {
  it('maps asset paths inside the root', () => {
    expect(resolveStaticPath(ROOT, '/assets/app.js')).toBe(resolve(ROOT, 'assets/app.js'));
  });

  it('falls back to index.html for app routes', () => {
    expect(resolveStaticPath(ROOT, '/methodology')).toBe(resolve(ROOT, 'index.html'));
    expect(resolveStaticPath(ROOT, '/?utm=x')).toBe(resolve(ROOT, 'index.html'));
  });

  it.each(['/../package.json', '/..%2f..%2fpackage.json', '/assets/%2e%2e/%2e%2e/.env.js', '/a%00.js', '/%E0%A4%A.js'])(
    'refuses %s',
    (path) => {
      expect(resolveStaticPath(ROOT, path)).toBeNull();
    },
  );
});

describe('vercel.json header rules', () => {
  it('converts Vercel sources into anchored patterns', () => {
    expect(sourceToRegExp('/(.*)').test('/assets/x.js')).toBe(true);
    expect(sourceToRegExp('/assets/(.*)').test('/assets/x.js')).toBe(true);
    expect(sourceToRegExp('/assets/(.*)').test('/index.html')).toBe(false);
  });

  it('applies security headers everywhere and immutable caching to hashed assets', () => {
    const page = headersForPath(vercel.headers, '/');
    const asset = headersForPath(vercel.headers, '/assets/index-abc.js');
    expect(page['Content-Security-Policy']).toContain("default-src 'self'");
    expect(page['Cache-Control']).toBeUndefined();
    expect(asset['Content-Security-Policy']).toBeDefined();
    expect(asset['Cache-Control']).toContain('immutable');
  });

  it('never allows unsafe-inline or unsafe-eval in the CSP', () => {
    const csp = headersForPath(vercel.headers, '/')['Content-Security-Policy'];
    expect(csp).not.toMatch(/unsafe-(inline|eval)/);
  });
});

describe('contentTypeFor', () => {
  it.each([
    ['a.js', 'text/javascript; charset=utf-8'],
    ['a.CSS', 'text/css; charset=utf-8'],
    ['a.svg', 'image/svg+xml'],
    ['a.bin', 'application/octet-stream'],
  ])('%s -> %s', (file, type) => {
    expect(contentTypeFor(file)).toBe(type);
  });
});
