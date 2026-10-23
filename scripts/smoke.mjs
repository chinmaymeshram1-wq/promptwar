#!/usr/bin/env node
/**
 * End-to-end smoke test against a running deployment (container, `npm start`, or the live site).
 * Usage: node scripts/smoke.mjs <baseUrl> [--container]
 *   --container  also checks /healthz (served by the standalone/Cloud Run server, not Vercel)
 * Exits non-zero on the first failed check, so it can gate CI.
 */
const [base = 'http://localhost:8080', ...flags] = process.argv.slice(2);
const container = flags.includes('--container');
const origin = new URL(base).origin;

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};

const post = (body, headers = {}) =>
  fetch(`${base}/api/plan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

if (container) {
  const health = await fetch(`${base}/healthz`);
  check('GET /healthz returns 200', health.status === 200);
}

const page = await fetch(`${base}/`);
const html = await page.text();
const csp = page.headers.get('content-security-policy') ?? '';
check('GET / serves the app', page.status === 200 && html.includes('<div id="root">'));
check('CSP is present and strict', csp.includes("default-src 'self'") && !/unsafe-(inline|eval)/.test(csp));
check('X-Frame-Options is DENY', page.headers.get('x-frame-options') === 'DENY');
check('X-Content-Type-Options is nosniff', page.headers.get('x-content-type-options') === 'nosniff');

const asset = html.match(/\/assets\/[^"]+\.js/)?.[0];
if (asset) {
  const res = await fetch(`${base}${asset}`);
  check('hashed assets are cached immutably', (res.headers.get('cache-control') ?? '').includes('immutable'));
}

const demo = await post({ mode: 'demo', profileId: 'city_commuter' });
const plan = await demo.json();
check('demo plan returns 200', demo.status === 200, `status ${demo.status}`);
check('demo plan has ranked actions', plan.source === 'demo' && plan.actions?.length > 0);
check('API responses carry a request id', Boolean(demo.headers.get('x-request-id')));

check(
  'cross-origin POST is rejected',
  (await post({ mode: 'demo', profileId: 'city_commuter' }, { origin: 'https://evil.example' })).status === 403,
);
check('wrong content type is rejected', (await post('x', { 'content-type': 'text/plain' })).status === 415);
check('malformed JSON is rejected', (await post('{oops')).status === 400);
check('unknown fields cannot select a mode', (await post({ mode: 'admin' })).status === 400);
check('oversized bodies are rejected', (await post({ mode: 'agent', description: 'x'.repeat(5000) })).status === 413);

console.log(failures ? `\n${failures} check(s) failed` : '\nAll smoke checks passed');
process.exit(failures ? 1 : 0);
