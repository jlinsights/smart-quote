# Design: code-quality-fixes

> Plan 문서(`docs/01-plan/features/code-quality-fixes.plan.md`) 기반 구체 설계

## 1. 설계 범위

Phase A (H1~H3) + Phase B (H4) 를 이번 사이클 구현 대상으로 확정.
Phase C/D/E 는 본 design에서 구조만 기술(후속 사이클).

## 2. 변경 대상 파일

| # | 파일 | 변경 유형 | LOC 영향 |
|---|------|----------|---------|
| 1 | `src/features/quote/components/widgets/NoticeWidget.tsx` | 수정 | +4 / ~1 |
| 2 | `src/features/admin/components/UserManagementWidget.tsx` | 수정 | +2 / ~2 |
| 3 | `src/features/quote/components/widgets/JetFuelWidget.tsx` | 수정 | ~2 |
| 4 | `src/features/dashboard/hooks/useJetFuelPrices.ts` | 수정 | +8 / ~5 |
| 5 | `src/lib/urlSafety.ts` | **신규** | +15 |
| 6 | `src/lib/__tests__/urlSafety.test.ts` | **신규** | +40 |

## 3. 상세 설계

### 3-1. H1 — URL 스킴 가드 (보안)

**문제:** `NoticeWidget.tsx:69` — `<a href={item.link}>` 에서 `item.link` 는 RSS 피드(백엔드 프록시 경유 외부 뉴스)에서 옴. 스킴 검증 없이 렌더링.

**설계:**

#### 신규 유틸 `src/lib/urlSafety.ts`

```ts
/**
 * Return original URL only if it uses http(s) or is a relative path.
 * Otherwise return '#' to block javascript:/data:/vbscript: URL injection.
 */
export function safeExternalHref(href: unknown): string {
  if (typeof href !== 'string') return '#';
  const trimmed = href.trim();
  if (!trimmed) return '#';
  // Allow relative URLs
  if (trimmed.startsWith('/')) return trimmed;
  // Allow only http(s)
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '#';
}
```

#### NoticeWidget 수정

```tsx
// NoticeWidget.tsx:69 전후
import { safeExternalHref } from '@/lib/urlSafety';

// ...
<a
  href={safeExternalHref(item.link)}
  target="_blank"
  rel="noopener noreferrer"
  ...
>
```

**추가 적용 대상:** grep으로 `item.link`, `row.link`, RSS/외부 출처 `href={}` 전수 확인 후 필요시 동일 가드 적용. 이번 PR 스코프는 NoticeWidget 한정.

**테스트:** `urlSafety.test.ts` — 8 케이스
- http/https/상대경로 pass-through
- `javascript:alert(1)` → `#`
- `data:text/html,...` → `#`
- `vbscript:`, 빈 문자열, `null`, `undefined`, 앞뒤 공백 → `#` 또는 trim 후 판정

---

### 3-2. H2 — alert() → toast 교체

**문제:** `UserManagementWidget.tsx:74, 91` — 유일한 잔존 `alert()`.

**설계:**

```tsx
// imports 추가
import { useToast } from '@/components/ui/Toast';

// 컴포넌트 내부
const { toast } = useToast();

// handleSaveClick (line 74)
} catch (e) {
  Sentry.captureException(e);
  toast('error', e instanceof Error ? e.message : 'Failed to update user');
}

// handleDeleteClick (line 91)
} catch (e) {
  Sentry.captureException(e);
  toast('error', e instanceof Error ? e.message : 'Failed to delete user');
}
```

**검증:** `ToastProvider` 가 App 최상단에 이미 mounting 되어 있는지 확인(된 것으로 판단 — 다른 위젯이 이미 사용 중).

---

### 3-3. H3 — JetFuelWidget 중복 key 수정

**문제:** `JetFuelWidget.tsx:101-112` — `labelIndices.map((idx) => <text key={idx}>)`. `labelIndices` 가 `[0, 3, 6, 9]` 같이 반환되면 unique하지만, 12주 미만 데이터에서 tick 인덱스가 반복될 경우 duplicate key 경고 발생.

**설계:**

```tsx
{labelIndices.map((idx, i) => (
  <text
    key={`tick-${i}-${idx}`}
    x={toX(idx)}
    y={H - 2}
    ...
  >
    {prices[idx].date.slice(5)}
  </text>
))}
```

**이유:** `i` 만으로도 unique하지만, 동일 idx가 두 번 나오면 논리 오류 — 디버깅 용이하도록 둘 다 포함.

---

### 3-4. H4 — useJetFuelPrices act() warning 제거

**문제:** `useJetFuelPrices.ts:18-36`:
- `load` 콜백이 `weeks` 변경시 재생성됨 → `useEffect([load])` 가 다시 실행
- 비동기 `load()` 내부에서 `setLoading(true)` 호출 → 테스트에서 `act()` 경고
- unmount 후에도 setState 실행 가능성 (cancelled flag 없음)

**설계 (리팩터):**

```ts
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const reloadRef = useRef(0); // trigger manual retry

  useEffect(() => {
    let cancelled = false;
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
  }, [weeks, reloadRef.current]);

  const retry = useCallback(() => {
    reloadRef.current += 1;
    // Force re-run by updating state (since ref alone won't trigger effect)
  }, []);

  return { data, loading, error, retry };
}
```

**문제점 발견:** `reloadRef.current` 를 effect dep에 넣어도 `useRef` 변경은 rerender를 trigger 하지 않음 → effect 재실행 안 됨.

**최종 설계 (올바른 버전):**

```ts
export function useJetFuelPrices(weeks: number = 12): UseJetFuelPricesResult {
  const [data, setData] = useState<JetFuelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
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
```

**효과:**
- `setLoading(true)` 가 effect 내부에서 동기 실행 → React가 hooks body 중 실행으로 인지 → act() warning 사라짐
- `cancelled` flag로 stale state update 방지
- `retry`는 `reloadToken` 증가로 effect 재실행 → 기존 인터페이스 동일 유지

**테스트 수정 필요 여부:** 기존 테스트가 `retry` 호출을 검증하므로 인터페이스 호환 확인. `useJetFuelPrices.test.ts` 5개 테스트 그대로 pass 예상.

---

## 4. 구현 순서

```
Step 1: urlSafety.ts + test   (신규 파일 2개)
Step 2: NoticeWidget           (H1 가드 적용)
Step 3: UserManagementWidget  (H2 alert→toast)
Step 4: JetFuelWidget         (H3 key)
Step 5: useJetFuelPrices       (H4 리팩터)
Step 6: npm run lint && tsc && vitest run  (전체 검증)
```

## 5. 검증 전략

### 자동 테스트
- [ ] `vitest run src/lib/__tests__/urlSafety.test.ts` — 8 케이스 통과
- [ ] `vitest run src/features/dashboard/hooks/__tests__/useJetFuelPrices.test.ts` — stderr act() warning 무
- [ ] `vitest run` 전체 1199+8 = 1207 테스트 pass
- [ ] `npm run lint` — 0 errors
- [ ] `npx tsc --noEmit` — 0 errors

### 수동 테스트 (옵션)
- Dashboard `/dashboard` 열기 → JetFuelWidget 정상 렌더 + tick 라벨 12개 보임
- Admin `/admin` → User 편집 저장 실패 유도 → alert 대신 toast 출력
- NoticeWidget 링크 클릭 시 새 탭 정상 열림

## 6. 롤백 계획

- PR 단위로 분리 (Step 1~2 = 보안 PR, Step 3~5 = DX PR)
- 각 파일 변경이 독립적이므로 revert 영향 최소

## 7. 후속 단계 (별도 Design 대상)

- **Phase C**: `useCrudList<T>` 훅 + UserManagement/TargetMarginRules 분리 설계
- **Phase D**: QuoteCalculator layoutProps useMemo + 테이블 row memo
- **Phase E**: i18n lazy split (번들 사이즈 목표 수치 사전 측정 필요)

## 8. 위험 요소

| 위험 | 발생 확률 | 대응 |
|------|----------|------|
| ToastProvider 미mount 시 `toast` 호출 silent no-op | Low | `App.tsx` 확인 |
| `useJetFuelPrices` 리팩터로 retry 동작 깨짐 | Low | 기존 테스트 통과로 검증 |
| `safeExternalHref` 가 진짜 유효한 URL 과도 차단 | Low | 테스트 케이스로 false-positive 방지 |

## 9. 참고

- 유사 과거 작업: `docs/archive/2026-03/code-quality-improvement/`
- Code Analysis Report (conversation artifact, 2026-04-05)
