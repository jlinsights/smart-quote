import { request } from './apiClient';
import type { LogisticsNews } from '@/types/dashboard';

export async function fetchLogisticsNews(): Promise<LogisticsNews[]> {
  try {
    return await request<LogisticsNews[]>('/api/v1/notices/news');
  } catch {
    // RSS feeds may timeout or backend may be deploying — return empty gracefully
    return [];
  }
}

