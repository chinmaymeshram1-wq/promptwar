/** Vercel Function: POST /api/plan. Other methods receive 405 from the platform. */
import { handleWebRequest } from '../server/http.js';

export const maxDuration = 60;

export function POST(request: Request): Promise<Response> {
  return handleWebRequest(request);
}
