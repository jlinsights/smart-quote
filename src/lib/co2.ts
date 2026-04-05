import { CARRIER_METADATA } from '@/config/carrier_metadata';
import { getDistanceKm } from '@/config/route_distances';

/** IATA air cargo average load factor (fraction of max payload actually carried). */
const LOAD_FACTOR = 0.7;

/**
 * Estimate CO₂ emissions (kg) for an air cargo shipment using a simplified
 * IATA RP1678 formula:
 *
 *   CO₂(kg) = (weightKg × distanceKm × emissionFactor × loadFactor) / 1000
 *
 * - emissionFactor is carrier-specific (kg CO₂ / tonne-km) from CARRIER_METADATA
 * - distanceKm is looked up from KR → destinationCountry table
 * - /1000 converts kg to tonnes for the tonne-km unit
 *
 * Returns null if the carrier is not in CARRIER_METADATA or weight is non-positive.
 * Result is rounded to 2 decimal places.
 *
 * This is a frontend-only estimate. The backend (Phase 3.5 / M2c) will replace
 * this with per-airport-pair distances and versioned emission factors.
 */
export function calculateCo2Kg(
  carrier: 'UPS' | 'DHL' | 'FEDEX',
  billableWeightKg: number,
  destinationCountry: string | undefined,
): number | null {
  const meta = CARRIER_METADATA[carrier];
  if (!meta) return null;
  if (!Number.isFinite(billableWeightKg) || billableWeightKg <= 0) return null;

  const distanceKm = getDistanceKm(destinationCountry);
  const co2Kg =
    (billableWeightKg * distanceKm * meta.emissionFactor * LOAD_FACTOR) / 1000;
  return Math.round(co2Kg * 100) / 100;
}
