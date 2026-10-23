# Contributing to EcoPilot

## Setup

```bash
npm ci
cp .env.example .env.local   # GEMINI_API_KEY is optional; demo mode works without it
npm run dev                  # http://localhost:5173
```

## Before you open a pull request

```bash
npm run check      # type-aware lint + type-check + tests
npm run coverage   # must stay above the floors in vite.config.ts
npm run build && npm run build:server
```

CI runs the same steps, then builds the Docker image and runs [`scripts/smoke.mjs`](scripts/smoke.mjs) against it.

## Conventions

- **Numbers come from tools, never from the model.** New calculations go in `shared/tools.ts` with tests and a cited factor in `shared/factors.ts`.
- **Validate at every boundary** with the Zod schemas in `shared/schemas.ts`.
- **Accessibility is a requirement:** semantic HTML, labelled controls, visible focus, and axe checks in `tests/app.test.tsx` must pass.
- **Keep secrets server-side.** Never prefix a secret with `VITE_`.
- Formatting is Prettier; commits use imperative, conventional-style subjects (`feat:`, `fix:`, `docs:`).

## Reporting security issues

See [SECURITY.md](SECURITY.md).
