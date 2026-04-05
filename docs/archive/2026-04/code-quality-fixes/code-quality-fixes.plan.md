# Plan: code-quality-fixes

> Code Analysis 리포트 기반 품질 개선 — Health Score 82 → 95 목표

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature | code-quality-fixes |
| 우선순위 | High (보안 H1) + Medium (구조/성능) |
| 예상 영향 범위 | Frontend 10~14개 파일 수정 |
| 근거 | 2026-04-05 `bkit:code-analyzer` 리포트 (Health 82/100) |

### 배경

전체 테스트 1199건 / lint / tsc 모두 통과하는 안정 상태이나, 코드 분석 결과 다음 영역에서 개선 여지 발견:

- **보안 1건**: RSS 외부 링크 스킴 검증 누락 (잠재적 XSS)
- **UX/테스트 경고 3건**: `alert()` 잔존, JetFuelWidget 중복 key, `act()` warning
- **구조/성능 6건**: 4개 God component, `React.memo` 전무, 번들 비대화(i18n/폰트 eager load)

## 2. 현황 요약 (from Code Analysis 2026-04-05)

### High Priority (4건)

| ID | 이슈 | 파일:라인 |
|----|------|----------|
| H1 | RSS `item.link` 스킴 가드 없음 (javascript:/data: XSS) | `features/quote/components/widgets/NoticeWidget.tsx:69` |
| H2 | `alert()` 사용 (유일 잔존) | `features/admin/components/UserManagementWidget.tsx:74, 91` |
| H3 | JetFuelWidget 차트 tick 중복 key | `features/quote/components/widgets/JetFuelWidget.tsx:101-112` |
| H4 | `useJetFuelPrices` act() warning + 더블 렌더 | `features/dashboard/hooks/useJetFuelPrices.ts:18-36` |

### Medium Priority (6건)

| ID | 이슈 | 대상 |
|----|------|------|
| M1 | God components (>250 lines, 7~8 useState) | `TargetMarginRulesWidget.tsx`(376), `UserManagementWidget.tsx`(376), `FscRateWidget.tsx`(280), `QuoteDetailModal.tsx`(374), `AuditLogViewer.tsx`(231), `FlightFormModal.tsx`(271) |
| M2 | `React.memo` / `useMemo` 부재 | `QuoteCalculator.tsx:141` layoutProps, `QuoteHistoryTable` rows, `JetFuelWidget` chart |
| M3 | `apiClient.ts` refreshPromise 경쟁 | `src/api/apiClient.ts:43, 78-82` |
| M4 | 오래된 eslint-disable 주석 | `pages/QuoteCalculator.tsx:107` |
| M5 | Tab 복귀 시 토큰 staleness 검증 없음 | `src/contexts/AuthContext.tsx:101-116` |
| M6 | 번들 비대화 — i18n 4언어/폰트/가이드 eager load | `src/i18n/translations.ts`(1166), `guideTranslations.ts`(1254), `NotoSansKR-Regular-base64.ts`, `logo-base64.ts` |

### Low Priority (8건)

L1~L8: 에러 메시지 중복, 매직 넘버, localStorage 에러 silent fail, `NodeJS.Timeout` 타입, SharedQuotePage ASCII-strip 부작용, `mailto:` header-injection, `useSyncToInput` 타입 캐스트, `useResolvedMargin` 취소 없음.

## 3. 구현 범위 (단계별)

### 3-1. Phase A: 긴급 수정 (~30분) — H1 / H2 / H3

**목표:** 보안 가드 + UX 잔존 alert 제거 + 차트 key 수정

| 작업 | 파일 | 변경 내용 |
|------|------|----------|
| A1 | `NoticeWidget.tsx:69` | `safeHref = /^https?:\/\//i.test(item.link) ? item.link : '#'` 가드 추가 |
| A2 | `UserManagementWidget.tsx:74, 91` | `alert()` → `toast('error', ...)` 교체 (기존 훅 재사용) |
| A3 | `JetFuelWidget.tsx:101-112` | `key={idx}` → `key={`tick-${i}`}` |

**검증:** `npm run lint && npx tsc --noEmit && npx vitest run`

---

### 3-2. Phase B: 테스트 안정화 (~1시간) — H4

**목표:** act() warning 제거 + 더블 렌더 해결

| 작업 | 파일 | 변경 내용 |
|------|------|----------|
| B1 | `useJetFuelPrices.ts:18-36` | `setLoading(true)` 동기 호출로 분리, `AbortController`/`cancelled` flag 도입 |

**검증:** `npx vitest run src/features/dashboard/hooks/__tests__/useJetFuelPrices.test.ts` → stderr 무소음 확인

---

### 3-3. Phase C: God component 분리 (~2~3시간) — M1

**목표:** `surcharge/` 분리 패턴을 다른 widget에 적용

우선순위:
1. `UserManagementWidget.tsx` (376) → `user/UserList.tsx` + `user/UserForm.tsx` + `user/useUserCrud.ts`
2. `TargetMarginRulesWidget.tsx` (376) → `margin/MarginRuleList.tsx` + `margin/MarginRuleForm.tsx`
3. (시간 여유시) `QuoteDetailModal.tsx` (374) → section-level 분리

**공통 추상화:** `useCrudList<T>()` 훅 — list/loading/error/edit-id/delete-confirm 캡슐화

**검증:** 관련 테스트 통과, 기능 동작 수동 확인

---

### 3-4. Phase D: 성능 최적화 (~1시간) — M2

| 작업 | 파일 | 변경 내용 |
|------|------|----------|
| D1 | `QuoteCalculator.tsx:141` | `layoutProps`를 `useMemo`로 감싸고 콜백을 `useCallback`으로 |
| D2 | `QuoteHistoryTable` row | `React.memo` 적용 |
| D3 | `JetFuelWidget` chart SVG children | `React.memo` 적용 |

**검증:** React DevTools Profiler로 re-render count 감소 확인(수동)

---

### 3-5. Phase E (후순위, backlog) — M3 / M4 / M5 / M6

별도 스프린트로 분리:
- **M6 (번들 분할)**: i18n 언어별 lazy split + `NotoSansKR-Regular-base64` pdfService 호출 시 dynamic import → 번들 사이즈 측정으로 효과 검증
- **M3 / M5**: 인증 레이어 개선 (refresh 경쟁, visibilitychange listener)
- **M4**: 주석/타입 정리

## 4. 완료 기준

### Phase A+B (이번 커밋)
- [ ] H1~H4 모두 수정 + 테스트 green
- [ ] `npx vitest run` stderr 경고 무(JetFuelWidget/useJetFuelPrices)
- [ ] `npm run lint` 0 errors

### Phase C+D (이번 스프린트)
- [ ] `UserManagementWidget` / `TargetMarginRulesWidget` 분리 완료
- [ ] 각 widget 250 lines 이하
- [ ] QuoteCalculator re-render 감소 확인

### Phase E (백로그)
- [ ] 별도 PDCA cycle로 tracking

## 5. 리스크 / 주의사항

- **God component 분리 시**: prop 시그니처 변동 최소화, 기존 admin widget 테스트가 내부 구현 참조하지 않는지 확인
- **번들 분할 (M6)**: 언어 전환 시 suspense fallback UX 확인, 첫 렌더 FOUT 방지
- **Phase A1 (URL 가드)**: RSS 소스가 상대 URL(`/path`)을 보낼 경우 `#`로 fallback 되는지 테스트 필요

## 6. 관련 문서

- Code Analysis Report (2026-04-05, Health Score 82/100) — conversation artifact
- 유사 선행: `docs/archive/2026-03/code-quality-improvement/` (100% 완료 사례)
