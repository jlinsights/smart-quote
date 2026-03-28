# Plan: fix-critical-issues

> 코드 리뷰에서 발견된 Critical/High 이슈 수정

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature | fix-critical-issues |
| 우선순위 | Critical |
| 예상 영향 범위 | 견적 계산 정확성, API 안정성, 비용 산출 로직 |
| 관련 파일 수 | ~8개 |

### 배경

3-AI CLI 협업 코드 리뷰(2026-03-28)에서 Critical 3건, High 4건의 이슈가 발견됨.
견적 금액에 직접 영향을 미치는 계산 로직 결함이 핵심.

## 2. 수정 대상

### Critical (반드시 수정)

#### C-1. lookupCarrierRate 조용한 0 반환 — 잘못된 견적 생성 위험
- **파일**: `src/features/quote/services/calculationService.ts:86`
- **문제**: zone/weight 조합을 못 찾으면 `return 0` → 0원 견적 발행 가능
- **수정**: `throw new Error(...)` 로 변경, 상위 try-catch에서 처리
- **검증**: 존재하지 않는 zone으로 계산 시 에러 메시지 표시 확인

#### C-2. UPS 요율 갭 (20.0~20.5kg 구간)
- **파일**: `src/config/ups_tariff.ts:108`
- **문제**: exact rates 20.0kg까지, range rates 20.5kg부터 → 경계 구간 fallback 의존
- **수정**: range rates min을 `20.1`로 조정하거나, 현재 fallback이 의도된 것이라면 주석으로 명시
- **검증**: 20.0, 20.1, 20.5kg 각각 계산 결과 비교, parity test 통과

#### C-3. useResolvedMargin 무한 API 호출 가능성
- **파일**: `src/features/dashboard/hooks/useResolvedMargin.ts:16`
- **문제**: 부동소수점 weight가 미세하게 변하면 useEffect 무한 실행
- **수정**: weight를 dependency 전에 `Math.round(weight * 100) / 100`으로 안정화
- **검증**: weight 변경 시 API 호출 횟수 console.log로 확인

### High (수정 권장)

#### H-1. totalCostAmount에 FSC 누락
- **파일**: `src/features/quote/services/calculationService.ts:317`
- **문제**: FSC(유류할증료)가 비용에 빠져 수익(profit) 과대 계산
- **수정**: `totalCostAmount`에 `baseRate * fscRate` 추가
- **검증**: 수익 금액이 현실적인지 수동 검산, calculationService.test.ts 업데이트

#### H-2. marginPercent >= 100 시 비정상 동작
- **파일**: `src/features/quote/services/calculationService.ts:299-301`
- **문제**: 100% 마진 시 마진 0 적용, 99.9% 시 천문학적 금액
- **수정**: `business-rules.ts`에 `MAX_MARGIN_PERCENT = 80` 추가, calculationService에서 clamp
- **검증**: 마진 80%, 90%, 100% 입력 시 올바른 동작 확인

#### H-3. FlightSchedulePage 521줄 관심사 분리
- **파일**: `src/pages/FlightSchedulePage.tsx`
- **수정**: 항공사 카드 → `AirlineCard` 컴포넌트 추출, 인라인 삭제 다이얼로그 → 기존 `ConfirmDialog` 활용
- **검증**: 기능 동일성 확인

#### H-4. ErrorBoundary Sentry 미연동
- **파일**: `src/components/ErrorBoundary.tsx:32-34`
- **수정**: `componentDidCatch`에 `Sentry.captureException` 추가
- **검증**: 에러 발생 시 Sentry 대시보드 이벤트 확인

## 3. 수정하지 않는 항목 (Medium/Low)

- React.memo 적용, 다국어 하드코딩, AiChatWidget useReducer 등은 이번 범위 제외
- addon calculator 테스트 추가는 별도 PDCA로 진행

## 4. 구현 순서

```
1. C-1 (lookupCarrierRate throw) ← 가장 위험, 가장 간단
2. C-3 (useResolvedMargin 안정화) ← API 부하 방지
3. H-1 (totalCostAmount FSC 추가) ← 수익 계산 정확성
4. H-2 (마진 상한 추가) ← 비즈니스 룰
5. C-2 (UPS 요율 갭 명시) ← 요율 데이터 변경, 신중히
6. H-4 (ErrorBoundary Sentry) ← 단순 추가
7. H-3 (FlightSchedulePage 분리) ← 리팩토링, 마지막
```

## 5. 테스트 전략

- 기존 `calculationService.test.ts` (1193 tests) 전체 통과 필수
- C-1 수정 후 새 테스트 케이스: "잘못된 zone에서 에러 throw"
- H-1 수정 후: profit 계산 검증 테스트 추가
- H-2 수정 후: 마진 상한 clamp 테스트 추가
- `npx vitest run` 전체 통과 확인

## 6. 롤백 계획

- 각 이슈별 개별 커밋 → 문제 발생 시 특정 커밋만 revert 가능
- 요율 데이터(C-2) 변경은 별도 브랜치에서 진행

---

**작성일**: 2026-03-28
**작성자**: Claude Code + Codex + Gemini (3-AI 협업 리뷰 기반)
