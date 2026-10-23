import type { IncomingMessage, ServerResponse } from 'node:http';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { readBody, sendJsonError, sendWebResponse, toWebRequest } from '../server/node';

function fakeRequest(method: string, body: string, headers: Record<string, string> = {}): IncomingMessage {
  const stream = new PassThrough();
  Object.assign(stream, { method, url: '/api/plan', headers: { host: 'app.test', ...headers } });
  queueMicrotask(() => stream.end(body));
  return stream as unknown as IncomingMessage;
}

function fakeResponse() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 0,
    body: '',
    setHeader: (key: string, value: string) => (headers[key.toLowerCase()] = value),
    end: (chunk?: string) => (res.body = chunk ?? ''),
  };
  return { res: res as unknown as ServerResponse & { body: string }, headers };
}

describe('node adapters', () => {
  it('converts a Node request into a Web Request without hop-by-hop headers', async () => {
    const request = await toWebRequest(
      fakeRequest('POST', '{"a":1}', { 'content-type': 'application/json', connection: 'keep-alive' }),
    );
    expect(request.url).toBe('http://app.test/api/plan');
    expect(request.headers.get('content-type')).toBe('application/json');
    expect(request.headers.has('connection')).toBe(false);
    expect(await request.text()).toBe('{"a":1}');
  });

  it('stops reading oversized bodies early', async () => {
    const body = await readBody(fakeRequest('POST', 'x'.repeat(100)), 10);
    expect(body.length).toBeGreaterThan(10);
  });

  it('writes a Web Response, merging extra headers', async () => {
    const { res, headers } = fakeResponse();
    await sendWebResponse(new Response('{"ok":true}', { status: 201, headers: { 'X-A': '1' } }), res, { 'X-B': '2' });
    expect(res.statusCode).toBe(201);
    expect(headers).toMatchObject({ 'x-a': '1', 'x-b': '2' });
    expect(res.body).toBe('{"ok":true}');
  });

  it('writes JSON errors', () => {
    const { res, headers } = fakeResponse();
    sendJsonError(res, 404, 'Not found.');
    expect(res.statusCode).toBe(404);
    expect(headers['content-type']).toContain('application/json');
    expect(JSON.parse(res.body)).toEqual({ error: 'Not found.' });
  });
});
