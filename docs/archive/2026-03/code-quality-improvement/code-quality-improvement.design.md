# Design: Code Quality Improvement

> **Feature**: code-quality-improvement
> **Plan Reference**: `docs/01-plan/features/code-quality-improvement.plan.md`
> **Created**: 2026-03-24
> **Status**: Draft

---

## 1. Implementation Design

### C-1: DEFAULT 값 단일 소스 화

**현재 문제**: `rates.ts`와 `QuoteCalculator.tsx` INITIAL_INPUT에 동일 값이 별도 하드코딩됨.

**수정 설계**:
```typescript
// QuoteCalculator.tsx — Before
const INITIAL_INPUT: QuoteInput = {
  ...
  exchangeRate: 1450,    // 하드코딩
  fscPercent: 41.75,     // 하드코딩
};

// QuoteCalculator.tsx — After
import { DEFAULT_EXCHANGE_RATE, DEFAULT_FSC_PERCENT } from '@/config/rates';
const INITIAL_INPUT: QuoteInput = {
  ...
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  fscPercent: DEFAULT_FSC_PERCENT,
};
```

**영향 파일**: `src/pages/QuoteCalculator.tsx`
**테스트**: 기존 테스트 통과 확인 (값 변경 없음, 참조만 변경)

---

### C-2: 이메일 허용목록 서버 이동

**현재 문제**: `SCHEDULE_ALLOWED_EMAILS`가 Header.tsx에 평문 노출, JS 번들에서 확인 가능.

**수정 설계** (2단계):

**Phase A (즉시, 프론트엔드만)**:
- 이메일 배열 대신 `user.permissions?.canViewSchedule` 또는 `user.role === 'admin'` 체크
- 현재 허용 사용자가 모두 admin이므로 admin 체크로 충분

```typescript
// Header.tsx — Before
const SCHEDULE_ALLOWED_EMAILS = ['jaehong.lim@goodmangls.com', 'charlie@goodmangls.com'];
const canViewSchedule = user?.email && SCHEDULE_ALLOWED_EMAILS.includes(user.email);

// Header.tsx — After
const canViewSchedule = user?.role === 'admin';
```

```typescript
// App.tsx — Before
<ProtectedRoute allowedEmails={['jaehong.lim@goodmangls.com', 'charlie@goodmangls.com']}>

// App.tsx — After
<ProtectedRoute requireAdmin={true}>
```

**Phase B (향후, 백엔드)**: user 모델에 `permissions` JSON 필드 추가 → 별도 PDCA

**영향 파일**: `Header.tsx`, `App.tsx`
**제거 가능**: `ProtectedRoute`의 `allowedEmails` prop (더 이상 사용하지 않으면)

---

### C-3: localStorage FSC 검증 강화

**현재 문제**: `loadFscHistory()`에서 파싱 후 `Array.isArray` 만 체크, rate 값 미검증.

**수정 설계**:
```typescript
// fsc-history.ts — loadFscHistory() 내 검증 강화
function isValidEntry(e: unknown): e is FscHistoryEntry {
  return typeof e === 'object' && e !== null
    && typeof (e as FscHistoryEntry).date === 'string'
    && typeof (e as FscHistoryEntry).rate === 'number'
    && isFinite((e as FscHistoryEntry).rate)
    && (e as FscHistoryEntry).rate >= 0;
}

// 파싱 후 필터링
parsed.ups = parsed.ups.filter(isValidEntry);
parsed.dhl = parsed.dhl.filter(isValidEntry);
```

**영향 파일**: `src/config/fsc-history.ts`
**테스트**: 기존 11개 fsc-history 테스트 통과 + invalid entry 테스트 추가

---

### W-1: Division-by-zero 방어

**현재 문제**: `CarrierComparisonCard.tsx:92`에서 `totalQuoteAmountUSD`가 0이면 `Infinity`.

**수정 설계**:
```typescript
// Before
exchangeRate={currentResult.totalQuoteAmount > 0
  ? currentResult.totalQuoteAmount / currentResult.totalQuoteAmountUSD
  : 1400}

// After — input.exchangeRate를 직접 사용
exchangeRate={input.exchangeRate}
```

`input.exchangeRate`는 항상 유효한 값 (1 이상, FinancialSection에서 검증).

**영향 파일**: `src/features/quote/components/CarrierComparisonCard.tsx`

---

### W-2: 데드 코드 제거

**현재 문제**: `RouteSection.tsx:182-203` hidden Incoterm 셀렉트 + 설명 — 렌더링되지 않는 DOM.

**수정 설계**: 해당 블록 전체 삭제. Incoterm 관련 import(`INCOTERM_OPTIONS`, `INCOTERM_DESC`)도 미사용 시 삭제.

**영향 파일**: `src/features/quote/components/RouteSection.tsx`
**주의**: `input.incoterm`은 여전히 `types.ts`에서 사용됨 — 삭제 대상은 UI 렌더링만

---

### W-3: 공통 Footer 컴포넌트 추출

**현재 문제**: 3개 페이지에 동일 footer 마크업 중복.

**수정 설계**:
```typescript
// src/components/layout/Footer.tsx
export const Footer: React.FC<{ variant?: 'admin' | 'default' }> = ({ variant = 'default' }) => (
  <footer className="bg-white dark:bg-gray-950 py-10 border-t border-gray-100 dark:border-gray-800 transition-colors duration-200">
    <div className="max-w-7xl mx-auto px-4 text-center">
      <p className="text-sm text-gray-400">
        &copy; 2026 Goodman GLS & J-Ways. {variant === 'admin' ? 'Internal Use Only.' : 'All rights reserved.'}
      </p>
    </div>
  </footer>
);
```

**교체 대상**: `CustomerDashboard.tsx:80`, `QuoteCalculator.tsx:260`, `UserGuidePage.tsx:432`

---

### W-4: 미번역 문자열 i18n 적용

**대상 문자열**:
| 파일 | 문자열 | 번역 키 |
|------|--------|---------|
| `QuoteSummaryCard.tsx:62` | "Transit Time" | `calc.transitTime` |
| `QuoteSummaryCard.tsx:66` | "Zone" | `calc.zone` |
| `CarrierComparisonCard.tsx:47` | "Carrier Comparison" | `calc.carrierComparison` |
| `CarrierComparisonCard.tsx:117` | "Selected" / "Switch" | `calc.selected` / `calc.switch` |

**영향 파일**: 해당 컴포넌트 + `translations.ts` (4개 언어)

---

### W-5: ServiceSection unsafe 타입 캐스트 제거

**수정 설계**: 직접 캐스트 대신 타입 안전 래퍼 사용 — 실제 코드 확인 후 최소 변경.

---

## 2. Implementation Order

```
C-1 (단일소스) → C-3 (검증강화) → W-1 (0나누기) → W-2 (데드코드)
    → W-3 (Footer) → W-4 (i18n) → C-2 (이메일→admin)
```

C-2는 마지막 — `allowedEmails` prop 제거가 다른 변경과 충돌 가능성.

## 3. Verification Criteria

- [ ] `npx tsc --noEmit` — 에러 0
- [ ] `npm run lint` — 에러/경고 0
- [ ] `npx vitest run` — 1,193+ 테스트 통과
- [ ] `npm run build` — 빌드 성공
- [ ] `INITIAL_INPUT`에 하드코딩 숫자 없음 (`rates.ts` import)
- [ ] `SCHEDULE_ALLOWED_EMAILS` 배열 코드에서 제거됨
- [ ] hidden Incoterm DOM 제거됨
- [ ] Footer 중복 0 (공통 컴포넌트 사용)

---

*Generated by PDCA Design phase | bkit v1.4.7*
