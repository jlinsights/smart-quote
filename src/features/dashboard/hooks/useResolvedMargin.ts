import { useState, useEffect } from 'react';
import { resolveMargin, type ResolvedMargin } from '@/api/marginRuleApi';

export function useResolvedMargin(
  email?: string,
  nationality?: string,
  weight?: number
) {
  const [data, setData] = useState<ResolvedMargin | null>(null);

  useEffect(() => {
    if (!email || weight === undefined) return;

    resolveMargin(email, nationality || '', weight)
      .then(setData)
      .catch(() => setData(null));
  }, [email, nationality, weight]);

  return { data };
}
