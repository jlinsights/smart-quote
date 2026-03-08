import { request } from './apiClient';
import type { LogisticsNews } from '@/types/dashboard';

export async function fetchLogisticsNews(): Promise<LogisticsNews[]> {
  return request<LogisticsNews[]>('/notices/news');
}

