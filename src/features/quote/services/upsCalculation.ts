import { UPS_EXACT_RATES, UPS_RANGE_RATES } from '@/config/ups_tariff';
import { determineUpsZone } from '@/config/ups_zones';
import { WAR_RISK_SURCHARGE_RATE, TRANSIT_TIMES } from '@/config/rates';
import { lookupCarrierRate, CarrierCostResult } from './carrierRateEngine';

export { determineUpsZone };

export const calculateUpsCosts = (billableWeight: number, country: string): CarrierCostResult => {
  const zoneInfo = determineUpsZone(country);
  const intlBase = lookupCarrierRate(
    billableWeight,
    zoneInfo.rateKey,
    UPS_EXACT_RATES,
    UPS_RANGE_RATES as Parameters<typeof lookupCarrierRate>[3],
  );
  const intlWarRisk = intlBase * (WAR_RISK_SURCHARGE_RATE / 100);
  return {
    intlBase,
    intlFsc: 0,
    intlWarRisk,
    appliedZone: zoneInfo.label,
    transitTime: TRANSIT_TIMES.UPS,
  };
};
