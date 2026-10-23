/**
 * Production Node server for Google Cloud Run (or any container host).
 * Serves the built SPA from ./dist and POST /api/plan with the same handler as Vercel.
 * Security headers are read from vercel.json, so both deployments share one source of truth.
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { handleWebRequest } from './http.js';
import { sendJsonError, sendWebResponse, toWebRequest } from './node.js';
import { contentTypeFor, headersForPath, resolveStaticPath, type HeaderRule } from './static.js';

const PORT = Number(process.env.PORT ?? 8080);
const ROOT = resolve(process.env.STATIC_ROOT ?? 'dist');
const { headers: rules } = JSON.parse(await readFile('vercel.json', 'utf8')) as { headers: HeaderRule[] };

const server = createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0] ?? '/';
  const securityHeaders = headersForPath(rules, path);

  const respond = async () => {
    if (path === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');
      return;
    }
    if (path === '/api/plan') {
      await sendWebResponse(await handleWebRequest(await toWebRequest(req)), res, securityHeaders);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJsonError(res, 405, 'Method not allowed.');
      return;
    }
    const file = resolveStaticPath(ROOT, path);
    if (!file) {
      sendJsonError(res, 400, 'Bad path.');
      return;
    }
    const body = await readFile(file).catch(() => null);
    if (!body) {
      sendJsonError(res, 404, 'Not found.');
      return;
    }
    res.writeHead(200, { ...securityHeaders, 'Content-Type': contentTypeFor(file) });
    res.end(req.method === 'HEAD' ? undefined : body);
  };

  respond().catch((error: unknown) => {
    console.error(JSON.stringify({ event: 'server_error', message: String(error) }));
    if (!res.headersSent) sendJsonError(res, 500, 'Something went wrong. Please try again.');
  });
});

server.listen(PORT, () => console.info(JSON.stringify({ event: 'listening', port: PORT })));

// Cloud Run sends SIGTERM before stopping an instance; finish in-flight requests first.
process.on('SIGTERM', () => server.close(() => process.exit(0)));
