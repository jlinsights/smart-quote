import { useState, useEffect, useCallback } from 'react';
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
      setRules(data.rules);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  return { rules, loading, error, refetch: fetchRules };
}
