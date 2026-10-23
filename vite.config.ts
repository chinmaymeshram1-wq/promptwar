/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import type * as HttpModule from './server/http.js';
import type * as NodeModule from './server/node.js';

/** Serves /api/plan during `npm run dev` with the same handler Vercel and Cloud Run use in production. */
function localApi(): Plugin {
  return {
    name: 'ecopilot-local-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''));
      server.middlewares.use('/api/plan', (req, res) => {
        const respond = async () => {
          const { handleWebRequest } = (await server.ssrLoadModule('/server/http.ts')) as typeof HttpModule;
          const { toWebRequest, sendWebResponse } = (await server.ssrLoadModule(
            '/server/node.ts',
          )) as typeof NodeModule;
          // Connect strips the mount path, so restore it for the Request URL.
          req.url = `/api/plan${req.url === '/' ? '' : (req.url ?? '')}`;
          await sendWebResponse(await handleWebRequest(await toWebRequest(req)), res);
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

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), localApi()],
  build: {
    target: 'es2022',
    sourcemap: false,
    // The server bundle (npm run build:server) does not need the static public/ files.
    copyPublicDir: !isSsrBuild,
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['shared/**', 'server/**', 'src/**'],
      // Process entry points are exercised by the container smoke test in CI, not unit tests.
      exclude: ['src/main.tsx', 'server/standalone.ts', '**/*.d.ts'],
      reporter: ['text', 'html', 'json-summary'],
      // CI fails if coverage drops below these floors.
      thresholds: { statements: 85, branches: 75, functions: 85, lines: 85 },
    },
  },
}));
