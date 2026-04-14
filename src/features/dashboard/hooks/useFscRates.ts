import { useState, useEffect, useCallback } from 'react';
import { getFscRates, type FscRates } from '@/api/fscApi';
import { DEFAULT_FSC_PERCENT, DEFAULT_FSC_PERCENT_DHL } from '@/config/rates';

const DEFAULT_FSC_RATES: FscRates = {
  rates: {
    UPS: { international: DEFAULT_FSC_PERCENT, domestic: DEFAULT_FSC_PERCENT },
    DHL: { international: DEFAULT_FSC_PERCENT_DHL, domestic: DEFAULT_FSC_PERCENT_DHL },
  },
  updatedAt: new Date().toISOString(),
};

export function useFscRates() {
  const [data, setData] = useState<FscRates>(DEFAULT_FSC_RATES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getFscRates();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FSC 요율 조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return { data, loading, error, retry: fetchRates };
}
