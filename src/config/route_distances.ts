/**
 * Great-circle distance from ICN (Seoul Incheon) to major destination airports (km).
 * Origin fixed at KR. Phase 3.5 backend (M2c) will replace with dynamic
 * origin-destination airport pair distances (od_distances table).
 *
 * Values sourced from publicly available great-circle calculators rounded to
 * the nearest 100 km. Used by src/lib/co2.ts for IATA RP1678 emission estimates.
 */

export const ROUTE_DISTANCES_FROM_KR: Record<string, number> = {
  // East Asia
  JP: 1200,   // ICN → NRT
  CN: 950,    // ICN → PVG
  HK: 2100,
  TW: 1500,
  MO: 2100,

  // Southeast Asia
  SG: 4700,
  MY: 4600,
  TH: 3700,
  VN: 3000,
  PH: 2600,
  ID: 5300,

  // South / Central Asia
  IN: 5700,
  PK: 5500,
  BD: 4300,
  LK: 5500,
  NP: 5200,

  // Oceania
  AU: 8300,
  NZ: 9700,

  // North America
  US: 11000,  // ICN → JFK (east coast); west coast ~9000 — use east as conservative est.
  CA: 10300,
  MX: 11800,

  // South America
  BR: 18300,
  AR: 19500,
  CL: 19100,
  CO: 14400,
  PE: 16400,

  // Western Europe
  GB: 9000,
  FR: 9000,
  DE: 8500,
  IT: 9000,
  ES: 10400,
  NL: 8600,
  BE: 8800,
  CH: 8900,
  AT: 8700,
  PT: 10800,
  IE: 9100,

  // Nordic
  SE: 7700,
  NO: 7800,
  DK: 8200,
  FI: 7100,

  // Eastern Europe
  PL: 8100,
  CZ: 8300,
  HU: 8200,
  RO: 8100,
  BG: 8200,

  // Middle East
  AE: 7000,
  SA: 7800,
  QA: 7100,
  KW: 7400,
  BH: 7100,
  OM: 7000,
  IL: 8100,
  JO: 7700,
  LB: 7900,
  TR: 7600,
  IR: 6900,
  IQ: 7600,

  // Africa
  EG: 8800,
  ZA: 13400,

  // Korea (domestic fallback, should not normally be a destination)
  KR: 0,

  // Fallback for unknown countries — uses global average long-haul distance
  _DEFAULT: 9000,
};

/**
 * Look up the distance (km) from KR to the given destination country.
 * Returns _DEFAULT (9000) if the country is not in the table.
 */
export function getDistanceKm(destinationCountry: string | undefined): number {
  if (!destinationCountry) return ROUTE_DISTANCES_FROM_KR._DEFAULT;
  const upper = destinationCountry.toUpperCase();
  return ROUTE_DISTANCES_FROM_KR[upper] ?? ROUTE_DISTANCES_FROM_KR._DEFAULT;
}
