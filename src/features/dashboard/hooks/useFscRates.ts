import { useMemo, useCallback } from 'react';
import type { FscRates } from '@/api/fscApi';
import { DEFAULT_FSC_PERCENT, DEFAULT_FSC_PERCENT_DHL } from '@/config/rates';

/**
 * FSC 표시는 `src/config/rates.ts`와 동일한 기본값을 씁니다.
 * (관리자 FSC 위젯과 대시보드 환율 위젯이 같은 숫자를 보여 주도록 맞춤.)
 * DB `/api/v1/fsc/rates`는 배포·DB 시드와 어긋날 수 있어 읽기 경로에서는 사용하지 않습니다.
 */
export function useFscRates() {
  const data = useMemo<FscRates>(
    () => ({
      rates: {
        UPS: { international: DEFAULT_FSC_PERCENT, domestic: DEFAULT_FSC_PERCENT },
        DHL: { international: DEFAULT_FSC_PERCENT_DHL, domestic: DEFAULT_FSC_PERCENT_DHL },
      },
      updatedAt: new Date().toISOString(),
    }),
    [],
  );

  const retry = useCallback(() => {}, []);

  return { data, loading: false, error: null as string | null, retry };
}
