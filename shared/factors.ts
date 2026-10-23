/**
 * Emission factors used by every calculation in EcoPilot.
 *
 * Numbers live in code (not in the LLM) so results are reproducible,
 * auditable and testable. Each factor cites its public source.
 */

export const TRANSPORT_MODES = [
  'car_petrol',
  'car_diesel',
  'car_cng',
  'car_ev',
  'motorbike',
  'auto_rickshaw',
  'bus',
  'metro_train',
  'flight',
  'bicycle_walk',
] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

/** kg CO2e per passenger-km. Source: UK DESNZ/DEFRA GHG conversion factors 2024; EV & auto adjusted to India grid (CEA). */
export const TRANSPORT_FACTORS: Record<TransportMode, number> = {
  car_petrol: 0.164,
  car_diesel: 0.168,
  car_cng: 0.135,
  car_ev: 0.083,
  motorbike: 0.114,
  auto_rickshaw: 0.075,
  bus: 0.097,
  metro_train: 0.035,
  flight: 0.153,
  bicycle_walk: 0,
};

export const DIETS = ['heavy_meat', 'medium_meat', 'low_meat', 'pescatarian', 'vegetarian', 'vegan'] as const;
export type Diet = (typeof DIETS)[number];

/** kg CO2e per person per day. Source: Scarborough et al. (2014), Climatic Change 125:179–192. */
export const DIET_FACTORS: Record<Diet, number> = {
  heavy_meat: 7.19,
  medium_meat: 5.63,
  low_meat: 4.67,
  pescatarian: 3.91,
  vegetarian: 3.81,
  vegan: 2.89,
};

/** kg CO2e per kWh. Source: Central Electricity Authority (India) CO2 Baseline Database v19. */
export const GRID_FACTOR_KG_PER_KWH = 0.716;

/** kg CO2e per kg LPG burned. Source: IPCC 2006 Guidelines, Vol. 2. A domestic cylinder holds 14.2 kg. */
export const LPG_FACTOR_KG_PER_KG = 2.983;
export const LPG_CYLINDER_KG = 14.2;

/** kg CO2e per kg of mixed municipal waste sent to landfill. Source: DEFRA 2024 (household residual waste). */
export const WASTE_FACTOR_KG_PER_KG = 0.467;

export const WEEKS_PER_YEAR = 52;
export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_YEAR = 365;

/** Annual per-capita emissions in tonnes CO2e. Sources: Our World in Data (2023), IPCC AR6 1.5°C pathway. */
export const BENCHMARKS_TONNES = {
  india_average: 2.0,
  global_average: 4.7,
  paris_2030_target: 2.3,
} as const;
