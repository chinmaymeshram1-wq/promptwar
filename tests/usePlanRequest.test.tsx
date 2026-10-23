// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findDemoProfile, runDemo } from '../shared/demo';
import { usePlanRequest } from '../src/hooks/usePlanRequest';

const plan = runDemo(findDemoProfile('student_hostel')!, () => 0);
const demoRequest = { mode: 'demo', profileId: 'student_hostel' } as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('usePlanRequest', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => vi.stubGlobal('fetch', fetchMock));
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('moves from idle to loading to done and calls onStart', async () => {
    fetchMock.mockResolvedValue(json(plan));
    const onStart = vi.fn();
    const { result } = renderHook(() => usePlanRequest(onStart));
    expect(result.current.status.kind).toBe('idle');

    act(() => void result.current.submit(demoRequest));
    expect(result.current.status).toEqual({ kind: 'loading', mode: 'demo' });
    expect(onStart).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(result.current.status.kind).toBe('done'));
  });

  it.each([
    [503, true],
    [429, true],
    [400, false],
    [422, false],
  ])('maps HTTP %d to an error that suggests demo mode: %s', async (status, suggestDemo) => {
    fetchMock.mockResolvedValue(json({ error: 'Nope.' }, status));
    const { result } = renderHook(() => usePlanRequest());
    await act(() => result.current.submit(demoRequest));
    expect(result.current.status).toEqual({ kind: 'error', message: 'Nope.', suggestDemo });
  });

  it('cancels a superseded request so only the latest result is shown', async () => {
    const signals: AbortSignal[] = [];
    fetchMock.mockImplementation((_url, init) => {
      const signal = init!.signal!;
      signals.push(signal);
      return signals.length === 1
        ? new Promise((_, reject) =>
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
          )
        : Promise.resolve(json(plan));
    });
    const { result } = renderHook(() => usePlanRequest());

    act(() => void result.current.submit(demoRequest));
    await act(() => result.current.submit(demoRequest));

    expect(signals[0]!.aborted).toBe(true);
    expect(result.current.status.kind).toBe('done');
  });

  it('aborts the in-flight request on unmount', () => {
    let captured: AbortSignal | undefined;
    fetchMock.mockImplementation((_url, init) => {
      captured = init!.signal!;
      return new Promise(() => undefined);
    });
    const { result, unmount } = renderHook(() => usePlanRequest());
    act(() => void result.current.submit(demoRequest));
    unmount();
    expect(captured?.aborted).toBe(true);
  });
});
