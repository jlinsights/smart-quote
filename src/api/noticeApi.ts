import { fetchWithRetry } from '@/lib/fetchWithRetry';
import type { LogisticsNews, LogisticsNewsResponse } from '@/types/dashboard';

export async function fetchLogisticsNews(): Promise<LogisticsNews[]> {
  const data: LogisticsNewsResponse = await fetchWithRetry(async () => {
    const response = await fetch('/api/logistics-news');
    if (!response.ok) {
      throw new Error(`Logistics news API error: ${response.status}`);
    }
    return response.json();
  });

  return data.items;
}
