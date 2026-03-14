import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/browser';
import { getMarginRules, type MarginRule } from '@/api/marginRuleApi';

export function useMarginRules() {
  const [rules, setRules] = useState<MarginRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMarginRules();
      setRules(data.rules || []);
    } catch (e) {
      Sentry.captureException(e);
      setError(e instanceof Error ? e.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  return useMemo(() => ({
    rules,
    loading,
    error,
    refetch: fetchRules
  }), [rules, loading, error, fetchRules]);
}
