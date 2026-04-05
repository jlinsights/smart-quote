import { getDistanceKm, ROUTE_DISTANCES_FROM_KR } from '../route_distances';

describe('getDistanceKm', () => {
  it('returns exact distance for known countries', () => {
    expect(getDistanceKm('US')).toBe(11000);
    expect(getDistanceKm('JP')).toBe(1200);
    expect(getDistanceKm('DE')).toBe(8500);
  });

  it('is case-insensitive', () => {
    expect(getDistanceKm('us')).toBe(11000);
    expect(getDistanceKm('Jp')).toBe(1200);
  });

  it('returns _DEFAULT for unknown countries', () => {
    expect(getDistanceKm('XX')).toBe(ROUTE_DISTANCES_FROM_KR._DEFAULT);
    expect(getDistanceKm('ZZ')).toBe(9000);
  });

  it('returns _DEFAULT for undefined/empty', () => {
    expect(getDistanceKm(undefined)).toBe(9000);
    expect(getDistanceKm('')).toBe(9000);
  });

  it('covers all inhabited continents', () => {
    // Sanity check — ensure table has entries from major regions
    expect(ROUTE_DISTANCES_FROM_KR.JP).toBeDefined(); // Asia
    expect(ROUTE_DISTANCES_FROM_KR.US).toBeDefined(); // N. America
    expect(ROUTE_DISTANCES_FROM_KR.BR).toBeDefined(); // S. America
    expect(ROUTE_DISTANCES_FROM_KR.GB).toBeDefined(); // Europe
    expect(ROUTE_DISTANCES_FROM_KR.AE).toBeDefined(); // Middle East
    expect(ROUTE_DISTANCES_FROM_KR.ZA).toBeDefined(); // Africa
    expect(ROUTE_DISTANCES_FROM_KR.AU).toBeDefined(); // Oceania
  });
});
