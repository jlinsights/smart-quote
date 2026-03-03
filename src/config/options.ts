import { Incoterm } from "@/types";

export const COUNTRY_OPTIONS = [
  // Asia-Pacific
  { code: 'CN', name: '🇨🇳 China' },
  { code: 'JP', name: '🇯🇵 Japan' },
  { code: 'VN', name: '🇻🇳 Vietnam' },
  { code: 'SG', name: '🇸🇬 Singapore' },
  { code: 'HK', name: '🇭🇰 Hong Kong' },
  { code: 'TW', name: '🇹🇼 Taiwan' },
  { code: 'TH', name: '🇹🇭 Thailand' },
  { code: 'PH', name: '🇵🇭 Philippines' },
  { code: 'AU', name: '🇦🇺 Australia' },
  { code: 'IN', name: '🇮🇳 India' },
  // Americas
  { code: 'US', name: '🇺🇸 United States' },
  { code: 'CA', name: '🇨🇦 Canada' },
  { code: 'BR', name: '🇧🇷 Brazil' },
  // Europe
  { code: 'DE', name: '🇩🇪 Germany' },
  { code: 'GB', name: '🇬🇧 United Kingdom' },
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'IT', name: '🇮🇹 Italy' },
  { code: 'ES', name: '🇪🇸 Spain' },
  { code: 'NL', name: '🇳🇱 Netherlands' },
  // Middle East
  { code: 'AE', name: '🇦🇪 UAE' },
  { code: 'SA', name: '🇸🇦 Saudi Arabia' },
  { code: 'TR', name: '🇹🇷 Turkey' },
];

export const ORIGIN_COUNTRY_OPTIONS = [
    { code: 'KR', name: '🇰🇷 South Korea' },
    { code: 'CN', name: '🇨🇳 China' },
    { code: 'VN', name: '🇻🇳 Vietnam' },
    { code: 'US', name: '🇺🇸 United States' },
];

export const INCOTERM_OPTIONS = Object.values(Incoterm);

export const SEOUL_PICKUP_ZONES: { districts: string[]; cost: number }[] = [
  { districts: ['강서', '양천', '마포'],                           cost: 30000 },
  { districts: ['구로', '금천', '관악', '동작', '영등포'],         cost: 35000 },
  { districts: ['은평', '서대문', '종로', '중구', '용산'],         cost: 40000 },
  { districts: ['강남', '서초', '송파'],                           cost: 45000 },
  { districts: ['동대문', '성동', '광진', '강동'],                 cost: 45000 },
  { districts: ['강북', '도봉', '노원', '중랑'],                   cost: 55000 },
];
