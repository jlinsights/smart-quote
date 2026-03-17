/**
 * DHL zone mapping: country code -> { rateKey, label }
 * Extracted from calculationService.ts to reduce file size.
 */

import type { ZoneInfo } from './ups_zones';

export const DHL_ZONE_MAP: Record<string, ZoneInfo> = {
  CN: { rateKey: 'Z1', label: 'China/HK/SG' },
  HK: { rateKey: 'Z1', label: 'China/HK/SG' },
  MO: { rateKey: 'Z1', label: 'China/HK/SG' },
  SG: { rateKey: 'Z1', label: 'China/HK/SG' },
  TW: { rateKey: 'Z1', label: 'China/HK/SG' },
  JP: { rateKey: 'Z2', label: 'Japan' },
  PH: { rateKey: 'Z3', label: 'PH/VN/TH' },
  VN: { rateKey: 'Z3', label: 'PH/VN/TH' },
  TH: { rateKey: 'Z3', label: 'PH/VN/TH' },
  AU: { rateKey: 'Z4', label: 'AU/KH/IN' },
  KH: { rateKey: 'Z4', label: 'AU/KH/IN' },
  IN: { rateKey: 'Z4', label: 'AU/KH/IN' },
  US: { rateKey: 'Z5', label: 'US/CA' },
  CA: { rateKey: 'Z5', label: 'US/CA' },
  GB: { rateKey: 'Z6', label: 'Europe' },
  FR: { rateKey: 'Z6', label: 'Europe' },
  DE: { rateKey: 'Z6', label: 'Europe' },
  IT: { rateKey: 'Z6', label: 'Europe' },
  ES: { rateKey: 'Z6', label: 'Europe' },
  DK: { rateKey: 'Z6', label: 'Europe' },
  NL: { rateKey: 'Z6', label: 'Europe' },
  BE: { rateKey: 'Z6', label: 'Europe' },
  CH: { rateKey: 'Z6', label: 'Europe' },
  FI: { rateKey: 'Z6', label: 'Europe' },
  SE: { rateKey: 'Z6', label: 'Europe' },
  NO: { rateKey: 'Z6', label: 'Europe' },
  AT: { rateKey: 'Z6', label: 'Europe' },
  PT: { rateKey: 'Z6', label: 'Europe' },
  IE: { rateKey: 'Z6', label: 'Europe' },
  MC: { rateKey: 'Z6', label: 'Europe' },
  CZ: { rateKey: 'Z7', label: 'Eastern Europe' },
  PL: { rateKey: 'Z7', label: 'Eastern Europe' },
  HU: { rateKey: 'Z7', label: 'Eastern Europe' },
  RO: { rateKey: 'Z7', label: 'Eastern Europe' },
  BG: { rateKey: 'Z7', label: 'Eastern Europe' },
  BR: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
  AR: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
  CL: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
  CO: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
  ZA: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
  EG: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
  AE: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
  TR: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
  BH: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
  IL: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
  JO: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
  LB: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
  SA: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
  PK: { rateKey: 'Z8', label: 'S.Am/Africa/ME' },
};

const DHL_DEFAULT_ZONE: ZoneInfo = { rateKey: 'Z8', label: 'Rest of World' };

export const determineDhlZone = (country: string): ZoneInfo =>
  DHL_ZONE_MAP[country] || DHL_DEFAULT_ZONE;
