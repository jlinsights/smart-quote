import { Incoterm } from "@/types";

export const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'SG', name: 'Singapore' },
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'United Kingdom' },
];

export const ORIGIN_COUNTRY_OPTIONS = [
    { code: 'KR', name: 'South Korea' },
    { code: 'CN', name: 'China' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'US', name: 'United States' },
];

export const INCOTERM_OPTIONS = Object.values(Incoterm);
