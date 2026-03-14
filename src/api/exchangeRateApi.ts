import { fetchWithRetry } from '@/lib/fetchWithRetry';
import { API_URL } from '@/api/apiClient';
import type { ExchangeRate } from '@/types/dashboard';

/**
 * Fetch exchange rates from Rails caching proxy.
 * Backend handles OpenExchangeRates API calls with 1-hour cache.
 * Returns KRW-based rates for target currencies.
 * Note: Public endpoint — uses raw fetch with retry (no auth token needed).
 */
export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  return fetchWithRetry(async () => {
    const res = await fetch(`${API_URL}/api/v1/exchange_rates`);
    if (!res.ok) throw new Error(`Exchange rate proxy error: ${res.status}`);

    const data = await res.json();
    return data.rates as ExchangeRate[];
  });
}
