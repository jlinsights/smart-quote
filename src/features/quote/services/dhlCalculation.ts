import { DHL_EXACT_RATES, DHL_RANGE_RATES } from '@/config/dhl_tariff';
import { determineDhlZone } from '@/config/dhl_zones';
import { WAR_RISK_SURCHARGE_RATE, TRANSIT_TIMES } from '@/config/rates';
import { lookupCarrierRate, CarrierCostResult } from './carrierRateEngine';

export { determineDhlZone };

export const calculateDhlCosts = (billableWeight: number, country: string): CarrierCostResult => {
  const zoneInfo = determineDhlZone(country);
  const intlBase = lookupCarrierRate(
    billableWeight,
    zoneInfo.rateKey,
    DHL_EXACT_RATES,
    DHL_RANGE_RATES as Parameters<typeof lookupCarrierRate>[3],
  );
  const intlWarRisk = intlBase * (WAR_RISK_SURCHARGE_RATE / 100);
  return {
    intlBase,
    intlFsc: 0,
    intlWarRisk,
    appliedZone: zoneInfo.label,
    transitTime: TRANSIT_TIMES.DHL,
  };
};
