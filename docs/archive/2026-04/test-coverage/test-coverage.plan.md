# Plan: test-coverage

## 목표

**Testing 점수 1/10 → 8/10, 전체 코드 품질 89 → 92+/100**

H1 리팩터링(code-quality-main-v2)으로 calculationService.ts에서 6개 서비스 서브모듈이 추출되었으나, 이들에 대한 전용 단위 테스트 파일이 없다. 각 모듈의 공개 API를 커버하는 Vitest 단위 테스트 6개를 신규 작성해 이 공백을 메운다.

---

## 배경

- **기존 테스트**: `calculationParity.test.ts` (프론트-백엔드 패리티), `carrierRanker.test.ts` (캐리어 순위)
- **H1 추출 결과**: 6개 서브모듈 파일이 각각 독립적 책임을 가짐
- **문제**: 서브모듈 각각에 대한 단위 테스트가 없어, 함수 수정 시 회귀 감지 불가
- **현재 테스트 수**: 약 1246개 (Vitest 전체), 모두 통과 중

---

## 범위 (Scope)

### 대상 서브모듈 6개

| 파일 | 주요 공개 API |
|------|-------------|
| `carrierRateEngine.ts` | `roundToHalf()`, `lookupCarrierRate()` |
| `itemCalculation.ts` | `calculateVolumetricWeight()`, `calculateItemCosts()`, `computePackingTotal()` |
| `upsCalculation.ts` | `calculateUpsCosts()` |
| `dhlCalculation.ts` | `calculateDhlCosts()` |
| `upsAddonCalculator.ts` | `calculateUpsAddOnCosts()` |
| `dhlAddonCalculator.ts` | `calculateDhlAddOnCosts()` |

### 제외

- `calculationService.ts` (오케스트레이터) — 기존 `calculationParity.test.ts`가 통합 커버
- RSpec 백엔드 테스트 — 별도 사이클
- E2E/통합 테스트 — 별도 사이클

---

## 테스트 전략

각 파일당 최소 **10개 이상의 케이스**:

1. **Happy path** — 정상 입력, 예상 출력 검증
2. **Edge cases** — 경계값 (최소/최대 무게, 정확히 경계에 해당하는 값)
3. **Branch coverage** — exact table 명중 / range table 명중 / fallback
4. **Auto-detection logic** — 각 캐리어의 자동 감지 부가서비스 (AHS, OSP, OWT, Surge)
5. **Error cases** — 알 수 없는 zone 등 예외 throw 검증

---

## 성공 기준

| 기준 | 목표 |
|------|------|
| 신규 테스트 파일 수 | 6개 |
| 신규 테스트 케이스 수 | 60개 이상 |
| 전체 Vitest pass | 1306+ / 1306+ |
| TypeScript 에러 | 0 |
| ESLint 경고 | 0 |
| Testing 점수 | 1/10 → 8/10 |
| 전체 코드 품질 점수 | 89 → 92+/100 |

---

## 구현 순서

1. `carrierRateEngine.test.ts` — 핵심 rate lookup 엔진 (다른 5개의 기반)
2. `itemCalculation.test.ts` — 부피중량/비용 계산
3. `upsCalculation.test.ts` — UPS 기본 요금
4. `dhlCalculation.test.ts` — DHL 기본 요금
5. `upsAddonCalculator.test.ts` — UPS 부가서비스 (복잡도 높음)
6. `dhlAddonCalculator.test.ts` — DHL 부가서비스 (복잡도 높음)

---

## 출력 경로

`src/features/quote/services/__tests__/`
- `carrierRateEngine.test.ts`
- `itemCalculation.test.ts`
- `upsCalculation.test.ts`
- `dhlCalculation.test.ts`
- `upsAddonCalculator.test.ts`
- `dhlAddonCalculator.test.ts`

---

## 의존성

- **Vitest** — 이미 설치 및 설정 완료
- **vitest/globals** — import 불필요 (`describe`, `it`, `expect` 글로벌 사용)
- **vi.mock** — zone 함수 및 config 상수 모킹 필요 시 사용
- **실제 tariff config** — 실제 요금표 데이터로 테스트 (모킹 최소화)

---

## 리스크

| 리스크 | 대응 |
|--------|------|
| zone lookup이 config에 종속됨 | 실제 국가 코드 사용 (mock 불필요) |
| 부가서비스 auto-detect 로직이 복잡 | 각 케이스별 명시적 QuoteInput 구성 |
| DB override 경로 (resolvedAddonRates) | 별도 테스트 케이스로 커버 |

---

## 후속 작업

- Design 문서 작성 (`/pdca design test-coverage`)
- 6개 테스트 파일 구현
- Gap analysis (`/pdca analyze test-coverage`)
- 완료 보고서 (`/pdca report test-coverage`)

---

_Created: 2026-04-15 | Feature: test-coverage | Phase: plan_
