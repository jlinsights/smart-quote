import { useState, useEffect, useMemo } from 'react';
import { resolveMargin, type ResolvedMargin } from '@/api/marginRuleApi';

export function useResolvedMargin(
  email?: string,
  nationality?: string,
  weight?: number
) {
  const [data, setData] = useState<ResolvedMargin | null>(null);

  useEffect(() => {
    if (!email || weight === undefined) return;

    // Use rounded weight to avoid excessive API calls due to floating point precision jitter
    const roundedWeight = Math.round(weight * 100) / 100;

    resolveMargin(email, nationality || '', roundedWeight)
      .then(setData)
      .catch(() => setData(null));
  }, [email, nationality, weight]);

  return useMemo(() => ({ data }), [data]);
}
