import { useState, useEffect, useCallback } from 'react';
import { getMarginRules, type MarginRule } from '@/api/marginRuleApi';

export function useMarginRules() {
  const [rules, setRules] = useState<MarginRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMarginRules();
      setRules(data.rules);
    } catch {
      // silent — widget shows fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  return { rules, loading, refetch: fetchRules };
}
