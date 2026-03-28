import { useState, useEffect, useMemo } from 'react';
import { resolveMargin, type ResolvedMargin } from '@/api/marginRuleApi';

export function useResolvedMargin(
  email?: string,
  nationality?: string,
  weight?: number
) {
  const [data, setData] = useState<ResolvedMargin | null>(null);

  // Stabilize weight before deps to prevent infinite API calls from floating-point jitter
  const stableWeight = weight !== undefined ? Math.round(weight * 100) / 100 : undefined;

  useEffect(() => {
    if (!email || stableWeight === undefined) return;

    resolveMargin(email, nationality || '', stableWeight)
      .then(setData)
      .catch(() => setData(null));
  }, [email, nationality, stableWeight]);

  return useMemo(() => ({ data }), [data]);
}
