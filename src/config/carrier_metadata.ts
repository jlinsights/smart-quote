/**
 * Carrier Metadata — Phase 1.5 (CargoAI-inspired)
 *
 * Static metadata for carrier comparison badges & ranking.
 * These values are placeholders until Phase 1 (real-time carrier API integration)
 * provides destination-specific transit times and Phase 2 booking history
 * produces actual quality scores.
 *
 * CO2 emission factors follow IATA RP1678 (kg CO2 / tonne-km) — approximate values.
 */

export interface CarrierMetadata {
  transitDaysMin: number;
  transitDaysMax: number;
  qualityScore: number;        // 1.0 - 5.0
  emissionFactor: number;      // kg CO2 / tonne-km
}

export const CARRIER_METADATA: Record<'UPS' | 'DHL' | 'FEDEX', CarrierMetadata> = {
  UPS: {
    transitDaysMin: 2,
    transitDaysMax: 5,
    qualityScore: 4.5,
    emissionFactor: 0.602,
  },
  DHL: {
    transitDaysMin: 2,
    transitDaysMax: 4,
    qualityScore: 4.7,
    emissionFactor: 0.520,
  },
  FEDEX: {
    transitDaysMin: 3,
    transitDaysMax: 6,
    qualityScore: 4.3,
    emissionFactor: 0.645,
  },
};
