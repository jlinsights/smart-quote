import { Incoterm } from "@/types";

export const COUNTRY_OPTIONS = [
  // Asia-Pacific
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
  // Americas
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'BR', name: 'Brazil' },
  // Europe
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  // Middle East
  { code: 'AE', name: 'UAE' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'TR', name: 'Turkey' },
];

export const ORIGIN_COUNTRY_OPTIONS = [
    { code: 'KR', name: 'South Korea' },
    { code: 'CN', name: 'China' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'US', name: 'United States' },
];

export const INCOTERM_OPTIONS = Object.values(Incoterm);
