import { fetchWithRetry } from '@/lib/fetchWithRetry';
import type { ExchangeRate } from '@/types/dashboard';

// Target currencies relevant for international logistics (KRW base)
const TARGET_CURRENCIES: { currency: string; code: string; flag: string }[] = [
  { currency: 'USD', code: 'USA', flag: '🇺🇸' },
  { currency: 'EUR', code: 'EUR', flag: '🇪🇺' },
  { currency: 'JPY', code: 'JPN', flag: '🇯🇵' },
  { currency: 'CNY', code: 'CHN', flag: '🇨🇳' },
  { currency: 'GBP', code: 'GBR', flag: '🇬🇧' },
  { currency: 'SGD', code: 'SGP', flag: '🇸🇬' },
];

const CACHE_KEY = 'exchange_rates_prev';

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
}

function getPreviousRates(): CachedRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedRates) : null;
  } catch {
    return null;
  }
}

function savePreviousRates(rates: Record<string, number>) {
  try {
    const data: CachedRates = { rates, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable — ignore
  }
}

/**
 * Fetch exchange rates from openexchangerates.org.
 * Requires VITE_OPEN_EXCHANGE_APP_ID in .env.
 * API returns USD base rates, which are then converted to KRW base.
 * Uses localStorage to cache previous rates for real change calculation.
 */
export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  return fetchWithRetry(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appId = (import.meta as any).env.VITE_OPEN_EXCHANGE_APP_ID;
    if (!appId) {
      throw new Error('OpenExchangeRates API require VITE_OPEN_EXCHANGE_APP_ID in .env');
    }

    const res = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${appId}`);
    if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);

    const data = await res.json();
    const conversionRates = data.rates;
    if (!conversionRates || !conversionRates.KRW) throw new Error('Exchange rate API: missing rates data or KRW base');

    const cached = getPreviousRates();
    const currentInverted: Record<string, number> = {};
    const krwRate = conversionRates.KRW; // 1 USD = X KRW

    const result = TARGET_CURRENCIES.map(({ currency, code, flag }) => {
      const rateInUSD = conversionRates[currency]; // 1 USD = Y Currency
      
      if (!rateInUSD || rateInUSD === 0) {
        return {
          currency,
          code,
          flag,
          rate: 0,
          previousClose: 0,
          change: 0,
          changePercent: 0,
          trend: 'flat' as const,
        };
      }
      
      // Calculate: 1 Currency = (KRW / Currency) KRW
      // e.g., 1 EUR = 1400 / 0.92 = 1521.74 KRW
      // For USD, conversionRates.USD is 1, so 1 USD = 1400 / 1 = 1400 KRW
      const rate = Math.round((krwRate / rateInUSD) * 100) / 100;
      currentInverted[currency] = rate;

      // Use cached previous rate for real change calculation
      const previousClose = cached?.rates[currency] ?? rate;
      const change = Math.round((rate - previousClose) * 100) / 100;
      const changePercent =
        previousClose !== 0
          ? Math.round((change / previousClose) * 10000) / 100
          : 0;

      return {
        currency,
        code,
        flag,
        rate,
        previousClose,
        change,
        changePercent,
        trend: change > 0 ? ('up' as const) : change < 0 ? ('down' as const) : ('flat' as const),
      };
    });

    // Save current rates as "previous" for next fetch
    savePreviousRates(currentInverted);

    return result;
  });
}
