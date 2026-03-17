/**
 * UPS zone mapping: country code -> { rateKey, label }
 * Extracted from calculationService.ts to reduce file size.
 */

export type ZoneInfo = { rateKey: string; label: string };

export const UPS_ZONE_MAP: Record<string, ZoneInfo> = {
  SG: { rateKey: 'Z1', label: 'SG/TW/MO/CN' },
  TW: { rateKey: 'Z1', label: 'SG/TW/MO/CN' },
  MO: { rateKey: 'Z1', label: 'SG/TW/MO/CN' },
  CN: { rateKey: 'Z1', label: 'SG/TW/MO/CN' },
  JP: { rateKey: 'Z2', label: 'JP/VN' },
  VN: { rateKey: 'Z2', label: 'JP/VN' },
  TH: { rateKey: 'Z3', label: 'TH/PH' },
  PH: { rateKey: 'Z3', label: 'TH/PH' },
  AU: { rateKey: 'Z4', label: 'AU/IN' },
  IN: { rateKey: 'Z4', label: 'AU/IN' },
  CA: { rateKey: 'Z5', label: 'CA/US' },
  US: { rateKey: 'Z5', label: 'CA/US' },
  ES: { rateKey: 'Z6', label: 'ES/IT/GB/FR' },
  IT: { rateKey: 'Z6', label: 'ES/IT/GB/FR' },
  GB: { rateKey: 'Z6', label: 'ES/IT/GB/FR' },
  FR: { rateKey: 'Z6', label: 'ES/IT/GB/FR' },
  DK: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  NO: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  SE: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  FI: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  DE: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  NL: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  BE: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  IE: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  CH: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  AT: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  PT: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  CZ: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  PL: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  HU: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  RO: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  BG: { rateKey: 'Z7', label: 'EEU/DK/NO' },
  AR: { rateKey: 'Z8', label: 'S.Am/ME/Africa' },
  BR: { rateKey: 'Z8', label: 'S.Am/ME/Africa' },
  CL: { rateKey: 'Z8', label: 'S.Am/ME/Africa' },
  CO: { rateKey: 'Z8', label: 'S.Am/ME/Africa' },
  AE: { rateKey: 'Z8', label: 'S.Am/ME/Africa' },
  TR: { rateKey: 'Z8', label: 'S.Am/ME/Africa' },
  ZA: { rateKey: 'Z8', label: 'S.Am/ME/Africa' },
  EG: { rateKey: 'Z8', label: 'S.Am/ME/Africa' },
  BH: { rateKey: 'Z8', label: 'S.Am/ME/Africa' },
  SA: { rateKey: 'Z8', label: 'S.Am/ME/Africa' },
  PK: { rateKey: 'Z8', label: 'S.Am/ME/Africa' },
  KW: { rateKey: 'Z8', label: 'S.Am/ME/Africa' },
  QA: { rateKey: 'Z8', label: 'S.Am/ME/Africa' },
  IL: { rateKey: 'Z9', label: 'IL/JO/LB' },
  JO: { rateKey: 'Z9', label: 'IL/JO/LB' },
  LB: { rateKey: 'Z9', label: 'IL/JO/LB' },
  HK: { rateKey: 'Z10', label: 'HK' },
};

const UPS_DEFAULT_ZONE: ZoneInfo = { rateKey: 'Z10', label: 'Rest of World' };

export const determineUpsZone = (country: string): ZoneInfo =>
  UPS_ZONE_MAP[country] || UPS_DEFAULT_ZONE;
