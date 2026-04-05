import { useState, useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/browser';
import { fetchJetFuelPrices } from '@/api/eiaApi';
import type { JetFuelPrice } from '@/api/eiaApi';

interface UseJetFuelPricesResult {
  data: JetFuelPrice[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useJetFuelPrices(weeks: number = 12): UseJetFuelPricesResult {
  const [data, setData] = useState<JetFuelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Intentional: reset fetch state when deps change (data-fetching pattern)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    fetchJetFuelPrices(weeks)
      .then((prices) => {
        if (!cancelled) setData(prices);
      })
      .catch((err) => {
        if (cancelled) return;
        Sentry.captureException(err);
        setError(
          err instanceof Error ? err.message : 'Failed to load jet fuel prices',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [weeks, reloadToken]);

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  return { data, loading, error, retry };
}
