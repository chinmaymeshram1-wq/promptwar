/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import type * as HttpModule from './server/http.js';

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

/** Serves /api/plan during `npm run dev` with the same handler Vercel runs in production. */
function localApi(): Plugin {
  return {
    name: 'ecopilot-local-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''));
      server.middlewares.use('/api/plan', (req, res) => {
        const respond = async () => {
          const { handleWebRequest } = (await server.ssrLoadModule('/server/http.ts')) as typeof HttpModule;
          const body = req.method === 'POST' ? await readBody(req) : undefined;
          const response = await handleWebRequest(
            new Request(`http://localhost${req.url ?? ''}`, {
              method: req.method,
              headers: req.headers as Record<string, string>,
              body,
            }),
          );
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        };
        // Never leave a request hanging: unexpected failures become a JSON 500.
        respond().catch((error: unknown) => {
          server.config.logger.error(`/api/plan failed: ${String(error)}`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Something went wrong. Please try again.' }));
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['shared/**', 'server/**', 'src/**'],
      exclude: ['src/main.tsx', '**/*.d.ts'],
      reporter: ['text', 'html', 'json-summary'],
      // CI fails if coverage drops below these floors.
      thresholds: { statements: 85, branches: 75, functions: 85, lines: 85 },
    },
  },
});
