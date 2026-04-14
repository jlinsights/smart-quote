// Shared rate-lookup engine used by both UPS and DHL calculators.

export interface CarrierCostResult {
  intlBase: number;
  intlFsc: number;
  intlWarRisk: number;
  appliedZone: string;
  transitTime: string;
}

type ExactRateTable = Record<string, Record<number, number>>;
type RangeRateEntry = { min: number; max: number; rates: Record<string, number> };

const roundToHalf = (num: number) => Math.ceil(num * 2) / 2;

export const lookupCarrierRate = (
  billableWeight: number,
  zoneKey: string,
  exactRates: ExactRateTable,
  rangeRates: RangeRateEntry[],
): number => {
  const lookupWeight = roundToHalf(billableWeight);
  const zoneRates = exactRates[zoneKey];

  if (zoneRates && zoneRates[lookupWeight]) {
    return zoneRates[lookupWeight];
  }

  const range = rangeRates.find((r) => billableWeight >= r.min && billableWeight <= r.max);
  if (range && range.rates[zoneKey]) {
    return Math.ceil(billableWeight) * range.rates[zoneKey];
  }

  if (zoneRates) {
    const weights = Object.keys(zoneRates)
      .map(Number)
      .sort((a, b) => a - b);
    const found = weights.find((w) => w >= lookupWeight);
    if (found) return zoneRates[found];

    const nextRange = rangeRates.find((r) => r.min <= Math.ceil(billableWeight));
    if (nextRange && nextRange.rates[zoneKey]) {
      return Math.ceil(billableWeight) * nextRange.rates[zoneKey];
    }
  }

  throw new Error(`Rate not found: zone=${zoneKey}, weight=${billableWeight}kg`);
};
