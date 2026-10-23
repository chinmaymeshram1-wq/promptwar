# Security Policy

## Reporting a vulnerability

Please open a private security advisory on this repository (Security → Advisories → Report a vulnerability).
Do not file public issues for security problems.

## Threat model and controls

| Threat                                | Control                                                                                                                                                                                              | Where                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| API key exposure                      | Key read only from server env (`GEMINI_API_KEY`, never `VITE_`-prefixed); browser calls our own `/api/plan`                                                                                          | `server/gemini.ts`                         |
| Prompt injection fabricating results  | User text wrapped in delimiters and labelled untrusted; numeric tools take **no numbers from the model** (they read server-side state); action ids filtered against tool output                      | `server/agent.ts`                          |
| Malformed or malicious tool arguments | Every tool call validated with Zod (enums, ranges, lengths); errors returned to the model, never thrown                                                                                              | `server/agent.ts`, `shared/schemas.ts`     |
| Runaway cost / denial of wallet       | Per-IP rate limit (8/min), 6-turn agent budget, 45 s abort timeout, 1,200-char input cap, 4 KB body cap                                                                                              | `server/handler.ts`, `server/rateLimit.ts` |
| Information leakage                   | Generic 500 messages; internal errors logged server-side only; `Cache-Control: no-store` on API responses                                                                                            | `server/handler.ts`                        |
| XSS / clickjacking / sniffing         | Strict CSP (`default-src 'self'`, `frame-ancestors 'none'`), HSTS, `nosniff`, `X-Frame-Options: DENY`, restrictive Permissions-Policy; React escapes all rendered text, no `dangerouslySetInnerHTML` | `vercel.json`                              |
| Vulnerable dependencies               | `npm audit --audit-level=high` gate in CI; minimal runtime deps (react, @google/genai, zod)                                                                                                          | `.github/workflows/ci.yml`                 |

## Third-party data

Firebase Analytics and Performance Monitoring receive only aggregate fields (plan source, latency, counts, rating band) and standard page-performance traces, never the text a user types. The CSP allows only the specific Google endpoints Firebase needs. Firebase web config is public by design; it is supplied by environment variable so each deployment is configurable and no key-shaped strings live in source.

## Known limitations

- The rate limiter is in-memory per serverless instance. For multi-region production use a shared store
  (for example Firestore or Redis).
- No user accounts or personal data are stored. Descriptions are sent to the Gemini API for processing only.
