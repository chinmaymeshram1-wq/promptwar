# Changelog

All notable changes to EcoPilot. Dates are 2026-10-23 (built during PromptWars).

## 1.1.0

### Added

- Google Cloud Run-ready container: multi-stage Dockerfile, standalone Node server with `/healthz`, graceful shutdown and shared security headers.
- End-to-end smoke test (`scripts/smoke.mjs`), run against the built container in CI and against the live site.
- Response cache (TTL + LRU, hashed keys): repeated plans are returned in milliseconds with no tokens spent.
- Gemini token accounting per plan, shown in the agent trace.
- Per-call 15 s timeout: a stuck Gemini call is cancelled and retried on the fallback model.
- Same-origin enforcement (403), `X-Request-Id` on every API response and log line, and Gemini safety settings.
- OpenAPI 3.1 specification, an architecture guide and contributing guidelines.

### Changed

- ESLint is now type-aware (`recommendedTypeChecked`, `stylisticTypeChecked`); all findings fixed.
- Fallback model is `gemini-3-flash-preview` (the `gemini-3.5-flash` free tier ran out of quota).

## 1.0.0

### Added

- Gemini function-calling agent with four deterministic tools, a deterministic fallback and demo mode.
- Dark-first accessible UI with Motion animations, Methodology page and agent timeline.
- Firebase Performance Monitoring and Analytics, started on first interaction.
- Strict CSP and security headers, Zod validation, rate limiting, body caps.
- CI with coverage floors, Dependabot, Vercel deployment.

### Fixed

- Removed the SDK retry loop that ignored the abort signal; benchmarked and pinned working models.
- Focus management with animated transitions; unlabelled icon buttons on phones.
