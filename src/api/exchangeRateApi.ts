import { fetchWithRetry } from '@/lib/fetchWithRetry';
import type { ExchangeRate, ExchangeRateResponse } from '@/types/dashboard';

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
 * Fetch exchange rates from ExchangeRate-API (free tier, 1500 req/month).
 * Returns rates as "1 foreign currency = X KRW".
 * Uses localStorage to cache previous rates for real change calculation.
 */
export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  return fetchWithRetry(async () => {
    // Free API: https://open.er-api.com/v6/latest/KRW
    const res = await fetch('https://open.er-api.com/v6/latest/KRW');
    if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);

    const data: ExchangeRateResponse = await res.json();
    if (data.result !== 'success') throw new Error('Exchange rate API returned error');

    const conversionRates = data.rates;
    if (!conversionRates) throw new Error('Exchange rate API: missing rates data');

    const cached = getPreviousRates();

    // Build current inverted rates for caching
    const currentInverted: Record<string, number> = {};

    const result = TARGET_CURRENCIES.map(({ currency, code, flag }) => {
      const ratePerKRW = conversionRates[currency];
      if (!ratePerKRW || ratePerKRW === 0) {
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
      // Convert: 1 KRW = X foreign → invert to get "1 foreign = Y KRW"
      const rate = Math.round((1 / ratePerKRW) * 100) / 100;
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
