import { describe, expect, it } from 'vitest';
import { initTelemetry, parseFirebaseConfig, trackPlan } from '../src/telemetry';
import { findDemoProfile, runDemo } from '../shared/demo';

const VALID = JSON.stringify({ apiKey: 'k', projectId: 'p', appId: 'a' });

describe('telemetry', () => {
  it('parses a complete Firebase web config', () => {
    expect(parseFirebaseConfig(VALID)).toMatchObject({ projectId: 'p' });
  });

  it.each([undefined, '', '{not json', JSON.stringify({ apiKey: 'k' })])('treats %o as disabled', (raw) => {
    expect(parseFirebaseConfig(raw)).toBeNull();
  });

  it('stays disabled without config and tracking is a safe no-op', async () => {
    await expect(initTelemetry(undefined)).resolves.toBe(false);
    expect(() => trackPlan(runDemo(findDemoProfile('city_commuter')!, () => 0))).not.toThrow();
  });
});
