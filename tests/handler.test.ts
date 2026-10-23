import { describe, expect, it, vi } from 'vitest';
import type { ModelClient } from '../server/agent';
import { handlePlanRequest, MAX_BODY_BYTES, type HandlerDeps, type HandlerRequest } from '../server/handler';
import { clientIpFrom, handleWebRequest } from '../server/http';
import { RateLimiter } from '../server/rateLimit';
import { DEMO_PROFILES } from '../shared/demo';
import type { PlanResponse } from '../shared/schemas';

const request = (overrides: Partial<HandlerRequest> = {}): HandlerRequest => ({
  method: 'POST',
  contentType: 'application/json',
  clientIp: '1.2.3.4',
  rawBody: JSON.stringify({ mode: 'demo', profileId: 'city_commuter' }),
  ...overrides,
});

const deps = (overrides: Partial<HandlerDeps> = {}): HandlerDeps => ({
  client: null,
  model: 'test-model',
  limiter: new RateLimiter(5, 60_000),
  ...overrides,
});

const agentBody = JSON.stringify({ mode: 'agent', description: 'I drive 20 km a day to the office.' });

describe('handlePlanRequest: protocol hardening', () => {
  it.each([
    [{ method: 'GET' }, 405],
    [{ contentType: 'text/plain' }, 415],
    [{ contentType: undefined }, 415],
    [{ rawBody: 'x'.repeat(MAX_BODY_BYTES + 1) }, 413],
    [{ rawBody: '{not json' }, 400],
    [{ rawBody: JSON.stringify({ mode: 'agent', description: 'short' }) }, 400],
    [{ rawBody: JSON.stringify({ mode: 'agent', description: 'x'.repeat(5000) }) }, 413],
    [{ rawBody: JSON.stringify({ mode: 'admin' }) }, 400],
    [{ rawBody: JSON.stringify({ mode: 'demo', profileId: '../../etc/passwd' }) }, 400],
    [{ rawBody: JSON.stringify({ mode: 'demo', profileId: 'nobody' }) }, 404],
  ])('rejects %o with %d', async (overrides, status) => {
    const res = await handlePlanRequest(request(overrides), deps());
    expect(res.status).toBe(status);
    expect(res.body).toHaveProperty('error');
  });
});

describe('handlePlanRequest: modes', () => {
  it.each(DEMO_PROFILES.map((p) => p.id))('serves demo profile %s without any model', async (profileId) => {
    const res = await handlePlanRequest(request({ rawBody: JSON.stringify({ mode: 'demo', profileId }) }), deps());
    expect(res.status).toBe(200);
    const plan = res.body as PlanResponse;
    expect(plan.source).toBe('demo');
    expect(plan.actions.length).toBeGreaterThan(0);
    expect(plan.steps).toHaveLength(4);
  });

  it('answers 503 for agent mode when no API key is configured', async () => {
    const res = await handlePlanRequest(request({ rawBody: agentBody }), deps());
    expect(res.status).toBe(503);
  });

  it('rate-limits agent mode per client IP', async () => {
    const limited = deps({ limiter: new RateLimiter(1, 60_000) });
    await handlePlanRequest(request({ rawBody: agentBody }), limited);
    const res = await handlePlanRequest(request({ rawBody: agentBody }), limited);
    expect(res.status).toBe(429);
    expect(res.headers?.['Retry-After']).toBeDefined();
    const other = await handlePlanRequest(request({ rawBody: agentBody, clientIp: '9.9.9.9' }), limited);
    expect(other.status).toBe(503);
  });

  it('maps unexpected agent failures to a generic 500', async () => {
    const log = vi.fn();
    const client: ModelClient = {
      generateContent: async () => ({
        functionCalls: [{ name: 'calculate_footprint', args: { transport: [{ mode: 'bus', kmPerWeek: 10 }] } }],
        get candidates(): never {
          throw new Error('secret internal detail');
        },
      }),
    };
    const res = await handlePlanRequest(request({ rawBody: agentBody }), deps({ client, log }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secret');
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ event: 'error' }));
  });
});

describe('handleWebRequest', () => {
  it('returns JSON with no-store caching', async () => {
    const res = await handleWebRequest(
      new Request('http://localhost/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'demo', profileId: 'student_hostel' }),
      }),
      deps(),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('rejects oversized bodies from the declared length before reading them', async () => {
    const res = await handleWebRequest(
      new Request('http://localhost/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': String(MAX_BODY_BYTES * 10) },
        body: '{}',
      }),
      deps(),
    );
    expect(res.status).toBe(413);
  });

  it('derives the client IP from proxy headers', () => {
    expect(clientIpFrom(new Headers({ 'x-forwarded-for': '5.6.7.8, 10.0.0.1' }))).toBe('5.6.7.8');
    expect(clientIpFrom(new Headers({ 'x-real-ip': '1.1.1.1' }))).toBe('1.1.1.1');
    expect(clientIpFrom(new Headers())).toBe('unknown');
  });
});
