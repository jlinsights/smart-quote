import { fetchWithRetry } from '@/lib/fetchWithRetry';
import type { ExchangeRate } from '@/types/dashboard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Fetch exchange rates from Rails caching proxy.
 * Backend handles OpenExchangeRates API calls with 1-hour cache.
 * Returns KRW-based rates for target currencies.
 */
export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  return fetchWithRetry(async () => {
    const res = await fetch(`${API_URL}/api/v1/exchange_rates`);
    if (!res.ok) throw new Error(`Exchange rate proxy error: ${res.status}`);

    const data = await res.json();
    return data.rates as ExchangeRate[];
  });
}
