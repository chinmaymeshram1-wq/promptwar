/** Pure helpers for serving the built app safely outside Vercel (Cloud Run, Docker, `npm start`). */
import { extname, resolve, sep } from 'node:path';

export interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

export const contentTypeFor = (path: string): string =>
  CONTENT_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream';

/**
 * Maps a URL path to a file inside `root`, or null if it would escape it (path traversal).
 * Directory-style and extension-less paths fall back to the SPA entry point.
 */
export function resolveStaticPath(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const relative = extname(decoded) ? decoded : '/index.html';
  const absoluteRoot = resolve(root);
  const target = resolve(absoluteRoot, `.${relative}`);
  return target === absoluteRoot || target.startsWith(absoluteRoot + sep) ? target : null;
}

/** Converts a vercel.json `source` such as "/assets/(.*)" into an anchored RegExp. */
export function sourceToRegExp(source: string): RegExp {
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${source.split('(.*)').map(escape).join('.*')}$`);
}

/** Headers for a path, applying every matching rule in order (later rules win), exactly like Vercel. */
export function headersForPath(rules: readonly HeaderRule[], path: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const rule of rules) {
    if (!sourceToRegExp(rule.source).test(path)) continue;
    for (const { key, value } of rule.headers) headers[key] = value;
  }
  return headers;
}
