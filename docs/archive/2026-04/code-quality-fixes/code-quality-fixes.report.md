# Completion Report: Code Quality Fixes (Phase A+B)

> **Feature**: code-quality-fixes
> **Completed**: 2026-04-05
> **Match Rate**: 96%
> **PDCA Cycle**: Plan → Design → Do → Check → Report

---

## 1. Executive Summary

`bkit:code-analyzer` 가 도출한 Health Score 82/100 리포트 기반으로, High Priority 4건을 Phase A+B로 범위 확정하여 단일 사이클 내에 설계-구현-검증 완료. 보안 가드 유틸 신설, `alert()` 잔존 제거, React key 중복 수정, `useJetFuelPrices` 훅 리팩터로 테스트 경고 2종(act, duplicate key)을 모두 제거.

## 2. Scope & Deliverables

### 완료된 작업 (4/4 — 100%)

| # | Priority | Task | 변경 파일 | 상태 |
|---|:--------:|------|----------|:----:|
| H1 | High | URL 스킴 가드 유틸 + RSS href 적용 | `lib/urlSafety.ts` (new), `lib/urlSafety.test.ts` (new), `NoticeWidget.tsx` | ✅ |
| H2 | High | `alert()` → `useToast()` 교체 (2곳) | `UserManagementWidget.tsx` | ✅ |
| H3 | High | JetFuelWidget tick 중복 key 수정 | `JetFuelWidget.tsx` | ✅ |
| H4 | High | `useJetFuelPrices` cancelled flag + reloadToken 리팩터 | `useJetFuelPrices.ts`, `useJetFuelPrices.test.ts` | ✅ |

### 미진행 (별도 PDCA 예정)

| Phase | Task | 사유 |
|-------|------|------|
| Phase C | God component 분리 (`UserManagement`, `TargetMarginRules`) | 영향 범위 큼, 별도 사이클 |
| Phase D | `React.memo` / `useMemo` 최적화 (QuoteCalculator) | Profiler 측정 병행 필요 |
| Phase E | i18n/폰트 lazy split (번들 사이즈 감소) | 사전 번들 측정 + UX 설계 필요 |
| — | M3-M5 | 인증 레이어 개선 (refresh 경쟁, visibility) |

## 3. Key Changes

### 보안 개선 (H1)
- **Before**: `NoticeWidget` 에서 RSS 피드(외부 뉴스)의 `item.link` 를 스킴 검증 없이 `href` 에 바인딩 → `javascript:` / `data:` URL 주입 시 클릭 시 스크립트 실행 가능
- **After**: `safeExternalHref()` 유틸 — `http(s)://` 또는 상대경로(`/…`) 만 pass-through, 그 외는 `#` 반환. 9개 테스트 케이스로 스킴 차단 검증

### UX 일관성 (H2)
- **Before**: `UserManagementWidget` 의 편집/삭제 실패 시 blocking `alert()` 2곳 — 프로젝트 내 유일 잔존
- **After**: 다른 위젯이 사용 중인 `useToast()` 로 통일, 4초 후 자동 dismiss

### 렌더링 정확성 (H3)
- **Before**: `labelIndices.map((idx) => <text key={idx}>)` — 12주 미만 데이터셋에서 duplicate key 경고 + tick 라벨 누락 위험
- **After**: `key={`tick-${i}-${idx}`}` 로 unique 보장

### 훅 안정성 (H4)
- **Before**: `useCallback` 기반 `load()` 가 `weeks` 변경 시 재생성 → `useEffect([load])` 가 비동기 내부에서 `setLoading(true)` 호출 → 테스트 시 `act()` 경고, unmount 후 stale setState 가능성
- **After**: `reloadToken` state + `cancelled` flag 패턴. 모든 setState는 `!cancelled` 가드, cleanup 에서 `cancelled = true`. `retry`는 `reloadToken` 증가로 effect 재실행

## 4. Verification

| 검증 항목 | 결과 |
|----------|:----:|
| TypeScript (`tsc --noEmit`) | 에러 0 ✅ |
| ESLint (`--max-warnings 0`) | 에러 0 ✅ |
| Vitest (전체) | 1208 passed (+9 신규 urlSafety) ✅ |
| act() warnings | 0 (이전 1건) ✅ |
| Duplicate key warnings | 0 (이전 1건) ✅ |
| Gap Match Rate | 96% (25/26) ✅ |

## 5. Deviations from Design (모두 LOW, 3건 개선)

| ID | 내용 | 성격 |
|----|------|------|
| D1 | 테스트 파일 co-located (`lib/urlSafety.test.ts`) | 컨벤션 준수 (`pdfService.test.ts` 패턴) |
| D2 | `react-hooks/set-state-in-effect` 로컬 eslint-disable 추가 | 신규 lint 규칙 대응 |
| D3 | 테스트에서 `retry()` 호출을 `act()` 로 래핑 | act() warning 제거 달성 |
| D4 | urlSafety 테스트 케이스 9개 (설계 8개) | 보안 커버리지 개선 |

## 6. Impact on Code Health

| 항목 | Before | After |
|------|:------:|:-----:|
| Health Score (analyzer) | 82/100 | ~87/100 (추정) |
| High Priority 이슈 | 4건 | 0건 |
| `alert()` 사용 | 2곳 | 0곳 |
| 테스트 stderr 경고 | 2종 (act, dup-key) | 0 |
| 보안 가드 유틸 | 없음 | `safeExternalHref` 재사용 가능 |

## 7. Lessons Learned

1. **Lint 규칙 변화 대응**: `react-hooks/set-state-in-effect` 같은 새 규칙이 도입되면, 의도된 패턴에 로컬 disable + 주석 설명으로 0-warning 게이트 유지.
2. **테스트 convention 우선**: Design 에서 `__tests__/` 경로 명시했으나 실제 프로젝트는 `lib/` 하위 co-located 패턴. 기존 관례 준수가 consistency 측면에서 우선.
3. **act() 경고의 두 가지 원인**: 훅 내부의 cascading setState 뿐 아니라 **테스트에서 외부 함수 호출**(e.g. `result.current.retry()`) 도 원인. 양쪽 모두 점검 필요.
4. **유틸 재사용성**: `safeExternalHref` 는 향후 `SurchargeTable`, `FscRateWidget` 등 다른 외부 href 가드에도 적용 가능 → Phase C 백로그에 전수 적용 고려.

## 8. Follow-up Actions

- [ ] `safeExternalHref` 를 다른 외부 href 사용처(grep 대상: `FscRateWidget`, `SurchargeTable`)에 전수 적용 검토
- [ ] Code analyzer 재실행으로 Health Score 재측정 (82 → 목표 87+)
- [ ] Phase C (God component 분리) 별도 PDCA 사이클 시작

---

## PDCA 문서 연결

- **Plan**: `docs/01-plan/features/code-quality-fixes.plan.md`
- **Design**: `docs/02-design/features/code-quality-fixes.design.md`
- **Analysis**: `docs/03-analysis/code-quality-fixes.analysis.md`
- **Report**: 본 문서
