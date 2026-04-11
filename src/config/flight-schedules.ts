export interface FlightSchedule {
  id: string;
  airline: string;
  airlineCode: string;
  flightNo: string;
  aircraftType: string;
  flightType: 'cargo' | 'passenger' | 'combi';
  origin: string;
  destination: string;
  via?: string; // Stopover airport code (e.g. 'NRT', 'HNL')
  departureDays: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  departureTime: string; // HH:MM (KST)
  arrivalTime: string; // HH:MM (local)
  flightDuration: string;
  maxCargoKg: number;
  remarks?: string;
  /** Inclusive lower bound, ISO YYYY-MM-DD. Omit for "always from the past". */
  effectiveFrom?: string;
  /** Inclusive upper bound, ISO YYYY-MM-DD. Omit for "never expires". */
  effectiveTo?: string;
}

/** Format route display: ICN → NRT → YYC or ICN → YYC */
export const formatRoute = (s: FlightSchedule): string =>
  s.via ? `${s.origin}→${s.via}→${s.destination}` : `${s.origin}→${s.destination}`;

/**
 * Check whether a schedule is active on the given YYYY-MM-DD day (inclusive bounds).
 * Uses lexicographic string comparison to avoid Date/timezone drift.
 */
export function isActiveOn(schedule: FlightSchedule, todayYmd: string): boolean {
  if (schedule.effectiveFrom && todayYmd < schedule.effectiveFrom) return false;
  if (schedule.effectiveTo && todayYmd > schedule.effectiveTo) return false;
  return true;
}

/**
 * YYYY-MM-DD in the browser's local time (not UTC).
 * Keeping it local prevents late-night flights from slipping into the wrong
 * effective window near midnight KST.
 */
export function todayYmdLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type GssaGroup = 'goodman' | 'gac' | 'extrans' | 'daejoo' | 'apex' | 'paa';

export interface AirlineInfo {
  code: string;
  name: string;
  nameKo: string;
  logo: string;
  country: string;
  hubCity: string;
  contractType: string;
  gssaGroup: GssaGroup; // 'goodman' = Goodman GLS, 'gac' = Globe Air Cargo (ECS Group)
}

export const GSSA_GROUP_LABELS = {
  goodman: {
    en: 'Goodman GLS',
    ko: 'Goodman GLS',
    badge:
      'bg-jways-100 dark:bg-jways-900/40 text-jways-700 dark:text-jways-300 border-jways-200 dark:border-jways-700',
  },
  gac: {
    en: 'Globe Air Cargo (ECS)',
    ko: 'Globe Air Cargo (ECS)',
    badge:
      'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
  },
  extrans: {
    en: 'Extrans Air',
    ko: 'Extrans Air',
    badge:
      'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700',
  },
  daejoo: {
    en: 'Daejoo Air Agencies',
    ko: '대주항공',
    badge:
      'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
  },
  apex: {
    en: 'Apexlogistics',
    ko: '에이펙스로지스틱스',
    badge:
      'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
  },
  paa: {
    en: 'Pacific Air Agency (PAA)',
    ko: 'Pacific Air Agency (PAA)',
    badge:
      'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700',
  },
} as const;

export const AIRLINE_INFO: AirlineInfo[] = [
  {
    code: 'WS',
    name: 'WestJet Cargo',
    nameKo: '웨스트젯 카고',
    logo: '🇨🇦',
    country: 'Canada',
    hubCity: 'Calgary (YYC)',
    contractType: 'GSSA — Cargo Sales Agent',
    gssaGroup: 'goodman',
  },
  {
    code: 'O3',
    name: 'ShunFeng Airlines',
    nameKo: '순펑항공 (SF Express)',
    logo: '🇨🇳',
    country: 'China',
    hubCity: 'Shenzhen (SZX)',
    contractType: 'GSSA — Cargo Sales Agent',
    gssaGroup: 'goodman',
  },
  {
    code: 'BX',
    name: 'Air Busan',
    nameKo: '에어부산',
    logo: '🇰🇷',
    country: 'South Korea',
    hubCity: 'Busan (PUS)',
    contractType: 'GSSA — Belly Cargo Sales',
    gssaGroup: 'goodman',
  },
  {
    code: 'M0',
    name: 'Aero Mongolia',
    nameKo: '에어로 몽골리아',
    logo: '🇲🇳',
    country: 'Mongolia',
    hubCity: 'Ulaanbaatar (UBN)',
    contractType: 'GSSA — Passenger & Cargo',
    gssaGroup: 'goodman',
  },
  {
    code: 'SU',
    name: 'Aeroflot',
    nameKo: '아에로플로트',
    logo: '🇷🇺',
    country: 'Russia',
    hubCity: 'Moscow (SVO)',
    contractType: 'GSSA — Cargo via BKK transit (ICN→BKK→SVO, single B/L)',
    gssaGroup: 'goodman',
  },
  {
    code: '2C',
    name: 'CMA CGM Air Cargo',
    nameKo: 'CMA CGM 항공화물',
    logo: '🇫🇷',
    country: 'France',
    hubCity: 'Paris (CDG)',
    contractType: 'GSSA — Cargo Sales Agent (via Globe Air Cargo / ECS Group)',
    gssaGroup: 'gac',
  },
  {
    code: 'AM',
    name: 'Aeromexico Cargo',
    nameKo: '아에로멕시코 카고',
    logo: '🇲🇽',
    country: 'Mexico',
    hubCity: 'Mexico City (MEX)',
    contractType: 'GSSA — Cargo Sales Agent (via Globe Air Cargo / ECS Group)',
    gssaGroup: 'gac',
  },
  {
    code: 'WE',
    name: 'Parata Air',
    nameKo: '파라타항공',
    logo: '🇰🇷',
    country: 'South Korea',
    hubCity: 'Seoul (ICN)',
    contractType: 'GSSA — Cargo Sales Agent (via Extrans Air)',
    gssaGroup: 'extrans',
  },
  {
    code: 'YP',
    name: 'Air Premia',
    nameKo: '에어프레미아',
    logo: '🇰🇷',
    country: 'South Korea',
    hubCity: 'Seoul (ICN)',
    contractType: 'GSSA — Belly Cargo Sales',
    gssaGroup: 'goodman',
  },
  {
    code: 'DE',
    name: 'Condor Airlines',
    nameKo: '콘도르 항공',
    logo: '🇩🇪',
    country: 'Germany',
    hubCity: 'Frankfurt (FRA)',
    contractType: 'GSSA — Cargo Sales Agent (via Globe Air Cargo / ECS Group)',
    gssaGroup: 'gac',
  },
  // --- Extrans Air ---
  {
    code: 'TW',
    name: "t'way Air",
    nameKo: '티웨이항공',
    logo: '🇰🇷',
    country: 'South Korea',
    hubCity: 'Seoul (ICN)',
    contractType: 'GSSA — Belly Cargo Sales (via Extrans Air)',
    gssaGroup: 'extrans',
  },
  // --- Daejoo Air Agencies ---
  {
    code: 'JX',
    name: 'Starlux Airlines',
    nameKo: '스타럭스항공',
    logo: '🇹🇼',
    country: 'Taiwan',
    hubCity: 'Taipei (TPE)',
    contractType: 'GSSA — Cargo Sales Agent (via Daejoo Air Agencies)',
    gssaGroup: 'daejoo',
  },
  // --- Apexlogistics ---
  {
    code: 'KE',
    name: 'Korean Air Cargo',
    nameKo: '대한항공 카고',
    logo: '🇰🇷',
    country: 'South Korea',
    hubCity: 'Seoul (ICN)',
    contractType: 'GSSA — Cargo Sales Agent (via Apexlogistics)',
    gssaGroup: 'apex',
  },
  {
    code: 'UA',
    name: 'United Cargo',
    nameKo: '유나이티드 카고',
    logo: '🇺🇸',
    country: 'United States',
    hubCity: 'San Francisco (SFO)',
    contractType: 'GSSA — Cargo Sales Agent (via Apexlogistics)',
    gssaGroup: 'apex',
  },
  {
    code: '5Y',
    name: 'Atlas Air',
    nameKo: '아틀라스 에어',
    logo: '🇺🇸',
    country: 'United States',
    hubCity: 'Purchase, NY',
    contractType: 'GSSA — Freighter (via Apexlogistics)',
    gssaGroup: 'apex',
  },
  // --- Pacific Air Agency (PAA) ---
  {
    code: 'M7',
    name: 'MASair',
    nameKo: 'MAS 항공',
    logo: '🇲🇽',
    country: 'Mexico',
    hubCity: 'Mexico City (NLU)',
    contractType: 'GSSA — Cargo Sales Agent (via Pacific Air Agency)',
    gssaGroup: 'paa',
  },
];

export const FLIGHT_SCHEDULES: FlightSchedule[] = [
  // WestJet Cargo (WS) — Updated from WS Cargo Sched 2026-02-09.csv (effective 29Mar26~24Oct26)
  {
    id: 'default-ws-087',
    airline: 'WestJet Cargo',
    airlineCode: 'WS',
    flightNo: 'WS 087',
    aircraftType: 'B789',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'YYC',
    departureDays: [0, 1, 3, 4, 5, 6], // 12.4567 (25May~24Oct26)
    departureTime: '20:45',
    arrivalTime: '16:15',
    flightDuration: '9h 30m',
    maxCargoKg: 20000,
    remarks: 'B789 · Effective 25May~24Oct26',
  },
  {
    id: 'default-ws-086',
    airline: 'WestJet Cargo',
    airlineCode: 'WS',
    flightNo: 'WS 086',
    aircraftType: 'B789',
    flightType: 'cargo',
    origin: 'YYC',
    destination: 'ICN',
    departureDays: [0, 1, 2, 3, 4, 5, 6], // 1.34567 (20May~24Oct26)
    departureTime: '16:00',
    arrivalTime: '18:45',
    flightDuration: '12h 45m',
    maxCargoKg: 20000,
    remarks: 'B789 · Effective 20May~24Oct26',
  },
  {
    id: 'default-ws-081',
    airline: 'WestJet Cargo',
    airlineCode: 'WS',
    flightNo: 'WS 081',
    aircraftType: 'B789',
    flightType: 'cargo',
    origin: 'NRT',
    destination: 'YYC',
    departureDays: [0, 1, 2, 3, 4, 5, 6], // Daily (29Mar~24Oct26)
    departureTime: '18:30',
    arrivalTime: '12:40',
    flightDuration: '9h 10m',
    maxCargoKg: 20000,
    remarks: 'B789 · ICN→NRT by WE/LJ/YP/BX · Effective 29Mar~24Oct26',
  },
  {
    id: 'default-ws-080',
    airline: 'WestJet Cargo',
    airlineCode: 'WS',
    flightNo: 'WS 080',
    aircraftType: 'B789',
    flightType: 'cargo',
    origin: 'YYC',
    destination: 'NRT',
    departureDays: [0, 1, 2, 3, 4, 5, 6], // Daily (26Apr~24Oct26)
    departureTime: '14:50',
    arrivalTime: '16:20',
    flightDuration: '10h 30m',
    maxCargoKg: 20000,
    remarks: 'B789 · Effective 26Apr~24Oct26',
  },
  // ShunFeng Airlines (O3)
  {
    id: 'default-o3-6201',
    airline: 'ShunFeng Airlines',
    airlineCode: 'O3',
    flightNo: 'O3 6201',
    aircraftType: 'B757-200F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'PVG',
    departureDays: [0, 1, 2, 3, 4, 5, 6],
    departureTime: '02:00',
    arrivalTime: '03:30',
    flightDuration: '2h 30m',
    maxCargoKg: 25000,
  },
  {
    id: 'default-o3-6203',
    airline: 'ShunFeng Airlines',
    airlineCode: 'O3',
    flightNo: 'O3 6203',
    aircraftType: 'B767-300F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'SZX',
    departureDays: [0, 1, 3, 5],
    departureTime: '01:00',
    arrivalTime: '04:30',
    flightDuration: '4h 30m',
    maxCargoKg: 40000,
  },
  // Air Busan (BX)
  {
    id: 'default-bx-131',
    airline: 'Air Busan',
    airlineCode: 'BX',
    flightNo: 'BX 131',
    aircraftType: 'A321-200',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'FUK',
    departureDays: [0, 1, 2, 3, 4, 5, 6],
    departureTime: '09:30',
    arrivalTime: '11:00',
    flightDuration: '1h 30m',
    maxCargoKg: 2000,
    remarks: 'Belly cargo only',
  },
  {
    id: 'default-bx-173',
    airline: 'Air Busan',
    airlineCode: 'BX',
    flightNo: 'BX 173',
    aircraftType: 'A321-200',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'KIX',
    departureDays: [0, 1, 2, 3, 4, 5, 6],
    departureTime: '10:15',
    arrivalTime: '12:00',
    flightDuration: '2h',
    maxCargoKg: 2000,
    remarks: 'Belly cargo only',
  },
  {
    id: 'default-bx-741',
    airline: 'Air Busan',
    airlineCode: 'BX',
    flightNo: 'BX 741',
    aircraftType: 'A321-200',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'CEB',
    departureDays: [2, 4, 6],
    departureTime: '08:00',
    arrivalTime: '11:30',
    flightDuration: '4h 30m',
    maxCargoKg: 2000,
    remarks: 'Belly cargo only',
  },
  {
    id: 'default-bx-395',
    airline: 'Air Busan',
    airlineCode: 'BX',
    flightNo: 'BX 395',
    aircraftType: 'A321-200',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'NRT',
    departureDays: [0, 1, 2, 3, 4, 5, 6],
    departureTime: '14:00',
    arrivalTime: '16:20',
    flightDuration: '2h 20m',
    maxCargoKg: 2000,
    remarks: 'Belly cargo only',
  },
  // Aero Mongolia (M0)
  {
    id: 'default-m0-562',
    airline: 'Aero Mongolia',
    airlineCode: 'M0',
    flightNo: 'M0 562',
    aircraftType: 'B737-800',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'UBN',
    departureDays: [0, 1, 3, 5],
    departureTime: '10:00',
    arrivalTime: '12:30',
    flightDuration: '3h 30m',
    maxCargoKg: 3000,
  },
  {
    id: 'default-m0-564',
    airline: 'Aero Mongolia',
    airlineCode: 'M0',
    flightNo: 'M0 564',
    aircraftType: 'B737-800',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'UBN',
    departureDays: [2, 4, 6],
    departureTime: '15:00',
    arrivalTime: '17:30',
    flightDuration: '3h 30m',
    maxCargoKg: 3000,
  },
  // Aeroflot (SU) — ICN-BKK-SVO transit via LJ/TG feeder · Single B/L
  // (Direct ICN-SVO suspended due to sanctions; cargo routed via BKK)
  // ── ICN→BKK feeder flights ──
  // LJ001 rollover handled via effectiveFrom/To (see flight-schedule-effective-window PDCA)
  {
    id: 'default-lj-001-apr10',
    airline: 'Jin Air (feeder for SU)',
    airlineCode: 'LJ',
    flightNo: 'LJ 001',
    aircraftType: 'B737-800',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'BKK',
    departureDays: [0, 1, 2, 3, 4, 5, 6], // DAILY — 10-14 APR 2026
    departureTime: '17:10',
    arrivalTime: '21:10',
    flightDuration: '6h 00m',
    maxCargoKg: 3000,
    remarks: 'SU feeder · KAS T2 · AS45 · Cut-off D-day 12:00 · N/B & MSDS pre-confirm required',
    effectiveFrom: '2026-04-10',
    effectiveTo: '2026-04-14',
  },
  {
    id: 'default-lj-001-apr15',
    airline: 'Jin Air (feeder for SU)',
    airlineCode: 'LJ',
    flightNo: 'LJ 001',
    aircraftType: 'B737-800',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'BKK',
    departureDays: [1, 3, 4, 5, 6], // D1,3,4,5,6 (Mon, Wed, Thu, Fri, Sat) — 15-25 APR 2026
    departureTime: '19:55',
    arrivalTime: '23:55',
    flightDuration: '6h 00m',
    maxCargoKg: 3000,
    remarks: 'SU feeder · KAS T2 · AS45 · Cut-off D-day 12:00 · N/B & MSDS pre-confirm required',
    effectiveFrom: '2026-04-15',
    effectiveTo: '2026-04-25',
  },
  {
    id: 'default-tg-659',
    airline: 'Thai Airways (feeder for SU)',
    airlineCode: 'TG',
    flightNo: 'TG 659',
    aircraftType: 'A350-900',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'BKK',
    departureDays: [0, 1, 2, 3, 4, 5, 6],
    departureTime: '09:35',
    arrivalTime: '13:25',
    flightDuration: '5h 50m',
    maxCargoKg: 15000,
    remarks: 'SU feeder · AACT T2 · AS100 · Cut-off D-1 18:00 (AWB 20:00)',
  },
  {
    id: 'default-tg-657',
    airline: 'Thai Airways (feeder for SU)',
    airlineCode: 'TG',
    flightNo: 'TG 657',
    aircraftType: 'A350-900',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'BKK',
    departureDays: [0, 1, 2, 3, 4, 5, 6],
    departureTime: '10:20',
    arrivalTime: '14:10',
    flightDuration: '5h 50m',
    maxCargoKg: 15000,
    remarks: 'SU feeder · AACT T2 · AS100 · Cut-off D-1 18:00 (AWB 20:00)',
  },
  {
    id: 'default-tg-653',
    airline: 'Thai Airways (feeder for SU)',
    airlineCode: 'TG',
    flightNo: 'TG 653',
    aircraftType: 'A350-900',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'BKK',
    departureDays: [0, 1, 2, 3, 4, 5, 6],
    departureTime: '16:55',
    arrivalTime: '20:45',
    flightDuration: '5h 50m',
    maxCargoKg: 15000,
    remarks: 'SU feeder · AACT T2 · AS100 · Cut-off D-day 12:00 (AWB 14:00)',
  },
  // ── BKK→SVO main Aeroflot flights ──
  {
    id: 'default-su-273',
    airline: 'Aeroflot',
    airlineCode: 'SU',
    flightNo: 'SU 273',
    aircraftType: 'B777-300',
    flightType: 'passenger',
    origin: 'BKK',
    destination: 'SVO',
    departureDays: [0, 1, 2, 3, 4, 5, 6],
    departureTime: '13:20',
    arrivalTime: '19:00',
    flightDuration: '10h 40m',
    maxCargoKg: 20000,
    remarks: 'DAILY · ICN feeder via LJ001 / TG659 / TG657 / TG653 · Single B/L ICN-BKK-SVO',
  },
  {
    id: 'default-su-271',
    airline: 'Aeroflot',
    airlineCode: 'SU',
    flightNo: 'SU 271',
    aircraftType: 'B777-300',
    flightType: 'passenger',
    origin: 'BKK',
    destination: 'SVO',
    departureDays: [3, 6], // D3=Wed, D6=Sat
    departureTime: '10:15',
    arrivalTime: '16:25',
    flightDuration: '10h 10m',
    maxCargoKg: 20000,
    remarks: 'D3,D6 · ICN feeder via LJ/TG · Single B/L ICN-BKK-SVO',
  },
  {
    id: 'default-su-575',
    airline: 'Aeroflot',
    airlineCode: 'SU',
    flightNo: 'SU 575',
    aircraftType: 'B777-300',
    flightType: 'passenger',
    origin: 'BKK',
    destination: 'SVO',
    departureDays: [1, 5], // D1=Mon, D5=Fri
    departureTime: '14:40',
    arrivalTime: '20:50',
    flightDuration: '10h 10m',
    maxCargoKg: 20000,
    remarks: 'D1,D5 · ICN feeder via LJ/TG · Single B/L ICN-BKK-SVO',
  },
  {
    id: 'default-su-581',
    airline: 'Aeroflot',
    airlineCode: 'SU',
    flightNo: 'SU 581',
    aircraftType: 'B777-300',
    flightType: 'passenger',
    origin: 'BKK',
    destination: 'SVO',
    departureDays: [4, 0], // D4=Thu, D7=Sun
    departureTime: '10:15',
    arrivalTime: '16:00',
    flightDuration: '9h 45m',
    maxCargoKg: 20000,
    remarks: 'D4,D7 · ICN feeder via LJ/TG · Single B/L ICN-BKK-SVO',
  },
  // CMA CGM Air Cargo (2C) — operated as 5Y, AWB prefix 003 · Effective 01APR26-UFN
  {
    id: 'default-5y-8527',
    airline: 'CMA CGM Air Cargo',
    airlineCode: '2C',
    flightNo: '5Y 8527',
    aircraftType: 'B777-200F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'HAN',
    departureDays: [2], // D3 = Tuesday
    departureTime: '21:45',
    arrivalTime: '00:55',
    flightDuration: '4h 10m',
    maxCargoKg: 100000,
    remarks: 'AACT T1 · Cut-off 4h prior (D3: 1745L) · AWB: 003',
  },
  {
    id: 'default-5y-8529',
    airline: 'CMA CGM Air Cargo',
    airlineCode: '2C',
    flightNo: '5Y 8529',
    aircraftType: 'B777-200F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'HAN',
    departureDays: [4], // D5 = Thursday
    departureTime: '18:45',
    arrivalTime: '21:55',
    flightDuration: '4h 10m',
    maxCargoKg: 100000,
    remarks: 'AACT T1 · Cut-off 4h prior (1445L) · AWB: 003',
  },
  {
    id: 'default-5y-8531',
    airline: 'CMA CGM Air Cargo',
    airlineCode: '2C',
    flightNo: '5Y 8531',
    aircraftType: 'B777-200F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'HAN',
    departureDays: [6], // D7 = Saturday
    departureTime: '18:45',
    arrivalTime: '21:55',
    flightDuration: '4h 10m',
    maxCargoKg: 100000,
    remarks: 'AACT T1 · Cut-off 4h prior (1445L) · AWB: 003',
  },
  // Aeromexico Cargo (AM) — via Globe Air Cargo / ECS Group
  {
    id: 'default-am-091',
    airline: 'Aeromexico Cargo',
    airlineCode: 'AM',
    flightNo: 'AM 091',
    aircraftType: 'B787-8/9',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'MEX',
    departureDays: [0, 1, 2, 3, 4, 5, 6], // DAILY (effective 31MAR26, summer schedule)
    departureTime: '11:40',
    arrivalTime: '10:35',
    flightDuration: '13h 55m',
    maxCargoKg: 15000,
    remarks:
      'Belly cargo · B788/9 · Via MEX: MTY/GDL(W/B&N/B&RFS), CUN(N/B) · GRU/EZE(W/B), LIM/BOG/MDE/GUA/SJO/SDQ(N/B)',
  },
  // Air Premia (YP) — APR 2026 Schedule (2026.4.1~4.30), B787-9, belly cargo
  {
    id: 'default-yp-101',
    airline: 'Air Premia',
    airlineCode: 'YP',
    flightNo: 'YP 101',
    aircraftType: 'B787-9',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'LAX',
    departureDays: [0, 1, 2, 3, 4, 5, 6], // Daily
    departureTime: '13:20',
    arrivalTime: '08:20',
    flightDuration: '11h',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · CNXL 22APR',
  },
  {
    id: 'default-yp-103',
    airline: 'Air Premia',
    airlineCode: 'YP',
    flightNo: 'YP 103',
    aircraftType: 'B787-9',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'LAX',
    departureDays: [0, 1, 3, 5], // Mon/Wed/Fri/Sun
    departureTime: '22:20',
    arrivalTime: '17:20',
    flightDuration: '11h',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · Night LAX · CNXL 20APR, CNXL 26APR',
  },
  {
    id: 'default-yp-131',
    airline: 'Air Premia',
    airlineCode: 'YP',
    flightNo: 'YP 131',
    aircraftType: 'B787-9',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'EWR',
    departureDays: [0, 1, 2, 3, 4, 6], // Daily except Sat
    departureTime: '21:55',
    arrivalTime: '22:30',
    flightDuration: '14h 35m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · Newark (New York)',
  },
  {
    id: 'default-yp-135',
    airline: 'Air Premia',
    airlineCode: 'YP',
    flightNo: 'YP 135',
    aircraftType: 'B787-9',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'IAD',
    departureDays: [0, 1, 3, 5], // Mon/Wed/Fri/Sun
    departureTime: '10:00',
    arrivalTime: '10:50',
    flightDuration: '13h 50m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · Washington Dulles · NEW from 24APR',
  },
  {
    id: 'default-yp-111',
    airline: 'Air Premia',
    airlineCode: 'YP',
    flightNo: 'YP 111',
    aircraftType: 'B787-9',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'SFO',
    departureDays: [0, 1, 3, 5], // Mon/Wed/Fri/Sun
    departureTime: '18:55',
    arrivalTime: '13:00',
    flightDuration: '10h 05m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo',
  },
  {
    id: 'default-yp-151',
    airline: 'Air Premia',
    airlineCode: 'YP',
    flightNo: 'YP 151',
    aircraftType: 'B787-9',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'HNL',
    departureDays: [0, 1, 3], // Mon/Wed/Sun (CNXL 12/19APR on Sat)
    departureTime: '22:50',
    arrivalTime: '12:10',
    flightDuration: '7h 20m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · Honolulu · CNXL 12/19APR',
  },
  {
    id: 'default-yp-731',
    airline: 'Air Premia',
    airlineCode: 'YP',
    flightNo: 'YP 731',
    aircraftType: 'B787-9',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'NRT',
    departureDays: [0, 1, 2, 3, 4, 5, 6], // Daily
    departureTime: '08:45',
    arrivalTime: '11:20',
    flightDuration: '2h 35m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · Narita',
  },
  {
    id: 'default-yp-733',
    airline: 'Air Premia',
    airlineCode: 'YP',
    flightNo: 'YP 733',
    aircraftType: 'B787-9',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'NRT',
    departureDays: [2], // Tue only
    departureTime: '09:25',
    arrivalTime: '12:00',
    flightDuration: '2h 35m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · Narita · Tue only',
  },
  {
    id: 'default-yp-735',
    airline: 'Air Premia',
    airlineCode: 'YP',
    flightNo: 'YP 735',
    aircraftType: 'B787-9',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'NRT',
    departureDays: [1, 4, 5, 0], // Mon/Thu/Fri/Sun
    departureTime: '13:50',
    arrivalTime: '16:30',
    flightDuration: '2h 40m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · 2nd daily NRT · CNXL 26/27APR · 24APR only, 30APR operate',
  },
  {
    id: 'default-yp-601',
    airline: 'Air Premia',
    airlineCode: 'YP',
    flightNo: 'YP 601',
    aircraftType: 'B787-9',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'BKK',
    departureDays: [0, 1, 2, 4, 5], // Mon/Tue/Thu/Fri/Sun
    departureTime: '17:15',
    arrivalTime: '21:10',
    flightDuration: '5h 55m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · Bangkok',
  },
  {
    id: 'default-yp-621',
    airline: 'Air Premia',
    airlineCode: 'YP',
    flightNo: 'YP 621',
    aircraftType: 'B787-9',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'DAD',
    departureDays: [0, 2, 3, 6], // Tue/Wed/Sat/Sun
    departureTime: '17:45',
    arrivalTime: '20:45',
    flightDuration: '5h',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · Da Nang',
  },
  {
    id: 'default-yp-801',
    airline: 'Air Premia',
    airlineCode: 'YP',
    flightNo: 'YP 801',
    aircraftType: 'B787-9',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'HKG',
    departureDays: [0, 1, 3, 5], // Mon/Wed/Fri/Sun
    departureTime: '09:05',
    arrivalTime: '12:00',
    flightDuration: '3h 55m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · Hong Kong',
  },
  // Condor Airlines (DE)
  {
    id: 'default-de-2025',
    airline: 'Condor Airlines',
    airlineCode: 'DE',
    flightNo: 'DE 2025',
    aircraftType: 'A330-900neo',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'FRA',
    departureDays: [2, 4, 6],
    departureTime: '13:00',
    arrivalTime: '18:30',
    flightDuration: '11h 30m',
    maxCargoKg: 10000,
    remarks: 'Seasonal (Summer IATA schedule)',
  },
  {
    id: 'default-de-2027',
    airline: 'Condor Airlines',
    airlineCode: 'DE',
    flightNo: 'DE 2027',
    aircraftType: 'A330-900neo',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'FRA',
    departureDays: [1, 3, 5],
    departureTime: '14:30',
    arrivalTime: '20:00',
    flightDuration: '11h 30m',
    maxCargoKg: 10000,
    remarks: 'Seasonal (Summer IATA schedule)',
  },

  // ═══════════════════════════════════════════════════════════════
  // t'way Air (TW) — via Extrans Air
  // ═══════════════════════════════════════════════════════════════

  // Canada
  {
    id: 'default-tw-531',
    airline: "t'way Air",
    airlineCode: 'TW',
    flightNo: 'TW 531',
    aircraftType: 'A333',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'YVR',
    departureDays: [1, 3, 5, 6], // D2467
    departureTime: '21:20',
    arrivalTime: '15:25',
    flightDuration: '10h 05m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · W8 interline via YVR→YHM→YYZ · RFS: YVR→YEG, YVR→YYC',
  },
  // Asia
  {
    id: 'default-tw-243',
    airline: "t'way Air",
    airlineCode: 'TW',
    flightNo: 'TW 243',
    aircraftType: 'B738',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'NRT',
    departureDays: [0, 1, 2, 3, 4, 5, 6], // Daily
    departureTime: '10:20',
    arrivalTime: '12:50',
    flightDuration: '2h 30m',
    maxCargoKg: 5000,
    remarks: 'Belly cargo · From Mar 2026',
  },
  {
    id: 'default-tw-155',
    airline: "t'way Air",
    airlineCode: 'TW',
    flightNo: 'TW 155',
    aircraftType: 'A333',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'CGK',
    departureDays: [0, 2, 4, 5, 6], // D13567
    departureTime: '15:10',
    arrivalTime: '20:10',
    flightDuration: '7h',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · NEW from Apr 2026',
  },
  // Europe
  {
    id: 'default-tw-401',
    airline: "t'way Air",
    airlineCode: 'TW',
    flightNo: 'TW 401',
    aircraftType: 'A332',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'CDG',
    departureDays: [0, 2, 4, 5, 6], // D13567
    departureTime: '09:50',
    arrivalTime: '16:50',
    flightDuration: '13h',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · RFS: CDG→EU',
  },
  {
    id: 'default-tw-403',
    airline: "t'way Air",
    airlineCode: 'TW',
    flightNo: 'TW 403',
    aircraftType: 'A332',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'FRA',
    departureDays: [0, 2, 4, 6], // D1357
    departureTime: '09:35',
    arrivalTime: '16:00',
    flightDuration: '12h 25m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · RFS: FRA→EU',
  },
  {
    id: 'default-tw-405',
    airline: "t'way Air",
    airlineCode: 'TW',
    flightNo: 'TW 405',
    aircraftType: 'A332',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'FCO',
    departureDays: [1, 2], // D23 (A332)
    departureTime: '11:00',
    arrivalTime: '17:00',
    flightDuration: '12h',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · RFS: FCO→MXP (TW CONSOL TRUCK)',
  },
  {
    id: 'default-tw-407',
    airline: "t'way Air",
    airlineCode: 'TW',
    flightNo: 'TW 407',
    aircraftType: 'A332',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'BCN',
    departureDays: [0, 1, 2, 4, 5], // D15 (A332) + D36 (B773)
    departureTime: '11:30',
    arrivalTime: '18:25',
    flightDuration: '13h 55m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · A332(D15)/B773(D36) · RFS: BCN→EU',
  },

  // ═══════════════════════════════════════════════════════════════
  // Starlux Airlines (JX) — via Daejoo Air Agencies
  // From Jun 1, 2026
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'default-jx-901',
    airline: 'Starlux Airlines',
    airlineCode: 'JX',
    flightNo: 'JX 901',
    aircraftType: 'A350',
    flightType: 'passenger',
    origin: 'PUS',
    destination: 'TPE',
    departureDays: [1, 3], // Mon/Wed
    departureTime: '12:30',
    arrivalTime: '13:45',
    flightDuration: '2h 15m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · PUS-TPE · From Jun 2026 · Hub: TPE→LAX/ONT/SFO/SEA/PHX',
  },
  {
    id: 'default-jx-903',
    airline: 'Starlux Airlines',
    airlineCode: 'JX',
    flightNo: 'JX 903',
    aircraftType: 'A350',
    flightType: 'passenger',
    origin: 'PUS',
    destination: 'TPE',
    departureDays: [0, 2, 4, 5, 6], // Tue/Thu/Fri/Sat/Sun
    departureTime: '18:55',
    arrivalTime: '20:15',
    flightDuration: '2h 20m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · PUS-TPE · From Jun 2026 · Hub: TPE→LAX/ONT/SFO/SEA/PHX',
  },

  // ═══════════════════════════════════════════════════════════════
  // Korean Air Cargo (KE) — via Apexlogistics
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'default-ke-8231',
    airline: 'Korean Air Cargo',
    airlineCode: 'KE',
    flightNo: 'KE 8231',
    aircraftType: 'B777-200F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'ORD',
    departureDays: [5], // D6 = Sat (Note: schedule says D6)
    departureTime: '02:00',
    arrivalTime: '01:45',
    flightDuration: '12h 45m',
    maxCargoKg: 100000,
    remarks: 'Freighter · Jan~Dec SKD',
  },

  // ═══════════════════════════════════════════════════════════════
  // United Cargo (UA) — via Apexlogistics
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'default-ua-806',
    airline: 'United Cargo',
    airlineCode: 'UA',
    flightNo: 'UA 806',
    aircraftType: 'B787-200',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'SFO',
    departureDays: [0, 1, 2], // D1, D2, D3
    departureTime: '12:45',
    arrivalTime: '06:20',
    flightDuration: '10h 35m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · UFN',
  },
  {
    id: 'default-ua-892',
    airline: 'United Cargo',
    airlineCode: 'UA',
    flightNo: 'UA 892',
    aircraftType: 'B777-200',
    flightType: 'passenger',
    origin: 'ICN',
    destination: 'SFO',
    departureDays: [3, 5], // D4, D6
    departureTime: '18:00',
    arrivalTime: '11:40',
    flightDuration: '10h 40m',
    maxCargoKg: 15000,
    remarks: 'Belly cargo · UFN',
  },

  // ═══════════════════════════════════════════════════════════════
  // Atlas Air (5Y) — via Apexlogistics · ICN→HAN / ICN→TPE
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'default-5y-8121',
    airline: 'Atlas Air',
    airlineCode: '5Y',
    flightNo: '5Y 8121',
    aircraftType: 'B747-8F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'HAN',
    departureDays: [0], // D1
    departureTime: '11:40',
    arrivalTime: '15:00',
    flightDuration: '4h 20m',
    maxCargoKg: 130000,
    remarks: 'Freighter · Jan UFN',
  },
  {
    id: 'default-5y-8123',
    airline: 'Atlas Air',
    airlineCode: '5Y',
    flightNo: '5Y 8123',
    aircraftType: 'B747-400F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'HAN',
    departureDays: [3], // D4
    departureTime: '03:45',
    arrivalTime: '07:05',
    flightDuration: '4h 20m',
    maxCargoKg: 110000,
    remarks: 'Freighter · Jan UFN',
  },
  {
    id: 'default-5y-8246',
    airline: 'Atlas Air',
    airlineCode: '5Y',
    flightNo: '5Y 8246',
    aircraftType: 'B747-400F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'HAN',
    departureDays: [5], // D6
    departureTime: '06:15',
    arrivalTime: '09:35',
    flightDuration: '4h 20m',
    maxCargoKg: 110000,
    remarks: 'Freighter · Jan UFN',
  },
  {
    id: 'default-5y-8559',
    airline: 'Atlas Air',
    airlineCode: '5Y',
    flightNo: '5Y 8559',
    aircraftType: 'B747-400F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'HAN',
    departureDays: [6], // D7
    departureTime: '00:55',
    arrivalTime: '04:15',
    flightDuration: '4h 20m',
    maxCargoKg: 110000,
    remarks: 'Freighter · Jan UFN',
  },
  {
    id: 'default-5y-8993',
    airline: 'Atlas Air',
    airlineCode: '5Y',
    flightNo: '5Y 8993',
    aircraftType: 'B747-400F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'TPE',
    departureDays: [3], // D4
    departureTime: '10:50',
    arrivalTime: '12:45',
    flightDuration: '2h 55m',
    maxCargoKg: 110000,
    remarks: 'Freighter · Jan UFN',
  },
  {
    id: 'default-5y-8995',
    airline: 'Atlas Air',
    airlineCode: '5Y',
    flightNo: '5Y 8995',
    aircraftType: 'B747-8F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'TPE',
    departureDays: [5], // D6 (note: image seems to show different, using D6)
    departureTime: '15:50',
    arrivalTime: '17:40',
    flightDuration: '2h 50m',
    maxCargoKg: 130000,
    remarks: 'Freighter · Jan UFN',
  },
  // Parata Air (WE / 884-) — Effective 01~15APR2026
  // Cut-off: WE501/503/511 전날 18:00 (협의 가능), WE201 당일 14:30
  // Prefix 884, 반입 AACT 1 터미널, CSD 서류 필수
  // CGC 3,000원/MAWB, CCA 70,000원/MAWB
  // A320 운항: PC 당 최대 60KG, 100x70x70cm 이하
  // ELI/ELM 충전율 30% 이하만 진행 가능 (KIX 노선은 ELI/ELM 불가)
  {
    id: 'default-we-501',
    airline: 'Parata Air',
    airlineCode: 'WE',
    flightNo: 'WE 501',
    aircraftType: 'A332',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'NRT',
    departureDays: [0, 1, 2, 3, 4, 5, 6], // DAILY
    departureTime: '09:50',
    arrivalTime: '12:00',
    flightDuration: '2h 10m',
    maxCargoKg: 25000,
    remarks: 'A332 (W/B) · Cut-off 전날 18:00 · NRT (IACT)',
  },
  {
    id: 'default-we-503',
    airline: 'Parata Air',
    airlineCode: 'WE',
    flightNo: 'WE 503',
    aircraftType: 'A332',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'NRT',
    departureDays: [0, 1, 2, 3, 4, 5, 6], // DAILY
    departureTime: '11:20',
    arrivalTime: '13:50',
    flightDuration: '2h 30m',
    maxCargoKg: 25000,
    remarks: 'A332 (W/B) · 4월 8일부 운항 · Cut-off 전날 18:00 · NRT (IACT)',
  },
  {
    id: 'default-we-511',
    airline: 'Parata Air',
    airlineCode: 'WE',
    flightNo: 'WE 511',
    aircraftType: 'A320',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'KIX',
    departureDays: [0, 1, 2, 3, 4, 5, 6], // DAILY
    departureTime: '11:10',
    arrivalTime: '12:55',
    flightDuration: '1h 45m',
    maxCargoKg: 8000,
    remarks: 'A320 (N/B) · PC당 60KG/100x70x70cm 제한 · ELI/ELM 불가 · KIX (CKTS)',
  },
  {
    id: 'default-we-201',
    airline: 'Parata Air',
    airlineCode: 'WE',
    flightNo: 'WE 201',
    aircraftType: 'A332',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'DAD',
    departureDays: [0, 1, 2, 3, 4, 5, 6], // DAILY
    departureTime: '18:30',
    arrivalTime: '21:10',
    flightDuration: '4h 40m',
    maxCargoKg: 25000,
    remarks: 'A332 (W/B) · Cut-off 당일 14:30 · DAD (SAGS)',
  },
  // MASair (M7) — ICN-NLU, effective 17Apr26, 2x/week (via PAA)
  {
    id: 'default-m7-3629',
    airline: 'MASair',
    airlineCode: 'M7',
    flightNo: 'M7 3629',
    aircraftType: 'A332F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'NLU',
    departureDays: [1], // Monday
    departureTime: '14:50',
    arrivalTime: '23:55(-1)',
    flightDuration: '15h 05m',
    maxCargoKg: 45000,
    remarks: 'A332F · Effective 17Apr26 · UIO/BOG/VCP 연결서비스',
  },
  {
    id: 'default-m7-3228',
    airline: 'MASair',
    airlineCode: 'M7',
    flightNo: 'M7 3228',
    aircraftType: 'A332F',
    flightType: 'cargo',
    origin: 'ICN',
    destination: 'NLU',
    departureDays: [5], // Friday
    departureTime: '08:25',
    arrivalTime: '17:30',
    flightDuration: '15h 05m',
    maxCargoKg: 45000,
    remarks: 'A332F · Effective 17Apr26 · UIO/BOG/VCP 연결서비스',
  },
];

/** Color classes per airline code */
export const AIRLINE_COLORS: Record<
  string,
  { bg: string; text: string; border: string; badge: string }
> = {
  WS: {
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
    badge: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  },
  O3: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  },
  BX: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  },
  M0: {
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    badge: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
  },
  SU: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  },
  '2C': {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
  },
  AM: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  },
  YP: {
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    badge: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  },
  DE: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
    badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  },
  WE: {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
    badge: 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300',
  },
  M7: {
    bg: 'bg-lime-50 dark:bg-lime-900/20',
    text: 'text-lime-700 dark:text-lime-300',
    border: 'border-lime-200 dark:border-lime-800',
    badge: 'bg-lime-100 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300',
  },
};

/** Hex colors per airline code — used by route map components (SVG & 3D) */
export const AIRLINE_HEX_COLORS: Record<string, string> = {
  WS: '#2dd4bf', // teal-400
  O3: '#fb923c', // orange-400
  BX: '#60a5fa', // blue-400
  M0: '#38bdf8', // sky-400
  SU: '#f87171', // red-400
  '2C': '#fb7185', // rose-400
  AM: '#34d399', // emerald-400
  YP: '#a78bfa', // violet-400
  DE: '#facc15', // yellow-400
  WE: '#f472b6', // pink-400
  M7: '#a3e635', // lime-400
};

export const DEFAULT_HEX_COLOR = '#94a3b8'; // slate-400

/** Get Tailwind color classes for an airline code (with fallback) */
export const getAirlineColors = (code: string) =>
  AIRLINE_COLORS[code] || {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
    badge: 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300',
  };

/** Day labels for display */
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_LABELS_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;
