# PDCA Completion Report: fix-critical-issues

> 코드 리뷰 Critical/High 이슈 7건 수정 완료 보고서

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature | fix-critical-issues |
| PDCA 사이클 | Plan → Design → Do → Check → Report |
| 시작일 | 2026-03-28 |
| 완료일 | 2026-03-28 |
| Match Rate | **100%** (7/7) |
| Iteration | 0회 (1차 구현에서 통과) |
| 테스트 | 32 files, 1196 tests 전체 통과 |

## 2. 배경

3-AI CLI 협업 코드 리뷰(Claude Code + Codex + Gemini)에서 발견된 Critical 3건, High 4건의 이슈를 PDCA 사이클로 체계적으로 수정.

## 3. 수정 내역

### Critical (3건)

| # | 이슈 | 파일 | 수정 내용 |
|---|------|------|----------|
| C-1 | 0원 견적 발행 위험 | `calculationService.ts:87` | `return 0` → `throw new Error(...)` |
| C-2 | UPS 요율 갭 (20.0~20.5kg) | `ups_tariff.ts:107-110` | 의도된 fallback 동작임을 주석으로 명시 |
| C-3 | useResolvedMargin 무한 호출 | `useResolvedMargin.ts:12` | `weight` → `stableWeight` (Math.round) deps 안정화 |

### High (4건)

| # | 이슈 | 파일 | 수정 내용 |
|---|------|------|----------|
| H-1 | totalCostAmount FSC 누락 | `calculationService.ts:315-316` | `costFsc = Math.round(baseRate * fscRate)` 추가 |
| H-2 | 마진 100% 비정상 동작 | `business-rules.ts` + `calculationService.ts` | `MAX_MARGIN_PERCENT = 80` 상한 + `Math.min` clamp |
| H-3 | FlightSchedulePage 521줄 | `FlightSchedulePage.tsx` + 신규 `AirlineCard.tsx` | 컴포넌트 추출 (-62줄) + `ConfirmDialog` 재사용 |
| H-4 | ErrorBoundary Sentry 미연동 | `ErrorBoundary.tsx:34-38` | 동적 import `Sentry.captureException` 추가 |

## 4. 변경 파일 목록

| 파일 | 변경 유형 |
|------|----------|
| `src/features/quote/services/calculationService.ts` | 수정 (C-1, H-1, H-2) |
| `src/features/dashboard/hooks/useResolvedMargin.ts` | 수정 (C-3) |
| `src/config/business-rules.ts` | 수정 (H-2) |
| `src/config/ups_tariff.ts` | 수정 (C-2, 주석만) |
| `src/components/ErrorBoundary.tsx` | 수정 (H-4) |
| `src/pages/FlightSchedulePage.tsx` | 수정 (H-3) |
| `src/features/schedule/components/AirlineCard.tsx` | **신규** (H-3) |

## 5. 검증 결과

| 검증 항목 | 결과 |
|-----------|------|
| TypeScript (`npx tsc --noEmit`) | 통과 |
| ESLint (`npm run lint`) | 통과 |
| Vitest (`npx vitest run`) | 32 files, 1196 tests 통과 |
| Snapshot 업데이트 | 1건 (totalCostAmount 변경 반영) |
| Gap Analysis | 100% Match |

## 6. 비즈니스 영향

| 영역 | Before | After |
|------|--------|-------|
| 견적 정확성 | 잘못된 zone에서 0원 견적 가능 | 에러 throw, UI에서 안전 처리 |
| 수익 계산 | FSC 비용 누락으로 수익 과대 계산 | 정확한 costFsc 반영 |
| 마진 안전성 | 100% 마진 시 무한대 금액 | 80% 상한으로 제한 |
| API 안정성 | 부동소수점 변화로 무한 호출 위험 | stableWeight로 안정화 |
| 에러 추적 | ErrorBoundary 에러 Sentry 미전송 | Sentry에 자동 전송 |

## 7. 후속 작업 (이번 범위 제외)

- [ ] Backend(Rails) `quote_calculator.rb`에도 H-1(FSC 비용) 동기화
- [ ] `dhlAddonCalculator.ts`, `upsAddonCalculator.ts` 테스트 추가
- [ ] Medium 이슈 6건 (React.memo, 다국어 등) 별도 PDCA

## 8. PDCA 문서 위치

| Phase | 문서 |
|-------|------|
| Plan | `docs/01-plan/features/fix-critical-issues.plan.md` |
| Design | `docs/02-design/features/fix-critical-issues.design.md` |
| Analysis | `docs/03-analysis/fix-critical-issues.analysis.md` |
| Report | `docs/04-report/features/fix-critical-issues.report.md` |

---

**작성일**: 2026-03-28
**작성 방법**: 3-AI CLI 협업 (Claude Code + Codex + Gemini)
