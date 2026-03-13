import {
  QuoteInput,
  QuoteResult,
  PackingType,
  Incoterm,
  CargoItem
} from "@/types";
import {
  HANDLING_FEE,
  FUMIGATION_FEE,
  SURGE_RATES,
  DEFAULT_EXCHANGE_RATE,
  PACKING_MATERIAL_BASE_COST,
  PACKING_LABOR_UNIT_COST,
  WAR_RISK_SURCHARGE_RATE
} from "@/config/rates";
import {
  SURGE_THRESHOLDS,
  PACKING_WEIGHT_BUFFER,
  PACKING_WEIGHT_ADDITION
} from "@/config/business-rules";
import { UPS_EXACT_RATES, UPS_RANGE_RATES } from "@/config/ups_tariff";
import { DHL_EXACT_RATES, DHL_RANGE_RATES } from "@/config/dhl_tariff";
import { EMAX_RATES, EMAX_HANDLING_CHARGE } from "@/config/emax_tariff";
import {
  DHL_ADDON_RATES,
  isDhlOversizePiece,
  isDhlOverWeight,
  calculateRemoteAreaFee,
  calculateInsuranceFee,
} from "@/config/dhl_addons";
import {
  UPS_ADDON_RATES,
  isUpsAdditionalHandling,
  calculateUpsRemoteAreaFee,
  calculateUpsExtendedAreaFee,
} from "@/config/ups_addons";

// --- Types for Internal Calculations ---
interface ItemCalculationResult {
  totalActualWeight: number;
  totalPackedVolumetricWeight: number;
  packingMaterialCost: number;
  packingLaborCost: number;
  surgeCost: number;
  warnings: string[];
}

interface CarrierCostResult {
  intlBase: number;
  intlFsc: number;
  intlWarRisk: number;
  appliedZone: string;
  transitTime: string;
}

// --- Helper Functions ---

export const calculateVolumetricWeight = (l: number, w: number, h: number, divisor: number = 5000) => {
  return (Math.ceil(l) * Math.ceil(w) * Math.ceil(h)) / divisor;
};

export const determineUpsZone = (country: string): { rateKey: string; label: string } => {
   // Aligned with backend Calculators::UpsZone (Z1-Z10)

   // Z1: SG, TW, MO, CN
   if (['SG', 'TW', 'MO', 'CN'].includes(country)) return { rateKey: 'Z1', label: 'SG/TW/MO/CN' };

   // Z2: JP, VN
   if (['JP', 'VN'].includes(country)) return { rateKey: 'Z2', label: 'JP/VN' };

   // Z3: TH, PH
   if (['TH', 'PH'].includes(country)) return { rateKey: 'Z3', label: 'TH/PH' };

   // Z4: AU, IN
   if (['AU', 'IN'].includes(country)) return { rateKey: 'Z4', label: 'AU/IN' };

   // Z5: CA, US
   if (['CA', 'US'].includes(country)) return { rateKey: 'Z5', label: 'CA/US' };

   // Z6: ES, IT, GB, FR
   if (['ES', 'IT', 'GB', 'FR'].includes(country)) return { rateKey: 'Z6', label: 'ES/IT/GB/FR' };

   // Z7: DK, NO, SE, FI, DE, NL, BE, IE, CH, AT, PT, CZ, PL, HU, RO, BG
   if (['DK', 'NO', 'SE', 'FI', 'DE', 'NL', 'BE', 'IE', 'CH', 'AT', 'PT', 'CZ', 'PL', 'HU', 'RO', 'BG'].includes(country))
     return { rateKey: 'Z7', label: 'EEU/DK/NO' };

   // Z8: AR, BR, CL, CO, AE, TR
   if (['AR', 'BR', 'CL', 'CO', 'AE', 'TR'].includes(country)) return { rateKey: 'Z8', label: 'S.Am/AE/TR' };

   // Z9: ZA, EG, BH, IL, JO, LB, SA, PK
   if (['ZA', 'EG', 'BH', 'IL', 'JO', 'LB', 'SA', 'PK'].includes(country)) return { rateKey: 'Z9', label: 'Africa/ME/PK' };

   // Z10: HK (+ default)
   if (['HK'].includes(country)) return { rateKey: 'Z10', label: 'HK' };

   // Default catch-all
   return { rateKey: 'Z10', label: 'Rest of World' };
};

// Retained for future reactivation of carrier surge auto-calculation.
// Currently tested but not called in production code path.
export const calculateItemSurge = (
  l: number,
  w: number,
  h: number,
  weight: number,
  packingType: PackingType,
  itemIndex: number
): { surgeCost: number; warnings: string[] } => {
    let surgeCost = 0;
    const warnings: string[] = [];

    const sortedDims = [l, w, h].sort((a, b) => b - a);
    const longest = sortedDims[0];
    const secondLongest = sortedDims[1];
    const actualGirth = longest + (2 * secondLongest) + (2 * sortedDims[2]);

    let packageSurgeApplied = false;
    let surgeReason = "";

    if (longest > SURGE_THRESHOLDS.MAX_LIMIT_LENGTH_CM || weight > 70 || actualGirth > SURGE_THRESHOLDS.MAX_LIMIT_GIRTH_CM) {
        surgeCost += SURGE_RATES.OVER_MAX;
        warnings.push(`Box #${itemIndex + 1}: Exceeds Max Limits (L>${SURGE_THRESHOLDS.MAX_LIMIT_LENGTH_CM}cm or >70kg). Heavy penalty applied.`);
        packageSurgeApplied = true;
    }
    else if (actualGirth > SURGE_THRESHOLDS.LPS_LENGTH_GIRTH_CM) {
        surgeCost += SURGE_RATES.LARGE_PACKAGE;
        surgeReason = "Large Package (L+Girth > 300cm)";
        packageSurgeApplied = true;
    }

    if (!packageSurgeApplied || surgeReason.includes("Large Package")) {
        if (weight > SURGE_THRESHOLDS.AHS_WEIGHT_KG) {
             surgeCost += SURGE_RATES.AHS_WEIGHT;
             if (!packageSurgeApplied) surgeReason = "AHS Weight (>25kg)";
             else surgeReason += " + AHS Weight";
             packageSurgeApplied = true;
        }
        else if (!surgeReason.includes("Large Package")) {
            if (longest > SURGE_THRESHOLDS.AHS_DIM_LONG_SIDE_CM || secondLongest > SURGE_THRESHOLDS.AHS_DIM_SECOND_SIDE_CM) {
                surgeCost += SURGE_RATES.AHS_DIMENSION;
                surgeReason = "AHS Dim (L>122 or W>76)";
                packageSurgeApplied = true;
            }
            else if ([PackingType.WOODEN_BOX, PackingType.SKID].includes(packingType)) {
                surgeCost += SURGE_RATES.AHS_DIMENSION;
                surgeReason = "AHS Packing (Wood/Skid)";
                packageSurgeApplied = true;
            }
        }
    }

    if (packageSurgeApplied && warnings.length === 0) {
         warnings.push(`Box #${itemIndex + 1}: ${surgeReason} applied.`);
    }

    return { surgeCost, warnings };
};

// --- Common Rate Lookup for UPS/DHL ---
const roundToHalf = (num: number) => Math.ceil(num * 2) / 2;

type ExactRateTable = Record<string, Record<number, number>>;
type RangeRateEntry = { min: number; max: number; rates: Record<string, number> };

const lookupCarrierRate = (
  billableWeight: number,
  zoneKey: string,
  exactRates: ExactRateTable,
  rangeRates: RangeRateEntry[]
): number => {
  const lookupWeight = roundToHalf(billableWeight);
  const zoneRates = exactRates[zoneKey];

  if (zoneRates && zoneRates[lookupWeight]) {
    return zoneRates[lookupWeight];
  }

  const range = rangeRates.find(r => billableWeight >= r.min && billableWeight <= r.max);
  if (range && range.rates[zoneKey]) {
    return Math.ceil(billableWeight) * range.rates[zoneKey];
  }

  if (zoneRates) {
    const weights = Object.keys(zoneRates).map(Number).sort((a, b) => a - b);
    const found = weights.find(w => w >= lookupWeight);
    if (found) return zoneRates[found];

    const nextRange = rangeRates.find(r => r.min <= Math.ceil(billableWeight));
    if (nextRange && nextRange.rates[zoneKey]) {
      return Math.ceil(billableWeight) * nextRange.rates[zoneKey];
    }
  }

  return 0;
};

// Surge auto-calc disabled; manual surge input applies to all carriers via calculateQuote().
export const calculateItemCosts = (items: CargoItem[], packingType: PackingType, manualPackingCost?: number, volumetricDivisor: number = 5000): ItemCalculationResult => {
  let totalActualWeight = 0;
  let totalPackedVolumetricWeight = 0;
  let packingMaterialCost = 0;
  let packingLaborCost = 0;
  const surgeCost = 0;
  const warnings: string[] = [];

  items.forEach((item) => {
    let l = item.length;
    let w = item.width;
    let h = item.height;
    let weight = item.weight;

    // Packing impact
    if (packingType !== PackingType.NONE) {
      l += 10;
      w += 10;
      h += 15;
      weight = weight * PACKING_WEIGHT_BUFFER + PACKING_WEIGHT_ADDITION;

      const surfaceAreaM2 = (2 * (l*w + l*h + w*h)) / 10000;
      packingMaterialCost += surfaceAreaM2 * PACKING_MATERIAL_BASE_COST * item.quantity;
      packingLaborCost += PACKING_LABOR_UNIT_COST * item.quantity;

      if (packingType === PackingType.VACUUM) {
         packingLaborCost *= 1.5;
      }
    }

    // Surge/AHS auto-calculation disabled — manual input via QuoteInput.manualSurgeCost.
    // Applies to all carriers (UPS, DHL, EMAX). See calculateQuote() for integration.

    totalActualWeight += weight * item.quantity;
    totalPackedVolumetricWeight += calculateVolumetricWeight(l, w, h, volumetricDivisor) * item.quantity;
  });

  // Manual Override Logic
  if (manualPackingCost !== undefined && manualPackingCost >= 0) {
      packingMaterialCost = manualPackingCost;
      packingLaborCost = 0;
  }

  return {
    totalActualWeight,
    totalPackedVolumetricWeight,
    packingMaterialCost,
    packingLaborCost,
    surgeCost,
    warnings
  };
};

export const calculateUpsCosts = (
  billableWeight: number,
  country: string,
  fscPercent: number
): CarrierCostResult => {
    const zoneInfo = determineUpsZone(country);
    const intlBase = lookupCarrierRate(billableWeight, zoneInfo.rateKey, UPS_EXACT_RATES, UPS_RANGE_RATES as RangeRateEntry[]);

    const fscRate = (fscPercent || 0) / 100;
    const intlFsc = intlBase * fscRate;
    const intlWarRisk = intlBase * (WAR_RISK_SURCHARGE_RATE / 100);
    return {
      intlBase,
      intlFsc,
      intlWarRisk,
      appliedZone: zoneInfo.label,
      transitTime: '2-4 Business Days'
    };
};


// --- DHL Calculator ---

export const determineDhlZone = (country: string): { rateKey: string; label: string } => {
  // Aligned with DHL Express Korea 공식 항공요금표 (2026-02)
  // Z1: 중국, 홍콩, 싱가포르 (TW/MO not in PDF — kept provisionally, verify with DHL)
  if (['CN', 'HK', 'MO', 'SG', 'TW'].includes(country)) return { rateKey: 'Z1', label: 'China/HK/SG' };
  // Z2: 일본
  if (['JP'].includes(country)) return { rateKey: 'Z2', label: 'Japan' };
  // Z3: 필리핀, 베트남, 태국
  if (['PH', 'VN', 'TH'].includes(country)) return { rateKey: 'Z3', label: 'PH/VN/TH' };
  // Z4: 호주, 캄보디아, 인도
  if (['AU', 'KH', 'IN'].includes(country)) return { rateKey: 'Z4', label: 'AU/KH/IN' };
  // Z5: 미국, 캐나다
  if (['US', 'CA'].includes(country)) return { rateKey: 'Z5', label: 'US/CA' };
  // Z6: 유럽 (서유럽 + 북유럽)
  if (['GB', 'FR', 'DE', 'IT', 'ES', 'DK', 'NL', 'BE', 'CH', 'FI', 'SE', 'NO', 'AT', 'PT', 'IE', 'MC'].includes(country))
    return { rateKey: 'Z6', label: 'Europe' };
  // Z7: 동유럽
  if (['CZ', 'PL', 'HU', 'RO', 'BG'].includes(country))
    return { rateKey: 'Z7', label: 'Eastern Europe' };
  // Z8: 남미, 아프리카, 중동
  if (['BR', 'AR', 'CL', 'CO', 'ZA', 'EG', 'AE', 'TR', 'BH', 'IL', 'JO', 'LB', 'SA', 'PK'].includes(country))
    return { rateKey: 'Z8', label: 'S.Am/Africa/ME' };
  return { rateKey: 'Z8', label: 'Rest of World' };
};

export const calculateDhlCosts = (
  billableWeight: number,
  country: string,
  fscPercent: number
): CarrierCostResult => {
  const zoneInfo = determineDhlZone(country);
  const intlBase = lookupCarrierRate(billableWeight, zoneInfo.rateKey, DHL_EXACT_RATES, DHL_RANGE_RATES as RangeRateEntry[]);

  const fscRate = (fscPercent || 0) / 100;
  const intlFsc = intlBase * fscRate;
  const intlWarRisk = intlBase * (WAR_RISK_SURCHARGE_RATE / 100);
  return {
    intlBase,
    intlFsc,
    intlWarRisk,
    appliedZone: zoneInfo.label,
    transitTime: '3-7 Business Days (DHL)',
  };
};

// --- EMAX Calculator ---

export const calculateEmaxCosts = (
  billableWeight: number,
  country: string
): CarrierCostResult => {
  const countryKey = country === 'CN' ? 'CN' : 'VN';
  const perKgRate = EMAX_RATES[countryKey] ?? EMAX_RATES['VN'];
  const intlBase = Math.ceil(billableWeight) * perKgRate + EMAX_HANDLING_CHARGE;

  return {
    intlBase,
    intlFsc: 0,
    intlWarRisk: 0,
    appliedZone: `E-MAX ${countryKey}`,
    transitTime: '5-10 Business Days (E-MAX)',
  };
};

// --- DHL Add-on Cost Calculator ---

// Generic add-on fee calculator for 'calculated' charge types using DB params
const calcAddonFee = (
  rate: { chargeType: string; amount: number; perKgRate?: number | null; ratePercent?: number | null; minAmount?: number | null },
  billableWeight: number,
  declaredValue: number
): number => {
  if (rate.chargeType === 'calculated') {
    if (rate.perKgRate) {
      const min = rate.minAmount ?? rate.amount;
      return Math.max(min, Math.ceil(billableWeight) * rate.perKgRate);
    }
    if (rate.ratePercent) {
      const min = rate.minAmount ?? rate.amount;
      return Math.max(declaredValue * rate.ratePercent / 100, min);
    }
  }
  return rate.amount;
};

const calculateDhlAddOnCosts = (
  input: QuoteInput,
  billableWeight: number,
  fscPercent: number
): { total: number; details: NonNullable<import("@/types").CostBreakdown["dhlAddOnDetails"]> } => {
  const fscRate = (fscPercent || 0) / 100;
  const details: NonNullable<import("@/types").CostBreakdown["dhlAddOnDetails"]> = [];
  let total = 0;

  // Use DB rates if available, otherwise hardcoded
  const dbRates = input.resolvedAddonRates?.filter(r => r.carrier === 'DHL');
  const useDb = dbRates && dbRates.length > 0;

  type AddonRateLike = {
    code: string; nameKo: string; nameEn: string; amount: number;
    chargeType: string; fscApplicable: boolean;
    perKgRate?: number | null; ratePercent?: number | null; minAmount?: number | null;
    detectRules?: Record<string, number | string[]> | null;
  };

  const findRate = (code: string): AddonRateLike | null => {
    if (useDb) {
      const r = dbRates!.find(a => a.code === code);
      return r ? { ...r } : null;
    }
    const h = DHL_ADDON_RATES.find(a => a.code === code);
    return h ? { code: h.code, nameKo: h.nameKo, nameEn: h.nameEn, amount: h.amount, chargeType: h.chargeType, fscApplicable: h.fscApplicable } : null;
  };

  // 1. Auto-detected: OSP and OWT
  let ospCount = 0;
  let owtCount = 0;
  const ospDef = findRate("OSP");
  const owtDef = findRate("OWT");

  input.items.forEach((item) => {
    let l = item.length;
    let w = item.width;
    let h = item.height;
    let weight = item.weight;

    if (input.packingType !== PackingType.NONE) {
      l += 10; w += 10; h += 15;
      weight = weight * PACKING_WEIGHT_BUFFER + PACKING_WEIGHT_ADDITION;
    }

    // OSP detection using DB detectRules or hardcoded
    if (useDb && ospDef?.detectRules) {
      const rules = ospDef.detectRules;
      const maxL = (rules.max_longest as number) ?? 100;
      const maxS = (rules.max_second as number) ?? 80;
      const sorted = [l, w, h].sort((a, b) => b - a);
      if (sorted[0] > maxL || sorted[1] > maxS) ospCount += item.quantity;
    } else {
      if (isDhlOversizePiece(l, w, h)) ospCount += item.quantity;
    }

    // OWT detection
    if (useDb && owtDef?.detectRules) {
      const threshold = (owtDef.detectRules.weight_threshold as number) ?? 70;
      if (weight > threshold) owtCount += item.quantity;
    } else {
      if (isDhlOverWeight(weight)) owtCount += item.quantity;
    }
  });

  if (ospCount > 0 && ospDef) {
    const amount = ospDef.amount * ospCount;
    const fsc = ospDef.fscApplicable ? amount * fscRate : 0;
    details.push({ code: "OSP", nameKo: ospDef.nameKo, nameEn: ospDef.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  }
  if (owtCount > 0 && owtDef) {
    const amount = owtDef.amount * owtCount;
    const fsc = owtDef.fscApplicable ? amount * fscRate : 0;
    details.push({ code: "OWT", nameKo: owtDef.nameKo, nameEn: owtDef.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  }

  // 2. User-selected add-ons
  const selectedCodes = input.dhlAddOns || [];
  selectedCodes.forEach((code) => {
    const addon = findRate(code);
    if (!addon) return;

    let amount: number;
    if (useDb) {
      amount = calcAddonFee(addon as any, billableWeight, input.dhlDeclaredValue || 0);
      if (code === "IRR" && addon.chargeType === 'per_piece') {
        const totalPieces = input.items.reduce((s, i) => s + i.quantity, 0);
        amount = addon.amount * totalPieces;
      }
    } else {
      amount = addon.amount;
      if (code === "RMT") amount = calculateRemoteAreaFee(billableWeight);
      if (code === "INS") amount = calculateInsuranceFee(input.dhlDeclaredValue || 0);
      if (code === "IRR") {
        const totalPieces = input.items.reduce((s, i) => s + i.quantity, 0);
        amount = addon.amount * totalPieces;
      }
    }

    const fsc = addon.fscApplicable ? amount * fscRate : 0;
    details.push({ code, nameKo: addon.nameKo, nameEn: addon.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  });

  return { total, details };
};

// --- UPS Add-on Cost Calculator ---

const calculateUpsAddOnCosts = (
  input: QuoteInput,
  billableWeight: number,
  fscPercent: number
): { total: number; details: NonNullable<import("@/types").CostBreakdown["dhlAddOnDetails"]> } => {
  const fscRate = (fscPercent || 0) / 100;
  const details: NonNullable<import("@/types").CostBreakdown["dhlAddOnDetails"]> = [];
  let total = 0;

  // Use DB rates if available, otherwise hardcoded
  const dbRates = input.resolvedAddonRates?.filter(r => r.carrier === 'UPS');
  const useDb = dbRates && dbRates.length > 0;

  type AddonRateLike = {
    code: string; nameKo: string; nameEn: string; amount: number;
    chargeType: string; fscApplicable: boolean;
    perKgRate?: number | null; ratePercent?: number | null; minAmount?: number | null;
    detectRules?: Record<string, number | string[]> | null;
  };

  const findRate = (code: string): AddonRateLike | null => {
    if (useDb) {
      const r = dbRates!.find(a => a.code === code);
      return r ? { ...r } : null;
    }
    const h = UPS_ADDON_RATES.find(a => a.code === code);
    return h ? { code: h.code, nameKo: h.nameKo, nameEn: h.nameEn, amount: h.amount, chargeType: h.chargeType, fscApplicable: h.fscApplicable } : null;
  };

  // 1. Auto-detected: AHS (Additional Handling)
  let ahsCount = 0;
  const ahsDef = findRate("AHS");

  input.items.forEach((item) => {
    let l = item.length;
    let w = item.width;
    let h = item.height;
    let weight = item.weight;

    if (input.packingType !== PackingType.NONE) {
      l += 10; w += 10; h += 15;
      weight = weight * PACKING_WEIGHT_BUFFER + PACKING_WEIGHT_ADDITION;
    }

    if (useDb && ahsDef?.detectRules) {
      const rules = ahsDef.detectRules;
      const wt = (rules.weight_threshold as number) ?? 25;
      const ml = (rules.max_longest as number) ?? 122;
      const ms = (rules.max_second as number) ?? 76;
      const pt = (rules.packing_types as string[]) ?? ['WOODEN_BOX', 'SKID'];
      const sorted = [l, w, h].sort((a, b) => b - a);
      if (weight > wt || sorted[0] > ml || sorted[1] > ms || pt.includes(input.packingType)) {
        ahsCount += item.quantity;
      }
    } else {
      if (isUpsAdditionalHandling(l, w, h, weight, input.packingType)) ahsCount += item.quantity;
    }
  });

  if (ahsCount > 0 && ahsDef) {
    const amount = ahsDef.amount * ahsCount;
    const fsc = ahsDef.fscApplicable ? amount * fscRate : 0;
    details.push({ code: "AHS", nameKo: ahsDef.nameKo, nameEn: ahsDef.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  }

  // 2. Auto-detected: DDP Service Fee
  if (input.incoterm === Incoterm.DDP) {
    const ddpDef = findRate("DDP");
    if (ddpDef) {
      details.push({ code: "DDP", nameKo: ddpDef.nameKo, nameEn: ddpDef.nameEn, amount: ddpDef.amount, fscAmount: 0 });
      total += ddpDef.amount;
    }
  }

  // 3. User-selected add-ons
  const selectedCodes = input.upsAddOns || [];
  selectedCodes.forEach((code) => {
    const addon = findRate(code);
    if (!addon) return;

    let amount: number;
    if (useDb) {
      amount = calcAddonFee(addon as any, billableWeight, 0);
      if (code === "ADC" && addon.chargeType === 'per_carton') {
        const totalCartons = input.items.reduce((s, i) => s + i.quantity, 0);
        amount = addon.amount * totalCartons;
      }
    } else {
      amount = addon.amount;
      if (code === "RMT") amount = calculateUpsRemoteAreaFee(billableWeight);
      if (code === "EXT") amount = calculateUpsExtendedAreaFee(billableWeight);
      if (code === "ADC") {
        const totalCartons = input.items.reduce((s, i) => s + i.quantity, 0);
        amount = addon.amount * totalCartons;
      }
    }

    const fsc = addon.fscApplicable ? amount * fscRate : 0;
    details.push({ code, nameKo: addon.nameKo, nameEn: addon.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  });

  return { total, details };
};

// --- Main Orchestrator ---

export const calculateQuote = (input: QuoteInput): QuoteResult => {
  const carrier = input.overseasCarrier || 'UPS';
  const isEmax = carrier === 'EMAX';
  const volumetricDivisor = isEmax ? 6000 : 5000;

  // 1. Calculate Item Costs (Packing, Surge, Weights)
  const itemResult = calculateItemCosts(input.items, input.packingType, input.manualPackingCost, volumetricDivisor);

  let packingFumigationCost = 0;
  if (input.packingType !== PackingType.NONE) {
    packingFumigationCost = FUMIGATION_FEE;
  }

  let finalHandlingFee = 0;
  // Packing & Docs = user-entered manualPackingCost only. No auto handling fee.
  // When manualPackingCost is set: material=override, labor=0, fumigation=0, handling=0
  // When manualPackingCost is empty: material=auto, labor=auto, fumigation=auto, handling=0
  if (input.manualPackingCost !== undefined && input.manualPackingCost >= 0) {
      packingFumigationCost = 0;
  }

  const packingTotal = itemResult.packingMaterialCost + itemResult.packingLaborCost + packingFumigationCost;

  // 2. Billable Weight
  const billableWeight = Math.max(itemResult.totalActualWeight, itemResult.totalPackedVolumetricWeight);
  const userWarnings = [...itemResult.warnings];

  if (itemResult.totalPackedVolumetricWeight > itemResult.totalActualWeight * 1.2) {
    userWarnings.push("High Volumetric Weight Detected (>20% over actual). Consider Repacking.");
  }

  // EMAX only services CN/VN routes from Korea
  if (carrier === 'EMAX' && !['CN', 'VN'].includes(input.destinationCountry)) {
    userWarnings.push("EMAX only services China (CN) and Vietnam (VN). Using VN fallback rate — verify with carrier.");
  }

  // 3. Carrier Costs (routing by carrier)
  let carrierResult: CarrierCostResult;
  switch (carrier) {
    case 'DHL':
      carrierResult = calculateDhlCosts(billableWeight, input.destinationCountry, input.fscPercent);
      break;
    case 'EMAX':
      carrierResult = calculateEmaxCosts(billableWeight, input.destinationCountry);
      break;
    default:
      carrierResult = calculateUpsCosts(billableWeight, input.destinationCountry, input.fscPercent);
      break;
  }

  // System surcharges from DB (War Risk, PSS, EBS, etc.)
  const manualSurgeCost = input.manualSurgeCost ?? 0;
  let systemSurchargeTotal = 0;
  let appliedSurcharges: NonNullable<import("@/types").CostBreakdown["appliedSurcharges"]> | undefined;

  if (input.resolvedSurcharges && input.resolvedSurcharges.length > 0) {
    const applied = input.resolvedSurcharges.map(s => {
      const appliedAmount = s.chargeType === 'rate'
        ? Math.round(carrierResult.intlBase * s.amount / 100)
        : Math.round(s.amount);
      return {
        code: s.code,
        name: s.name,
        nameKo: s.nameKo ?? undefined,
        chargeType: s.chargeType,
        amount: s.amount,
        appliedAmount,
        sourceUrl: s.sourceUrl ?? undefined,
      };
    });
    systemSurchargeTotal = applied.reduce((sum, s) => sum + s.appliedAmount, 0);
    appliedSurcharges = applied;
  }

  const surgeCost = systemSurchargeTotal + manualSurgeCost;
  const intlTotal = carrierResult.intlBase + carrierResult.intlFsc + carrierResult.intlWarRisk + surgeCost;

  // 3a. Carrier Add-on Services (DHL or UPS)
  let dhlAddOnTotal = 0;
  let dhlAddOnDetails: NonNullable<import("@/types").CostBreakdown["dhlAddOnDetails"]> | undefined;
  if (carrier === 'DHL') {
    const dhlAddOns = calculateDhlAddOnCosts(input, billableWeight, input.fscPercent);
    dhlAddOnTotal = dhlAddOns.total;
    dhlAddOnDetails = dhlAddOns.details.length > 0 ? dhlAddOns.details : undefined;
  } else if (carrier === 'UPS') {
    const upsAddOns = calculateUpsAddOnCosts(input, billableWeight, input.fscPercent);
    dhlAddOnTotal = upsAddOns.total;
    dhlAddOnDetails = upsAddOns.details.length > 0 ? upsAddOns.details : undefined;
  }

  // 4. Duty
  let destDuty = 0;
  if (input.incoterm === Incoterm.DDP) {
    destDuty = input.dutyTaxEstimate;
  }

  // 4a. Extra Pick-up in Seoul cost
  const pickupInSeoul = input.pickupInSeoulCost ?? 0;

  // 5. Totals
  const totalCostAmount = packingTotal + finalHandlingFee + intlTotal + dhlAddOnTotal + destDuty + pickupInSeoul;

  let quoteBasisCost = 0;
  if ([Incoterm.EXW, Incoterm.FOB].includes(input.incoterm)) {
     quoteBasisCost = packingTotal + finalHandlingFee;
     userWarnings.push("Collect Term: International Freight calculated for reference but may be billed to Consignee/Partner.");
  } else {
     quoteBasisCost = totalCostAmount;
  }

  // 6. Margin & Revenue (% based)
  const exchangeRate = input.exchangeRate || DEFAULT_EXCHANGE_RATE;
  
  // Calculate target revenue based on margin percentage
  // Target Revenue = Cost / (1 - Margin/100) 
  // e.g. 15% margin -> Revenue = Cost / 0.85
  const safeMarginPercent = Math.max(input.marginPercent ?? 15, 0);
  
  let targetRevenue = quoteBasisCost;
  // Prevent division by zero if margin is set to 100% or higher
  if (safeMarginPercent < 100) {
     targetRevenue = quoteBasisCost / (1 - (safeMarginPercent / 100));
  }
  
  const marginAmount = targetRevenue - quoteBasisCost;
  const totalQuoteAmount = Math.ceil(targetRevenue / 100) * 100; // Round up to nearest 100 KRW
  const totalQuoteAmountUSD = totalQuoteAmount / exchangeRate;

  // Derive effective margin % for display (recalculated after rounding)
  const effectiveMarginPercent = totalQuoteAmount > 0
    ? ((totalQuoteAmount - quoteBasisCost) / totalQuoteAmount) * 100
    : 0;

  if (effectiveMarginPercent < 10) {
    userWarnings.push("Low Margin Alert: Profit margin is below 10%. Approval required.");
  }

  return {
    totalQuoteAmount,
    totalQuoteAmountUSD,
    totalCostAmount,
    profitAmount: marginAmount,
    profitMargin: Math.round(effectiveMarginPercent * 100) / 100,
    currency: 'KRW',
    totalActualWeight: itemResult.totalActualWeight,
    totalVolumetricWeight: itemResult.totalPackedVolumetricWeight,
    billableWeight,
    appliedZone: carrierResult.appliedZone,
    transitTime: carrierResult.transitTime,
    carrier,
    warnings: userWarnings,
    breakdown: {
      packingMaterial: itemResult.packingMaterialCost,
      packingLabor: itemResult.packingLaborCost,
      packingFumigation: packingFumigationCost,
      handlingFees: finalHandlingFee,
      pickupInSeoul,
      intlBase: carrierResult.intlBase,
      intlFsc: carrierResult.intlFsc,
      intlWarRisk: carrierResult.intlWarRisk,
      intlSurge: surgeCost,
      intlSystemSurcharge: systemSurchargeTotal || undefined,
      intlManualSurge: manualSurgeCost || undefined,
      appliedSurcharges,
      dhlAddOnTotal: dhlAddOnTotal || undefined,
      dhlAddOnDetails,
      destDuty,
      totalCost: totalCostAmount
    }
  };
};