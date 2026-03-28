# Design: fix-critical-issues

> Plan 문서 기반 상세 구현 설계

## 1. C-1: lookupCarrierRate 0원 견적 방지

### 현재 코드 (`calculationService.ts:86`)
```typescript
return 0;
```

### 변경 설계
```typescript
// calculationService.ts:86
throw new Error(`Rate not found for carrier zone=${zoneKey}, weight=${billableWeight}kg`);
```

### 영향 분석
- `lookupCarrierRate()`는 `calculateCarrierCosts()` (line 144) 에서 호출
- `calculateCarrierCosts()`는 `calculateQuote()` (line 262) 에서 호출
- `calculateQuote()` 호출부(`QuoteCalculator.tsx:69`)에서 이미 try-catch 처리:
  ```typescript
  try { result = calculateQuote(input); } catch { result = null; }
  ```
- result가 null이면 UI에 결과가 표시되지 않음 → 0원 견적보다 안전

### 테스트 추가
```typescript
// calculationService.test.ts에 추가
it('should throw when rate not found for invalid zone', () => {
  expect(() => lookupCarrierRate(
    { Z99: { 0.5: 100 } }, // invalid zone
    [], 'Z1', 10
  )).toThrow('Rate not found');
});
```

---

## 2. C-2: UPS 요율 갭 명시 (20.0~20.5kg)

### 현재 상태
- `UPS_EXACT_RATES`: Z1~Z10 각 0.5~20.0kg (0.5 단위)
- `UPS_RANGE_RATES`: min 20.5kg부터 시작
- 20.01~20.49kg → `roundToHalf`로 20.5 → exact에 없음 → fallback 로직(line 75-84)으로 처리

### 변경 설계
현재 fallback이 정상 동작하므로 **코드 변경 없이 주석으로 의도 명시**:

```typescript
// ups_tariff.ts:108 — 주석 추가
// Note: 20.01~20.49kg는 roundToHalf로 20.5가 되어 exact table에 없지만,
// lookupCarrierRate()의 fallback 로직(line 75-84)이 range rates의 첫 tier에서 처리.
// 이는 의도된 동작임 — UPS 공식 요금표가 20kg 초과분을 per-kg 단가로 계산하기 때문.
export const UPS_RANGE_RATES = [
```

### 검증
- 기존 parity test + 20.1kg, 20.5kg 수동 계산 대조

---

## 3. C-3: useResolvedMargin 무한 호출 방지

### 현재 코드 (`useResolvedMargin.ts:11-20`)
```typescript
useEffect(() => {
  if (!email || weight === undefined) return;
  const roundedWeight = Math.round(weight * 100) / 100;
  resolveMargin(email, nationality || '', roundedWeight)
    .then(setData)
    .catch(() => setData(null));
}, [email, nationality, weight]); // ← weight (raw) 가 deps
```

### 문제
`roundedWeight`를 내부에서 계산하지만, deps에는 raw `weight`가 있어 부동소수점 미세 변화마다 effect 재실행.

### 변경 설계
```typescript
// weight를 deps 전에 안정화
const stableWeight = weight !== undefined ? Math.round(weight * 100) / 100 : undefined;

useEffect(() => {
  if (!email || stableWeight === undefined) return;
  resolveMargin(email, nationality || '', stableWeight)
    .then(setData)
    .catch(() => setData(null));
}, [email, nationality, stableWeight]); // ← stableWeight 사용
```

---

## 4. H-1: totalCostAmount에 FSC 추가

### 현재 코드 (`calculationService.ts:317`)
```typescript
const totalCostAmount = baseRate + carrierResult.intlWarRisk + surgeCost + packingTotal + carrierAddOnTotal + destDuty + pickupInSeoul;
```

### 문제
FSC는 캐리어에게 지불하는 실제 비용이므로 `totalCostAmount`에 포함되어야 함.
현재 빠져있어 `profitAmount = totalQuoteAmount - totalCostAmount`가 과대 계산됨.

### 변경 설계
```typescript
// 실제 비용 FSC = baseRate * fscRate (마진 없는 금액 기준)
const costFsc = Math.round(baseRate * fscRate);
const totalCostAmount = baseRate + costFsc + carrierResult.intlWarRisk + surgeCost + packingTotal + carrierAddOnTotal + destDuty + pickupInSeoul;
```

### 영향
- `profitAmount`가 감소 (정확한 값으로 보정)
- `profitPercent` 재계산 필요 없음 (이미 `totalCostAmount` 기반으로 계산)
- **Backend 동기화 필요**: `smart-quote-api/app/services/quote_calculator.rb`에서도 동일 수정

### 테스트 업데이트
- `calculationService.test.ts`에서 profit 관련 assertion 값 조정

---

## 5. H-2: 마진 상한 추가

### 변경 파일

**1) `business-rules.ts` — 상수 추가**
```typescript
export const MAX_MARGIN_PERCENT = 80; // 최대 마진율 (%)
```

**2) `calculationService.ts:294` — clamp 적용**
```typescript
import { MAX_MARGIN_PERCENT } from '@/config/business-rules';

const safeMarginPercent = Math.min(
  Math.max(input.marginPercent ?? 15, 0),
  MAX_MARGIN_PERCENT
);
```

### 영향
- UI의 마진 입력에서 80% 초과 값을 넣어도 80%로 제한
- 기존 `safeMarginPercent < 100` 분기는 항상 true가 되므로 제거 가능
  → 하지만 방어적으로 유지

---

## 6. H-3: FlightSchedulePage 컴포넌트 분리

### 추출 대상

**1) `AirlineCard` 컴포넌트** (신규 파일)
- 경로: `src/features/schedule/components/AirlineCard.tsx`
- 기존 `FlightSchedulePage.tsx` line 302-365의 항공사 카드 렌더링 분리
- Props: `airline, flights, onEdit, onDelete, isAdmin`

**2) 삭제 확인 다이얼로그**
- 기존 인라인 구현 (line 494-516) → `src/components/ui/ConfirmDialog.tsx` 활용

### 예상 결과
- `FlightSchedulePage.tsx`: 521줄 → ~380줄 (-27%)

---

## 7. H-4: ErrorBoundary Sentry 연동

### 변경 (`ErrorBoundary.tsx:32-34`)
```typescript
componentDidCatch(error: Error, info: React.ErrorInfo) {
  console.error('[ErrorBoundary]', error, info.componentStack);
  // Sentry 전송
  import('@sentry/browser').then(Sentry => {
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    });
  });
}
```

동적 import로 번들 크기 영향 최소화.

---

## 구현 순서 (확정)

```
1. C-1  calculationService.ts     throw Error 변경 + 테스트
2. C-3  useResolvedMargin.ts      stableWeight deps 수정
3. H-1  calculationService.ts     totalCostAmount FSC 추가 + 테스트
4. H-2  business-rules.ts +       MAX_MARGIN_PERCENT 추가 + clamp
        calculationService.ts
5. C-2  ups_tariff.ts             주석 명시 (코드 변경 없음)
6. H-4  ErrorBoundary.tsx         Sentry.captureException 추가
7. H-3  FlightSchedulePage.tsx    AirlineCard 추출 + ConfirmDialog 활용
```

## 검증 체크리스트

- [ ] `npx vitest run` 전체 통과 (1193+ tests)
- [ ] `npx tsc --noEmit` 타입 체크 통과
- [ ] `npm run lint` ESLint 통과
- [ ] 새 테스트 케이스 3건 추가 (C-1, H-1, H-2)
- [ ] 각 이슈별 개별 커밋

---

**작성일**: 2026-03-28
**참조**: `docs/01-plan/features/fix-critical-issues.plan.md`
