/** Node `http` <-> Web `Request`/`Response` adapters shared by the Vite dev server and the standalone server. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { MAX_BODY_BYTES } from './handler.js';

/** Reads a request body, stopping early once it exceeds the API limit (the handler then answers 413). */
export function readBody(req: IncomingMessage, limit = MAX_BODY_BYTES): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      data += chunk;
      if (data.length > limit) {
        req.removeAllListeners('data');
        resolve(data);
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/** Connection-level headers that must not be forwarded into a new Request. */
const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade']);

export async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (HOP_BY_HOP.has(key)) continue;
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(`http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`, {
    method: req.method,
    headers,
    body: hasBody ? await readBody(req) : undefined,
  });
}

export async function sendWebResponse(
  response: Response,
  res: ServerResponse,
  extraHeaders: Record<string, string> = {},
) {
  res.statusCode = response.status;
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(await response.text());
}

export function sendJsonError(res: ServerResponse, status: number, message: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: message }));
}
