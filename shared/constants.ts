/** Dependency-free constants shared by the browser bundle and the server. */

/** Hard limits that bound cost, latency and abuse surface. */
export const LIMITS = {
  descriptionMinChars: 10,
  descriptionMaxChars: 1200,
  maxTransportEntries: 10,
  maxKmPerWeek: 20_000,
  maxKwhPerMonth: 10_000,
  maxLpgCylindersPerMonth: 10,
  maxWasteKgPerWeek: 500,
  maxActions: 6,
} as const;

export const CATEGORIES = ['transport', 'electricity', 'cooking', 'food', 'waste'] as const;
export type Category = (typeof CATEGORIES)[number];
