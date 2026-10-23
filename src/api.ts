import type { ApiError, PlanRequest, PlanResponse } from '../shared/schemas';

export class PlanRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'PlanRequestError';
  }
}

const isApiError = (value: unknown): value is ApiError =>
  typeof value === 'object' && value !== null && typeof (value as ApiError).error === 'string';

export async function requestPlan(
  body: PlanRequest,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<PlanResponse> {
  let response: Response;
  try {
    response = await fetchImpl('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new PlanRequestError('Network error. Check your connection and try again.', 0);
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new PlanRequestError(isApiError(data) ? data.error : `Request failed (${response.status}).`, response.status);
  }
  return data as PlanResponse;
}
