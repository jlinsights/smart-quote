import { useState, useEffect, useCallback } from 'react';
import { fetchLogisticsNews } from '@/api/noticeApi';
import type { LogisticsNews } from '@/types/dashboard';

interface UseLogisticsNewsResult {
  data: LogisticsNews[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useLogisticsNews(): UseLogisticsNewsResult {
  const [data, setData] = useState<LogisticsNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const news = await fetchLogisticsNews();
      setData(news);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, retry: load };
}
