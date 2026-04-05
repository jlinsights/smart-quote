# Completion Report: CargoAI Roadmap — M1 (Phase 1.5 Multi-Carrier UX)

> **Feature**: cargoai-roadmap (M1 only — full roadmap spans 1년+)
> **Completed**: 2026-04-05
> **Match Rate**: 97%
> **PDCA Cycle**: Plan → Design → Do → Check → Report

---

## 1. Executive Summary

CargoAI 스타일 로드맵 중 **즉시 착수 가능한 M1 (Phase 1.5 Multi-Carrier UX)** 완료. 기존 UPS/DHL 2-캐리어 비교 카드에 배지(최저가/최단/친환경) + Transit Days 표시 + 4개 언어 i18n을 추가해, 실 API 연동(Phase 1) 없이도 차별화된 UX 제공. 캐리어 메타데이터를 상수화하여 Phase 1 API 연동 시 동적 전환 가능한 구조 확립.

## 2. Scope & Deliverables

### 완료된 작업 (6 Steps / 100%)

| # | Task | 변경/신규 파일 | 상태 |
|---|------|---------------|:----:|
| S1 | 타입 확장 (`CarrierComparisonItem`, `CarrierBadge`, `CarrierSortKey`) | `src/types.ts` | ✅ |
| S2 | 랭킹 서비스 (`assignBadges`, `rankCarriers`) + 11 테스트 | `carrierRanker.ts`, `carrierRanker.test.ts` (new) | ✅ |
| S3 | 캐리어 메타데이터 상수 (UPS/DHL/FEDEX) | `src/config/carrier_metadata.ts` (new) | ✅ |
| S4 | Card 레벨 통합 (UI 내부에서 badges 계산) | `CarrierComparisonCard.tsx` | ✅ |
| S5 | 배지 + Transit UI | `CarrierComparisonCard.tsx` | ✅ |
| S6 | i18n 5 키 × 4 언어 (comparison/badge/transit) | `src/i18n/translations.ts`, `CarrierComparisonCard.tsx`, `ResultSection.test.tsx` | ✅ |

### 의도적으로 연기 (Deferred, not gaps)

| # | Item | 사유 | 재도입 시점 |
|---|------|------|------------|
| D1 | sortBy 드롭다운 | 2-column swap UI에 불필요 | FEDEX 추가(3+ 캐리어) |
| D2 | ComparisonMatrix 테이블 | 동일 이유 | FEDEX 추가 |
| D3 | CO2 실제 값 (`co2Kg` null) | Phase 3.5 (M2) 범위 | M2 |
| D4 | qualityScore 자동 산출 | Phase 2 예약 이력 필요 | Phase 2 이후 |
| D5 | FEDEX 실계산 | 타입 stub만 추가 | Phase 1 API 이후 |

## 3. Key Changes

### 타입 체계 (S1)
- `CarrierComparisonItem` 인터페이스 — `carrier/revenueKrw/costKrw/marginPct/transitDaysMin/transitDaysMax/co2Kg/qualityScore/badges` 9개 필드
- `CarrierBadge` union type — `cheapest | fastest | greenest` (설계의 `| null` 제거로 단순화)
- 원 설계 `CarrierResult` → `CarrierComparisonItem` 개명 (기존 `QuoteResult.carrier` 와 충돌 회피)

### 랭킹 로직 (S2)
- `assignBadges(items)`: O(n) 패스 3회로 최저가/최단/친환경 인덱스 산출 → 동점 시 먼저 발견된 것 우선
- `rankCarriers(items, sortBy)`: 배지 부여 후 정렬. `co2` 정렬 시 `null` 값은 뒤로
- 순수함수, 불변성 (spread + map)

### 메타데이터 구조 (S3)
- UPS/DHL/FEDEX 별 `{transitDaysMin, transitDaysMax, qualityScore, emissionFactor}` 고정값
- IATA RP1678 기반 emission factor placeholder (0.602 / 0.520 / 0.645 kg CO₂/tonne-km)
- Phase 1 실 API 연동 시 동일 인터페이스로 동적 교체 가능

### UI 통합 (S4 + S5)
- `CarrierComparisonCard` 내부 `useMemo` 로 current + alt 결과를 묶어 `assignBadges()` 호출 (calculationService 중복 호출 회피)
- `BADGE_STYLE` 상수로 아이콘(💰/⚡/🌱) + Tailwind 색상 + i18n 키 매핑
- Transit 표시 기존 `result.transitTime` → `{min}~{max}일` 포맷 (언어별)

### i18n (S6)
- 5 keys × 4 langs = 20 entries:
  - `comparison.title`, `badge.cheapest/fastest/greenest`, `transit.days`
- `transit.days` placeholder: `{min}/{max}` 수동 치환 (`t()` 인터폴레이션 미지원)
- `ResultSection.test.tsx` 어설션 업데이트 (mocked `t` 는 key 그대로 반환)

## 4. Verification

| 검증 항목 | 결과 |
|----------|:----:|
| TypeScript (`tsc --noEmit`) | 에러 0 ✅ |
| ESLint (`--max-warnings 0`) | 에러 0 ✅ |
| Vitest | 1208 passed (+11 carrierRanker) ✅ |
| Gap Analysis Match Rate | 97% ✅ |
| 수동 QA | 배지 표시 / transit 언어별 포맷 / swap 작동 확인 |

## 5. Deviations from Design (3건, 모두 LOW/개선)

| ID | 내용 | 성격 |
|----|------|------|
| L1 | 타입명 `CarrierResult` → `CarrierComparisonItem` | 네이밍 충돌 방지 개선 |
| L2 | `CarrierBadge` 에서 `\| null` 제거 | 불필요 union 정리 |
| L3 | 통합 지점을 `calculationService` → `CarrierComparisonCard` | DRY (calc 중복 호출 회피) |

## 6. Impact & Value

| 축 | Before | After |
|----|:------:|:-----:|
| 캐리어 비교 시각화 | 2-column 가격 비교만 | +배지(cheapest/fastest/greenest) |
| Transit 정보 | `result.transitTime` 문자열 | 숫자 기반 {min-max} 언어별 포맷 |
| i18n 커버리지 (비교 섹션) | 하드코딩 영문 | 4 언어 지원 |
| 캐리어 메타데이터 | 산재 | 단일 상수 파일로 중앙화 |
| Phase 1 API 연동 준비 | — | 메타데이터 인터페이스 확립 |

## 7. Lessons Learned

1. **설계의 "리스트 가정" 재검토**: 원 설계 Step 5의 sortBy 드롭다운은 3+ 캐리어 리스트 UI 전제. 실제 UI 가 2-column 스왑인 경우 sortBy 는 UX 가치 없음 → 의도적 지연 기록이 gap보다 중요.
2. **통합 위치의 유연성**: calculationService vs Card 내부 통합 선택지에서, 이미 calc 이 2번 호출되는 컨텍스트(useMemo)라면 Card 레벨이 DRY. 설계 spec 은 가이드이지 절대가 아님.
3. **i18n 인터폴레이션 부재 대응**: 현 `t(key): string` 은 placeholder 미지원 → `{min}/{max}` 같은 동적 값은 `.replace()` 로 수동 치환. 향후 인터폴레이션 헬퍼 도입 고려.
4. **테스트 mock과 i18n**: `vi.mock('@/contexts/LanguageContext', () => ({ t: (k) => k }))` 패턴 사용 중 — 컴포넌트 텍스트 어설션은 translation key 자체를 기준으로 작성해야 회귀 방지.

## 8. Follow-up Actions

- [ ] **M2 (Phase 3.5 CO2)**: `CARRIER_METADATA.emissionFactor × distance × weight` 공식으로 `co2Kg` 채워 greenest 배지 활성화 → 별도 PDCA 사이클
- [ ] **FEDEX 실 계산 추가 시**: sortBy/ComparisonMatrix 재도입 검토
- [ ] **설계 문서 업데이트**: §3.3 타입명/ `| null` 제거, §3.4 card-level 통합 근거 추가 (선택)
- [ ] **i18n 인터폴레이션**: `transit.days` 외에도 placeholder 패턴 늘어나면 `t(key, vars)` 시그니처 확장 검토

---

## PDCA 문서 연결

- **Plan**: `docs/01-plan/features/cargoai-inspired-roadmap.plan.md` (장기 로드맵, M1-M6 포함)
- **Design**: `docs/02-design/features/cargoai-roadmap.design.md` (§3 Phase 1.5)
- **Do**: `docs/01-plan/features/cargoai-roadmap.do.md` (M1 6-step 체크리스트)
- **Analysis**: `docs/03-analysis/cargoai-roadmap.analysis.md` (Match Rate 97%)
- **Report**: 본 문서
